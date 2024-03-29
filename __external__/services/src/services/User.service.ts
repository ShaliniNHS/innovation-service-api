import {
  Organisation,
  OrganisationUnit,
  OrganisationUnitUser,
  OrganisationUser,
  User,
  UserType,
} from "@domain/index";
import {
  InvalidDataError,
  InvalidParamsError,
  InvalidUserTypeError,
} from "@services/errors";
import {
  ProfileSlimModel,
  UserEmailModel,
} from "@services/models/ProfileSlimModel";
import { RequestUser } from "@services/models/RequestUser";
import { UserCreationModel } from "@services/models/UserCreationModel";
import { UserCreationResult } from "@services/models/UserCreationResult";
import { UserProfileUpdateModel } from "@services/models/UserProfileUpdateModel";
import { UserUpdateModel } from "@services/models/UserUpdateModel";
import { UserUpdateResult } from "@services/models/UserUpdateResult";
import {
  Connection,
  EntityManager,
  FindOneOptions,
  getConnection,
  getRepository,
  Repository,
} from "typeorm";
import {
  authenticateWitGraphAPI,
  createB2CUser,
  getUserFromB2C,
  getUserFromB2CByEmail,
  getUsersFromB2C,
  saveB2CUser,
} from "../helpers";
import { ProfileModel } from "../models/ProfileModel";

export class UserService {
  private readonly connection: Connection;
  private readonly userRepo: Repository<User>;
  private readonly orgRepo: Repository<Organisation>;
  private readonly orgUnitRepo: Repository<OrganisationUnit>;

  constructor(connectionName?: string) {
    this.connection = getConnection(connectionName);
    this.userRepo = getRepository(User, connectionName);
    this.orgRepo = getRepository(Organisation, connectionName);
    this.orgUnitRepo = getRepository(OrganisationUnit, connectionName);
  }

  async find(id: string, options?: FindOneOptions) {
    if (!id) return;
    return await this.userRepo.findOne(id, options);
  }

  async create(user: User) {
    return await this.userRepo.save(user);
  }

  async getUser(id: string) {
    return await this.userRepo.findOne(id);
  }

  async updateB2CUser(
    payload: any,
    oid: string,
    accessToken?: string
  ): Promise<boolean> {
    if (!accessToken) {
      accessToken = await authenticateWitGraphAPI();
    }
    await saveB2CUser(accessToken, oid, payload);

    return true;
  }

  async getProfile(id: string, accessToken?: string): Promise<ProfileModel> {
    if (!accessToken) {
      accessToken = await authenticateWitGraphAPI();
    }

    const user = await getUserFromB2C(id, accessToken);

    if (!user) {
      throw new Error("Invalid user.");
    }

    const email = user.identities.find(
      (identity) => identity.signInType === "emailAddress"
    ).issuerAssignedId;

    const profile: ProfileModel = {
      id,
      displayName: user.displayName,
      type: null,
      organisations: [],
      email,
      phone: user.mobilePhone,
    };

    try {
      const userDb: User = await this.userRepo.findOne(id, {
        relations: [
          "userOrganisations",
          "userOrganisations.organisation",
          "userOrganisations.userOrganisationUnits",
          "userOrganisations.userOrganisationUnits.organisationUnit",
        ],
      });
      if (userDb) {
        const organisations: OrganisationUser[] = await userDb.userOrganisations;

        profile.type = userDb.type;
        profile.organisations = [];

        for (let idx = 0; idx < organisations.length; idx++) {
          const orgUser: OrganisationUser = organisations[idx];
          const org: Organisation = orgUser.organisation;
          const orgUnits: OrganisationUnitUser[] =
            orgUser.userOrganisationUnits;

          profile.organisations.push({
            id: org.id,
            name: org.name,
            size: org.size,
            role: orgUser.role,
            isShadow: org.isShadow,
            organisationUnits: orgUnits?.map((ouu: OrganisationUnitUser) => ({
              id: ouu.organisationUnit.id,
              name: ouu.organisationUnit.name,
            })),
          });
        }
      }
    } catch (error) {
      throw error;
    }

    return profile;
  }

