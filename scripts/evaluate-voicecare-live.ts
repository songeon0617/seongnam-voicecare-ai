import { loadEnvConfig } from "@next/env";
import { mkdirSync,readFileSync,writeFileSync,existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { VOICECARE_EVALUATION_CASES } from "./voicecare-evaluation-cases";
import { createOfficialSearchProvider } from "../src/lib/search/openai-official-search";
import { createExpandedPublicInformationResponse } from "../src/lib/search/expanded-public-information";
import { readSearchAnswer } from "../src/lib/search/read-search-answer";
import { fetchOfficialSource } from "../src/lib/search/fetch-official-source";
import type { BudgetAcquirer } from "../src/lib/search/shared-search-budget";

loadEnvConfig(process.cwd());
const directory="docs/voicecare-evaluation/release-20260907";
mkdirSync(directory,{recursive:true});
// Frozen Stage 1 selection before real search; two per requested category.
export const STAGE1=[97,98,9,68,113,115,81,83,52,53,66,71,27,31,138,140,73,75,130,134].map(n=>`domain-${String(n).padStart(3,"0")}`);
async function main(){
  const replay=process.argv.includes("--replay");
  if(!replay&&!process.argv.includes("--allow-paid"))throw Error("Use --allow-paid only after reporting calls and cost. Billing settings are never modified.");
  const only=process.argv[process.argv.indexOf("--id")+1];
  const ids=process.argv.includes("--id")?[only]:STAGE1;
  const ledgerPath=`${directory}/paid-ledger.json`;
  const day=new Date().toISOString().slice(0,10);
  const ledger: {day:string;attempts:{id:string;at:string;reservationUsd:number;status?:number;usage?:unknown}[]}=existsSync(ledgerPath)?JSON.parse(readFileSync(ledgerPath,"utf8")):{day,attempts:[]};
  // No automatic daily rollover in this evaluation: all runs share this 20-call ceiling.
  let active=false,lastStart=0,currentId="";
  const acquire:BudgetAcquirer=()=>{
    if(replay)return {allowed:true,release(){}};
    if(ledger.attempts.length>=20)return {allowed:false,reason:"budget_limited"};
    if(active||Date.now()-lastStart<2000)return {allowed:false,reason:"rate_limited"};
    ledger.attempts.push({id:currentId,at:new Date().toISOString(),reservationUsd:0.15});
    writeFileSync(ledgerPath,JSON.stringify(ledger,null,2));active=true;lastStart=Date.now();
    return {allowed:true,release(){active=false;}};
  };
  const capture:typeof fetch=async(input,init)=>{
    if(replay){
      const prior=ledger.attempts.findLastIndex(a=>a.id===currentId)+1;
      const saved=JSON.parse(readFileSync(`${directory}/${currentId}-provider-${prior}.json`,"utf8"));
      return Response.json(saved.body,{status:saved.status});
    }
    const response=await fetch(input,init);
    const raw=await response.clone().json().catch(()=>null);
    const attempt=ledger.attempts.at(-1)!;attempt.status=response.status;attempt.usage=raw?.usage;
    writeFileSync(ledgerPath,JSON.stringify(ledger,null,2));
    writeFileSync(`${directory}/${currentId}-provider-${ledger.attempts.length}.json`,JSON.stringify({status:response.status,body:raw},null,2));
    return response;
  };
  const provider=createOfficialSearchProvider({...process.env,PUBLIC_INFORMATION_WEB_SEARCH_ENABLED:"true",PUBLIC_INFORMATION_SEARCH_DAILY_USD:"3"},capture,fetchOfficialSource,acquire);
  const results=[];let consecutiveProviderFailures=0;
  for(const id of ids){
    const entry=VOICECARE_EVALUATION_CASES.find(c=>c.id===id);if(!entry)throw Error(`Unknown case ${id}`);
    const path=`${directory}/${id}-${replay?"replay":"result"}.json`;
    if(existsSync(path)&&!process.argv.includes("--retry")){results.push(JSON.parse(readFileSync(path,"utf8")));continue;}
    currentId=id;
    const result=await createExpandedPublicInformationResponse({query:entry.question},provider);
    const parsed=readSearchAnswer(result.body);
    const row={id,mode:replay?"CAPTURED_PROVIDER_LIVE_HTTPS":"LIVE",domain:entry.domain,question:entry.question,expectedBehavior:entry.expectedBehavior,at:new Date().toISOString(),schemaPass:!!parsed,response:result.body,semanticReview:"PENDING",actualAnswerSuccess:null};
    if(existsSync(path))writeFileSync(`${directory}/${id}-previous-${Date.now()}.json`,readFileSync(path));
    writeFileSync(path,JSON.stringify(row,null,2));results.push(row);
    console.log(JSON.stringify({id,kind:parsed?.kind,status:parsed?.officialSearch?.status,diagnostics:parsed?.officialSearch?.diagnostics,usage:parsed?.officialSearch?.usage}));
    const status=parsed?.officialSearch?.status;
    consecutiveProviderFailures=status&&["provider_error","timeout","invalid_output"].includes(status)?consecutiveProviderFailures+1:0;
    if(consecutiveProviderFailures>=2||status==="budget_limited")break;
    await new Promise(resolve=>setTimeout(resolve,2100));
  }
  writeFileSync(`${directory}/stage1-${replay?"replay":"raw"}.json`,JSON.stringify({selectedIds:STAGE1,evaluationSha256:createHash("sha256").update(readFileSync("scripts/voicecare-evaluation-cases.ts")).digest("hex"),results,gate:"SEMANTIC_REVIEW_REQUIRED; fallback/links are not answer success",paidAttempts:ledger.attempts.length},null,2));
}
void main().catch(error=>{console.error(error instanceof Error?error.message:"evaluation failed");process.exitCode=1;});
