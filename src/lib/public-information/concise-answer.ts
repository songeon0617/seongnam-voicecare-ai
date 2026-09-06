import type { PublicInformationAnswer } from "@/types/public-information";

/** Avoid cutting a qualification or date away from a long policy paragraph. */
export function conciseAnswer(answer: PublicInformationAnswer): string {
  if (answer.plainLanguageSummary.length <= 240) return answer.plainLanguageSummary;
  return `${answer.title} 관련 공식 자료를 찾았습니다. 대상과 이용 방법은 상세 안내에서 확인해 주세요. 현재 운영 여부와 개인별 자격은 추가 확인이 필요합니다.`;
}
