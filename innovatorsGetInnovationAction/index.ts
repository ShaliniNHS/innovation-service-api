import { HttpRequest } from "@azure/functions";
import { UserType } from "@domain/index";
import {
  InnovationNotFoundError,
  InvalidParamsError,
  ResourceNotFoundError,
} from "@services/errors";
import {
  AllowedUserType,
  AppInsights,
  JwtDecoder,
  SQLConnector,
} from "../utils/decorators";
import * as Responsify from "../utils/responsify";
import { CustomContext, Severity } from "../utils/types";
import * as persistence from "./persistence";

class InnovatorsGetInnovationAction {
  @AppInsights()
  @SQLConnector()
  @JwtDecoder()
  @AllowedUserType(UserType.INNOVATOR)
  static async httpTrigger(
    context: CustomContext,
    req: HttpRequest
  ): Promise<void> {
    const actionId = req.params.actionId;
    const innovatorId = req.params.innovatorId;
    const innovationId = req.params.innovationId;
    const oid = context.auth.decodedJwt.oid;

    if (innovatorId !== oid) {
      context.res = Responsify.Forbidden({ error: "Operation denied." });
      return;
    }

    let result;
    try {
      result = await persistence.findInnovationAction(
        context,
        actionId,
        innovationId,
        innovatorId
      );
    } catch (error) {
      context.logger(`[${req.method}] ${req.url}`, Severity.Error, { error });
      context.log.error(error);
      context.res = Responsify.ErroHandling(error);

      return;
    }

    context.res = Responsify.Ok(result);
  }
}

export default InnovatorsGetInnovationAction.httpTrigger;