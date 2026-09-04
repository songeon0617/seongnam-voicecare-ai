import assert from "node:assert/strict";
import test from "node:test";
import { searchPublicInformation } from "./search-public-information";

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
