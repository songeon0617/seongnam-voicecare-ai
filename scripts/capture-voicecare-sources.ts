import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { fetchOfficialSource } from "../src/lib/search/fetch-official-source";
import { relevantNavigation } from "../src/lib/search/official-navigation";
const dir="docs/voicecare-evaluation/recovery-20260907/sources";
mkdirSync(dir,{recursive:true});
const summary=JSON.parse(readFileSync("docs/voicecare-evaluation/release-20260907/summary.json","utf8"));
const index:Record<string,unknown>=existsSync(`${dir}/index.json`)?JSON.parse(readFileSync(`${dir}/index.json`,"utf8")):{};
async function capture(url:string){
  const hash=createHash("sha256").update(url).digest("hex");
  try {
    const page=await fetchOfficialSource(url,AbortSignal.timeout(15000),(final,html)=>writeFileSync(`${dir}/${hash}.html`,html));
    writeFileSync(`${dir}/${hash}.json`,JSON.stringify(page,null,2));index[url]={file:hash,finalUrl:page.url,status:"fetched"};return page;
  }catch(e){index[url]={status:"failed",error:e instanceof Error?e.message:String(e)};}
  finally{writeFileSync(`${dir}/index.json`,JSON.stringify(index,null,2));}
}
async function main(){
 const directory=await capture("https://www.seongnam.go.kr/sitemap");
 if(!directory)throw Error("sitemap unavailable");
 const urls=new Set<string>();
 for(const row of summary.stage1.rows){
  for(const l of relevantNavigation(directory,row.question)){urls.add(l.url);console.log(row.id,l.title,l.url);}
  for(const page of row.diagnostics?.pages??[])urls.add(page.url);
 }
 const extra=process.argv.slice(2);for(const url of extra)urls.add(url);
 for(const url of urls) if(!index[url]||extra.includes(url)){await capture(url);console.log(index[url]);}
}
void main();
