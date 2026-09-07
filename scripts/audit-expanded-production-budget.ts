import { writeFileSync } from "node:fs";
import { readSearchAnswer } from "../src/lib/search/read-search-answer";

const base="https://seongnam-voicecare-ai.vercel.app";
async function main(){
 const queries=["성남시에서 처음 여권 만들 때 준비물 알려줘","성남시 도서관 회원증 처음 만들려면 어떻게 해요?"];
 const startedAt=new Date().toISOString();
 const results=await Promise.all(queries.map(async query=>{
  const start=Date.now();
  const response=await fetch(`${base}/api/public-information/search`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({query}),signal:AbortSignal.timeout(40000)});
  const body=await response.json();
  return {query,status:response.status,durationMs:Date.now()-start,schema:!!readSearchAnswer(body),body};
 }));
 const runtimePass=results.every(r=>r.status===200&&r.schema)
  &&results.filter(r=>r.body.officialSearch?.searched&&r.body.officialSearch?.evidence?.length>0).length===1
  &&results.filter(r=>r.body.officialSearch?.status==="rate_limited"&&!r.body.officialSearch?.searched).length===1;
 const result={startedAt,base,requestCount:2,maxPotentialProviderCalls:2,runtimePass,note:"Real simultaneous Production requests. Different queries avoid query-cache hits; Vercel instance placement is not observable. A rate_limited response together with grounded search shows runtime shared reservation is functioning, not forced multi-instance proof.",results};
 writeFileSync("docs/voicecare-evaluation/final-expanded-20260907/production-budget.json",JSON.stringify(result,null,2));
 console.log(JSON.stringify(result,null,2));
 if(!runtimePass)process.exitCode=1;
}
void main();
