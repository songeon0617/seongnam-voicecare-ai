import assert from "node:assert/strict";
import test from "node:test";
import {createOfficialSearchProvider} from "./openai-official-search";
import {createRequestSearchBudget} from "./request-search-budget";
import {createExpandedPublicInformationResponse} from "./expanded-public-information";
const env={NODE_ENV:"production",PUBLIC_INFORMATION_WEB_SEARCH_ENABLED:"true",PUBLIC_INFORMATION_SEARCH_DAILY_USD:"3",OPENAI_API_KEY:"fixture",OPENAI_MODEL:"gpt-5.6-terra",UPSTASH_REDIS_REST_URL:"https://fixture.upstash.io",UPSTASH_REDIS_REST_TOKEN:"fixture"};
test("production provider calls default shared admission before the paid API and releases after source failure",async()=>{
 const order:string[]=[];
 const provider=createOfficialSearchProvider(env,(async(url,init)=>{
   if(String(url)===env.UPSTASH_REDIS_REST_URL){const cmd=JSON.parse(String(init?.body));order.push(cmd[2]===2?"reserve":"release");return Response.json({result:1});}
   order.push("paid");assert.equal(order[0],"reserve");return Response.json({status:"completed",output:[{type:"web_search_call",status:"completed",action:{type:"search",sources:[]}}]});
 }) as typeof fetch,async()=>{throw Error("source_http_404");});
 const result=await provider.search("성남 여권",AbortSignal.timeout(1000));
 assert.deepEqual(order,["reserve","paid","release"]);assert.equal(result.evidence.length,0);
 assert.equal(result.diagnostics?.budget?.aiCalls,1);assert.equal(result.diagnostics?.budget?.searchCalls,1);
});
test("two production provider instances share one atomic admission and a denied lease spends no API call",async()=>{
 let active=false,paid=0;let finish:()=>void=()=>{};
 const gate=new Promise<void>(resolve=>{finish=resolve;});
 const network=(async(url,init)=>{
  if(String(url)===env.UPSTASH_REDIS_REST_URL){const cmd=JSON.parse(String(init?.body));if(cmd[2]===2){if(active)return Response.json({result:2});active=true;}else active=false;return Response.json({result:1});}
  paid++;await gate;return new Response("failure",{status:503});
 }) as typeof fetch;
 const first=createOfficialSearchProvider(env,network).search("여권",AbortSignal.timeout(2000));
 await new Promise(resolve=>setTimeout(resolve,5));
 const second=await createOfficialSearchProvider(env,network).search("도서관",AbortSignal.timeout(2000));
 assert.equal(second.status,"rate_limited");assert.equal(paid,1);finish();await first;assert.equal(active,false);
});
test("missing or failing shared store cannot reach the paid API",async()=>{
 for(const config of [{...env,UPSTASH_REDIS_REST_TOKEN:undefined},env]){
  const provider=createOfficialSearchProvider(config,(async(url)=>{assert.equal(String(url),env.UPSTASH_REDIS_REST_URL);throw Error("store down");}) as typeof fetch);
  assert.equal((await provider.search("여권",AbortSignal.timeout(1000))).status,"budget_limited");
 }
});
test("all navigation and original fetches consume a single bounded request allowance",async()=>{
 const budget=createRequestSearchBudget(new AbortController().signal);
 for(let i=0;i<16;i++)budget.consume("originalFetches");assert.throws(()=>budget.consume("originalFetches"),/budget/);
 budget.consume("aiCalls");assert.throws(()=>budget.consume("aiCalls"),/budget/);
 const urls=Array.from({length:3},(_,i)=>({url:`https://www.seongnam.go.kr/p${i}`}));
 let originals=0;
 const provider=createOfficialSearchProvider(env,(async(url)=>String(url)===env.UPSTASH_REDIS_REST_URL?Response.json({result:1}):Response.json({status:"completed",output:[{type:"web_search_call",status:"completed",action:{type:"search",sources:urls}}]})) as typeof fetch,
  async url=>{originals++;return {url,title:"여권 메뉴",paragraphs:[],sections:[],navigation:Array.from({length:10},(_,i)=>({url:`https://www.seongnam.go.kr/menu${originals}-${i}`,title:"여권 신청"})),checkedAt:new Date().toISOString(),fromCache:false};});
 const result=await provider.search("여권 준비물",AbortSignal.timeout(2000));assert.equal(originals,16);assert.equal(result.diagnostics?.budget?.originalFetches,16);assert.equal(result.evidence.length,0);
});
test("a stalled source or provider exits safely on the request deadline",async()=>{
 const network=(async(url)=>String(url)===env.UPSTASH_REDIS_REST_URL?Response.json({result:1}):new Promise(()=>{})) as typeof fetch;
 const provider=createOfficialSearchProvider(env,network);
 const result=await provider.search("여권",AbortSignal.timeout(30));assert.equal(result.status,"timeout");
 let called=false;await createExpandedPublicInformationResponse({query:"특별교통수단 알려줘"},{search:async()=>{called=true;return result;}});assert.equal(called,false);
});
