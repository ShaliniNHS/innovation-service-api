/* eslint-disable */
import { AccessorOrganisationRole, UserType } from "@services/index";
import {
  runStubFunctionFromBindings, createHttpTrigger
} from "stub-azure-function-context";
import innovatorsUpdateInnovationAction from "../../innovatorsUpdateInnovationAction";
import * as persistence from "../../innovatorsUpdateInnovationAction/persistence";
import * as validation from "../../innovatorsUpdateInnovationAction/validation";
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
  actionId: "test_action_id",
  innovationId: "test_innovation_id",
  innovatorId: "test_innovator_id",
};

describe("[HttpTrigger] innovatorsUpdateInnovationAction Suite", () => {
  describe("Function Handler", () => {
    afterEach(() => {
      jest.resetAllMocks();
    });

    it("fails when connection is not established", async () => {
      spyOn(authentication, 'decodeToken').and.returnValue({ oid: ':oid' });
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

    it("Should return 200 when Innovation Action is updated", async () => {
      spyOn(connection, "setupSQLConnection").and.returnValue(null);
      spyOn(service_loader, "loadAllServices").and.returnValue(dummy.services);
      spyOn(validation, "ValidatePayload").and.returnValue({});
      spyOn(authentication, "decodeToken").and.returnValue({
        oid: dummy.innovatorId,
      });
      spyOn(persistence, "updateInnovationAction").and.returnValue([
        { id: dummy.actionId },
      ]);

      const { res } = await mockedRequestFactory({});
      expect(res.status).toBe(200);
    });

    it("Should return 403 when innovator has an invalid role", async () => {
      const services = {
        UserService: {
          getUser: () => ({
            type: UserType.ACCESSOR,
          }),
        },
      };

      spyOn(connection, "setupSQLConnection").and.returnValue(null);
      spyOn(service_loader, "loadAllServices").and.returnValue(services);
      spyOn(validation, "ValidatePayload").and.returnValue({});
      spyOn(authentication, "decodeToken").and.returnValue({
        oid: dummy.innovatorId,
      });
      spyOn(persistence, "updateInnovationAction").and.returnValue([
        { id: dummy.actionId },
      ]);

      const { res } = await mockedRequestFactory({
        headers: { authorization: ":access_token" },
      });
      expect(res.status).toBe(403);
    });

    it("Should throw error when oid is different from innovatorId", async () => {
      spyOn(connection, "setupSQLConnection").and.returnValue(null);
      spyOn(service_loader, "loadAllServices").and.returnValue(dummy.services);
      spyOn(validation, "ValidatePayload").and.returnValue({});
      spyOn(authentication, "decodeToken").and.returnValue({
        oid: "other",
      });
      spyOn(persistence, "updateInnovationAction").and.returnValue([
        { id: dummy.actionId },
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
    innovatorsUpdateInnovationAction,
    [
      {
        type: "httpTrigger",
        name: "req",
        direction: "in",
        data: createHttpTrigger(
          "PUT",
          "http://nhse-i-aac/api/innovators/{innovatorId}/innovations/{innovationId}/actions/{actionId}",
          { ...data.headers }, // headers
          {
            actionId: dummy.actionId,
            innovatorId: dummy.innovatorId,
            innovationId: dummy.innovationId,
          },
          {
            status: "DECLINED",
            comment: ":comment",
          }, // payload/body
          null // querystring
        ),
      },
      { type: "http", name: "res", direction: "out" },
    ],
    new Date()
  );
}
