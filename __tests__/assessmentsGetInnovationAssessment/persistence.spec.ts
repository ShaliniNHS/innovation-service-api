import { InnovationAssessmentService } from "@services/index";
import * as typeorm from "typeorm";
import * as persistence from "../../assessmentsGetInnovationAssessment/persistence";
import { CustomContext } from "../../utils/types";

describe("[assessmentsGetInnovationAssessment] Persistence suite", () => {
  describe("getInnovationAssessment", () => {
    it("should get an innovation assessment", async () => {
      // Arrange
      spyOn(typeorm, "getRepository");
      spyOn(typeorm, "getConnection");
      const spy = spyOn(
        InnovationAssessmentService.prototype,
        "find"
      ).and.returnValue([{ id: "" }]);

      const ctx = {
        services: {
          InnovationAssessmentService: new InnovationAssessmentService(),
        },
      };
      // Act
      await persistence.findInnovationAssessmentById(
        ctx as CustomContext,
        "E362433E-F36B-1410-80DE-0032FE5B194B",
        "T123456E-F88B-6514-89DE-0032FE5B194B"
      );

      expect(spy).toHaveBeenCalled();
    });
  });
});
