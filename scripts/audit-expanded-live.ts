import { loadEnvConfig } from "@next/env";
import { assertVoiceCareActive } from "../src/lib/archive";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { createOfficialSearchProvider } from "../src/lib/search/openai-official-search";
import { createExpandedPublicInformationResponse } from "../src/lib/search/expanded-public-information";
import { fetchOfficialSource } from "../src/lib/search/fetch-official-source";
import { readSearchAnswer } from "../src/lib/search/read-search-answer";
import { VOICECARE_EVALUATION_CASES } from "./voicecare-evaluation-cases";
import type { BudgetAcquirer } from "../src/lib/search/shared-search-budget";

loadEnvConfig(process.cwd());
assertVoiceCareActive();
const directory="docs/voicecare-evaluation/final-expanded-20260907";
const probe=process.argv.includes("--probe-final");
const ids=(probe?[66,138]:[97,98,9,68,113,115,81,83,52,53,66,71,27,31,138,140,73,75,130,134]).map(n=>`domain-${String(n).padStart(3,"0")}`);
const ledgerPath=`${directory}/live-ledger.json`;
type Attempt={id:string;at:string;reservationUsd:number;httpStatus?:number;usage?:unknown};
const ledger:{attempts:Attempt[]}=existsSync(ledgerPath)?JSON.parse(readFileSync(ledgerPath,"utf8")):{attempts:[]};
let active=false,currentId="",last=0;
const replay=process.argv.includes("--replay");
const acquire:BudgetAcquirer=()=>{
  if(replay)return {allowed:true,release(){}};
  if(ledger.attempts.length>=20)return {allowed:false,reason:"budget_limited"};
  if(active||Date.now()-last<2000)return {allowed:false,reason:"rate_limited"};
  ledger.attempts.push({id:currentId,at:new Date().toISOString(),reservationUsd:0.15});
  writeFileSync(ledgerPath,JSON.stringify(ledger,null,2));active=true;last=Date.now();
  return {allowed:true,release(){active=false;}};
};
const capture:typeof fetch=async(input,init)=>{
  if(replay){const saved=JSON.parse(readFileSync(`${directory}/${currentId}-live-provider.json`,"utf8"));return Response.json(saved.body,{status:saved.status});}
  const response=await fetch(input,init);
  const raw=await response.clone().json().catch(()=>null);
  const attempt=ledger.attempts.at(-1)!;attempt.httpStatus=response.status;attempt.usage=raw?.usage;
  writeFileSync(ledgerPath,JSON.stringify(ledger,null,2));
  writeFileSync(`${directory}/${currentId}-${probe?'probe':'live'}-provider.json`,JSON.stringify({status:response.status,body:raw},null,2));
  return response;
};
async function main(){
  if(!replay&&!process.argv.includes("--allow-paid"))throw Error("Explicit --allow-paid is required. Never resets any ledger or changes billing settings.");
  const provider=createOfficialSearchProvider({...process.env,PUBLIC_INFORMATION_WEB_SEARCH_ENABLED:"true",PUBLIC_INFORMATION_SEARCH_DAILY_USD:"3"},capture,fetchOfficialSource,acquire);
  const results=[];let failures=0;
  for(const id of ids){
    const file=`${directory}/${id}-${probe?'probe':replay?'replay':'live'}.json`;
    if(existsSync(file)){results.push(JSON.parse(readFileSync(file,"utf8")));continue;}
    currentId=id;const entry=VOICECARE_EVALUATION_CASES.find(c=>c.id===id)!;
    const start=Date.now();const result=await createExpandedPublicInformationResponse({query:entry.question},provider);
    const parsed=readSearchAnswer(result.body);
    const row={id,question:entry.question,at:new Date().toISOString(),ms:Date.now()-start,schemaPass:!!parsed,response:result.body,semanticReview:"PENDING"};
    results.push(row);writeFileSync(file,JSON.stringify(row,null,2));
    console.log(JSON.stringify({id,kind:parsed?.kind,status:parsed?.officialSearch?.status,ms:row.ms,evidence:parsed?.officialSearch?.evidence.map(e=>e.url)}));
    writeFileSync(`${directory}/${probe?'probe':replay?'replay':'live'}-summary.json`,JSON.stringify({mode:replay?"CAPTURED_FINAL_AUDIT_PROVIDER_LIVE_HTTPS":"LIVE_OPENAI_LIVE_HTTPS_LOCAL_PERSISTENT_AUDIT_BUDGET",actualPaidCalls:replay?0:probe?results.length:ledger.attempts.length,productionRedisTest:false,selectedIds:ids,attempts:ledger.attempts.length,reservedUsd:ledger.attempts.length*.15,results},null,2));
    failures=parsed?.officialSearch&&["provider_error","timeout","invalid_output"].includes(parsed.officialSearch.status)?failures+1:0;
    if(failures>=2||parsed?.officialSearch?.status==="budget_limited")break;
    await new Promise(resolve=>setTimeout(resolve,2100));
  }
}
void main().catch(error=>{console.error(error instanceof Error?error.message:"audit failed");process.exitCode=1;});
