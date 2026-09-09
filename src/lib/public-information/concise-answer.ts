import type { PublicInformationAnswer } from "@/types/public-information";

/** Avoid cutting a qualification or date away from a long policy paragraph. */
export function conciseAnswer(answer: PublicInformationAnswer): string {
  return answer.plainLanguageSummary;
}

export function completeAnswerSpeech(answer: PublicInformationAnswer): string {
  return [answer.plainLanguageSummary, ...(answer.eligibility ?? []), ...(answer.requiredItems ?? []),
    ...answer.steps.map(s=>s.description), ...(answer.contacts ?? []).map(c=>`${c.label ?? ''} ${c.phone ?? ''}`),
    answer.nextAction?.description, answer.verification.details].filter(Boolean).join(' ');
}
