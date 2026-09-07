import "server-only";
import { randomUUID } from "node:crypto";
import { abortable, boundedResponseText } from "./bounded-io";
import { acquireSearchBudget } from "./search-budget";

export type BudgetLease = {allowed:false;reason:"budget_limited"|"rate_limited"}|{allowed:true;release:()=>void|Promise<void>};
export type BudgetAcquirer = (configured:number)=>BudgetLease|Promise<BudgetLease>;
// Redis time, one atomic reservation across all instances. Failures are not refunded.
export const RESERVE_SEARCH_LUA = `
local clock = redis.call('TIME')
local ms = tonumber(clock[1])*1000 + math.floor(tonumber(clock[2])/1000)
local day = math.floor(tonumber(clock[1])/86400)
local saved = tonumber(redis.call('HGET',KEYS[1],'day') or '-1')
if saved ~= day then redis.call('HSET',KEYS[1],'day',day,'count',0,'reserved',0) end
local reserved = tonumber(redis.call('HGET',KEYS[1],'reserved') or '0')
local count = tonumber(redis.call('HGET',KEYS[1],'count') or '0')
if count >= 20 or reserved + 150000 > tonumber(ARGV[1]) then return 0 end
local last = tonumber(redis.call('HGET',KEYS[1],'last') or '0')
if ms-last < 2000 or redis.call('EXISTS',KEYS[2]) == 1 then return 2 end
redis.call('SET',KEYS[2],ARGV[2],'PX',60000)
redis.call('HSET',KEYS[1],'last',ms,'count',count+1,'reserved',reserved+150000)
redis.call('EXPIRE',KEYS[1],172800)
return 1`;
const RELEASE_SEARCH_LUA = `if redis.call('GET',KEYS[1]) == ARGV[1] then return redis.call('DEL',KEYS[1]) end return 0`;

export function createRuntimeSearchBudget(env:Readonly<Record<string,string|undefined>>,fetcher:typeof fetch=fetch):BudgetAcquirer {
  const endpoint=env.UPSTASH_REDIS_REST_URL,token=env.UPSTASH_REDIS_REST_TOKEN;
  if(!endpoint||!token){
    // An in-memory lease cannot protect a serverless/production deployment.
    if(env.VERCEL||env.NODE_ENV==="production")return ()=>({allowed:false,reason:"budget_limited"});
    return acquireSearchBudget;
  }
  let valid=false;
  try{const u=new URL(endpoint);valid=u.protocol==="https:"&&!u.username&&!u.password&&u.pathname==="/"&&!u.search&&!u.hash&&(!u.port||u.port==="443")&&u.hostname.endsWith(".upstash.io");}catch{}
  if(!valid)return ()=>({allowed:false,reason:"budget_limited"});
  async function command(args:(string|number)[]) {
    const signal=AbortSignal.timeout(2000);
    const r=await abortable(fetcher(endpoint!,{method:"POST",headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},body:JSON.stringify(args),signal,redirect:"error",cache:"no-store"}),signal);
    if(!r.ok)throw Error("budget_store_unavailable");
    const body=JSON.parse(await boundedResponseText(r,signal,4000));
    if(body.error||!Number.isInteger(body.result))throw Error("budget_store_unavailable");
    return body.result as number;
  }
  return async configured=>{
    if(!Number.isFinite(configured)||configured<=0)return {allowed:false,reason:"budget_limited"};
    const owner=randomUUID();
    try{
      const result=await command(["EVAL",RESERVE_SEARCH_LUA,2,"voicecare:{search}:budget","voicecare:{search}:active",Math.floor(Math.min(configured,3)*1e6),owner]);
      if(result!==1)return {allowed:false,reason:result===2?"rate_limited":"budget_limited"};
      let released=false;
      return {allowed:true,async release(){if(released)return;released=true;try{await command(["EVAL",RELEASE_SEARCH_LUA,1,"voicecare:{search}:active",owner]);}catch{/* Lease expires; reservation remains. */}}};
    }catch{return {allowed:false,reason:"budget_limited"};}
  };
}
