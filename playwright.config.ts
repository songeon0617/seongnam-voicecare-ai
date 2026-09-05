import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/ui",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  use: { baseURL: "http://127.0.0.1:3100", browserName: "chromium" },
  webServer: {
    command: "node node_modules/next/dist/bin/next dev --hostname 127.0.0.1 --port 3100",
    url: "http://127.0.0.1:3100",
    reuseExistingServer: false,
    timeout: 120_000,
    // 로컬 키가 있더라도 자동 테스트는 실제 API를 호출하지 않는다.
    env: { PUBLIC_INFORMATION_AI_ENABLED: "false", OPENAI_API_KEY: "", OPENAI_MODEL: "" },
  },
});
