import assert from "node:assert/strict";
import test from "node:test";
import { regionBoundaryGuard } from "./region-boundary";
import { createPublicInformationResponseWithAnswer as run } from "./create-public-information-response-with-answer";
import type { PublicInformationSearchResponse } from "@/types/public-information-search";

const result = (response: Awaited<ReturnType<typeof run>>): PublicInformationSearchResponse => {
  assert.equal(response.status, 200);
  assert.ok("results" in response.body);
  return response.body;
};

for (const query of [
  "부천시 노인맞춤돌봄서비스 신청하는 곳 알려주세요", "수원시 장애인 택시", "서울에서 노인 돌봄",
  "용인시 노인맞춤돌봄", "청주시 노인맞춤돌봄", "강남구 노인맞춤돌봄", "양평군 노인맞춤돌봄",
  "부천시에서 노인맞춤돌봄", "서울특별시 장애인 택시", "부산광역시 장애인 택시",
  "인천 장애인 택시바우처", "대구에서 돌봄", "성남시와 부천시 노인맞춤돌봄 비교",
  "부천시노인맞춤돌봄", "부천시청 노인맞춤돌봄", "서구 노인맞춤돌봄",
]) {
  test(`타 지역은 AI 구성 전 차단하고 성남 사실을 반환하지 않는다: ${query}`, async () => {
    const body = result(await run({ query }, () => { assert.fail("외부 지역에 AI/fallback 호출 금지"); }));
    assert.equal(body.routing?.decision.route, "UNSUPPORTED");
    assert.equal(body.routing?.source, "guard");
    assert.deepEqual(body.results, []);
    assert.deepEqual(body.answer.sources, []);
    assert.deepEqual(body.answer.steps, []);
    assert.equal(body.answer.nextAction, null);
    assert.doesNotMatch(body.answer.plainLanguageSummary, /031-|행정복지센터/);
  });
}

test("지역 미지정과 성남 3개 구의 명확한 서비스는 keyword DIRECT 유지", async () => {
  for (const prefix of ["", "성남시 ", "경기도 성남시 ", "분당구 ", "수정구 ", "중원구 "]) {
    const body = result(await run({ query: `${prefix}노인맞춤돌봄서비스 신청` }, () => { assert.fail("keyword 유지"); }));
    assert.equal(body.routing?.decision.route, "DIRECT");
    assert.equal(body.routing?.source, "keyword");
  }
});

test("분당구 장애인 이동지원은 정상 AI 경로로 연결", async () => {
  const body = result(await run({ query: "분당구 장애인 이동지원" }, () => ({ status: "ready", route: async () => ({
    route: "DIRECT", serviceIds: ["seongnam-special-transportation"], intent: "overview", clarificationId: null,
  }) })));
  assert.equal(body.routing?.decision.route, "DIRECT");
});

test("택시·보조기구 등 일상어와 성남 하위 동은 타 지역으로 오인하지 않는다", () => {
  for (const query of ["혹시 택시 지원", "장애인 콜택시", "복지콜택시", "신청시 필요한 서류", "대상은 누구?", "보조기구 보장구 신청", "위기 가구 지원", "친구 돌봄", "정자동 복지관", "분당구보건소", "즉시 신청", "요금 청구", "장애인 버스요금 지원", "어머니가 혼자 계시는데 누가 안부 좀 봐줄 수 있나요?"]) {
    assert.equal(regionBoundaryGuard(query), null, query);
  }
});

test("지역 확인 후속과 다른 확인 문맥에 남은 타 지역도 우회 불가", async () => {
  for (const payload of [
    { query: "부천시요", context: { question: "가까운 노인복지관", clarificationId: "region_required" } },
    { query: "노인맞춤돌봄서비스 신청", context: { question: "부천시 노인 돌봄", clarificationId: "elderly_care_type" } },
  ]) {
    const body = result(await run(payload, () => { assert.fail("문맥 우회 금지"); }));
    assert.equal(body.routing?.decision.route, "UNSUPPORTED");
    assert.deepEqual(body.answer.sources, []);
  }
});

test("기존 region_required 및 성남 거리정보 미지원 정책 유지", async () => {
  const configure = () => ({ status: "disabled" as const });
  const missing = result(await run({ query: "가까운 노인복지관이 어디예요?" }, configure));
  assert.equal(missing.clarification?.id, "region_required");
  const followup = result(await run({ query: "수정구요", context: { question: "가까운 노인복지관이 어디예요?", clarificationId: "region_required" } }, configure));
  assert.equal(followup.routing?.decision.route, "UNSUPPORTED");
});
