import { CustomContext } from "../../utils/types";

export const findAllInnovationSections = async (
  ctx: CustomContext,
  innovatorId: string,
  innovationId: string
) => {
  const result = await ctx.services.InnovationSectionService.findAllInnovationSections(
    innovationId,
    innovatorId
  );

  return result;
};
