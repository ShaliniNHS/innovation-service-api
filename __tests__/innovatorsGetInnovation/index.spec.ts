/* eslint-disable */
import { UserType } from "@domain/index";
import {
  createHttpTrigger, runStubFunctionFromBindings
} from "stub-azure-function-context";
import innovatorsGetInnovation from "../../innovatorsGetInnovation";
import * as persistence from "../../innovatorsGetInnovation/persistence";
import * as authentication from "../../utils/authentication";
import * as connection from "../../utils/connection";
import * as service_loader from "../../utils/serviceLoader";

jest.mock("../../utils/logging/insights", () => ({
  start: () => { },
  getInstance: () => ({
    startOperation: () => ({
      operation: {
        parentId: ":parent_id",
      },
    }),
    wrapWithCorrelationContext: (func) => {
      return func;
    },
    defaultClient: {
      trackTrace: () => { },
      trackRequest: () => { },
      flush: () => { },
    },
  }),
}));

const dummy = {
  services: {
    UserService: {
      getUser: () => ({
        type: UserType.INNOVATOR,
      }),
    },
  },
  innovationId: "test_innovation_id",
  innovatorId: "test_innovator_id",
};

describe("[HttpTrigger] innovatorsGetInnovation Suite", () => {
  describe("Function Handler", () => {
    afterEach(() => {
      jest.resetAllMocks();
    });

    it("fails when connection is not established", async () => {
      spyOn(service_loader, "loadAllServices").and.returnValue(dummy.services);
      spyOn(authentication, 'decodeToken').and.returnValue({ oid: dummy.innovatorId });
      spyOn(connection, "setupSQLConnection").and.throwError(
        "Error establishing connection with the datasource."
      );

      const { res } = await mockedRequestFactory({});
      expect(res.status).toBe(500);
      expect(res.body.error).toBeDefined();
      expect(res.body.error).toBe(
        "Error establishing connection with the datasource."
      );
    });

    it("Should return 200 when Innovations is found", async () => {
      spyOn(connection, "setupSQLConnection").and.returnValue(null);
      spyOn(service_loader, "loadAllServices").and.returnValue(dummy.services);
      spyOn(authentication, "decodeToken").and.returnValue({
        oid: dummy.innovatorId,
      });
      spyOn(persistence, "findInnovationsByInnovator").and.returnValue([
        { innovation: dummy.innovationId },
      ]);

      const { res } = await mockedRequestFactory({});
      expect(res.status).toBe(200);
    });

    it("Should return 403 when innovator has an invalid user type", async () => {
      const services = {
        UserService: {
          getUser: () => ({
            type: UserType.ACCESSOR,
          }),
        },
      };

      spyOn(connection, "setupSQLConnection").and.returnValue(null);
      spyOn(service_loader, "loadAllServices").and.returnValue(services);
      spyOn(authentication, "decodeToken").and.returnValue({
        oid: dummy.innovatorId,
      });
      spyOn(persistence, "findInnovationsByInnovator").and.returnValue([
        { id: dummy.innovationId },
      ]);

      const { res } = await mockedRequestFactory({
        headers: { authorization: ":access_token" },
      });
      expect(res.status).toBe(403);
    });

    it("Should throw error when oid is different from innovatorId", async () => {
      spyOn(connection, "setupSQLConnection").and.returnValue(null);
      spyOn(service_loader, "loadAllServices").and.returnValue(dummy.services);
      spyOn(authentication, "decodeToken").and.returnValue({
        oid: 'other',
      });
      spyOn(persistence, "findInnovationsByInnovator").and.returnValue([
        { id: dummy.innovationId },
      ]);

      const { res } = await mockedRequestFactory({
        headers: { authorization: ":access_token" },
      });
      expect(res.status).toBe(403);
    });
  });
});

async function mockedRequestFactory(data?: any) {
  return runStubFunctionFromBindings(
    innovatorsGetInnovation,
    [
      {
        type: "httpTrigger",
        name: "req",
        direction: "in",
        data: createHttpTrigger(
          "GET",
          "http://nhse-i-aac/api/innovators/{innovatorId}/innovations/{innovationId}",
          { ...data.headers }, // headers
          {
            innovatorId: dummy.innovatorId,
            innovationId: dummy.innovationId,
          }, // ?
          {}, // payload/body
          undefined // querystring
        ),
      },
      { type: "http", name: "res", direction: "out" },
    ],
    new Date()
  );
}
