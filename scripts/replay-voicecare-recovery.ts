import {readFileSync,writeFileSync,mkdirSync} from "node:fs";
import {createHash} from "node:crypto";
import {createOfficialSearchProvider} from "../src/lib/search/openai-official-search";
import {createExpandedPublicInformationResponse} from "../src/lib/search/expanded-public-information";
import {extractOfficialDocument} from "../src/lib/search/extract-official-document";
import {fetchOfficialSource,isNavigationSource,type OriginalPage} from "../src/lib/search/fetch-official-source";
import {readSearchAnswer} from "../src/lib/search/read-search-answer";
const directory="docs/voicecare-evaluation/recovery-20260907", sources=`${directory}/sources`;
const outputDirectory=process.env.VOICECARE_RESULT_DIRECTORY??directory;
const prior="docs/voicecare-evaluation/release-20260907";
const summary=JSON.parse(readFileSync(`${prior}/summary.json`,"utf8"));
const ledger=JSON.parse(readFileSync(`${prior}/paid-ledger.json`,"utf8"));
const index:Record<string,{status:string;file?:string;error?:string}>=JSON.parse(readFileSync(`${sources}/index.json`,"utf8"));
const capture=process.argv.includes("--capture-missing");
const liveHttps=process.argv.includes("--live-https");
let missing=0;
const original=async(url:string,signal:AbortSignal):Promise<OriginalPage>=>{
 let entry=index[url];
 if(!entry && capture) {
  const file=createHash("sha256").update(url).digest("hex");
  try {
   const page=await fetchOfficialSource(url,signal,(_final,html)=>writeFileSync(`${sources}/${file}.html`,html));
   writeFileSync(`${sources}/${file}.json`,JSON.stringify(page,null,2));entry=index[url]={status:"fetched",file};
  }catch(e){entry=index[url]={status:"failed",error:e instanceof Error?e.message:String(e)};}
  writeFileSync(`${sources}/index.json`,JSON.stringify(index,null,2));
 }
 if(!entry){missing++;throw Error(`fixture_missing:${url}`);}
 if(entry.status!=="fetched")throw Error(entry.error);
 const saved=JSON.parse(readFileSync(`${sources}/${entry.file}.json`,"utf8")) as OriginalPage;
 const page={...saved,...extractOfficialDocument(readFileSync(`${sources}/${entry.file}.html`,"utf8"),saved.url),fromCache:false};
 if(isNavigationSource(page.url)){page.sections=[];page.paragraphs=[];}
 return page;
};
async function main(){
 mkdirSync(outputDirectory,{recursive:true});const results=[];
 for(const row of summary.stage1.rows) {
  const number=ledger.attempts.findIndex((a:{id:string},i:number)=>a.id===row.id&&i!==0)+1;
  const provider=createOfficialSearchProvider({PUBLIC_INFORMATION_WEB_SEARCH_ENABLED:"true",OPENAI_API_KEY:"offline-fixture",OPENAI_MODEL:"gpt-5.6-terra",PUBLIC_INFORMATION_SEARCH_DAILY_USD:"3",NODE_ENV:"production",UPSTASH_REDIS_REST_URL:"https://fixture.upstash.io",UPSTASH_REDIS_REST_TOKEN:"fixture"},
   (async(url,init)=>{
    if(String(url)==="https://fixture.upstash.io")return Response.json({result:1});
    if(String(url)!=="https://api.openai.com/v1/responses"||!init?.body)throw Error("unexpected fixture request");
    const saved=JSON.parse(readFileSync(`${prior}/${row.id}-provider-${number}.json`,"utf8"));
    return Response.json(saved.body,{status:saved.status});
   }) as typeof fetch,liveHttps?fetchOfficialSource:original);
  const result=await createExpandedPublicInformationResponse({query:row.question},provider);
  const parsed=readSearchAnswer(result.body);
  results.push({id:row.id,question:row.question,baseline:row.classification,schemaPass:!!parsed,response:result.body,semanticReview:"PENDING"});
  console.log(row.id,parsed?.kind,parsed?.officialSearch?.diagnostics?.budget,parsed?.officialSearch?.evidence.map(e=>({url:e.url,excerpt:e.excerpt.slice(0,170)})));
 }
 writeFileSync(`${outputDirectory}/stage1-${liveHttps?"live-https":capture?"capture":"offline"}.json`,JSON.stringify({mode:liveHttps||capture?"CAPTURED_PROVIDER_LIVE_HTTPS":"CAPTURED_PROVIDER_CAPTURED_HTTPS_NO_NETWORK",actualPaidCalls:0,fixtureMissing:missing,results},null,2));
 if(missing||results.some(r=>!r.schemaPass))process.exitCode=1;
}
void main();
