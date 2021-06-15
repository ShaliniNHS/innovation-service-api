import {
  AccessorOrganisationRole,
  ClinicalEvidenceTypeCatalogue,
  EvidenceTypeCatalogue,
  HasRegulationKnowledegeCatalogue,
  HasSubgroupsCatalogue,
  Comment,
  Innovation,
  InnovationArea,
  InnovationAreaCatalogue,
  InnovationCareSetting,
  InnovationCategory,
  InnovationCategoryCatalogue,
  InnovationClinicalArea,
  InnovationDeploymentPlan,
  InnovationEvidence,
  InnovationFile,
  InnovationRevenue,
  InnovationSection,
  InnovationSectionCatalogue,
  InnovationSectionStatus,
  InnovationStandard,
  InnovationStandardCatologue,
  InnovationStatus,
  InnovationSubgroup,
  InnovationUserTest,
  OrganisationType,
  StandardMetCatalogue,
  User,
  YesOrNoCatalogue,
  OrganisationUnitUser,
  OrganisationUnit,
  OrganisationUser,
  Organisation,
  InnovationAction,
  InnovationSupport,
} from "@domain/index";
import { InnovationSectionModel } from "@services/models/InnovationSectionModel";
import { getConnection } from "typeorm";
import { closeTestsConnection, setupTestsConnection } from "..";
import { FileService } from "../services/File.service";
import { InnovationSectionService } from "../services/InnovationSection.service";
import * as fixtures from "../__fixtures__";

