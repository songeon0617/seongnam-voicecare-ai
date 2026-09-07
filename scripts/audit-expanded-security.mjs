import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
const git = args => execFileSync('git', args, {encoding:'utf8',maxBuffer:100_000_000}).trim();
const directory=process.env.VOICECARE_RESULT_DIRECTORY??'docs/voicecare-evaluation/final-expanded-20260907';
const env=existsSync('.env.local')?readFileSync('.env.local','utf8'):'';
const names=['OPENAI_API_KEY','UPSTASH_REDIS_REST_TOKEN','VERCEL_TOKEN'];
const secrets=names.flatMap(name=>{const m=env.match(new RegExp(`^${name}=(.*)$`,'m'));const value=m?.[1].trim().replace(/^["']|["']$/g,'');return value&&value.length>=20?[value]:[];});
const patterns=[/sk-(?:proj-)?[A-Za-z0-9_-]{30,}/g,/gh[pousr]_[A-Za-z0-9]{30,}/g,/AKIA[A-Z0-9]{16}/g,/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g];
function matches(value){return secrets.some(s=>value.includes(s))||patterns.some(p=>{p.lastIndex=0;return p.test(value);});}
const files=git(['ls-files','-co','--exclude-standard']).split('\n');
const workingFindings=files.filter(p=>existsSync(p)&&matches(readFileSync(p,'utf8')));
const objects=git(['rev-list','--objects','--all']).split('\n');
const objectData=execFileSync('git',['cat-file','--batch'],{input:objects.map(l=>l.split(' ')[0]).join('\n')+'\n',maxBuffer:200_000_000});
let at=0;const historyFindings=[];
while(at<objectData.length){const end=objectData.indexOf(10,at);if(end<0)break;const [sha,type,size]=objectData.subarray(at,end).toString().split(' ');at=end+1;const length=Number(size);if(!Number.isFinite(length))break;const content=objectData.subarray(at,at+length);if(type==='blob'&&matches(content.toString('utf8')))historyFindings.push({sha,path:objects.find(l=>l.startsWith(sha+' '))?.slice(sha.length+1)??null});at+=length+1;}
function walk(path){if(!existsSync(path))return [];return readdirSync(path,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(join(path,e.name)):[join(path,e.name)]);}
const clientFiles=walk('.next/static');
const bundleFindings=clientFiles.filter(p=>matches(readFileSync(p,'utf8')));
const flags=Object.fromEntries(['PUBLIC_INFORMATION_AI_ENABLED','PUBLIC_INFORMATION_WEB_SEARCH_ENABLED','PUBLIC_INFORMATION_SEARCH_DAILY_USD','OPENAI_MODEL'].map(name=>[name,env.match(new RegExp(`^${name}=(.*)$`,'m'))?.[1].trim()??'absent']));
const result={checkedAt:new Date().toISOString(),scope:'all local refs reachable git objects, tracked/untracked nonignored files, generated client static bundle; high-confidence patterns plus exact locally configured credentials',commits:Number(git(['rev-list','--all','--count'])),objects:objects.length,workingFiles:files.length,clientFiles:clientFiles.length,workingFindings,historyFindings,bundleFindings,envIgnored:git(['check-ignore','.env.local'])==='.env.local',trackedEnvFiles:git(['ls-files','--','.env*']),localCredentialPresence:Object.fromEntries(names.map(name=>[name,new RegExp(`^${name}=.+`,'m').test(env)])),localFlags:flags};
writeFileSync(`${directory}/security.json`,JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
if(workingFindings.length||historyFindings.length||bundleFindings.length)process.exitCode=1;
