import { loadEnvConfig } from "@next/env";
import { createOpenAIIntentRouter } from "../src/lib/ai/openai-intent-router";
import { createPublicInformationResponseWithAnswer } from "../src/lib/search/create-public-information-response-with-answer";

/** 명시적으로 실행할 때만 실제 API 1회. 키·질문·응답·원시 오류를 출력하지 않는다. */
async function main() {
  loadEnvConfig(process.cwd(), true, { info() {}, error() {} });
  const configuration = createOpenAIIntentRouter();
  if (configuration.status !== "ready") {
    console.log("SKIPPED: PUBLIC_INFORMATION_AI_ENABLED=true 및 OPENAI_API_KEY, OPENAI_MODEL 설정이 필요합니다. 실제 호출 0회.");
    process.exitCode = 2;
    return;
  }
  const startedAt = performance.now();
  const response = await createPublicInformationResponseWithAnswer(
    { query: "어머니가 혼자 계시는데 누가 안부 좀 봐줄 수 있나요?" },
    () => configuration,
  );
  const elapsedMs = Math.round(performance.now() - startedAt);
  console.log(`응답 시간: ${elapsedMs} ms (검색·OpenAI 요청·검증·조합 포함).`);
  if ("routing" in response.body && response.body.routing?.source === "ai" && response.body.routing.decision.route === "DIRECT" && response.body.routing.decision.serviceIds[0] === "seongnam-senior-tailored-care") {
    console.log("PASS: 실제 OpenAI 라우터 호출 1회, 서비스 선택·안전 검증·공식 답변 매핑 성공.");
  } else {
    console.log("FAIL: 실제 라우팅 확인 실패. 설정/모델 접근 권한/네트워크/8초 제한을 확인하세요. 추가 호출 없음.");
    process.exitCode = 1;
  }
}

main().catch(() => {
  console.log("FAIL: smoke test 실행 실패. 비밀 정보 보호를 위해 오류 상세는 생략합니다.");
  process.exitCode = 1;
});
