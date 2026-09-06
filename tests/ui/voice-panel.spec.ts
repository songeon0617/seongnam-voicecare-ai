import { expect, test, type Page } from "@playwright/test";
import { createPublicInformationSearchResponse } from "../../src/lib/search/create-public-information-search-response";
import { mapDocumentsToPublicInformationAnswer } from "../../src/lib/public-information/map-documents-to-answer";
import { installSpeechMock } from "./speech-mock";
import { SAFETY_GUIDANCE } from "../../src/types/public-information-safety";

const QUERY = "장애인 콜택시 이용하려면 어떻게 해야 해?";
function fixture() {
  const response = createPublicInformationSearchResponse({ query: QUERY });
  if (!("results" in response.body)) throw new Error("Invalid fixture");
  return response.body;
}

// 명확한 서비스 질문의 새 API는 한 문서를 선택한다. 원문 완전성 검증은 유지한다.
function keywordAnswer() {
  return mapDocumentsToPublicInformationAnswer(QUERY, [fixture().results[0].document]);
}

async function textQuestion(page: Page) {
  await page.getByRole("textbox").fill(QUERY);
  await page.getByRole("textbox").press("Enter");
  await expect(page.getByRole("status")).toContainText("안내가 준비되었습니다");
}

test("한국어 STT 확정 결과를 입력란과 기존 API에 한 번 전달하고 출처를 유지한다", async ({ page }) => {
  await installSpeechMock(page);
  let requests = 0;
  const search = fixture();
  await page.route("**/api/public-information/search", (route) => {
    requests++;
    expect(route.request().postDataJSON()).toEqual({ query: QUERY });
    return route.fulfill({ json: search });
  });
  await page.goto("/");
  const microphone = page.getByRole("button", { name: "마이크로 질문하기" });
  await microphone.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: "음성 입력 취소" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("status")).toContainText("듣고 있습니다");
  expect(await page.evaluate(() => {
    const recognition = window.voiceTest.sessions[0];
    return { lang: recognition.lang, continuous: recognition.continuous, interim: recognition.interimResults };
  })).toEqual({ lang: "ko-KR", continuous: false, interim: true });
  await page.evaluate(() => window.voiceTest.interim("장애인 콜택시"));
  await expect(page.getByText("인식 중: 장애인 콜택시", { exact: true })).toBeVisible();
  expect(requests).toBe(0);
  await page.evaluate((text) => {
    window.voiceTest.final(text);
    window.voiceTest.final(text);
    window.voiceTest.end();
    window.voiceTest.end();
  }, QUERY);
  await expect(page.getByRole("textbox")).toHaveValue(QUERY);
  await expect(page.getByText(search.answer.plainLanguageSummary, { exact: true })).toBeVisible();
  expect(requests).toBe(1);
  expect(await page.evaluate(() => window.voiceTest.spoken.length)).toBe(0);
  for (const source of search.answer.sources) {
    const link = page.getByRole("link", { name: `${source.title} (새 창)`, exact: true });
    await expect(link).toHaveAttribute("href", source.url);
    await expect(link.locator("..")).toContainText(source.checkedAt!.slice(0, 10));
    await expect(link.locator("..")).toContainText("최신성 미확인");
  }
});

test("webkit 접두사 STT도 기존 실제 검색 API에 전달된다", async ({ page }) => {
  await installSpeechMock(page, { recognition: "prefixed" });
  await page.goto("/");
  await page.getByRole("button", { name: "마이크로 질문하기" }).click();
  const response = page.waitForResponse("**/api/public-information/search");
  await page.evaluate((text) => { window.voiceTest.final(text); window.voiceTest.end(); }, QUERY);
  expect((await (await response).json()).query).toBe(QUERY);
  await expect(page.getByRole("status")).toContainText("안내가 준비되었습니다");
});

for (const scenario of [
  { name: "STT 미지원", options: { recognition: "none" as const }, message: "음성 입력을 지원하지 않습니다" },
  { name: "보안 연결 아님", options: { insecure: true }, message: "HTTPS 또는 localhost" },
  { name: "STT 시작 예외", options: { throwStart: true }, message: "음성 입력을 시작하지 못했습니다" },
]) {
  test(`${scenario.name}에서도 텍스트 질문이 정상 동작한다`, async ({ page }) => {
    await installSpeechMock(page, scenario.options);
    await page.goto("/");
    await page.getByRole("button", { name: "마이크로 질문하기" }).click();
    await expect(page.getByRole("status")).toContainText(scenario.message);
    await textQuestion(page);
  });
}

for (const [code, message] of [
  ["not-allowed", "권한이 허용되지 않았습니다"],
  ["audio-capture", "마이크를 사용할 수 없습니다"],
  ["network", "음성 인식 서비스에 연결하지 못했습니다"],
  ["no-speech", "말씀을 인식하지 못했습니다"],
]) {
  test(`인식 오류 ${code} 처리 후 텍스트 질문이 가능하다`, async ({ page }) => {
    await installSpeechMock(page);
    await page.goto("/");
    await page.getByRole("button", { name: "마이크로 질문하기" }).click();
    await page.evaluate((code) => { window.voiceTest.error(code); window.voiceTest.end(); }, code);
    await expect(page.getByRole("status")).toContainText(message);
    await expect(page.getByRole("button", { name: "마이크로 질문하기" })).toHaveAttribute("aria-pressed", "false");
    await textQuestion(page);
  });
}

