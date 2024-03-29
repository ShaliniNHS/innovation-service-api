import { InnovationSupportService } from "@services/index";
import * as typeorm from "typeorm";
import * as persistence from "../../accessorsUpdateInnovationSupport/persistence";
import { CustomContext } from "../../utils/types";
import * as dotenv from "dotenv";
import * as path from "path";
describe("[accessorsUpdateInnovationSupport] Persistence suite", () => {
  beforeAll(() => {
    dotenv.config({
      path: path.resolve(__dirname, "../.environment"),
    });
  });
  describe("updateInnovationSupport", () => {
    it("should update an innovation support", async () => {
      // Arrange
      spyOn(typeorm, "getRepository");
      spyOn(typeorm, "getConnection");
      const spy = spyOn(
        InnovationSupportService.prototype,
        "update"
      ).and.returnValue([{ id: "" }]);

      const ctx = {
        services: {
          InnovationSupportService: new InnovationSupportService(),
        },
        auth: {
          requestUser: {
            id: ":userId",
            type: "ACCESSOR",
          },
        },
      };
      // Act
      await persistence.updateInnovationSupport(
        ctx as CustomContext,
        "T362433E-F36B-1410-80DE-0032FE5B194B",
        "E362433E-F36B-1410-80DE-0032FE5B194B",
        {
          status: "NOT_YET",
          comment: ":comment",
          accessors: [],
        }
      );

      expect(spy).toHaveBeenCalled();
    });
  });
});
