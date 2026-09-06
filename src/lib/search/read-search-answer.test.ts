import assert from "node:assert/strict";
import test from "node:test";
import { createPublicInformationSearchResponse } from "./create-public-information-search-response";
import { readSearchAnswer } from "./read-search-answer";
import { CLARIFICATIONS } from "@/types/public-information-router";
import { SAFETY_GUIDANCE } from "@/types/public-information-safety";

function fixture() {
  const response = createPublicInformationSearchResponse({ query: "노인맞춤돌봄서비스 신청하려면 어떻게 해야 하나요?" });
  assert.ok("results" in response.body);
  return response.body;
}

test("실제 답변과 빈 결과를 변경 없이 읽는다", () => {
  const search = fixture();
  assert.strictEqual(readSearchAnswer(search)?.answer, search.answer);
  const empty = createPublicInformationSearchResponse({ query: "프로야구 경기 일정" });
  assert.equal(readSearchAnswer(empty.body)?.hasResults, false);
});

test("누락·잘못된 중첩 필드·실행 URL을 가진 응답은 렌더링 전에 거부한다", () => {
  const search = fixture();
  for (const bad of [null, [], {}, { results: [] }, { ...search, hasResults: false }]) {
    assert.equal(readSearchAnswer(bad), null);
  }
  const malformedFields = [
    { sources: null }, { sources: [null] }, { steps: {} }, { steps: [null] },
    { title: {} }, { plainLanguageSummary: 123 }, { eligibility: [{}] }, { requiredItems: "서류" },
    { contacts: [{ phone: {} }] }, { locations: [{ organizationName: null }] },
    { nextAction: {} }, { verification: null },
    { verification: { status: "invented", checkedAt: null } },
    { verification: { status: "verified", checkedAt: 20260905 } },
    { sources: [{ ...search.answer.sources[0], checkedAt: "not-a-date" }] },
    { sources: [{ ...search.answer.sources[0], freshnessStatus: "invented" }] },
    { sources: [{ ...search.answer.sources[0], url: "javascript:alert(1)" }] },
    { contacts: [{ url: "data:text/html,test" }] },
    { locations: [{ organizationName: "기관", url: "javascript:alert(1)" }] },
    { nextAction: { title: "안내", description: "안내", url: "javascript:alert(1)" } },
  ];
  for (const fields of malformedFields) {
    assert.equal(readSearchAnswer({ ...search, answer: { ...search.answer, ...fields } }), null);
  }
});

test("서버가 보낸 선택 구조화 필드와 미확인 날짜는 그대로 보존한다", () => {
  const search = fixture();
  Object.assign(search.answer, {
    requiredItems: ["서버 서류"], contacts: [{ phone: "031-000-0000", url: "https://www.seongnam.go.kr" }],
    locations: [{ organizationName: "서버 기관", address: "서버 주소" }],
    steps: [{ order: 1, title: "서버 단계", description: "서버 설명" }],
    nextAction: { title: "서버 안내", description: "서버 설명" },
    verification: { status: "unverified", checkedAt: null },
  });
  assert.deepEqual(readSearchAnswer(search)?.answer, search.answer);
});

test("확인 질문·미지원 판별과 무결성: 허용 ID/고정 문장 외 응답 및 사실 혼입 거부", () => {
  const response = createPublicInformationSearchResponse({ query: "자료 없는 질문" });
  assert.ok("results" in response.body);
  const clean = { ...response.body, results: [], hasResults: false,
    answer: { ...response.body.answer, sources: [], eligibility: undefined, plainLanguageSummary: CLARIFICATIONS.service_required.question } };
  const clarify = { ...clean, kind: "clarification", clarification: { id: "service_required" } };
  assert.equal(readSearchAnswer(clarify)?.kind, "clarification");
  assert.equal(readSearchAnswer({ ...clean, kind: "unsupported" })?.kind, "unsupported");
  for (const invalid of [
    { ...clarify, kind: "invented" }, { ...clarify, clarification: { id: "invented" } },
    { ...clarify, clarification: undefined }, { ...clarify, kind: "answer" },
    { ...clarify, answer: { ...clean.answer, plainLanguageSummary: "가짜 연락처" } },
    { ...clarify, answer: { ...clean.answer, contacts: [{ phone: "010-9999-9999" }] } },
    { ...clarify, answer: { ...clean.answer, sources: fixture().answer.sources } },
    { ...clarify, answer: { ...clean.answer, verification: { status: "verified", checkedAt: null } } },
  ]) assert.equal(readSearchAnswer(invalid), null);
});

test("safety는 검토된 category·번호·고정 문구만 표시 대상으로 허용한다", () => {
  const search = fixture();
  const guidance = SAFETY_GUIDANCE.immediate_emergency;
  const clean = { ...search, results: [], hasResults: false, kind: "safety",
    safety: { category: "immediate_emergency", phoneNumbers: [...guidance.phoneNumbers], requiresUserAction: true },
    answer: { ...search.answer, title: guidance.title, plainLanguageSummary: guidance.summary,
      sources: [], steps: [], nextAction: null, eligibility: undefined,
      verification: { status: "insufficient_data", checkedAt: null } } };
  assert.equal(readSearchAnswer(clean)?.kind, "safety");
  for (const invalid of [
    { ...clean, safety: { ...clean.safety, category: "invented" } },
    { ...clean, safety: { ...clean.safety, phoneNumbers: ["010-9999-9999"] } },
    { ...clean, safety: { ...clean.safety, requiresUserAction: false } },
    { ...clean, answer: { ...clean.answer, plainLanguageSummary: "임의 안전 문구" } },
    { ...clean, kind: "unsupported" },
  ]) assert.equal(readSearchAnswer(invalid), null);
});
