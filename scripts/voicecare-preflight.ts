import { writeFileSync } from "node:fs";
import { assertVoiceCareActive } from "../src/lib/archive";
import { loadEnvConfig } from "@next/env";
import { createPublicInformationResponseWithAnswer } from "../src/lib/search/create-public-information-response-with-answer";

loadEnvConfig(process.cwd());
async function main() {
  assertVoiceCareActive();
  if(!process.argv.includes("--allow-paid-preflight")){console.error("Paid preflight requires explicit --allow-paid-preflight. Do not run under the current offline-only instruction.");process.exitCode=1;return;}
  const query = "이동수단 알려줘";
  const local = await createPublicInformationResponseWithAnswer({query});
  const production = await fetch("https://seongnam-voicecare-ai.vercel.app/api/public-information/search", {
    method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({query}), signal:AbortSignal.timeout(20_000),
  });
  const record = {checkedAt:new Date().toISOString(), payload:{query}, local, production:{status:production.status,body:await production.json()}};
  writeFileSync("docs/voicecare-before.json", JSON.stringify(record,null,2));
  console.log(JSON.stringify(record,null,2));
  if (process.argv.includes("--search-smoke")) {
    const start=Date.now();
    const response=await fetch("https://api.openai.com/v1/responses", {method:"POST", headers:{"Content-Type":"application/json", Authorization:`Bearer ${process.env.OPENAI_API_KEY}`},signal:AbortSignal.timeout(40_000), body:JSON.stringify({
      model:process.env.OPENAI_MODEL,store:false,reasoning:{effort:"low"},max_output_tokens:1800,max_tool_calls:1,
      tools:[{type:"web_search",filters:{allowed_domains:["seongnam.go.kr"]},search_context_size:"low"}],tool_choice:{type:"web_search"},include:["web_search_call.action.sources"],
      input:"성남시 여권 신청 장소를 공식 사이트에서 검색하세요. 검색 결과 URL을 인용하고 짧게 답하세요."
    })});
    const body=await response.json();
    const smoke={checkedAt:new Date().toISOString(),status:response.status,ms:Date.now()-start,body};
    writeFileSync("docs/voicecare-provider-smoke.json",JSON.stringify(smoke,null,2));
    console.log(JSON.stringify(smoke,null,2));
  }
}
void main();
