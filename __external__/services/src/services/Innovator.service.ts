import {
  Innovation,
  InnovationStatus,
  InnovationTransferStatus,
  InnovatorOrganisationRole,
  Organisation,
  OrganisationType,
  OrganisationUser,
  User,
  UserType,
} from "@domain/index";
import { Connection, getConnection } from "typeorm";
import { TransactionResult } from "../models/InnovatorTransactionResult";
import { BaseService } from "./Base.service";
import { InnovationTransferService } from "./InnovationTransfer.service";

export class InnovatorService extends BaseService<User> {
  private readonly connection: Connection;
  private readonly innovationTransferService: InnovationTransferService;

  constructor(connectionName?: string) {
    super(User, connectionName);
    this.connection = getConnection(connectionName);
    this.innovationTransferService = new InnovationTransferService(
      connectionName
    );
  }

  async create(user: User): Promise<User> {
    user.type = UserType.INNOVATOR;
    return super.create(user);
  }

  async findAll(filter?: any): Promise<User[]> {
    filter = filter || {};
    filter.type = UserType.INNOVATOR;

    return await this.repository.find(filter);
  }

  async createFirstTimeSignIn(
    innovator: User,
    innovation: Innovation,
    organisation: Organisation
  ): Promise<TransactionResult> {
    const queryRunner = this.connection.createQueryRunner();

    await queryRunner.connect();

    await queryRunner.startTransaction();
    let result: TransactionResult;

    try {
      innovator.type = UserType.INNOVATOR;
      const _innovator = await queryRunner.manager.save(innovator);
      innovation.owner = _innovator;
      innovation.createdBy = _innovator.id;
      innovation.updatedBy = _innovator.id;
      innovation.status = InnovationStatus.CREATED;

      organisation.type = OrganisationType.INNOVATOR;
      organisation.createdBy = _innovator.id;
      organisation.updatedBy = _innovator.id;

      const _organisation = await queryRunner.manager.save(organisation);
      const _innovation = await queryRunner.manager.save(innovation);

      const organisationUser: OrganisationUser = OrganisationUser.new({
        organisation: _organisation,
        user: _innovator,
        role: InnovatorOrganisationRole.INNOVATOR_OWNER,
        createdBy: _innovator.id,
        updatedBy: _innovator.id,
      });

      await queryRunner.manager.save(organisationUser);

      await queryRunner.commitTransaction();

      result = {
        user: {
          id: _innovator.id,
          type: _innovator.type,
        },
        organisation: _organisation,
        innovation: _innovation,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }

    return result;
  }

  async createFirstTimeSignInTransfer(
    innovator: User,
    organisation: Organisation,
    transferId: string
  ) {
    await this.innovationTransferService.checkOne(transferId);

    const queryRunner = this.connection.createQueryRunner();

    await queryRunner.connect();

    await queryRunner.startTransaction();
    let result: TransactionResult;

    try {
      innovator.type = UserType.INNOVATOR;
      const _innovator = await queryRunner.manager.save(innovator);

      organisation.type = OrganisationType.INNOVATOR;
      organisation.createdBy = _innovator.id;
      organisation.updatedBy = _innovator.id;

      const _organisation = await queryRunner.manager.save(organisation);

      const organisationUser: OrganisationUser = OrganisationUser.new({
        organisation: _organisation,
        user: _innovator,
        role: InnovatorOrganisationRole.INNOVATOR_OWNER,
        createdBy: _innovator.id,
        updatedBy: _innovator.id,
      });

      await queryRunner.manager.save(organisationUser);

      await queryRunner.commitTransaction();

      result = {
        user: {
          id: _innovator.id,
          type: _innovator.type,
        },
        organisation: _organisation,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }

    await this.innovationTransferService.updateStatus(
      {
        id: innovator.id,
        type: UserType.INNOVATOR,
      },
      transferId,
      InnovationTransferStatus.COMPLETED
    );

    return result;
  }
}
