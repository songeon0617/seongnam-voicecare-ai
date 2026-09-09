import { expect, test } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { SEARCH_MESSAGES } from "../../src/types/search-messages";
import { installSpeechMock } from "./speech-mock";

const phase = process.env.VOICECARE_DESIGN_PHASE ?? "after";
const outputDirectory = process.env.VOICECARE_DESIGN_OUTPUT ?? `test-results/design-review/${phase}`;

for (const viewport of [
  { name: "desktop", width: 1440, height: 1000 },
  { name: "mobile", width: 390, height: 844 },
]) {
  test(`${phase} ${viewport.name} design states`, async ({ page }) => {
    await installSpeechMock(page);
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto("/");
    mkdirSync(outputDirectory, { recursive: true });
    await page.screenshot({caret: "initial",
      path: `${outputDirectory}/${viewport.name}-initial.png`,
      fullPage: true,
    });

    await page.getByRole("textbox").fill("특별교통수단 신청 방법");
    await page.getByRole("button", { name: "질문하기", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "특별교통수단 운영", exact: true }),
    ).toBeVisible();
    await page.screenshot({caret: "initial",
      path: `${outputDirectory}/${viewport.name}-answer.png`,
      fullPage: true,
    });

    await page.reload();
    await page.getByRole("textbox").fill("이동수단 알려줘");
    await page.getByRole("button", { name: "질문하기", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "일반 버스·지하철 이용", exact: true }),
    ).toBeVisible();
    await page.screenshot({caret: "initial",
      path: `${outputDirectory}/${viewport.name}-clarification.png`,
      fullPage: true,
    });
  });
}

if (phase === "after") {
  test("after mobile loading, error and recovery states", async ({ page }) => {
    let release!: () => void;
    const pending = new Promise<void>((resolve) => { release = resolve; });
    await page.route("**/api/public-information/search", async (route) => {
      await pending;
      await route.abort("internetdisconnected");
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await page.getByRole("textbox").fill("특별교통수단 신청 방법");
    await page.getByRole("button", { name: "질문하기", exact: true }).click();
    await expect(page.getByRole("status")).toContainText("안내를 준비하고 있습니다");
    await page.screenshot({caret: "initial", path: `${outputDirectory}/mobile-loading.png`, fullPage: true });

    release();
    await expect(page.getByRole("status")).toContainText("검색 중 문제가 생겼습니다");
    await page.screenshot({caret: "initial", path: `${outputDirectory}/mobile-error.png`, fullPage: true });

    await page.unroute("**/api/public-information/search");
    await page.getByRole("button", { name: "질문하기", exact: true }).click();
    await expect(page.getByRole("heading", { name: "특별교통수단 운영", exact: true })).toBeVisible();
    await page.screenshot({caret: "initial", path: `${outputDirectory}/mobile-recovered.png`, fullPage: true });
  });

  test("after mobile voice and TTS states", async ({ page }) => {
    await installSpeechMock(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await page.getByRole("button", { name: "음성으로 질문하기" }).click();
    await expect(page.getByRole("button", { name: "음성 입력 취소" })).toBeVisible();
    await page.screenshot({caret: "initial", path: `${outputDirectory}/mobile-voice-listening.png`, fullPage: true });

    await page.evaluate(() => {
      window.voiceTest.error("audio-capture");
      window.voiceTest.end();
    });
    await expect(page.getByRole("status")).toContainText("마이크를 사용할 수 없습니다");
    await page.screenshot({caret: "initial", path: `${outputDirectory}/mobile-voice-error.png`, fullPage: true });

    await page.getByRole("textbox").fill("특별교통수단 신청 방법");
    await page.getByRole("button", { name: "질문하기", exact: true }).click();
    await expect(page.getByRole("heading", { name: "특별교통수단 운영", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "답변 듣기", exact: true }).click();
    await expect(page.getByRole("button", { name: "답변 읽기 중지", exact: true })).toHaveAttribute("aria-pressed", "true");
    await page.screenshot({caret: "initial", path: `${outputDirectory}/mobile-tts-playing.png`, fullPage: true });
  });

  test("after mobile limit and unsupported states", async ({ page }) => {
    await page.route("**/api/public-information/search", (route) => {
      const query = route.request().postDataJSON().query;
      if (query !== "여권") return route.continue();
      return route.fulfill({ json: {
        query,
        kind: "search_unavailable",
        results: [],
        hasResults: false,
        answer: {
          userQuestion: query,
          title: "검색 제한",
          plainLanguageSummary: SEARCH_MESSAGES.budget_limited,
          steps: [],
          sources: [],
          nextAction: null,
          verification: { status: "insufficient_data", checkedAt: null },
        },
        officialSearch: { region: "성남시", status: "budget_limited", searched: false, evidence: [], links: [] },
      } });
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await page.getByRole("textbox").fill("여권");
    await page.getByRole("button", { name: "질문하기", exact: true }).click();
    await expect(page.getByRole("status")).toContainText("하루 20회");
    await page.screenshot({caret: "initial", path: `${outputDirectory}/mobile-limit.png`, fullPage: true });

    await page.unroute("**/api/public-information/search");
    await page.getByRole("button", { name: "글자로 다시 질문", exact: true }).click();
    await page.getByRole("textbox").fill("서울 음식물쓰레기 버리는 법");
    await page.getByRole("button", { name: "질문하기", exact: true }).click();
    await expect(page.getByRole("status")).toContainText("다른 지역");
    await page.screenshot({caret: "initial", path: `${outputDirectory}/mobile-unsupported.png`, fullPage: true });
  });
}
