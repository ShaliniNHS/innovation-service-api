import { InnovationActionService } from "@services/index";
import * as typeorm from "typeorm";
import * as persistence from "../../innovatorsUpdateInnovationAction/persistence";
import { CustomContext } from "../../utils/types";

describe("[innovatorsUpdateInnovationAction] Persistence suite", () => {
  describe("updateInnovationAction", () => {
    it("should update an innovation action", async () => {
      // Arrange
      spyOn(typeorm, "getRepository");
      spyOn(typeorm, "getConnection");
      const spy = spyOn(
        InnovationActionService.prototype,
        "updateByInnovator"
      ).and.returnValue([{ id: "" }]);

      const ctx = {
        services: {
          InnovationActionService: new InnovationActionService(),
        },
      };
      // Act
      await persistence.updateInnovationAction(
        ctx as CustomContext,
        "T362433E-F36B-1410-80DE-0032FE5B194B",
        "E362433E-F36B-1410-80DE-0032FE5B194B",
        "F362433E-F36B-1410-80DE-0032FE5B194B",
        {
          status: "DECLINED",
          comment: ":comment",
        }
      );

      expect(spy).toHaveBeenCalled();
    });
  });
});