import { readFileSync, writeFileSync } from "node:fs";
import { createOfficialSearchProvider } from "../src/lib/search/openai-official-search";
import { fetchOfficialSource } from "../src/lib/search/fetch-official-source";
const dir="docs/voicecare-evaluation/submission-final-20260907";
async function main(){
 const rows=[];
 for(const id of ["domain-097","domain-130","domain-134"]){
  const prior=JSON.parse(readFileSync(`${dir}/${id}-production-live.json`,"utf8"));
  const forbidden=prior.response.officialSearch.links.map((l:{url:string})=>l.url);
  // Synthetic provider output reproduces the observed candidates, not a new model call.
  const body={status:"completed",output:[{type:"web_search_call",status:"completed",action:{type:"search",sources:forbidden.map((url:string)=>({url}))}},{type:"message",content:[{type:"output_text",text:'{"findings":[]}'}]}]};
  const provider=createOfficialSearchProvider({PUBLIC_INFORMATION_WEB_SEARCH_ENABLED:"true",PUBLIC_INFORMATION_SEARCH_DAILY_USD:"3",OPENAI_API_KEY:"fixture",OPENAI_MODEL:"fixture"},async()=>Response.json(body),fetchOfficialSource,()=>({allowed:true,release(){}}));
  const result=await provider.search(prior.question,AbortSignal.timeout(30000));
  const noWrongSource=![...result.links,...result.evidence].some(l=>forbidden.includes(l.url));
  const expected=id==="domain-097"?/성남시청 1층 종합민원실/:id==="domain-130"?/2026년 9월.*관람료 : 무료/:/인터넷 예매/;
  const coreComplete=result.evidence.some(e=>expected.test(e.excerpt));
  const pass=noWrongSource&&coreComplete;
  rows.push({id,question:prior.question,forbidden,result,noWrongSource,coreComplete,pass});
  console.log(id,pass?"PASS":"FAIL",result.status,result.links.map(l=>l.url));
 }
 writeFileSync(`${dir}/observed-risk-replay.json`,JSON.stringify({at:new Date().toISOString(),mode:"SYNTHETIC_PROVIDER_OBSERVED_BAD_CANDIDATES_CURRENT_HTTPS_ZERO_MODEL",rows},null,2));
 if(rows.some(r=>!r.pass))process.exitCode=1;
}
void main();
