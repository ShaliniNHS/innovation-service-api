import {
  InnovationEvidence,
  InnovationFile,
  InnovationSectionCatalogue,
  InnovationSectionStatus,
} from "@domain/index";
import { getConnection, getRepository, Repository } from "typeorm";
import { FileService } from "./File.service";
import { InnovationSectionService } from "./InnovationSection.service";

export class InnovationEvidenceService {
  private readonly evidenceRepo: Repository<InnovationEvidence>;
  private readonly fileService: FileService;
  private readonly sectionService: InnovationSectionService;

  constructor(connectionName?: string) {
    getConnection(connectionName);
    this.evidenceRepo = getRepository(InnovationEvidence, connectionName);
    this.fileService = new FileService(connectionName);
    this.sectionService = new InnovationSectionService(connectionName);
  }

  async find(id: string) {
    if (!id) {
      throw new Error("Invalid parameters. You must define id.");
    }

    const evidence = await this.findOne(id);
    if (!evidence) {
      return null;
    }

    const files = evidence.files
      ?.filter((obj: InnovationFile) => !obj.isDeleted)
      .map((obj: InnovationFile) => ({
        id: obj.id,
        displayFileName: obj.displayFileName,
        url: this.fileService.getDownloadUrl(obj.id, obj.displayFileName),
      }));

    return {
      ...evidence,
      files,
    };
  }

  async create(
    userId: string,
    evidence: any,
    section: InnovationSectionCatalogue
  ) {
    if (!evidence || !section) {
      throw new Error("Invalid parameters.");
    }

    await this.updateSectionStatus(evidence.innovation, section);

    evidence.files = evidence.files?.map((id: string) => ({ id }));
    evidence.createdBy = userId;
    evidence.updatedBy = userId;

    return await this.evidenceRepo.save(evidence);
  }

  async update(
    id: string,
    userId: string,
    evidence: any,
    section: InnovationSectionCatalogue
  ) {
    if (!id || !evidence || !section) {
      throw new Error("Invalid parameters.");
    }

    const evidenceDb = await this.findOne(id);
    if (!evidence) {
      throw new Error("Evidence not found!");
    }

    const deletedFiles = evidenceDb.files.filter(
      (obj: InnovationFile) => !evidence.files.includes(obj.id)
    );
    try {
      await this.fileService.deleteFiles(deletedFiles);
    } catch (error) {
      throw error;
    }

    evidence.files = evidence.files.map((id: string) => ({ id }));
    evidence.updatedBy = userId;

    return await this.evidenceRepo.save(evidence);
  }

  async delete(id: string, userId: string) {
    if (!id) {
      throw new Error("Invalid parameters.");
    }

    const evidence = await this.findOne(id);
    if (!evidence) {
      throw new Error("Evidence not found!");
    }
    evidence.updatedBy = userId;
    evidence.isDeleted = true;

    try {
      await this.fileService.deleteFiles(evidence.files);
    } catch (error) {
      throw error;
    }

    return await this.evidenceRepo.save(evidence);
  }

  private async findOne(id: string): Promise<InnovationEvidence> {
    const filterOptions = {
      relations: ["files", "innovation", "innovation.owner"],
      where: { isDeleted: false },
    };

    return await this.evidenceRepo.findOne(id, filterOptions);
  }

  private async updateSectionStatus(innovationId: string, section: string) {
    const sectionOptions = {
      where: {
        innovation: innovationId,
        section: section,
      },
    };

    const innovationSections = await this.sectionService.findAll(
      sectionOptions
    );

    if (innovationSections.length === 0) {
      throw new Error("Invalid section name.");
    }

    const innovationSection = innovationSections[0];
    innovationSection.status = InnovationSectionStatus.DRAFT;

    await this.sectionService.update(innovationSection.id, innovationSection);
  }
}