import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { createExpandedPublicInformationResponse } from "../src/lib/search/expanded-public-information";
import { createOfficialSearchProvider } from "../src/lib/search/openai-official-search";
import { fetchOfficialSource } from "../src/lib/search/fetch-official-source";
import { readSearchAnswer } from "../src/lib/search/read-search-answer";
const dir="docs/voicecare-evaluation/submission-final-20260907";
const prior="docs/voicecare-evaluation/final-expanded-20260907";
const live=process.argv.includes("--production");
const mode=live?"production-live":process.argv.includes("--final-replay")?"replay-final":"replay";
// Failures first; the selected 20 questions are unchanged.
const ids=[113,83,66,71,81,53,138,130,97,98,9,68,115,52,27,31,140,73,75,134];
async function main(){
  mkdirSync(dir,{recursive:true});const rows=[];
  for(const number of ids){
    const id=`domain-${String(number).padStart(3,"0")}`;
    const path=`${dir}/${id}-${mode}.json`;
    if(existsSync(path)){rows.push(JSON.parse(readFileSync(path,"utf8")));continue;}
    const old=JSON.parse(readFileSync(`${prior}/${id}-live.json`,"utf8"));
    let capturedCalls=0;
    const start=Date.now();
    const result=live?await fetch("https://seongnam-voicecare-ai.vercel.app/api/public-information/search",{
      method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({query:old.question}),signal:AbortSignal.timeout(40000)
    }).then(async r=>({status:r.status,body:await r.json()})):
      await createExpandedPublicInformationResponse({query:old.question},createOfficialSearchProvider({PUBLIC_INFORMATION_WEB_SEARCH_ENABLED:"true",PUBLIC_INFORMATION_SEARCH_DAILY_USD:"3",OPENAI_API_KEY:"replay-only",OPENAI_MODEL:"fixture"},async()=>{
        capturedCalls++;const saved=JSON.parse(readFileSync(`${prior}/${id}-live-provider.json`,"utf8"));return Response.json(saved.body,{status:saved.status});
      },fetchOfficialSource,()=>({allowed:true,release(){}})));
    const parsed=readSearchAnswer(result.body);
    const row={id,question:old.question,at:new Date().toISOString(),mode:live?"FRESH_PRODUCTION_HTTP_SHARED_REDIS_NO_OVERRIDE":"CAPTURED_PROVIDER_CURRENT_HTTPS_NOT_NEW_MODEL",ms:Date.now()-start,httpStatus:result.status,schemaPass:!!parsed,capturedCalls,response:result.body,semanticReview:"PENDING"};
    rows.push(row);writeFileSync(path,JSON.stringify(row,null,2));
    writeFileSync(`${dir}/${mode}-summary.json`,JSON.stringify({mode,rows},null,2));
    console.log(JSON.stringify({id,status:result.status,kind:parsed?.kind,search:parsed?.officialSearch?.status,tools:live?parsed?.officialSearch?.usage?.toolCalls:0,evidence:parsed?.officialSearch?.evidence.map(e=>e.url)}));
    if(result.status===429||parsed?.officialSearch?.status==="budget_limited")break;
    // Preserve public request and search spacing; never reset any counter.
    await new Promise(resolve=>setTimeout(resolve,2100));
  }
}
void main().catch(error=>{console.error(error instanceof Error?error.message:"audit_failed");process.exitCode=1;});
