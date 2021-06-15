import {
  Comment,
  InnovationAction,
  InnovationActionStatus,
  InnovationSupport,
  InnovationSectionAliasCatalogue,
  OrganisationUser,
} from "@domain/index";
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
      throw new Error("Invalid parameters.");
    }

    if (!userOrganisations || userOrganisations.length == 0) {
      throw new Error("Invalid user. User has no organisations.");
    }

    // BUSINESS RULE: An accessor has only one organization
    const userOrganisation = userOrganisations[0];

    if (
      !userOrganisation.userOrganisationUnits ||
      userOrganisation.userOrganisationUnits.length == 0
    ) {
      throw new Error("Invalid user. User has no organisation units.");
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
      throw new Error("Invalid parameters. Innovation not found for the user.");
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
      throw new Error("Invalid parameters. Innovation Support not found.");
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

  async update(
    id: string,
    userId: string,
    innovationId: string,
    action: any,
    userOrganisations: OrganisationUser[]
  ) {
    if (!id || !userId || !action) {
      throw new Error("Invalid parameters.");
    }

    if (!userOrganisations || userOrganisations.length == 0) {
      throw new Error("Invalid user. User has no organisations.");
    }

    // BUSINESS RULE: An accessor has only one organization
    const userOrganisation = userOrganisations[0];

    if (
      !userOrganisation.userOrganisationUnits ||
      userOrganisation.userOrganisationUnits.length == 0
    ) {
      throw new Error("Invalid user. User has no organisation units.");
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
      throw new Error("Invalid parameters. Innovation not found for the user.");
    }

    const innovationAction = await this.findOne(id);
    if (
      !innovationAction ||
      innovationAction.innovationSupport.organisationUnit.id !==
        organisationUnit.id
    ) {
      throw new Error("Invalid action data.");
    }

    return await this.connection.transaction(async (transactionManager) => {
      if (action.comment) {
        const comment = Comment.new({
          user: { id: userId },
          innovation: innovation,
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

  async find(
    id: string,
    userId: string,
    innovationId: string,
    userOrganisations?: OrganisationUser[]
  ): Promise<InnovationActionModel> {
    if (!userId || !innovationId) {
      throw new Error("Invalid parameters.");
    }

    const innovation = await this.innovationService.findInnovation(
      innovationId,
      userId,
      null,
      userOrganisations
    );
    if (!innovation) {
      throw new Error("Invalid parameters. Innovation not found for the user.");
    }

    const innovationAction = await this.findOne(id);
    if (!innovationAction) {
      throw new Error("Invalid parameters. Innovation action not found.");
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

  async findAllByInnovation(
    userId: string,
    innovationId: string,
    userOrganisations?: OrganisationUser[]
  ): Promise<InnovationActionModel[]> {
    if (!userId || !innovationId) {
      throw new Error("Invalid parameters.");
    }

    const innovation = await this.innovationService.findInnovation(
      innovationId,
      userId,
      null,
      userOrganisations
    );
    if (!innovation) {
      throw new Error("Invalid parameters. Innovation not found for the user.");
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
}
