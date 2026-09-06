export const SAFETY_GUIDANCE = {
  immediate_emergency: {
    title: "지금 바로 119에 연락하세요",
    summary: "지금 의식이 없거나 숨을 쉬지 못하는 등 즉시 위험한 상황이라면 바로 119에 연락하세요. 주변에 도움을 요청하고, 이 서비스는 자동으로 전화하거나 신고하지 않으므로 사용자가 직접 연락해야 합니다.",
    phoneNumbers: ["119"],
  },
  self_harm_immediate: {
    title: "지금 바로 안전 도움을 요청하세요",
    summary: "지금 자신을 해칠 위험이 있거나 즉각적인 위험이 있다면 바로 119 또는 112에 연락하세요. 자살예방상담전화 109에서도 도움을 받을 수 있습니다. 이 서비스는 자동으로 전화하거나 신고하지 않으므로 사용자가 직접 연락해야 합니다.",
    phoneNumbers: ["119", "112", "109"],
  },
} as const;

export type SafetyCategory = keyof typeof SAFETY_GUIDANCE;

export interface PublicInformationSafetyResponse {
  category: SafetyCategory;
  phoneNumbers: readonly string[];
  requiresUserAction: true;
}
