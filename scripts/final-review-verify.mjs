import {spawnSync} from 'node:child_process';
import {openSync,closeSync,writeFileSync,mkdirSync} from 'node:fs';
const dir='docs/voicecare-evaluation/submission-final-20260907';
mkdirSync(dir,{recursive:true});
const env={...process.env,OPENAI_API_KEY:'',PUBLIC_INFORMATION_AI_ENABLED:'false',PUBLIC_INFORMATION_WEB_SEARCH_ENABLED:'false',VOICECARE_RESULT_DIRECTORY:dir,VOICECARE_AUDIT_OUTPUT:`${dir}/cross-browser-local.json`};
const checks=[
 ['lint',['node_modules/eslint/bin/eslint.js']],
 ['typecheck',['node_modules/typescript/bin/tsc','--noEmit']],
 ['server',['node_modules/tsx/dist/cli.mjs','--conditions=react-server','--test','src/lib/search/*.test.ts','src/lib/ai/*.test.ts']],
 ['ui',['scripts/test-ui.mjs']],
 ['build',['node_modules/next/dist/bin/next','build']],
 ['routing',['node_modules/tsx/dist/cli.mjs','--conditions=react-server','scripts/audit-expanded-routing.ts']],
 ['legacy',['scripts/check-voicecare-legacy-release.mjs']],
 ['browser',['node_modules/@playwright/test/cli.js','test','--config','playwright.audit.config.ts']],
 ['security',['scripts/audit-expanded-security.mjs']],
];
const results=[];
for(const [name,args] of checks){
 const log=openSync(`${dir}/${name}.log`,'w');const start=new Date().toISOString();
 const result=spawnSync(process.execPath,args,{stdio:['ignore',log,log],env});
 closeSync(log);results.push({name,start,end:new Date().toISOString(),exitCode:result.status});
 writeFileSync(`${dir}/verification.json`,JSON.stringify({mode:'NO_PAID_API_ORDERED_CHECKS',results},null,2));
 console.log(name,result.status===0?'PASS':'FAIL');if(result.status!==0)process.exit(result.status??1);
}
