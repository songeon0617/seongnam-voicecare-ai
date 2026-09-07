import { defineConfig } from "@playwright/test";

const baseURL = process.env.VOICECARE_AUDIT_URL ?? "http://127.0.0.1:3102";
export default defineConfig({
  testDir:"./tests/audit",fullyParallel:false,workers:1,retries:0,
  reporter:[["json",{outputFile:process.env.VOICECARE_AUDIT_OUTPUT ?? "docs/voicecare-evaluation/final-expanded-20260907/cross-browser-local.json"}]],
  use:{baseURL},
  projects:[{name:"chromium",use:{browserName:"chromium"}},{name:"firefox",use:{browserName:"firefox"}},{name:"webkit",use:{browserName:"webkit"}}],
  ...(process.env.VOICECARE_AUDIT_URL?{}:{webServer:{
    command:"node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3102",url:baseURL,reuseExistingServer:false,timeout:30000,
    env:{OPENAI_API_KEY:"",PUBLIC_INFORMATION_AI_ENABLED:"false",PUBLIC_INFORMATION_WEB_SEARCH_ENABLED:"false"},
  }}),
});
