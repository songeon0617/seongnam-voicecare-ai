import {writeFileSync} from "node:fs";
import {fetchOfficialSource} from "../src/lib/search/fetch-official-source";
async function main(){
  const url="https://www.seongnam.go.kr/cn02040801";
  const start=Date.now();
  const output=`docs/voicecare-original-check-${new Date().toISOString().replace(/[:.]/g,"-")}.json`;
  try{
    const page=await fetchOfficialSource(url,AbortSignal.timeout(10000));
    const result={checkedAt:new Date().toISOString(),url:page.url,title:page.title,ms:Date.now()-start,fetch:"PASS",fullContextExcerptCount:page.paragraphs.length,paidCalls:0,note:"Original-page HTTPS check only, not a runtime model/search quality evaluation."};
    writeFileSync(output,JSON.stringify(result,null,2));console.log(result);
  }catch(error){
    const result={checkedAt:new Date().toISOString(),url,ms:Date.now()-start,fetch:"FAIL",error:error instanceof Error?error.message:"unknown",paidCalls:0};
    writeFileSync(output,JSON.stringify(result,null,2));console.log(result);process.exitCode=1;
  }
}
void main();
