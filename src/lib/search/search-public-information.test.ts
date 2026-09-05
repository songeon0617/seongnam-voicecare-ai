import assert from "node:assert/strict";
import test from "node:test";
import { POST } from "@/app/api/public-information/search/route";
import { PUBLIC_INFORMATION_DOCUMENTS } from "@/data/public-data/documents";
import { mapDocumentsToPublicInformationAnswer } from "@/lib/public-information/map-documents-to-answer";
import { createPublicInformationSearchResponse } from "@/lib/search/create-public-information-search-response";
import {
  searchPublicInformation,
  searchPublicInformationDocuments,
} from "./search-public-information";

const RANKING_CASES = [
  {
    query: "장애인 택시 지원받으려면 어떻게 해야 해?",
    expectedTitle: "장애인 택시바우처",
  },
  {
    query: "휠체어 타는데 이동지원 차량 이용하고 싶어",
    expectedTitle: "특별교통수단 운영",
  },
  {
    query: "혼자 사는 어르신 돌봄 서비스 알려줘",
    expectedTitle: "노인맞춤돌봄서비스",
  },
  {
    query: "분당에 노인복지관 어디 있어?",
    expectedTitle: "분당노인종합복지관",
  },
] as const;

for (const { query, expectedTitle } of RANKING_CASES) {
  test(`"${query}"의 최상위 결과는 ${expectedTitle}이다`, () => {
    const results = searchPublicInformation(query);

    assert.equal(results[0]?.document.title, expectedTitle);
    assert.ok(results[0].score > 0);
    assert.ok(results[0].matchedTerms.length > 0);
    assert.ok(results.every((result) => result.document.status === "active"));
    assert.ok(results.length <= 3);
  });
}

for (const query of ["여권 발급 방법 알려줘", "청년 월세지원 알려줘"]) {
  test(`"${query}"는 관련 결과를 반환하지 않는다`, () => {
    assert.deepEqual(searchPublicInformation(query), []);
  });
}

test("정상 API 입력은 검색 결과와 매핑된 답변을 반환한다", () => {
  const response = createPublicInformationSearchResponse({
    query: "장애인 택시 지원받으려면 어떻게 해야 해?",
  });

  assert.equal(response.status, 200);
  assert.ok("results" in response.body);
  assert.equal(response.body.hasResults, true);
  assert.equal(response.body.results[0]?.document.title, "장애인 택시바우처");
  assert.equal(response.body.answer.userQuestion, response.body.query);
});

test("관련 없는 API 질문은 성공 응답 안에서 빈 결과로 처리한다", () => {
  const response = createPublicInformationSearchResponse({
    query: "여권 발급 방법 알려줘",
  });

  assert.equal(response.status, 200);
  assert.ok("results" in response.body);
  assert.equal(response.body.hasResults, false);
  assert.deepEqual(response.body.results, []);
  assert.equal(response.body.answer.verification.status, "insufficient_data");
});

test("빈 API 질문은 400 오류로 처리한다", () => {
  const response = createPublicInformationSearchResponse({ query: "   " });

  assert.equal(response.status, 400);
  assert.ok("error" in response.body);
  assert.equal(response.body.error.code, "empty_query");
});

test("300자를 넘는 API 질문은 413 오류로 처리한다", () => {
  const response = createPublicInformationSearchResponse({
    query: "가".repeat(301),
  });

  assert.equal(response.status, 413);
  assert.ok("error" in response.body);
  assert.equal(response.body.error.code, "query_too_long");
});

test("Route Handler는 잘못된 JSON을 400 오류로 처리한다", async () => {
  const response = await POST(
    new Request("http://localhost/api/public-information/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{",
    }),
  );
  const body = (await response.json()) as { error: { code: string } };

  assert.equal(response.status, 400);
  assert.equal(body.error.code, "invalid_json");
});

test("active가 아닌 문서는 검색 코어에서 제외한다", () => {
  const excludedDocument = {
    ...PUBLIC_INFORMATION_DOCUMENTS[1],
    id: "test-excluded-document",
    status: "excluded" as const,
  };

  assert.deepEqual(
    searchPublicInformationDocuments(
      "장애인 택시 지원받으려면 어떻게 해야 해?",
      [excludedDocument],
    ),
    [],
  );
});

test("답변 매핑은 출처 URL과 원문 메타데이터를 보존한다", () => {
  const document = PUBLIC_INFORMATION_DOCUMENTS[3];
  const answer = mapDocumentsToPublicInformationAnswer("복지관 알려줘", [
    document,
  ]);

  assert.equal(answer.sources[0]?.sourceId, document.sourceId);
  assert.equal(answer.sources[0]?.url, document.originalUrl);
  assert.equal(answer.sources[0]?.checkedAt, document.lastVerifiedAt);
  assert.equal(answer.sources[0]?.documentStatus, document.status);
  assert.equal(answer.sources[0]?.freshnessStatus, document.freshness.status);
  assert.equal(answer.verification.status, "verified");
});

test("최신성이 current가 아닌 확인 문서는 partially_verified로 매핑한다", () => {
  const answer = mapDocumentsToPublicInformationAnswer("이동지원 알려줘", [
    PUBLIC_INFORMATION_DOCUMENTS[0],
  ]);

  assert.equal(answer.verification.status, "partially_verified");
  assert.equal(answer.verification.checkedAt, "2026-09-05");
});

test("답변 매핑은 문서에 구조화되지 않은 값을 생성하지 않는다", () => {
  const document = PUBLIC_INFORMATION_DOCUMENTS[0];
  const answer = mapDocumentsToPublicInformationAnswer("이동지원 알려줘", [
    document,
  ]);

  assert.equal(answer.plainLanguageSummary, document.content);
  assert.equal(answer.requiredItems, undefined);
  assert.equal(answer.contacts, undefined);
  assert.equal(answer.locations, undefined);
  assert.deepEqual(answer.steps, []);
  assert.equal(answer.nextAction, null);
});

test("여러 문서의 대상을 한 서비스 자격으로 합치지 않고 본문마다 문서명을 붙인다", () => {
  const documents = [PUBLIC_INFORMATION_DOCUMENTS[2], PUBLIC_INFORMATION_DOCUMENTS[3]];
  const answer = mapDocumentsToPublicInformationAnswer("노인맞춤돌봄서비스 신청하려면 어떻게 해야 하나요?", documents);
  assert.equal(answer.eligibility, undefined);
  assert.equal(answer.plainLanguageSummary, documents.map((document) => `「${document.title}」\n${document.content}`).join("\n\n"));
  assert.equal(answer.sources.length, 2);
});