describe("Innovation Section Service Suite", () => {
  let fileService: FileService;
  let innovationSectionService: InnovationSectionService;
  let innovatorUser: User;

  beforeAll(async () => {
    // await setupTestsConnection();
    fileService = new FileService(process.env.DB_TESTS_NAME);
    innovationSectionService = new InnovationSectionService(
      process.env.DB_TESTS_NAME
    );

    innovatorUser = await fixtures.createInnovatorUser();
  });

  afterAll(async () => {
    const query = getConnection(process.env.DB_TESTS_NAME)
      .createQueryBuilder()
      .delete();

    await query.from(User).execute();
    // closeTestsConnection();
  });

  afterEach(async () => {
    const query = getConnection(process.env.DB_TESTS_NAME)
      .createQueryBuilder()
      .delete();

    await query.from(Comment).execute();
    await query.from(InnovationDeploymentPlan).execute();
    await query.from(InnovationRevenue).execute();
    await query.from(InnovationUserTest).execute();
    await query.from(InnovationStandard).execute();
    await query.from(InnovationFile).execute();
    await query.from(InnovationArea).execute();
    await query.from(InnovationCareSetting).execute();
    await query.from(InnovationCategory).execute();
    await query.from(InnovationClinicalArea).execute();
    await query.from(InnovationEvidence).execute();
    await query.from(InnovationSubgroup).execute();
    await query.from(InnovationAction).execute();
    await query.from(InnovationSection).execute();
    await query.from(InnovationSupport).execute();
    await query.from(OrganisationUnitUser).execute();
    await query.from(OrganisationUnit).execute();
    await query.from(OrganisationUser).execute();
    await query.from(Organisation).execute();
    await query.from(Innovation).execute();
  });

  it("should instantiate the innovation section service", async () => {
    expect(innovationSectionService).toBeDefined();
  });

  it("should find all innovation sections with all properties", async () => {
    const sectionObj = InnovationSection.new({
      section: InnovationSectionCatalogue.INNOVATION_DESCRIPTION,
      status: InnovationSectionStatus.DRAFT,
    });

    const innovationObj = fixtures.generateInnovation({
      owner: innovatorUser,
      surveyId: "abc",
      sections: [sectionObj],
      status: InnovationStatus.IN_PROGRESS,
    });
    const innovation = await fixtures.saveInnovation(innovationObj);

    // Act
    const result = await innovationSectionService.findAllInnovationSections(
      innovation.id,
      innovatorUser.id
    );

    // Assert
    expect(result).toBeDefined();
    expect(result.sections.length).toEqual(14);
  });

  it("should throw when id is null in findAllInnovationSections()", async () => {
    let err;
    try {
      await innovationSectionService.findAllInnovationSections(null, null);
    } catch (error) {
      err = error;
    }

    expect(err).toBeDefined();
    expect(err.message).toContain(
      "Invalid parameters. You must define the innovation id and the userId."
    );
  });

  it("should throw when user id or innovator id are invalid in findAllInnovationSections()", async () => {
    let err;
    try {
      await innovationSectionService.findAllInnovationSections(
        "D58C433E-F36B-1410-80E0-0032FE5B194B",
        "invalid"
      );
    } catch (error) {
      err = error;
    }

    expect(err).toBeDefined();
    expect(err.message).toContain(
      "Invalid parameters. Innovation not found for the user."
    );
  });

  it("should get a specific innovation section with all dependencies", async () => {
    const category = InnovationCategory.new({
      type: InnovationCategoryCatalogue.AI,
      deletedAt: new Date(),
    });

    const category2 = InnovationCategory.new({
      type: InnovationCategoryCatalogue.EDUCATION,
    });

    const subgroup = InnovationSubgroup.new({
      name: "subgroup test",
      conditions: "subgroup conditions",
      benefits: "subgroup benefits",
    });

    const evidence = InnovationEvidence.new({
      name: "evidence test",
      summary: "summary",
      evidenceType: EvidenceTypeCatalogue.CLINICAL,
      clinicalEvidenceType: ClinicalEvidenceTypeCatalogue.OTHER,
      description: "other description",
    });

    const innovationObj = fixtures.generateInnovation({
      owner: innovatorUser,
      surveyId: "abc",
      hasSubgroups: HasSubgroupsCatalogue.YES,
      status: InnovationStatus.IN_PROGRESS,
      subgroups: [subgroup],
      evidence: [evidence],
      categories: [category, category2],
    });
    const innovation = await fixtures.saveInnovation(innovationObj);

    // Act
    const result = await innovationSectionService.findSection(
      innovation.id,
      innovatorUser.id,
      InnovationSectionCatalogue.UNDERSTANDING_OF_BENEFITS
    );

    // Assert
    expect(result).toBeDefined();
  });

  it("should get a specific innovation section with all types", async () => {
    const category = InnovationCategory.new({
      type: InnovationCategoryCatalogue.AI,
      deletedAt: new Date(),
    });

    const category2 = InnovationCategory.new({
      type: InnovationCategoryCatalogue.EDUCATION,
    });

    const subgroup = InnovationSubgroup.new({
      name: "subgroup test",
      conditions: "subgroup conditions",
      benefits: "subgroup benefits",
    });

    const innovationObj = fixtures.generateInnovation({
      owner: innovatorUser,
      surveyId: "abc",
      hasSubgroups: HasSubgroupsCatalogue.YES,
      status: InnovationStatus.IN_PROGRESS,
      subgroups: [subgroup],
      categories: [category, category2],
    });
    const innovation = await fixtures.saveInnovation(innovationObj);

    const file = await fileService.getUploadUrl(
      "test.txt",
      innovation.id,
      "INNOVATION_EVIDENCE"
    );

    await innovationSectionService.saveSection(
      innovation.id,
      innovatorUser.id,
      InnovationSectionCatalogue.EVIDENCE_OF_EFFECTIVENESS,
      {
        hasEvidence: YesOrNoCatalogue.YES,
        evidence: [
          {
            evidenceType: EvidenceTypeCatalogue.CLINICAL,
            clinicalEvidenceType: ClinicalEvidenceTypeCatalogue.OTHER,
            description: "other description",
            summary: "my summary",
            files: [file.id],
          },
        ],
      }
    );

    // Act
    const result = await innovationSectionService.findSection(
      innovation.id,
      innovatorUser.id,
      InnovationSectionCatalogue.EVIDENCE_OF_EFFECTIVENESS
    );

    // Assert
    expect(result).toBeDefined();
  });

  it("should throw when id is null in findSection()", async () => {
    let err;
    try {
      await innovationSectionService.findSection(null, null, null);
    } catch (error) {
      err = error;
    }

    expect(err).toBeDefined();
    expect(err.message).toContain(
      "Invalid parameters. You must define innovation id and section."
    );
  });

  it("should throw when innovation id invalid in findSection()", async () => {
    let err;
    try {
      await innovationSectionService.findSection(
        "D58C433E-F36B-1410-80E0-0032FE5B194B",
        "T85C433E-F36B-1410-80E0-0032FE5B194B",
        InnovationSectionCatalogue.INNOVATION_DESCRIPTION
      );
    } catch (error) {
      err = error;
    }

    expect(err).toBeDefined();
    expect(err.message).toContain("Invalid parameters. Innovation not found.");
  });

  it("should throw when section code is invalid in findSection()", async () => {
    let err;
    try {
      await innovationSectionService.findSection(
        "D58C433E-F36B-1410-80E0-0032FE5B194B",
        "T85C433E-F36B-1410-80E0-0032FE5B194B",
        "invalid"
      );
    } catch (error) {
      err = error;
    }

    expect(err).toBeDefined();
    expect(err.message).toContain("Invalid parameters. Section not found.");
  });

  it("should save UNDERSTANDING_OF_NEEDS section with correct properties", async () => {
    const sectionObj = InnovationSection.new({
      section: InnovationSectionCatalogue.INNOVATION_DESCRIPTION,
      status: InnovationSectionStatus.DRAFT,
    });

    const innovationObj = fixtures.generateInnovation({
      owner: innovatorUser,
      name: "My Innovation",
      surveyId: "abc",
      hasSubgroups: HasSubgroupsCatalogue.NO,
      status: InnovationStatus.IN_PROGRESS,
      sections: [sectionObj],
    });
    const innovation = await fixtures.saveInnovation(innovationObj);

    // Act
    const result = await innovationSectionService.saveSection(
      innovation.id,
      innovatorUser.id,
      InnovationSectionCatalogue.UNDERSTANDING_OF_NEEDS,
      {
        hasSubgroups: HasSubgroupsCatalogue.YES,
        subgroups: [
          InnovationSubgroup.new({
            name: "subgroup test",
            conditions: "subgroup conditions",
            benefits: "subgroup benefits",
          }),
        ],
        name: "should not update name",
      }
    );

    const sections = await result.sections;
    const subgroups = await result.subgroups;

    // Assert
    expect(sections.length).toEqual(2);
    expect(subgroups.length).toEqual(1);
    expect(result.name).toEqual("My Innovation");
    expect(subgroups[0].name).toEqual("subgroup test");
  });

  it("should save UNDERSTANDING_OF_BENEFITS section with correct properties", async () => {
    const subgroup = InnovationSubgroup.new({
      name: "subgroup test",
      conditions: "subgroup conditions",
    });

    const innovationObj = fixtures.generateInnovation({
      owner: innovatorUser,
      name: "My Innovation",
      surveyId: "abc",
      hasSubgroups: HasSubgroupsCatalogue.YES,
      hasBenefits: YesOrNoCatalogue.YES,
      status: InnovationStatus.IN_PROGRESS,
      subgroups: [subgroup],
    });
    const innovation = await fixtures.saveInnovation(innovationObj);
    let subgroups = await innovation.subgroups;

    // Act
    const result = await innovationSectionService.saveSection(
      innovation.id,
      innovatorUser.id,
      InnovationSectionCatalogue.UNDERSTANDING_OF_BENEFITS,
      {
        hasBenefits: YesOrNoCatalogue.YES,
        benefits: "innovation benefits",
        subgroups: [
          {
            id: subgroups[0].id,
            conditions: "subgroup conditions",
            benefits: "subgroup benefits",
          },
        ],
        name: "should not update name",
      }
    );

    const sections = await result.sections;
    subgroups = await result.subgroups;

    // Assert
    expect(result.name).toEqual("My Innovation");
    expect(subgroups[0].benefits).toEqual("subgroup benefits");
    expect(sections.length).toEqual(1);
    expect(subgroups.length).toEqual(1);
  });

  it("should save EVIDENCE_OF_EFFECTIVENESS section with correct properties", async () => {
    const innovationObj = fixtures.generateInnovation({
      owner: innovatorUser,
      name: "My Innovation",
      surveyId: "abc",
      hasSubgroups: HasSubgroupsCatalogue.YES,
      hasEvidence: YesOrNoCatalogue.NO,
      status: InnovationStatus.IN_PROGRESS,
    });
    const innovation = await fixtures.saveInnovation(innovationObj);

    // Act
    const result = await innovationSectionService.saveSection(
      innovation.id,
      innovatorUser.id,
      InnovationSectionCatalogue.EVIDENCE_OF_EFFECTIVENESS,
      {
        hasEvidence: YesOrNoCatalogue.YES,
      }
    );

    const sections = await result.sections;

    // Assert
    expect(result.name).toEqual("My Innovation");
    expect(result.hasEvidence).toEqual(YesOrNoCatalogue.YES);
    expect(sections.length).toEqual(1);
  });

  it("should save INNOVATION_DESCRIPTION section with correct properties", async () => {
    const innovationObj = fixtures.generateInnovation({
      owner: innovatorUser,
      name: "My Innovation",
      surveyId: "abc",
      hasFinalProduct: YesOrNoCatalogue.NO,
      hasSubgroups: HasSubgroupsCatalogue.YES,
      hasEvidence: YesOrNoCatalogue.NO,
      status: InnovationStatus.IN_PROGRESS,
    });
    const innovation = await fixtures.saveInnovation(innovationObj);

    // Act
    const result = await innovationSectionService.saveSection(
      innovation.id,
      innovatorUser.id,
      InnovationSectionCatalogue.INNOVATION_DESCRIPTION,
      {
        name: "should not update name",
        description: "description save",
        hasFinalProduct: YesOrNoCatalogue.YES,
        categories: [InnovationCategoryCatalogue.OTHER],
        otherCategoryDescription: "Other",
        areas: [InnovationAreaCatalogue.COVID_19],
        clinicalAreas: [],
        careSettings: [],
        mainPurpose: "main purpose",
      }
    );

    const categories = await result.categories;
    const areas = await result.areas;

    // Assert
    expect(result.name).toEqual("My Innovation");
    expect(result.hasFinalProduct).toEqual(YesOrNoCatalogue.YES);
    expect(categories.length).toEqual(1);
    expect(areas.length).toEqual(1);
  });

  it("should save REGULATIONS_AND_STANDARDS section with correct properties", async () => {
    const innovationObj = fixtures.generateInnovation({
      owner: innovatorUser,
      name: "My Innovation",
      surveyId: "abc",
      hasFinalProduct: YesOrNoCatalogue.NO,
      hasSubgroups: HasSubgroupsCatalogue.YES,
      hasEvidence: YesOrNoCatalogue.NO,
      status: InnovationStatus.IN_PROGRESS,
    });
    const innovation = await fixtures.saveInnovation(innovationObj);

    const file = await fileService.getUploadUrl(
      "test.txt",
      innovation.id,
      "INNOVATION_EVIDENCE"
    );

    // Act
    await innovationSectionService.saveSection(
      innovation.id,
      innovatorUser.id,
      InnovationSectionCatalogue.REGULATIONS_AND_STANDARDS,
      {
        hasRegulationKnowledge: HasRegulationKnowledegeCatalogue.YES_ALL,
        hasOtherIntellectual: "cenas variadas",
        standards: [
          {
            type: InnovationStandardCatologue.CE_UKCA_CLASS_I,
            hasMet: StandardMetCatalogue.IN_PROGRESS,
          },
        ],
        files: [file.id],
      }
    );

    // Act
    const result = await innovationSectionService.findSection(
      innovation.id,
      innovatorUser.id,
      InnovationSectionCatalogue.REGULATIONS_AND_STANDARDS
    );

    // Assert
    expect(result).toBeDefined();
  });

  it("should throw when id is null in saveSection()", async () => {
    let err;
    try {
      await innovationSectionService.saveSection(null, null, null, null);
    } catch (error) {
      err = error;
    }

    expect(err).toBeDefined();
    expect(err.message).toContain("Invalid parameters.");
  });

  it("should throw when innovation id invalid in saveSection()", async () => {
    let err;
    try {
      await innovationSectionService.saveSection(
        "D58C433E-F36B-1410-80E0-0032FE5B194B",
        "D58C433E-F36B-1410-80E0-0032FE5B194B",
        InnovationSectionCatalogue.INNOVATION_DESCRIPTION,
        {}
      );
    } catch (error) {
      err = error;
    }

    expect(err).toBeDefined();
    expect(err.message).toContain(
      "Invalid parameters. Innovation not found for the user."
    );
  });

  it("should throw when section code is invalid in saveSection()", async () => {
    let err;
    try {
      await innovationSectionService.saveSection(
        "D58C433E-F36B-1410-80E0-0032FE5B194B",
        "D58C433E-F36B-1410-80E0-0032FE5B194B",
        "invalid",
        {}
      );
    } catch (error) {
      err = error;
    }

    expect(err).toBeDefined();
    expect(err.message).toContain("Invalid parameters. Section not found.");
  });

  it("should submmit sections with correct properties without actions", async () => {
    const sectionObj = InnovationSection.new({
      section: InnovationSectionCatalogue.INNOVATION_DESCRIPTION,
      status: InnovationSectionStatus.DRAFT,
    });

    const innovationObj = fixtures.generateInnovation({
      owner: innovatorUser,
      name: "My Innovation",
      surveyId: "abc",
      hasSubgroups: HasSubgroupsCatalogue.NO,
      status: InnovationStatus.IN_PROGRESS,
      sections: [sectionObj],
    });
    const innovation = await fixtures.saveInnovation(innovationObj);

    // Act
    await innovationSectionService.submitSections(
      innovation.id,
      innovatorUser.id,
      [
        InnovationSectionCatalogue.INNOVATION_DESCRIPTION,
        InnovationSectionCatalogue.UNDERSTANDING_OF_NEEDS,
      ]
    );

    const result = await innovationSectionService.findAllInnovationSections(
      innovation.id,
      innovatorUser.id
    );
    const count = result.sections.reduce(
      (counter: number, obj: InnovationSectionModel) => {
        if (obj.status === InnovationSectionStatus.SUBMITTED) counter += 1;
        return counter;
      },
      0
    );

    // Assert
    expect(count).toEqual(2);
  });

  it("should submmit sections with correct properties with actions", async () => {
    const sectionObj = InnovationSection.new({
      section: InnovationSectionCatalogue.INNOVATION_DESCRIPTION,
      status: InnovationSectionStatus.DRAFT,
    });

    const qualAccessorUser = await fixtures.createAccessorUser();
    const accessorOrganisation = await fixtures.createOrganisation(
      OrganisationType.ACCESSOR
    );
    const qAccessorUserOrganisation = await fixtures.addUserToOrganisation(
      qualAccessorUser,
      accessorOrganisation,
      AccessorOrganisationRole.QUALIFYING_ACCESSOR
    );
    const organisationUnit = await fixtures.createOrganisationUnit(
      accessorOrganisation
    );
    const organisationQuaAccessorUnitUser = await fixtures.addOrganisationUserToOrganisationUnit(
      qAccessorUserOrganisation,
      organisationUnit
    );
    const qAccessorUserOrganisations = await fixtures.findUserOrganisations(
      qualAccessorUser.id
    );

    const innovationObj = fixtures.generateInnovation({
      owner: innovatorUser,
      name: "My Innovation",
      surveyId: "abc",
      hasSubgroups: HasSubgroupsCatalogue.NO,
      status: InnovationStatus.IN_PROGRESS,
      sections: [sectionObj],
      organisationShares: [accessorOrganisation],
    });
    const innovation = await fixtures.saveInnovation(innovationObj);

    await fixtures.createSupportInInnovation(
      innovation,
      qualAccessorUser,
      qAccessorUserOrganisations[0],
      organisationQuaAccessorUnitUser
    );
    await fixtures.createInnovationAction(
      innovation,
      qualAccessorUser,
      qAccessorUserOrganisations[0]
    );

    // Act
    await innovationSectionService.submitSections(
      innovation.id,
      innovatorUser.id,
      [
        InnovationSectionCatalogue.INNOVATION_DESCRIPTION,
        InnovationSectionCatalogue.UNDERSTANDING_OF_NEEDS,
      ]
    );

    const result = await innovationSectionService.findAllInnovationSections(
      innovation.id,
      innovatorUser.id
    );
    const count = result.sections.reduce(
      (counter: number, obj: InnovationSectionModel) => {
        if (obj.status === InnovationSectionStatus.SUBMITTED) counter += 1;
        return counter;
      },
      0
    );

    // Assert
    expect(count).toEqual(2);
  });

  it("should throw when id is null in submitSections()", async () => {
    let err;
    try {
      await innovationSectionService.submitSections(null, null, null);
    } catch (error) {
      err = error;
    }

    expect(err).toBeDefined();
    expect(err.message).toContain("Invalid parameters.");
  });

  it("should throw when innovation id invalid in submitSections()", async () => {
    let err;
    try {
      await innovationSectionService.submitSections(
        "D58C433E-F36B-1410-80E0-0032FE5B194B",
        "D58C433E-F36B-1410-80E0-0032FE5B194B",
        [InnovationSectionCatalogue.INNOVATION_DESCRIPTION]
      );
    } catch (error) {
      err = error;
    }

    expect(err).toBeDefined();
    expect(err.message).toContain(
      "Invalid parameters. Innovation not found for the user."
    );
  });
});
