import {
  InnovationEvidenceService,
  InnovationSectionCatalogue,
} from "@services/index";
import * as typeorm from "typeorm";
import * as persistence from "../../innovatorsUpdateInnovationEvidence/persistence";
import { CustomContext } from "../../utils/types";
import * as dotenv from "dotenv";
import * as path from "path";
describe("[innovatorsUpdateInnovationEvidence] Persistence suite", () => {
  beforeAll(() => {
    dotenv.config({
      path: path.resolve(__dirname, "../.environment"),
    });
  });
  describe("updateInnovationEvidence", () => {
    it("should update an innovation evidence", async () => {
      // Arrange
      spyOn(typeorm, "getRepository");
      spyOn(typeorm, "getConnection");
      const spy = spyOn(
        InnovationEvidenceService.prototype,
        "update"
      ).and.returnValue([{ id: "" }]);

      const ctx = {
        services: {
          InnovationEvidenceService: new InnovationEvidenceService(),
        },
        auth: {
          requestUser: {
            id: ":userId",
            type: "INNOVATOR",
          },
        },
      };
      // Act
      await persistence.updateInnovationEvidence(
        ctx as CustomContext,
        "E362433E-F36B-1410-80DE-0032FE5B194B",
        {
          id: "test_evidence_id",
          innovation: "test_innovation_id",
          evidenceType: "CLINICAL",
          clinicalEvidenceType: "DATA_PUBLISHED",
          description: "",
          summary: "upd 2",
          files: [],
        },
        InnovationSectionCatalogue.EVIDENCE_OF_EFFECTIVENESS
      );

      expect(spy).toHaveBeenCalled();
    });
  });
});
