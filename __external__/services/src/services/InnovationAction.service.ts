import {
  AccessorOrganisationRole,
  Comment,
  InnovationAction,
  InnovationActionStatus,
  InnovationSectionAliasCatalogue,
  InnovationSupport,
  OrganisationUser,
} from "@domain/index";
import {
  InnovationNotFoundError,
  InnovationSupportNotFoundError,
  InvalidDataError,
  InvalidParamsError,
  InvalidUserRoleError,
  MissingUserOrganisationError,
  MissingUserOrganisationUnitError,
  ResourceNotFoundError,
} from "@services/errors";
import { hasAccessorRole } from "@services/helpers";
import { InnovationActionModel } from "@services/models/InnovationActionModel";
import {
  Connection,
  FindManyOptions,
  getConnection,
  getRepository,
  Repository,
} from "typeorm";
import { InnovationService } from "./Innovation.service";
import { InnovationSectionService } from "./InnovationSection.service";
import { UserService } from "./User.service";

export class InnovationActionService {
  private readonly connection: Connection;
  private readonly actionRepo: Repository<InnovationAction>;
  private readonly innovationService: InnovationService;
  private readonly innovationSectionService: InnovationSectionService;
  private readonly userService: UserService;

  constructor(connectionName?: string) {
    this.connection = getConnection(connectionName);
    this.actionRepo = getRepository(InnovationAction, connectionName);
    this.innovationService = new InnovationService(connectionName);
    this.innovationSectionService = new InnovationSectionService(
      connectionName
    );
    this.userService = new UserService(connectionName);
  }

  async create(
    userId: string,
    innovationId: string,
    action: any,
    userOrganisations: OrganisationUser[]
  ) {
    if (!userId || !action || !innovationId) {
      throw new InvalidParamsError("Invalid parameters.");
    }

    if (!userOrganisations || userOrganisations.length == 0) {
      throw new MissingUserOrganisationError(
        "Invalid user. User has no organisations."
      );
    }

    // BUSINESS RULE: An accessor has only one organization
    const userOrganisation = userOrganisations[0];

    if (
      !userOrganisation.userOrganisationUnits ||
      userOrganisation.userOrganisationUnits.length == 0
    ) {
      throw new MissingUserOrganisationUnitError(
        "Invalid user. User has no organisation units."
      );
    }

    // BUSINESS RULE: An accessor has only one organization unit
    const filterOptions = {
      relations: [
        "sections",
        "innovationSupports",
        "innovationSupports.organisationUnit",
      ],
    };
    const innovation = await this.innovationService.findInnovation(
      innovationId,
      userId,
      filterOptions,
      userOrganisations
    );
    if (!innovation) {
      throw new InnovationNotFoundError(
        "Invalid parameters. Innovation not found for the user."
      );
    }

    const sections = await innovation.sections;
    let actionsCounter = 0;

    let innovationSection = sections.find(
      (sec) => sec.section === action.section
    );
    if (!innovationSection) {
      innovationSection = await this.innovationSectionService.createSection(
        innovation.id,
        userId,
        action.section
      );
    } else {
      const actions = await innovationSection.actions;
      actionsCounter = actions.length;
    }

    // BUSINESS RULE: An user has only one organization unit
    const organisationUnit =
      userOrganisations[0].userOrganisationUnits[0].organisationUnit;

    const innovationSupport: InnovationSupport = innovation?.innovationSupports.find(
      (is: InnovationSupport) => is.organisationUnit.id === organisationUnit.id
    );
    if (!innovationSupport) {
      throw new InnovationSupportNotFoundError(
        "Invalid parameters. Innovation Support not found."
      );
    }

    const actionObj = {
      displayId: this.getActionDisplayId(action.section, actionsCounter),
      description: action.description,
      status: InnovationActionStatus.REQUESTED,
      innovationSection: { id: innovationSection.id },
      innovationSupport: { id: innovationSupport.id },
      createdBy: userId,
      updatedBy: userId,
    };

    return this.actionRepo.save(actionObj);
  }

