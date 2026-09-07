import {spawnSync} from "node:child_process";
// Each suite gets a fresh server process. This preserves the production 30/minute
// boundary and prevents unrelated voice tests from consuming another suite's quota.
for(const suite of ["question-panel.spec.ts","voice-panel.spec.ts","expanded-panel.spec.ts","submission-panel.spec.ts"]){
  const result=spawnSync(process.execPath,["node_modules/@playwright/test/cli.js","test",suite],{stdio:"inherit"});
  if(result.status!==0)process.exit(result.status??1);
}
