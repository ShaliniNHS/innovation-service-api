import { EmailTemplate } from "@services/services/Email.service";

export const getTemplates = (): EmailTemplate[] => [
  {
    id: "382c29d3-2263-43dd-b7d7-1e6be73ea098",
    code: "ACCESSORS_ACTION_TO_REVIEW",
    path: {
      url: "accessor/innovations/:innovationId/action-tracker/:contextId",
      params: {
        innovationId: "",
        contextId: "",
      },
    },
    props: {
      display_name: "",
      innovator_name: "",
      innovation_name: "",
      action_url: "",
    },
  },
  {
    id: "f63b1459-c1ee-48b3-b0da-12bb19863d19",
    code: "ACCESSORS_ASSIGNED_TO_INNOVATION",
    path: {
      url: "accessor/innovations/:contextId",
      params: {
        contextId: "",
      },
    },
    props: {
      display_name: "",
      qa_name: "",
      innovation_url: "",
    },
  },
  {
    id: "384ab7ad-6c0c-4e5d-9b0c-e4502bf07c7e",
    code: "INNOVATORS_ACTION_REQUEST",
    path: {
      url: "innovator/innovations/:innovationId/action-tracker/:contextId",
      params: {
        innovationId: "",
        contextId: "",
      },
    },
    props: {
      display_name: "",
      accessor_name: "",
      unit_name: "",
      action_url: "",
    },
  },
  {
    id: "078070fd-832a-4df2-8f7b-ad616654cbbd",
    code: "QA_ORGANISATION_SUGGESTED",
    path: {
      url: "accessor/innovations/:contextId",
      params: {
        innovationId: "",
        contextId: "",
      },
    },
    props: {
      display_name: "",
      innovation_url: "",
    },
  },
];