  async updateByAccessor(
    id: string,
    userId: string,
    innovationId: string,
    action: any,
    userOrganisations: OrganisationUser[]
  ) {
    if (!id || !userId || !action) {
      throw new InvalidParamsError("Invalid parameters.");
    }

    if (!userOrganisations || userOrganisations.length == 0) {
      throw new MissingUserOrganisationError(
        "Invalid user. User has no organisations."
      );
    }

    // BUSINESS RULE: An accessor has only one organization
    const userOrganisation = userOrganisations[0];

    if (
      !userOrganisation.userOrganisationUnits ||
      userOrganisation.userOrganisationUnits.length == 0
    ) {
      throw new MissingUserOrganisationUnitError(
        "Invalid user. User has no organisation units."
      );
    }

    // BUSINESS RULE: An user has only one organization unit
    const organisationUnit =
      userOrganisations[0].userOrganisationUnits[0].organisationUnit;

    const innovation = await this.innovationService.findInnovation(
      innovationId,
      userId,
      null,
      userOrganisations
    );
    if (!innovation) {
      throw new InvalidParamsError(
        "Invalid parameters. Innovation not found for the user."
      );
    }

    const innovationAction = await this.findOne(id);
    if (
      !innovationAction ||
      innovationAction.innovationSupport.organisationUnit.id !==
        organisationUnit.id
    ) {
      throw new InvalidDataError("Invalid action data.");
    }

    return this.update(innovationAction, innovationId, userId, action);
  }

  async updateByInnovator(
    id: string,
    userId: string,
    innovationId: string,
    action: any
  ) {
    if (!id || !userId || !action) {
      throw new InvalidParamsError("Invalid parameters.");
    }

    const filterOptions = {
      relations: ["innovationSection", "innovationSection.innovation"],
      where: `owner_id = '${userId}'`,
    };

    const innovationAction = await this.actionRepo.findOne(id, filterOptions);
    if (!innovationAction) {
      throw new ResourceNotFoundError("Invalid parameters.");
    }

    return this.update(innovationAction, innovationId, userId, action);
  }

  async find(
    id: string,
    userId: string,
    innovationId: string,
    userOrganisations?: OrganisationUser[]
  ): Promise<InnovationActionModel> {
    if (!userId || !innovationId) {
      throw new InvalidParamsError("Invalid parameters.");
    }

    const innovation = await this.innovationService.findInnovation(
      innovationId,
      userId,
      null,
      userOrganisations
    );
    if (!innovation) {
      throw new InnovationNotFoundError(
        "Invalid parameters. Innovation not found for the user."
      );
    }

    const innovationAction = await this.findOne(id);
    if (!innovationAction) {
      throw new ResourceNotFoundError(
        "Invalid parameters. Innovation action not found."
      );
    }

    const b2cCreatorUser = await this.userService.getProfile(
      innovationAction.createdBy
    );
    const organisationUnit =
      innovationAction.innovationSupport.organisationUnit;

    return {
      id: innovationAction.id,
      displayId: innovationAction.displayId,
      status: innovationAction.status,
      description: innovationAction.description,
      section: innovationAction.innovationSection.section,
      createdAt: innovationAction.createdAt,
      updatedAt: innovationAction.updatedAt,
      createdBy: {
        id: innovationAction.createdBy,
        name: b2cCreatorUser.displayName,
        organisationName: organisationUnit.organisation.name,
        organisationUnitName: organisationUnit.name,
      },
    };
  }