test("사용자 취소·텍스트 수정 후 늦은 인식 콜백이 질문을 보내지 않는다", async ({ page }) => {
  await installSpeechMock(page);
  let requests = 0;
  page.on("request", (request) => { if (request.url().includes("/api/public-information/search")) requests++; });
  await page.goto("/");
  await page.getByRole("textbox").fill("기존 입력");
  await page.getByRole("button", { name: "마이크로 질문하기" }).click();
  // 브라우저에 이미 큐잉된 콜백도 세션 식별 검사로 무시하는지 확인한다.
  const stale = await page.evaluateHandle(() => ({ result: window.voiceTest.sessions[0].onresult, end: window.voiceTest.sessions[0].onend }));
  await page.getByRole("button", { name: "음성 입력 취소" }).press("Space");
  await stale.evaluate((callbacks) => {
    callbacks.result?.({ results: [{ isFinal: true, 0: { transcript: "늦은 결과" } }] });
    callbacks.end?.();
  });
  await expect(page.getByRole("status")).toContainText("취소했습니다");
  await expect(page.getByRole("textbox")).toHaveValue("기존 입력");
  await page.getByRole("button", { name: "마이크로 질문하기" }).click();
  await page.getByRole("textbox").fill("수정한 질문");
  await page.evaluate(() => { window.voiceTest.final("덮어쓰기 시도"); window.voiceTest.end(); });
  await expect(page.getByRole("textbox")).toHaveValue("수정한 질문");
  expect(requests).toBe(0);
});

test("최종 결과 없는 종료와 30초 인식 제한을 처리한다", async ({ page }) => {
  await installSpeechMock(page);
  await page.goto("/");
  await page.clock.install();
  await page.getByRole("button", { name: "마이크로 질문하기" }).click();
  await page.evaluate(() => { window.voiceTest.interim("미확정 질문"); window.voiceTest.end(); });
  await expect(page.getByRole("status")).toContainText("말씀을 인식하지 못했습니다");
  await page.getByRole("button", { name: "마이크로 질문하기" }).click();
  await page.clock.fastForward(30_000);
  await expect(page.getByRole("status")).toContainText("대기 시간이 지났습니다");
  expect(await page.evaluate(() => window.voiceTest.aborts)).toBe(2);
});

test("300자 초과 인식은 자르거나 전송하지 않고 수정할 수 있게 한다", async ({ page }) => {
  await installSpeechMock(page);
  let requests = 0;
  page.on("request", (request) => { if (request.url().includes("/api/public-information/search")) requests++; });
  await page.goto("/");
  await page.getByRole("button", { name: "마이크로 질문하기" }).click();
  await page.evaluate((text) => { window.voiceTest.final(text); window.voiceTest.end(); }, "가".repeat(301));
  await expect(page.getByRole("status")).toContainText("300자 이하로 수정");
  await expect(page.getByRole("textbox")).toHaveValue("가".repeat(301));
  expect(requests).toBe(0);
});

test("TTS는 한국어로 원문 전체를 순서대로 읽고 자동 재생하지 않는다", async ({ page }) => {
  await installSpeechMock(page);
  await page.goto("/");
  await textQuestion(page);
  expect(await page.evaluate(() => window.voiceTest.spoken.length)).toBe(0);
  await page.getByRole("button", { name: "답변 듣기" }).press("Enter");
  await expect(page.getByRole("button", { name: "답변 읽기 중지" })).toBeVisible();
  await expect(page.getByRole("status")).toHaveAttribute("aria-live", "off");
  const spoken = await page.evaluate(() => {
    let previousLength = 0;
    while (window.voiceTest.spoken.length > previousLength && previousLength < 100) {
      previousLength = window.voiceTest.spoken.length;
      window.voiceTest.finishSpeech();
    }
    return window.voiceTest.spoken.map((item) => ({ text: item.text, lang: item.lang, voice: item.voice?.lang }));
  });
  expect(spoken.length).toBeGreaterThan(1);
  expect(spoken.map((item) => item.text).join("")).toBe(keywordAnswer().plainLanguageSummary);
  expect(spoken.every((item) => item.lang === "ko-KR" && item.voice === "ko-KR")).toBe(true);
  await expect(page.getByRole("status")).toContainText("읽기를 마쳤습니다");
  await expect(page.getByRole("status")).toHaveAttribute("aria-live", "polite");
});

