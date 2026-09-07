import { writeFileSync } from "node:fs";
import { readSearchAnswer } from "../src/lib/search/read-search-answer";
const base=process.env.VOICECARE_AUDIT_URL??"http://127.0.0.1:3102";
const directory=process.env.VOICECARE_RESULT_DIRECTORY??"docs/voicecare-evaluation/final-expanded-20260907";
const production=!['127.0.0.1','localhost'].includes(new URL(base).hostname);
async function main(){
 const cases=[
  {name:"empty",body:JSON.stringify({query:" "}),status:400,code:"empty_query"},
  {name:"long",body:JSON.stringify({query:"가".repeat(601)}),status:413,code:"query_too_long"},
  {name:"malformed_json",body:"{",status:400,code:"invalid_json"},
  {name:"missing_query",body:"{}",status:400,code:"invalid_request"},
  {name:"wrong_type",body:JSON.stringify({query:10}),status:400,code:"invalid_request"},
  {name:"oversized_bytes",body:JSON.stringify({query:"가".repeat(2000)}),status:413,code:"body_too_large"},
  {name:"bad_context",body:JSON.stringify({query:"1",context:{question:"질문",clarificationId:"invented"}}),status:400,code:"invalid_request"},
  {name:"normal",body:JSON.stringify({query:"특별교통수단"}),status:200,kind:"answer"},
  {name:"multiple",body:JSON.stringify({query:"특별교통수단과 장애인 택시바우처"}),status:200,kind:"clarification"},
  {name:"unclear",body:JSON.stringify({query:"도움"}),status:200,kind:"clarification"},
  {name:"out_of_scope",body:JSON.stringify({query:"파이썬 코드 만들어"}),status:200,kind:"unsupported"},
 ];
 const homepage=await fetch(base,{signal:AbortSignal.timeout(15000)});
 const headers=Object.fromEntries(["x-content-type-options","x-frame-options","referrer-policy","permissions-policy","strict-transport-security"].map(k=>[k,homepage.headers.get(k)]));
 const results=[];
 for(const c of cases){
  const response=await fetch(`${base}/api/public-information/search`,{method:"POST",headers:{"Content-Type":"application/json"},body:c.body,signal:AbortSignal.timeout(35000)});
  const body=await response.json();const schema=c.status===200?!!readSearchAnswer(body):body.error?.code===c.code;
  const sources=c.name!=="normal"||body.answer?.sources?.[0]?.url==="https://www.seongnam.go.kr/wf-pm020101/23018";
  results.push({name:c.name,status:response.status,expectedStatus:c.status,schema,sources,noStore:response.headers.get("cache-control")==="no-store",pass:response.status===c.status&&schema&&sources&&(!c.kind||body.kind===c.kind),body});
 }
 const result={at:new Date().toISOString(),base,headers,total:results.length,pass:results.filter(r=>r.pass).length,paidCalls:0,note:"Static routes and validation only. Internal errors/provider timeout/no-results are injected server integration tests, not public debug endpoints.",results};
 writeFileSync(`${directory}/http-${production?'production':'local'}.json`,JSON.stringify(result,null,2));
 console.log(JSON.stringify({...result,results:results.filter(r=>!r.pass)},null,2));if(result.pass!==result.total)process.exitCode=1;
}
void main();
