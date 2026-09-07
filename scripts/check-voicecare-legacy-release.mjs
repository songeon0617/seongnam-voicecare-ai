import {spawn} from "node:child_process";
import {readFileSync,writeFileSync} from "node:fs";
const directory=process.env.VOICECARE_RESULT_DIRECTORY??"docs/voicecare-evaluation/release-20260907";
const results=[];
// Fresh isolated server per batch preserves the real 30/minute production limiter.
for(const [from,to] of [[1,20],[21,40],[41,61]]){
  const server=spawn(process.execPath,["node_modules/next/dist/bin/next","start","--hostname","127.0.0.1","--port","3101"],{stdio:"ignore",env:{...process.env,PUBLIC_INFORMATION_AI_ENABLED:"false",PUBLIC_INFORMATION_WEB_SEARCH_ENABLED:"false",OPENAI_API_KEY:""}});
  const closed=new Promise(resolve=>server.once("exit",resolve));
  try{
    let ready=false;
    for(let tries=0;tries<100;tries++){
      if(server.exitCode!==null)throw Error("Test server exited before ready");
      try{ready=(await fetch("http://127.0.0.1:3101",{signal:AbortSignal.timeout(1000)})).ok;}catch{}
      if(ready)break;
      await new Promise(resolve=>setTimeout(resolve,200));
    }
    if(!ready)throw Error("Test server startup timeout");
    const file=`${directory}/legacy-e2e-${from}-${to}.json`;
    const child=spawn(process.execPath,["node_modules/tsx/dist/cli.mjs","--conditions=react-server","scripts/evaluate-public-information-e2e.ts","--base-url","http://127.0.0.1:3101","--from",String(from),"--to",String(to),"--output",file],{stdio:"inherit"});
    await new Promise(resolve=>child.once("exit",resolve));
    results.push(...JSON.parse(readFileSync(file,"utf8")).results);
  }finally{server.kill();await closed;}
}
const summary={mode:"BUILT_NEXT_HTTP_AI_AND_SEARCH_OFF_ORIGINAL_EXPECTATIONS_UNCHANGED",total:results.length,pass:results.filter(r=>r.pass).length,fail:results.filter(r=>!r.pass).length,httpErrors:results.filter(r=>r.httpStatus!==200).length,note:"Legacy strict route/document contract differs from expanded clarification/search contract. Its hallucination flag is a structural mapping check, not semantic adjudication.",results};
writeFileSync(`${directory}/legacy-e2e-summary.json`,JSON.stringify(summary,null,2));
console.log(JSON.stringify({...summary,results:undefined}));
if(summary.fail)process.exitCode=1;