test("safety 고정 안내도 자동 재생 없이 TTS로 전체를 읽는다", async ({ page }) => {
  await installSpeechMock(page);
  await page.goto("/");
  const response = page.waitForResponse("**/api/public-information/search");
  await page.getByRole("textbox").fill("사람이 의식이 없어요");
  await page.getByRole("textbox").press("Enter");
  expect((await (await response).json()).kind).toBe("safety");
  expect(await page.evaluate(() => window.voiceTest.spoken.length)).toBe(0);
  await page.getByRole("button", { name: "답변 듣기" }).click();
  const spoken = await page.evaluate(() => {
    let previousLength = 0;
    while (window.voiceTest.spoken.length > previousLength && previousLength < 100) {
      previousLength = window.voiceTest.spoken.length;
      window.voiceTest.finishSpeech();
    }
    return window.voiceTest.spoken.map((item) => item.text).join("");
  });
  expect(spoken).toBe(SAFETY_GUIDANCE.immediate_emergency.summary);
});

for (const action of ["stop", "type", "microphone", "example", "submit"] as const) {
  test(`TTS 중 ${action} 동작은 이전 발화를 취소한다`, async ({ page }) => {
    await installSpeechMock(page);
    await page.goto("/");
    await textQuestion(page);
    await page.getByRole("button", { name: "답변 듣기" }).click();
    const oldEnd = await page.evaluateHandle(() => window.voiceTest.spoken[0].onend);
    if (action === "stop") await page.getByRole("button", { name: "답변 읽기 중지" }).press("Space");
    if (action === "type") await page.getByRole("textbox").fill("다음 질문");
    if (action === "microphone") await page.getByRole("button", { name: "마이크로 질문하기" }).click();
    if (action === "example") await page.getByRole("button", { name: /분당구에서 이용할 수 있는 복지시설/ }).click();
    if (action === "submit") await page.getByRole("button", { name: "질문 보내기" }).click();
    await oldEnd.evaluate((callback) => callback?.call(new SpeechSynthesisUtterance(), new Event("end") as SpeechSynthesisEvent));
    expect(await page.evaluate(() => window.voiceTest.cancels)).toBe(1);
    expect(await page.evaluate(() => window.voiceTest.spoken.length)).toBe(1);
    await expect(page.getByRole("button", { name: "답변 읽기 중지" })).toHaveCount(0);
  });
}

test("한국어 음성 지연 로드 후 재시도와 voiceschanged를 처리한다", async ({ page }) => {
  await installSpeechMock(page, { korean: false });
  await page.goto("/");
  await textQuestion(page);
  await page.getByRole("button", { name: "답변 듣기" }).click();
  await expect(page.getByRole("status")).toContainText("한국어 읽기 음성이 아직 준비되지 않았습니다");
  expect(await page.evaluate(() => window.voiceTest.spoken.length)).toBe(0);
  await page.evaluate(() => window.voiceTest.loadKoreanVoice());
  await page.getByRole("button", { name: "답변 듣기" }).click();
  expect(await page.evaluate(() => window.voiceTest.spoken.length)).toBe(1);
});

test("TTS 미지원에도 본문과 텍스트 기능을 유지한다", async ({ page }) => {
  await installSpeechMock(page, { synthesis: false });
  await page.goto("/");
  await textQuestion(page);
  await page.getByRole("button", { name: "답변 듣기" }).click();
  await expect(page.getByRole("status")).toContainText("답변 듣기를 지원하지 않습니다");
  await expect(page.getByText(keywordAnswer().plainLanguageSummary, { exact: true })).toBeVisible();
});

test("TTS 재생 오류와 엔진 무응답에서 중지 상태를 복구한다", async ({ page }) => {
  await installSpeechMock(page);
  await page.goto("/");
  await textQuestion(page);
  await page.clock.install();
  await page.getByRole("button", { name: "답변 듣기" }).click();
  await page.evaluate(() => window.voiceTest.failSpeech());
  await expect(page.getByRole("status")).toContainText("읽기를 완료하지 못했습니다");
  await page.getByRole("button", { name: "답변 듣기" }).click();
  await page.clock.fastForward(45_000);
  await expect(page.getByRole("status")).toContainText("읽기를 완료하지 못했습니다");
  await expect(page.getByRole("button", { name: "답변 듣기" })).toBeVisible();
});

test("이전 TTS 조각의 중복 종료·오류는 다음 조각과 제한 시간을 건드리지 않는다", async ({ page }) => {
  await installSpeechMock(page);
  await page.goto("/");
  await textQuestion(page);
  await page.clock.install();
  await page.getByRole("button", { name: "답변 듣기" }).click();
  await page.evaluate(() => {
    const first = window.voiceTest.spoken[0];
    const end = first.onend;
    const error = first.onerror;
    end?.call(first, new Event("end") as SpeechSynthesisEvent);
    end?.call(first, new Event("end") as SpeechSynthesisEvent);
    error?.call(first, new Event("error") as SpeechSynthesisErrorEvent);
  });
  expect(await page.evaluate(() => window.voiceTest.spoken.length)).toBe(2);
  await expect(page.getByRole("button", { name: "답변 읽기 중지" })).toBeVisible();
  await page.clock.fastForward(45_000);
  await expect(page.getByRole("status")).toContainText("읽기를 완료하지 못했습니다");
});
