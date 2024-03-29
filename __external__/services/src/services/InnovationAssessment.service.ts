import { EmailNotificationTemplate } from "@domain/enums/email-notifications.enum";
import {
  Comment,
  Innovation,
  InnovationAssessment,
  InnovationStatus,
  NotificationAudience,
  NotificationContextType,
  OrganisationUnit,
  UserType,
} from "@domain/index";
import {
  InnovationNotFoundError,
  InvalidParamsError,
  ResourceNotFoundError,
} from "@services/errors";
import { RequestUser } from "@services/models/RequestUser";
import { Connection, getConnection, getRepository, Repository } from "typeorm";
import {
  checkIfValidUUID,
  getOrganisationsFromOrganisationUnitsObj,
} from "../helpers";
import { InnovationAssessmentResult } from "../models/InnovationAssessmentResult";
import { InnovationService } from "./Innovation.service";
import { LoggerService } from "./Logger.service";
import { NotificationService } from "./Notification.service";
import { OrganisationService } from "./Organisation.service";
import { UserService } from "./User.service";

export class InnovationAssessmentService {
  private readonly connection: Connection;
  private readonly assessmentRepo: Repository<InnovationAssessment>;
  private readonly userService: UserService;
  private readonly innovationService: InnovationService;
  private readonly notificationService: NotificationService;
  private readonly logService: LoggerService;
  private readonly organisationService: OrganisationService;

  constructor(connectionName?: string) {
    this.connection = getConnection(connectionName);
    this.assessmentRepo = getRepository(InnovationAssessment, connectionName);
    this.userService = new UserService(connectionName);
    this.innovationService = new InnovationService(connectionName);
    this.notificationService = new NotificationService(connectionName);
    this.logService = new LoggerService();
    this.organisationService = new OrganisationService(connectionName);
  }

  async find(
    requestUser: RequestUser,
    id: string,
    innovationId: string
  ): Promise<InnovationAssessmentResult> {
    if (
      !requestUser ||
      !id ||
      !innovationId ||
      !checkIfValidUUID(id) ||
      !checkIfValidUUID(innovationId)
    ) {
      throw new InvalidParamsError("Invalid parameters.");
    }

    if (requestUser.type !== UserType.ASSESSMENT) {
      const innovation = await this.innovationService.findInnovation(
        requestUser,
        innovationId
      );

      if (!innovation) {
        throw new InnovationNotFoundError("Innovation not found for the user.");
      }
    }

    const assessment = await this.findOne(id, innovationId);
    if (!assessment) {
      throw new ResourceNotFoundError("Assessment not found!");
    }

    const b2cUsers = await this.userService.getListOfUsers([
      assessment.assignTo.id,
      assessment.createdBy,
      assessment.updatedBy,
    ]);
    const b2cUserNames = b2cUsers.reduce((map, obj) => {
      map[obj.id] = obj.displayName;
      return map;
    }, {});

    const organisations =
      assessment.organisationUnits.length > 0
        ? getOrganisationsFromOrganisationUnitsObj(assessment.organisationUnits)
        : [];

    return {
      id: assessment.id,
      description: assessment.description,
      assignToName: b2cUserNames[assessment.assignTo.id],
      createdBy: b2cUserNames[assessment.createdBy],
      createdAt: assessment.createdAt,
      updatedBy: b2cUserNames[assessment.updatedBy],
      updatedAt: assessment.updatedAt,
      innovation: {
        id: assessment.innovation.id,
        name: assessment.innovation.name,
      },
      summary: assessment.summary,
      finishedAt: assessment.finishedAt,
      maturityLevel: assessment.maturityLevel,
      hasRegulatoryApprovals: assessment.hasRegulatoryApprovals,
      hasRegulatoryApprovalsComment: assessment.hasRegulatoryApprovalsComment,
      hasEvidence: assessment.hasEvidence,
      hasEvidenceComment: assessment.hasEvidenceComment,
      hasValidation: assessment.hasValidation,
      hasValidationComment: assessment.hasValidationComment,
      hasProposition: assessment.hasProposition,
      hasPropositionComment: assessment.hasPropositionComment,
      hasCompetitionKnowledge: assessment.hasCompetitionKnowledge,
      hasCompetitionKnowledgeComment: assessment.hasCompetitionKnowledgeComment,
      hasImplementationPlan: assessment.hasImplementationPlan,
      hasImplementationPlanComment: assessment.hasImplementationPlanComment,
      hasScaleResource: assessment.hasScaleResource,
      hasScaleResourceComment: assessment.hasScaleResourceComment,
      organisations,
    };
  }