  async getUsersEmail(ids: string[]): Promise<UserEmailModel[]> {
    if (ids.length === 0) {
      return null;
    }
    const accessToken = await authenticateWitGraphAPI();
    const uniqueUserIds = ids.filter((x, i, a) => a.indexOf(x) == i);
    const userIds = uniqueUserIds.map((u) => `"${u}"`).join(",");
    const odataFilter = `$filter=id in (${userIds})`;

    const users =
      (await getUsersFromB2C(accessToken, odataFilter, "beta")) || [];

    const result = users.map((u) => ({
      id: u.id,
      displayName: u.displayName,
      email: u.identities.find((i) => i.signInType === "emailAddress")
        ?.issuerAssignedId,
    }));

    return result;
  }

  async getListOfUsers(ids: string[]): Promise<ProfileSlimModel[]> {
    if (!ids || ids.length === 0) {
      return [];
    }

    const accessToken = await authenticateWitGraphAPI();

    // remove duplicated userIds
    const uniqueUserIds = ids.filter((x, i, a) => a.indexOf(x) == i);

    // limit of users per chunk
    const userIdsChunkSize = 10;

    // create chunks
    const userIdsChunks = uniqueUserIds.reduce((resultArray, item, index) => {
      const chunkIndex = Math.floor(index / userIdsChunkSize);

      if (!resultArray[chunkIndex]) {
        resultArray[chunkIndex] = [];
      }

      resultArray[chunkIndex].push(item);

      return resultArray;
    }, []);

    // prepare promises
    const promises = [];
    for (let i = 0; i < userIdsChunks.length; i++) {
      const userIds = userIdsChunks[i].map((u) => `"${u}"`).join(",");
      const odataFilter = `$filter=id in (${userIds})`;

      promises.push(getUsersFromB2C(accessToken, odataFilter));
    }

    // promise all and merge all results
    return Promise.all(promises).then((results) => {
      return results.flatMap((result) =>
        result?.map((u) => ({
          id: u.id,
          displayName: u.displayName,
        }))
      );
    });
  }

  async updateProfile(requestUser: RequestUser, user: UserProfileUpdateModel) {
    if (!requestUser || !user) {
      throw new InvalidParamsError("Invalid params.");
    }

    const accessToken = await authenticateWitGraphAPI();
    const currentProfile = await this.getProfile(requestUser.id, accessToken);
    if (user.displayName != currentProfile.displayName) {
      await this.updateB2CUser(
        { displayName: user.displayName },
        requestUser.id,
        accessToken
      );
    }

    if (user.organisation) {
      const organisationId = user.organisation.id;
      delete user.organisation.id;
      await this.orgRepo.update(organisationId, user.organisation);
    }

    return { id: requestUser.id };
  }

  async createUsers(
    requestUser: RequestUser,
    users: UserCreationModel[]
  ): Promise<UserCreationResult[]> {
    if (!requestUser || !users || users.length === 0) {
      throw new InvalidParamsError("Invalid params.");
    }

    const graphAccessToken = await authenticateWitGraphAPI();
    const results: UserCreationResult[] = [];

    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      let result: UserCreationResult;

      try {
        result = await this.createUser(requestUser, users[i], graphAccessToken);
      } catch (err) {
        result = {
          email: user.email,
          error: {
            code: err.constructor.name,
            message: err.message,
          },
        };
      }

      results.push(result);
    }

