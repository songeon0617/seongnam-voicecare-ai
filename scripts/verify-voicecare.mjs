import { spawnSync } from "node:child_process";
const commands=[
  ["node_modules/eslint/bin/eslint.js"],
  ["node_modules/typescript/bin/tsc","--noEmit"],
  ["node_modules/tsx/dist/cli.mjs","--conditions=react-server","--test","src/lib/search/*.test.ts","src/lib/ai/*.test.ts"],
  ["scripts/test-ui.mjs"],
  ["node_modules/next/dist/bin/next","build"],
];
for(const args of commands){
  console.log(`Running ${args.join(" ")}`);
  const result=spawnSync(process.execPath,args,{stdio:"inherit",env:{...process.env,PUBLIC_INFORMATION_WEB_SEARCH_ENABLED:"false",PUBLIC_INFORMATION_AI_ENABLED:"false",OPENAI_API_KEY:""}});
  if(result.status!==0)process.exit(result.status??1);
}
