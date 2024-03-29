import {
  InnovationActionService,
  InnovationSectionCatalogue,
} from "@services/index";
import * as typeorm from "typeorm";
import * as persistence from "../../accessorsCreateInnovationAction/persistence";
import { CustomContext } from "../../utils/types";
import * as dotenv from "dotenv";
import * as path from "path";

describe("[accessorsCreateInnovationAction] Persistence suite", () => {
  beforeAll(() => {
    dotenv.config({
      path: path.resolve(__dirname, "../.environment"),
    });
  });
  describe("createInnovationAction", () => {
    it("should create an innovation action", async () => {
      // Arrange
      spyOn(typeorm, "getRepository");
      spyOn(typeorm, "getConnection");
      const spy = spyOn(
        InnovationActionService.prototype,
        "create"
      ).and.returnValue([{ id: "" }]);

      const ctx = {
        services: {
          InnovationActionService: new InnovationActionService(),
        },
        auth: {
          requestUser: {
            id: ":userId",
            type: "ACCESSOR",
          },
        },
      };
      // Act
      await persistence.createInnovationAction(
        ctx as CustomContext,
        "E362433E-F36B-1410-80DE-0032FE5B194B",
        {
          description: ":description",
          section: InnovationSectionCatalogue.INNOVATION_DESCRIPTION,
        }
      );

      expect(spy).toHaveBeenCalled();
    });
  });
});
