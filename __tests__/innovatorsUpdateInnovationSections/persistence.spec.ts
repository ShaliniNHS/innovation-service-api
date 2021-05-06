import * as persistence from "../../innovatorsUpdateInnovationSections/persistence";
import {
  InnovationSectionCatalogue,
  InnovationSectionService,
} from "nhs-aac-domain-services";
import * as typeorm from "typeorm";
import { CustomContext } from "../../utils/types";

describe("[innovatorsUpdateInnovationSection] Persistence suite", () => {
  describe("updateInnovationSection", () => {
    it("should update an innovation section", async () => {
      // Arrange
      spyOn(typeorm, "getRepository");
      spyOn(typeorm, "getConnection");
      const spy = spyOn(
        InnovationSectionService.prototype,
        "saveSection"
      ).and.returnValue([{ section: "SECTION", data: {} }]);

      const ctx = {
        services: {
          InnovationSectionService: new InnovationSectionService(),
        },
        auth: {
          userOrganisations: [],
        },
      };
      // Act
      await persistence.updateInnovationSection(
        ctx as CustomContext,
        "E362433E-F36B-1410-80DE-0032FE5B194B",
        "test_innovator_id",
        InnovationSectionCatalogue.INNOVATION_DESCRIPTION,
        {
          description: "bbb",
          otherCategoryDescription: null,
          hasFinalProduct: null,
          mainPurpose: null,
          categories: [],
          areas: [],
          clinicalAreas: [],
          careSettings: [],
        },
        true
      );

      expect(spy).toHaveBeenCalled();
    });
  });
});