  async findAllByAccessor(
    userId: string,
    userOrganisations: OrganisationUser[],
    openActions: boolean,
    skip: number,
    take: number,
    order?: { [key: string]: string }
  ) {
    if (!userId) {
      throw new InvalidParamsError("Invalid parameters.");
    }

    if (!userOrganisations || userOrganisations.length == 0) {
      throw new MissingUserOrganisationError(
        "Invalid user. User has no organisations."
      );
    }

    // BUSINESS RULE: An accessor has only one organization
    const userOrganisation = userOrganisations[0];

    if (!hasAccessorRole(userOrganisation.role)) {
      throw new InvalidUserRoleError("Invalid user. User has an invalid role.");
    }

    const statuses = this.getFilterStatusByOpen(openActions);
    const filterOptions: FindManyOptions<InnovationAction> = {
      relations: [],
      where: {},
      skip,
      take,
      order: order || { createdAt: "DESC" },
    };

    if (
      userOrganisation.role === AccessorOrganisationRole.QUALIFYING_ACCESSOR
    ) {
      filterOptions.relations = [
        "innovationSection",
        "innovationSection.innovation",
        "innovationSection.innovation.organisationShares",
      ];
      filterOptions.where = `organisation_id = '${
        userOrganisation.organisation.id
      }' and InnovationAction.status in (${statuses.toString()})`;
    } else {
      // BUSINESS RULE: An user has only one organization unit
      const organisationUnit =
        userOrganisation.userOrganisationUnits[0].organisationUnit;

      filterOptions.relations = [
        "innovationSection",
        "innovationSection.innovation",
        "innovationSection.innovation.innovationSupports",
      ];
      filterOptions.where = `organisation_unit_id = '${
        organisationUnit.id
      }' and InnovationAction.status in (${statuses.toString()})`;
    }

    const result = await this.actionRepo.findAndCount(filterOptions);
    const actions = result[0]?.map((ia: InnovationAction) => ({
      id: ia.id,
      displayId: ia.displayId,
      innovation: {
        id: ia.innovationSection.innovation.id,
        name: ia.innovationSection.innovation.name,
      },
      status: ia.status,
      section: ia.innovationSection.section,
      createdAt: ia.createdAt,
      updatedAt: ia.updatedAt,
    }));

    return {
      data: actions,
      count: result[1],
    };
  }

  async findAllByInnovation(
    userId: string,
    innovationId: string,
    userOrganisations?: OrganisationUser[]
  ): Promise<InnovationActionModel[]> {
    if (!userId || !innovationId) {
      throw new InvalidParamsError("Invalid parameters.");
    }

    const innovation = await this.innovationService.findInnovation(
      innovationId,
      userId,
      null,
      userOrganisations
    );
    if (!innovation) {
      throw new InnovationNotFoundError(
        "Invalid parameters. Innovation not found for the user."
      );
    }

    const filterOptions: FindManyOptions<InnovationAction> = {
      relations: ["innovationSection"],
      where: `innovation_id = '${innovation.id}'`,
    };
    const innovationActions = await this.actionRepo.find(filterOptions);

    return innovationActions.map((ia: InnovationAction) => ({
      id: ia.id,
      displayId: ia.displayId,
      status: ia.status,
      description: ia.description,
      section: ia.innovationSection.section,
      createdAt: ia.createdAt,
      updatedAt: ia.updatedAt,
    }));
  }

  private async update(
    innovationAction: InnovationAction,
    innovationId: string,
    userId: string,
    action: any
  ) {
    return await this.connection.transaction(async (transactionManager) => {
      if (action.comment) {
        const comment = Comment.new({
          user: { id: userId },
          innovation: { id: innovationId },
          message: action.comment,
          innovationAction: { id: innovationAction.id },
          createdBy: userId,
          updatedBy: userId,
        });
        await transactionManager.save(Comment, comment);
      }

      innovationAction.status = action.status;
      innovationAction.updatedBy = userId;

      return await transactionManager.save(InnovationAction, innovationAction);
    });
  }

  private async findOne(id: string): Promise<InnovationAction> {
    const filterOptions = {
      relations: [
        "innovationSection",
        "innovationSupport",
        "innovationSupport.organisationUnit",
        "innovationSupport.organisationUnit.organisation",
      ],
    };

    return await this.actionRepo.findOne(id, filterOptions);
  }

  private getActionDisplayId(section: string, counter: number) {
    const alias = InnovationSectionAliasCatalogue[section] || "ZZ";
    return alias + (++counter).toString().slice(-2).padStart(2, "0");
  }

  private getFilterStatusByOpen(openActions: boolean) {
    if (openActions) {
      return [
        `'${InnovationActionStatus.IN_REVIEW}'`,
        `'${InnovationActionStatus.REQUESTED}'`,
        `'${InnovationActionStatus.CONTINUE}'`,
        `'${InnovationActionStatus.STARTED}'`,
      ];
    } else {
      return [
        `'${InnovationActionStatus.COMPLETED}'`,
        `'${InnovationActionStatus.DECLINED}'`,
        `'${InnovationActionStatus.DELETED}'`,
      ];
    }
  }
}