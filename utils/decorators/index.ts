import { HttpRequest } from "@azure/functions";
import { OrganisationUser, UserType } from "@services/index";
import { decodeToken } from "../authentication";
import {
  setIsCosmosConnected,
  setIsSQLConnected,
  setupCosmosDb,
  setupSQLConnection,
} from "../connection";
import { getInstance, start } from "../logging/insights";
import * as Responsify from "../responsify";
import { loadAllServices } from "../serviceLoader";
import { CustomContext, Severity } from "../types";

export function SQLConnector() {
  return function (
    target: Object,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const decoratorId = "SQLConnector";

    const original = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const context: CustomContext = args[0];
      try {
        await setupSQLConnection();
        context.services = await loadAllServices();
      } catch (error) {
        context.log.error(error);
        context.logger(
          `${decoratorId}: an error has occurred. Check details.`,
          Severity.Error,
          {
            error,
          }
        );
        context.res = Responsify.Internal({
          error: "Error establishing connection with the datasource.",
        });
        setIsSQLConnected(false);
        return;
      }

      context.log.info("Database connection established");

      context.logger("@SQLConnector", Severity.Information, {
        isConnected: true,
      });

      await original.apply(this, args);
      return;
    };
  };
}

export function CosmosConnector() {
  return function (
    target: Object,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const decoratorId = "CosmosConnector";

    const original = descriptor.value;
    descriptor.value = async function (...args: any[]) {
      const context: CustomContext = args[0];
      try {
        await setupCosmosDb();
      } catch (error) {
        context.log.error(error);
        context.logger(
          `${decoratorId}: an error has occurred. Check details.`,
          Severity.Error,
          {
            error,
          }
        );
        context.res = Responsify.Internal({
          error: "Error establishing connection with the datasource.",
        });
        setIsCosmosConnected(false);
        return;
      }

      context.log.info("CosmosDB connection established");

      context.logger("@CosmosConnector", Severity.Information, {
        isConnected: true,
      });

      await original.apply(this, args);
      return;
    };
  };
}

export function Validator(
  validationFunc: Function,
  reqProperty: string,
  errorMessage?: string
) {
  return function (
    target: Object,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const decoratorId = "Validator";
    const original = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const context: CustomContext = args[0];
      const req: HttpRequest = args[1];

      const validate = validationFunc(req[reqProperty]);
      if (validate.error) {
        context.log.error(validate.error);
        context.logger(
          `${decoratorId}: an error has occurred. Check details.`,
          Severity.Error,
          {
            error: validate.error,
          }
        );
        context.res = Responsify.UnprocessableEntity({
          error: errorMessage || "validation failed",
        });
        return;
      }
      await original.apply(this, args);
      return;
    };
  };
}

export function JwtDecoder() {
  return function (
    target: Object,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const original = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const context: CustomContext = args[0];
      const req: HttpRequest = args[1];
      const token = req.headers.authorization;
      const jwt = decodeToken(token);

      const userId = req.params.userId;

      if (userId && userId !== jwt.oid) {
        context.logger(
          `[${req.method}]${req.url} Operation denied. ${userId} !== ${jwt.oid}`,
          Severity.Information
        );
        context.res = Responsify.Forbidden({ error: "Operation denied." });
        return;
      }

      context.auth = {
        decodedJwt: {
          oid: jwt.oid,
          surveyId: jwt.extension_surveyId,
        },
      };

      await original.apply(this, args);
      return;
    };
  };
}

