import type { PublicInformationAnswer } from "@/types/public-information";
import { CLARIFICATIONS, isClarificationId, type ClarificationId } from "@/types/public-information-router";
import { SAFETY_GUIDANCE, type PublicInformationSafetyResponse, type SafetyCategory } from "@/types/public-information-safety";

type RecordValue = Record<string, unknown>;
const record = (value: unknown): value is RecordValue => typeof value === "object" && value !== null && !Array.isArray(value);
const string = (value: unknown): value is string => typeof value === "string";
const strings = (value: unknown) => Array.isArray(value) && value.every(string);
const optional = (value: unknown, validate: (value: unknown) => boolean) => value === undefined || validate(value);
const list = (value: unknown, validate: (value: unknown) => boolean) => Array.isArray(value) && value.every(validate);
const date = (value: unknown) => value === null || (string(value) && /^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(value) && Number.isFinite(Date.parse(value)));
const oneOf = (value: unknown, values: string[]) => string(value) && values.includes(value);
function url(value: unknown) {
  if (!string(value)) return false;
  try { return new URL(value).protocol === "https:"; } catch { return false; }
}

/** 네트워크 JSON은 TypeScript 타입을 보장하지 않는다. 표시/낭독할 필드를 검증한다. */
function isAnswer(value: unknown): value is PublicInformationAnswer {
  if (!record(value)) return false;
  return string(value.userQuestion) && string(value.title) && string(value.plainLanguageSummary)
    && optional(value.eligibility, strings) && optional(value.requiredItems, strings)
    && list(value.steps, (step) => record(step) && Number.isInteger(step.order) && Number(step.order) > 0
      && string(step.title) && string(step.description) && optional(step.sourceIds, strings))
    && optional(value.contacts, (items) => list(items, (item) => record(item)
      && optional(item.label, string) && optional(item.phone, string)
      && optional(item.url, url) && optional(item.availableHours, string)))
    && optional(value.locations, (items) => list(items, (item) => record(item)
      && string(item.organizationName) && optional(item.address, string) && optional(item.url, url)))
    && (value.nextAction === null || (record(value.nextAction) && string(value.nextAction.title)
      && string(value.nextAction.description) && optional(value.nextAction.url, url)))
    && list(value.sources, (source) => record(source) && string(source.id) && string(source.sourceId)
      && string(source.organizationName) && string(source.title) && url(source.url) && date(source.checkedAt)
      && optional(source.supportingSources, (items) => list(items, (item) => record(item) && string(item.title) && url(item.url)))
      && oneOf(source.documentStatus, ["active", "review_required", "expired", "superseded", "excluded"])
      && oneOf(source.freshnessStatus, ["current", "possibly_outdated", "superseded", "unknown"])
      && optional(source.evidenceSummary, string))
    && record(value.verification)
    && oneOf(value.verification.status, ["verified", "partially_verified", "insufficient_data", "unverified"])
    && date(value.verification.checkedAt) && optional(value.verification.details, string);
}

/** 결과 문서를 클라이언트에서 재조합하지 않고 승인된 answer만 사용한다. */
export function readSearchAnswer(value: unknown): {
  answer: PublicInformationAnswer; hasResults: boolean;
  kind?: "answer" | "clarification" | "unsupported" | "safety";
  clarification?: { id: ClarificationId };
  safety?: PublicInformationSafetyResponse;
} | null {
  if (!record(value) || !Array.isArray(value.results) || typeof value.hasResults !== "boolean"
    || value.hasResults !== (value.results.length > 0) || !isAnswer(value.answer)) return null;
  if (value.kind !== undefined) {
    if (!oneOf(value.kind, ["answer", "clarification", "unsupported", "safety"])) return null;
    if ((value.kind === "answer") !== value.hasResults) return null;
    if (value.kind !== "answer" && (value.answer.sources.length > 0 || value.answer.steps.length > 0 ||
      value.answer.eligibility?.length || value.answer.requiredItems?.length || value.answer.contacts?.length ||
      value.answer.locations?.length || value.answer.nextAction !== null || value.answer.verification.status !== "insufficient_data")) return null;
    if (value.kind === "clarification") {
      if (!record(value.clarification) || !isClarificationId(value.clarification.id) ||
        value.answer.plainLanguageSummary !== CLARIFICATIONS[value.clarification.id].question) return null;
      return { answer: value.answer, hasResults: false, kind: "clarification", clarification: { id: value.clarification.id } };
    }
    if (value.kind === "safety") {
      if (value.clarification !== undefined || !record(value.safety) || Object.keys(value.safety).length !== 3 ||
        !string(value.safety.category) || !Object.hasOwn(SAFETY_GUIDANCE, value.safety.category) ||
        value.safety.requiresUserAction !== true || !strings(value.safety.phoneNumbers)) return null;
      const category = value.safety.category as SafetyCategory;
      const guidance = SAFETY_GUIDANCE[category];
      if (value.answer.title !== guidance.title || value.answer.plainLanguageSummary !== guidance.summary ||
        JSON.stringify(value.safety.phoneNumbers) !== JSON.stringify(guidance.phoneNumbers)) return null;
      return { answer: value.answer, hasResults: false, kind: "safety",
        safety: { category, phoneNumbers: [...guidance.phoneNumbers], requiresUserAction: true } };
    }
    if (value.clarification !== undefined || value.safety !== undefined) return null;
    return { answer: value.answer, hasResults: value.hasResults, kind: value.kind as "answer" | "unsupported" };
  }
  if (value.safety !== undefined || value.clarification !== undefined) return null;
  return { answer: value.answer, hasResults: value.hasResults };
}
