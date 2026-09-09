import { SAFETY_GUIDANCE, type SafetyCategory } from "@/types/public-information-safety";

const PAST_OR_INFORMATION_CONTEXT = [
  /작년|지난해|예전|과거|지난달|며칠 전|얼마 전/,
  /적이 (?:있|없)|있었|했었|했던 적|들었던 적/,
  /발견하면|발견했을 때|경우에는|대처법|예시|인용/,
  /말(?:을|이라고|이라는) (?:들|했)|말하(?:면|는 사람|는 경우)/,
  /[“”"'‘’]/,
] as const;

const IMMEDIATE_EMERGENCY = [
  /(?:가슴|흉부).{0,12}(?:심하게\s*아|심한\s*통증)/,
  /숨(?:을|이|쉬기|\s*쉬기)?.{0,8}(?:어려워|어려워요|힘들어|곤란)/,
  /(?:약|알약).{0,12}(?:많이\s*먹었|과다\s*복용|과량\s*복용)/,
  /(?:피|출혈).{0,8}(?:멈추지\s*않|안\s*멈)/,
  /의식(?:이|도)?\s*(?:전혀\s*)?없(?:어요|습니다|어|다)/,
  /숨(?:을|이)?\s*(?:전혀\s*)?(?:못\s*쉬|안\s*쉬)(?:어요|습니다|어|다)/,
  /반응(?:이|도)?\s*(?:전혀\s*)?없(?:어요|습니다|어|다)/,
  /(?:갑자기\s*)?쓰러졌(?:어요|습니다|어)/,
  /지금.{0,16}쓰러질\s*것\s*같(?:아요|습니다|아)/,
] as const;

const IMMEDIATE_SELF_HARM = [
  /^지금\s*자살하려고\s*(?:해요|합니다|해|한다)[.!?]*$/,
  /(?:지금\s*)?(?:정말\s*)?죽고\s*싶(?:어요|습니다|어|다)/,
  /(?:지금\s*)?자살하고\s*싶(?:어요|습니다|어|다)/,
  /지금.{0,16}(?:나|저|자신)(?:를|을)?\s*(?:해칠|다치게\s*할)\s*것\s*같(?:아요|습니다|아)/,
  /지금.{0,16}(?:나|저|자신)(?:를|을)?\s*(?:해치|다치게\s*하)고\s*싶(?:어요|습니다|어)/,
  /지금.{0,16}자해(?:하|할)\s*것\s*같(?:아요|습니다|아)/,
] as const;

function hasExcludedContext(query: string) {
  return PAST_OR_INFORMATION_CONTEXT.some((pattern) => pattern.test(query));
}

/** 현재형·직접 위험 문구만 보수적으로 찾는다. 진단이나 위험 점수 계산은 하지 않는다. */
export function matchSafetyBoundary(query: string): SafetyCategory | null {
  const normalized = query.normalize("NFKC").replace(/\s+/g, " ").trim();
  if (!normalized) return null;
  const current = normalized.includes("지금") && !/예시|인용|[“”"'‘’]/.test(normalized) ? normalized.slice(normalized.lastIndexOf("지금")) : normalized;
  if(hasExcludedContext(current))return null;
  if (IMMEDIATE_EMERGENCY.some((pattern) => pattern.test(current))) return "immediate_emergency";
  if (IMMEDIATE_SELF_HARM.some((pattern) => pattern.test(current))) return "self_harm_immediate";
  return null;
}

export function getSafetyGuidance(category: SafetyCategory) {
  return SAFETY_GUIDANCE[category];
}