export function OrganisationRoleValidator(userType: UserType, ...roles: any[]) {
  return function (
    target: Object,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const decoratorId = "OrganisationRoleValidator";
    const original = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const context: CustomContext = args[0];
      const oid = context.auth.decodedJwt.oid;

      const userOrganisations: OrganisationUser[] = await context.services.OrganisationService.findUserOrganisations(
        oid
      );
      const filteredOrganisations = userOrganisations.filter((uo) =>
        roles.includes(uo.role)
      );

      if (filteredOrganisations.length === 0) {
        context.log.error(
          `Invalid user. User has no valid roles. {oid: ${oid}}`
        );
        context.logger(
          `${decoratorId}: an error has occurred. Check details.`,
          Severity.Error,
          {
            error: `Invalid user. User has no valid roles. {oid: ${oid}}`,
          }
        );
        context.res = Responsify.Forbidden();
        return;
      }

      // BUSINESS RULE - An user has only one organization and one organisation unit
      let organisationUnitUser = null;
      if (filteredOrganisations[0].userOrganisationUnits) {
        organisationUnitUser =
          filteredOrganisations[0].userOrganisationUnits[0];

        organisationUnitUser = {
          id: organisationUnitUser.id,
          organisationUnit: {
            id: organisationUnitUser.organisationUnit.id,
            name: organisationUnitUser.organisationUnit.name,
          },
        };
      }

      context.auth.requestUser = {
        id: oid,
        type: userType,
        organisationUser: {
          id: filteredOrganisations[0].id,
          role: filteredOrganisations[0].role,
          organisation: {
            id: filteredOrganisations[0].organisation.id,
            name: filteredOrganisations[0].organisation.name,
          },
        },
        organisationUnitUser,
      };

      await original.apply(this, args);
      return;
    };
  };
}

export function AppInsights() {
  return function (
    target: Object,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const insights = getInstance();
    const original = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const context: CustomContext = args[0];
      const req: HttpRequest = args[1];
      start();

      const correlationContext = insights.startOperation(context, req);

      return insights.wrapWithCorrelationContext(async () => {
        const loggerFunc = (message, severity, props) => {
          const token = req.headers.authorization;
          let authenticatedUser = {};

          if (token) {
            const jwt = decodeToken(token);
            authenticatedUser = jwt.oid;
          }

          const properties = {
            properties: {
              ...props,
              authenticatedUser,
            },
          };

          // logs all as a trace
          insights.defaultClient.trackTrace({
            message,
            severity,
            properties,
          });
        };

        context.logger = loggerFunc;

        await original.apply(this, args);

        insights.defaultClient.flush();
      }, correlationContext)();
    };
  };
}

export function AllowedUserType(...type: UserType[]) {
  return function (
    target: object,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const decoratorId = "AllowedUserType";
    const original = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const context: CustomContext = args[0];
      const oid = context.auth.decodedJwt.oid;
      const user = await context.services.UserService.getUser(oid);

      if (!user || !type.includes(user.type)) {
        context.log.error(
          `Invalid user. User is of wrong type for this endpoint. {oid: ${oid}}`
        );
        context.logger(
          `${decoratorId}: an error has occurred. Check details.`,
          Severity.Error,
          {
            error: `Invalid user. User is of wrong type for this endpoint. {oid: ${oid}}`,
          }
        );
        context.res = Responsify.Forbidden();
        return;
      }

      let requestUser;

      if (user.type === UserType.ACCESSOR) {
        const userOrganisations: OrganisationUser[] = await context.services.OrganisationService.findUserOrganisations(
          oid
        );

        let organisationUnitUser = null;
        if (userOrganisations[0].userOrganisationUnits) {
          organisationUnitUser = userOrganisations[0].userOrganisationUnits[0];

          organisationUnitUser = {
            id: organisationUnitUser.id,
            organisationUnit: {
              id: organisationUnitUser.organisationUnit.id,
              name: organisationUnitUser.organisationUnit.name,
            },
          };
        }

        requestUser = {
          id: oid,
          type: user.type,
          organisationUser: {
            id: userOrganisations[0].id,
            role: userOrganisations[0].role,
            organisation: {
              id: userOrganisations[0].organisation.id,
              name: userOrganisations[0].organisation.name,
            },
          },
          organisationUnitUser,
        };
      } else {
        requestUser = {
          id: oid,
          type: user.type,
        };
      }

      context.auth.requestUser = requestUser;

      await original.apply(this, args);
      return;
    };
  };
}