    return results;
  }

  async createUser(
    requestUser: RequestUser,
    userModel: UserCreationModel,
    graphAccessToken?: string
  ): Promise<UserCreationResult> {
    if (!requestUser || !userModel) {
      throw new InvalidParamsError("Invalid params.");
    }

    if (
      userModel.type === UserType.ACCESSOR &&
      (!userModel.organisationAcronym ||
        !userModel.organisationUnitAcronym ||
        !userModel.role)
    ) {
      throw new InvalidParamsError("Invalid params. Invalid accessor params.");
    }

    if (
      userModel.type !== UserType.ACCESSOR &&
      userModel.type !== UserType.ASSESSMENT
    ) {
      throw new InvalidDataError("Invalid data. Invalid user type.");
    }

    if (requestUser.type !== UserType.ADMIN) {
      throw new InvalidUserTypeError("Invalid user type.");
    }

    if (!graphAccessToken) {
      graphAccessToken = await authenticateWitGraphAPI();
    }

    if (!userModel.password) {
      userModel.password = Math.random().toString(36).slice(2) + "0aA!";
    }

    let oid: string;
    let user: User;
    // Check if user exists in B2C
    const b2cUser = await getUserFromB2CByEmail(
      userModel.email,
      graphAccessToken
    );

    if (b2cUser) {
      oid = b2cUser.id;

      // If user exists in B2C, check if exists in the DB
      user = await this.userRepo
        .createQueryBuilder("user")
        .where("id = :oid", {
          oid,
        })
        .getOne();

      if (user && user.type !== userModel.type) {
        throw new InvalidDataError("Invalid data. Invalid user type.");
      }
    } else {
      // If the user does not exist in the B2C, create b2c user
      const b2cUser = await createB2CUser(
        graphAccessToken,
        userModel.name,
        userModel.email,
        userModel.password
      );

      oid = b2cUser.id;
    }

    let organisation: Organisation = null;
    if (userModel.organisationAcronym) {
      organisation = await this.orgRepo
        .createQueryBuilder("organisation")
        .where("acronym = :acronym", {
          acronym: userModel.organisationAcronym,
        })
        .getOne();
    }

    let organisationUnit: OrganisationUnit = null;
    if (userModel.organisationUnitAcronym) {
      organisationUnit = await this.orgUnitRepo
        .createQueryBuilder("organisationUnit")
        .where("acronym = :acronym", {
          acronym: userModel.organisationUnitAcronym,
        })
        .getOne();
    }

    const result: UserCreationResult = {
      email: userModel.email,
      userId: oid,
    };
    return await this.connection.transaction(
      async (transactionManager: EntityManager) => {
        if (!user) {
          // If the user does not exist in the DB, create user
          user = User.new({
            id: oid,
            type: userModel.type,
            createdBy: requestUser.id,
            updatedBy: requestUser.id,
          });
          await transactionManager.save(User, user);
        }

        if (organisation) {
          const orgUserObj = OrganisationUser.new({
            organisation,
            user,
            role: userModel.role,
            createdBy: requestUser.id,
            updatedBy: requestUser.id,
          });

          const orgUser = await transactionManager.save(
            OrganisationUser,
            orgUserObj
          );
          result.organisationUserId = orgUser.id;

          if (organisationUnit) {
            const orgUnitUserObj = OrganisationUnitUser.new({
              organisationUnit: { id: organisationUnit.id },
              organisationUser: { id: orgUser.id },
              createdBy: requestUser.id,
              updatedBy: requestUser.id,
            });

            const orgUnitUser = await transactionManager.save(
              OrganisationUnitUser,
              orgUnitUserObj
            );
            result.organisationUnitUserId = orgUnitUser.id;
          }
        }

        return result;
      }
    );
  }

  async updateUsers(
    requestUser: RequestUser,
    users: UserUpdateModel[]
  ): Promise<UserUpdateResult[]> {
    if (!requestUser || !users || users.length === 0) {
      throw new InvalidParamsError("Invalid params.");
    }

    const graphAccessToken = await authenticateWitGraphAPI();
    const results: UserUpdateResult[] = [];

    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      let result: UserUpdateResult;

      try {
        result = await this.updateUser(requestUser, users[i], graphAccessToken);
      } catch (err) {
        result = {
          id: user.id,
          status: "ERROR",
          error: {
            code: err.constructor.name,
            message: err.message,
          },
        };
      }

      results.push(result);
    }

    return results;
  }

  async updateUser(
    requestUser: RequestUser,
    userModel: UserUpdateModel,
    graphAccessToken?: string
  ): Promise<UserUpdateResult> {
    if (!requestUser || !userModel) {
      throw new InvalidParamsError("Invalid params.");
    }

    if (!graphAccessToken) {
      graphAccessToken = await authenticateWitGraphAPI();
    }

    const user = await getUserFromB2C(userModel.id, graphAccessToken);
    if (!user) {
      throw new Error("Invalid user id.");
    }

    try {
      await this.updateB2CUser(
        userModel.properties,
        userModel.id,
        graphAccessToken
      );
    } catch {
      throw new Error("Error updating user.");
    }

    return {
      id: userModel.id,
      status: "OK",
    };
  }
}
