import { expect, test } from "@playwright/test";
import { installSpeechMock } from "./speech-mock";

test("390px 첫 화면은 음성 → 글자 → 보조 메뉴이며 키보드 순서도 같다", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const voice = page.getByRole("button", { name: "음성으로 질문하기", exact: true });
  const input = page.getByRole("textbox", { name: "글자로 질문하기" });
  const menu = page.getByRole("button", { name: "생활정보 찾기", exact: true });
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("성남 생활정보를 쉽게 물어보세요");
  await expect(page.getByRole("heading", { name: "지원 분야" })).toHaveCount(0);
  for (const label of ["복지", "이동·교통", "건강", "민원·생활", "기타"]) {
    await expect(page.getByRole("button", { name: label, exact: true })).toHaveCount(0);
  }
  for (const control of [voice, input, menu]) await expect(control).toBeInViewport();
  expect((await voice.boundingBox())!.height).toBeGreaterThanOrEqual(84);
  await voice.focus();
  await page.keyboard.press("Tab"); await expect(input).toBeFocused();
  await page.keyboard.press("Tab"); await expect(page.getByRole("button", { name: "질문하기", exact: true })).toBeFocused();
  await page.keyboard.press("Tab"); await expect(menu).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("음성 종료·확인·다시 말하기·글자 수정은 명시 전송 전 요청하지 않는다", async ({ page }) => {
  await installSpeechMock(page);
  let requests = 0;
  page.on("request", request => { if (request.url().endsWith("/api/public-information/search")) requests++; });
  await page.goto("/");
  await page.getByRole("button", { name: "음성으로 질문하기", exact: true }).click();
  await expect(page.getByRole("button", { name: /듣고 있어요.*취소/ })).toHaveAttribute("aria-pressed", "true");
  await page.evaluate(() => window.voiceTest.sessions[0].onaudioend?.());
  await expect(page.getByRole("status")).toContainText("말씀하신 내용을 확인하고 있어요");
  await page.evaluate(() => { window.voiceTest.final("무인민원발급기"); window.voiceTest.end(); });
  await expect(page.getByRole("textbox")).toBeFocused();
  await expect(page.getByRole("button", { name: "이대로 질문하기", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "다시 말하기" }).click();
  await page.evaluate(() => { window.voiceTest.final("택시바우처"); window.voiceTest.end(); });
  await expect(page.getByRole("textbox")).toHaveValue("택시바우처");
  await expect(page.getByRole("textbox")).toBeFocused();
  await page.getByRole("textbox").fill("무인민원발급기 이용 방법은?");
  expect(requests).toBe(0);
  await page.getByRole("button", { name: "이대로 질문하기", exact: true }).click();
  await expect(page.getByTestId("answer-summary")).toContainText("증명 종류");
  expect(requests).toBe(1);
});

for (const transcript of ["어", "...", "ㅋㅋㅋ"]) test(`짧거나 이상한 확정 결과 ${transcript}는 전송하지 않는다`, async ({ page }) => {
  await installSpeechMock(page);
  let requests = 0;
  page.on("request", request => { if (request.url().endsWith("/api/public-information/search")) requests++; });
  await page.goto("/");
  await page.getByRole("button", { name: "음성으로 질문하기", exact: true }).click();
  await page.evaluate(text => { window.voiceTest.final(text); window.voiceTest.end(); }, transcript);
  await expect(page.getByRole("status")).toContainText("음성을 잘 듣지 못했어요");
  await expect(page.getByRole("button", { name: "다시 말하기" })).toBeVisible();
  await page.getByRole("button", { name: "글자로 질문하기", exact: true }).click();
  await expect(page.getByRole("textbox")).toBeFocused();
  expect(requests).toBe(0);
});

test("답변 아래 음성 재질문은 한 번에 시작하고 문맥·오류·초점·처음으로를 유지한다", async ({ page }) => {
  await installSpeechMock(page);
  await page.setViewportSize({ width: 390, height: 844 });
  const sent: unknown[] = [];
  page.on("request", request => { if (request.url().endsWith("/api/public-information/search")) sent.push(request.postDataJSON()); });
  await page.goto("/");
  await page.getByRole("textbox").fill("무인민원발급기 이용 방법은?");
  await page.getByRole("textbox").press("Enter");
  await expect(page.getByTestId("answer-summary")).toContainText("증명 종류");
  await page.getByRole("button", { name: "다시 음성으로 질문하기", exact: true }).click();
  expect(await page.evaluate(() => window.voiceTest.sessions.length)).toBe(1);
  await expect(page.getByRole("button", { name: /듣고 있어요.*취소/ })).toBeFocused();
  await expect(page.getByRole("status")).toBeInViewport();
  await page.evaluate(() => window.voiceTest.error("not-allowed"));
  await expect(page.getByRole("status")).toBeVisible();
  await expect(page.getByRole("status")).toContainText("권한");
  await page.getByRole("button", { name: "다시 말하기" }).click();
  await page.evaluate(() => { window.voiceTest.final("요금은?"); window.voiceTest.end(); });
  await expect(page.getByRole("textbox")).toHaveValue("요금은?");
  await page.getByRole("button", { name: "이대로 질문하기", exact: true }).click();
  await expect(page.getByTestId("answer-summary")).toContainText("500원");
  expect(sent).toHaveLength(2);
  expect(sent[1]).toEqual({ query: "요금은?", serviceContext: { serviceId: "seongnam-unmanned-civil-service-kiosk" } });
  await page.getByRole("button", { name: "글자로 다시 질문" }).click();
  await expect(page.getByRole("textbox")).toBeFocused();
  await page.getByRole("button", { name: "처음으로", exact: true }).click();
  await expect(page.getByRole("button", { name: "음성으로 질문하기", exact: true })).toBeFocused();
  await page.getByRole("textbox").fill("전화번호는?");
  await page.getByRole("textbox").press("Enter");
  await expect.poll(() => sent.length).toBe(3);
  expect(sent[2]).toEqual({ query: "전화번호는?" });
});

test("데스크톱과 200% 확대 상당 640px에서도 질문·메뉴·재질문이 사용 가능하다", async ({ page }) => {
  for (const width of [1280, 640]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await expect(page.getByRole("button", { name: "음성으로 질문하기", exact: true })).toBeInViewport();
    await page.getByRole("textbox").fill("공영주차장");
    await page.getByRole("textbox").press("Enter");
    await expect(page.getByRole("link", { name: "주차장 위치 보기 (새 창)" })).toBeVisible();
    await page.getByRole("button", { name: "글자로 다시 질문" }).click();
    await expect(page.getByRole("textbox")).toBeFocused();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});

test("음성 재질문 중 기존 후속 질문을 선택하면 늦은 인식으로 덮어쓰지 않는다", async ({ page }) => {
  await installSpeechMock(page);
  await page.goto("/");
  await page.getByRole("textbox").fill("무인민원발급기 이용 방법은?");
  await page.getByRole("textbox").press("Enter");
  await expect(page.getByTestId("answer-summary")).toContainText("증명 종류");
  await page.getByRole("button", { name: "다시 음성으로 질문하기", exact: true }).click();
  const stale = await page.evaluateHandle(() => ({ result: window.voiceTest.sessions[0].onresult, end: window.voiceTest.sessions[0].onend }));
  await page.getByRole("button", { name: "요금은?", exact: true }).click();
  await stale.evaluate(callbacks => {
    callbacks.result?.({ results: [{ isFinal: true, 0: { transcript: "늦게 도착한 질문" } }] });
    callbacks.end?.();
  });
  await expect(page.getByTestId("answer-summary")).toContainText("500원");
  await expect(page.locator("#question")).toHaveValue("요금은?");
  expect(await page.evaluate(() => window.voiceTest.aborts)).toBe(1);
});
