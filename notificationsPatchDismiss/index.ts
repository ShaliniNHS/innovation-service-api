import { HttpRequest } from "@azure/functions";
import * as persistence from "./persistence";
import * as validation from "./validation";
import * as Responsify from "../utils/responsify";
import {
  AllowedUserType,
  AppInsights,
  JwtDecoder,
  SQLConnector,
  Validator,
} from "../utils/decorators";
import { CustomContext } from "../utils/types";
import { UserType } from "@domain/index";

class NotificationsDismiss {
  @AppInsights()
  @SQLConnector()
  @JwtDecoder()
  @Validator(validation.ValidatePayload, "body", "Invalid payload.")
  @AllowedUserType(UserType.INNOVATOR, UserType.ACCESSOR, UserType.ASSESSMENT)
  static async httpTrigger(
    context: CustomContext,
    req: HttpRequest
  ): Promise<void> {
    const result = await persistence.patchDismissNotification(
      context,
      req.body.contextId,
      req.body.contextType
    );

    if (result) {
      context.res = Responsify.Ok(result);
      return;
    }

    context.res = Responsify.NotFound(null);
  }
}

export default NotificationsDismiss.httpTrigger;