  async create(
    requestUser: RequestUser,
    innovationId: string,
    assessment: any
  ) {
    if (!requestUser || !assessment) {
      throw new InvalidParamsError("Invalid parameters.");
    }

    return await this.connection.transaction(async (transactionManager) => {
      if (assessment.comment) {
        const comment = Comment.new({
          user: { id: requestUser.id },
          innovation: { id: innovationId },
          message: assessment.comment,
          createdBy: requestUser.id,
          updatedBy: requestUser.id,
        });
        await transactionManager.save(Comment, comment);
      }

      await transactionManager.update(
        Innovation,
        { id: innovationId },
        { status: InnovationStatus.NEEDS_ASSESSMENT }
      );

      const assessmentObj = InnovationAssessment.new({
        description: assessment.description,
        innovation: { id: innovationId },
        assignTo: requestUser.id,
        createdBy: requestUser.id,
        updatedBy: requestUser.id,
      });

      return await transactionManager.save(InnovationAssessment, assessmentObj);
    });
  }

  async update(
    requestUser: RequestUser,
    id: string,
    innovationId: string,
    assessment: any
  ) {
    if (!id || !requestUser || !assessment) {
      throw new InvalidParamsError("Invalid parameters.");
    }

    const assessmentDb = await this.findOne(id, innovationId);
    if (!assessmentDb) {
      throw new ResourceNotFoundError("Assessment not found!");
    }

    // Current organisation Units suggested on the assessment (most of the times will be none)
    const currentUnits = assessmentDb.organisationUnits?.map((u) => u.id) || [];

    // Obtains organisation's units that the innovator agreed to share his innovation with
    const innovationOrganisationUnitShares = await this.innovationService.getOrganisationUnitShares(
      requestUser,
      innovationId
    );

    let organisationSuggestionsDiff = [];

    if (assessment.organisationUnits) {
      // gets the difference between the currentUnits on the assessment and the units being suggested by this assessment update
      // most of the times it will be a 100% diff.
      organisationSuggestionsDiff = assessment.organisationUnits.filter(
        (ou) => !currentUnits.includes(ou)
      );
    }

    let suggestedOrganisationUnits;

    const result = await this.connection.transaction(
      async (transactionManager) => {
        if (assessment.isSubmission && !assessmentDb.finishedAt) {
          assessmentDb.finishedAt = new Date();

          await transactionManager.update(
            Innovation,
            { id: innovationId },
            { status: InnovationStatus.IN_PROGRESS, updatedBy: requestUser.id }
          );
        }

        delete assessment["innovation"];
        for (const key in assessmentDb) {
          if (key in assessment) {
            assessmentDb[key] = assessment[key];
          }
        }
        assessmentDb.updatedBy = requestUser.id;
        assessmentDb.organisationUnits = assessment.organisationUnits?.map(
          (id: string) => ({ id })
        );

        suggestedOrganisationUnits = assessmentDb.organisationUnits;
        return await transactionManager.save(assessmentDb);
      }
    );

    if (assessment.isSubmission) {
      try {
        await this.notificationService.create(
          requestUser,
          NotificationAudience.QUALIFYING_ACCESSORS,
          innovationId,
          NotificationContextType.INNOVATION,
          innovationId,
          `Innovation with id ${innovationId} is now available for Qualifying Accessors`
        );
      } catch (error) {
        this.logService.error(
          `An error has occured while creating a notification of type ${NotificationContextType.INNOVATION} from ${requestUser.id}`,
          error
        );
      }

      try {
        // maps the units object to only the unit id
        const units = suggestedOrganisationUnits.map((u) => u.id);

        // gets the qualifying accessors from the organisation units
        const qualifyingAccessors = await this.organisationService.findQualifyingAccessorsFromUnits(
          units,
          innovationId
        );

        // sends an email notification to those Qualifying Accessors
        await this.notificationService.sendEmail(
          requestUser,
          EmailNotificationTemplate.QA_ORGANISATION_SUGGESTED,
          innovationId,
          innovationId,
          qualifyingAccessors
        );
      } catch (error) {
        this.logService.error(
          `An error has occured while sending an email of type ${EmailNotificationTemplate.QA_ORGANISATION_SUGGESTED}`,
          error
        );
      }

      // removes the units that the Innovator agreed to share his innovation with from the suggestions
      organisationSuggestionsDiff = organisationSuggestionsDiff.filter(
        (ou) => !innovationOrganisationUnitShares.includes(ou)
      );

      // if there are still any suggestions unmatched with the innovation data sharing, then create a notification for the innovator.
      if (
        organisationSuggestionsDiff &&
        organisationSuggestionsDiff.length > 0
      ) {
        try {
          await this.notificationService.create(
            requestUser,
            NotificationAudience.INNOVATORS,
            innovationId,
            NotificationContextType.DATA_SHARING,
            innovationId,
            `Innovation with id ${innovationId} has received Data sharing suggestions from the needs assessment team`
          );
        } catch (error) {
          this.logService.error(
            `An error has occured while creating a notification of type ${NotificationContextType.DATA_SHARING} from ${requestUser.id}`,
            error
          );
        }
      }
    }

    return result;
  }

  async findOne(
    id?: string,
    innovationId?: string
  ): Promise<InnovationAssessment> {
    const filterOptions = {
      where: { innovation: innovationId },
      relations: [
        "organisationUnits",
        "organisationUnits.organisation",
        "innovation",
        "assignTo",
      ],
    };

    return await this.assessmentRepo.findOne(id, filterOptions);
  }
}
