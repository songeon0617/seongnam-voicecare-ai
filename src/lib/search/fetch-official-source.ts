import "server-only";
import { lookup } from "node:dns/promises";
import { request } from "node:https";
import { isIP } from "node:net";
import { officialUrl } from "./official-source-policy";
import { abortable } from "./bounded-io";

export const normalizeEvidence = (s: string) => s.normalize("NFKC").replace(/\s+/g," ").trim();
export function publicAddress(ip: string): boolean {
  if (isIP(ip) === 4) {
    const [a,b] = ip.split(".").map(Number);
    return !(a===0 || a===10 || a===127 || a>=224 || (a===169&&b===254) || (a===172&&b>=16&&b<=31) || (a===192&&(b===168||b===0)) || (a===100&&b>=64&&b<=127) || (a===198&&(b===18||b===19)));
  }
  // Conservative IPv6 global unicast only, excluding mapped and documentation ranges.
  return isIP(ip)===6 && /^[23]/i.test(ip) && !/^2001:db8:/i.test(ip) && !ip.includes(".");
}
function decode(s:string) {
  return s.replace(/&#(x[\da-f]+|\d+);/gi,(_,n:string)=>{ const code=n[0].toLowerCase()==="x"?parseInt(n.slice(1),16):Number(n);return code>0&&code<=0x10ffff?String.fromCodePoint(code):" "; })
    .replace(/&nbsp;/gi," ").replace(/&amp;/gi,"&").replace(/&quot;/gi,'"').replace(/&lt;/gi,"<").replace(/&gt;/gi,">").replace(/&#39;/g,"'");
}
export function extractPage(html:string): { title:string; paragraphs:string[] } {
  const title=normalizeEvidence(decode(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/<[^>]*>/g," ")??"성남시 공식 안내")).slice(0,180);
  const clean=html.replace(/<!--[^]*?-->/g," ").replace(/<(script|style|nav|header|footer|form|noscript)\b[^>]*>[\s\S]*?<\/\1>/gi," ");
  const main=clean.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1]??clean;
  // Keep headings, short conditions, table labels and <br> footnotes. A short line can
  // change the meaning of every number below it. Do not truncate an evidence section.
  const complete=normalizeEvidence(decode(main.replace(/<[^>]*>/g," ")));
  // Until a section hierarchy has been semantically evaluated, retain the entire main
  // content. A heading in another section can constrain the quote. Never slice it away.
  const paragraphs=complete.length>=20&&complete.length<=900?[complete]:[];
  return {title,paragraphs};
}
export interface OriginalPage {url:string;title:string;paragraphs:string[];checkedAt:string;fromCache:boolean}
const cache=new Map<string,{expires:number;page:OriginalPage}>();
/** DNS is checked and pinned into the HTTPS socket; every redirect is revalidated. */
export async function fetchOfficialSource(input:string, signal:AbortSignal):Promise<OriginalPage> {
  let current=officialUrl(input);
  if (!current) throw new Error("source_unverified");
  const cached=cache.get(current);
  if(cached&&cached.expires>Date.now()) return {...cached.page,fromCache:true};
  for(let hop=0;hop<3;hop++) {
    if(signal.aborted) throw new Error("timeout");
    const url=new URL(current);
    const addresses=await abortable(lookup(url.hostname,{all:true}),signal);
    if(!addresses.length||addresses.some(x=>!publicAddress(x.address))) throw new Error("source_unverified");
    const pinned=addresses[0];
    const response=await new Promise<{status:number;location?:string;html:string}>((resolve,reject)=>{
      const req=request(url,{signal,timeout:5000,lookup:(_host,options,callback)=>{
        if(options.all) callback(null,[pinned]); else callback(null,pinned.address,pinned.family);
      },headers:{Accept:"text/html","User-Agent":"VoiceCare/1.0 official-evidence-verification"}},res=>{
        if(res.statusCode&&res.statusCode>=300&&res.statusCode<400) {res.resume();resolve({status:res.statusCode,location:res.headers.location,html:""});return;}
        if(res.statusCode!==200||!res.headers["content-type"]?.includes("text/html")) {res.resume();reject(new Error("source_unavailable"));return;}
        let size=0;const chunks:Buffer[]=[];
        res.on("data",(chunk:Buffer)=>{size+=chunk.length;if(size>600_000){req.destroy(new Error("source_unverified"));return;}chunks.push(chunk);});
        res.on("error",reject);
        res.on("end",()=>resolve({status:200,html:Buffer.concat(chunks).toString("utf8")}));
      });
      req.on("timeout",()=>req.destroy(new Error("timeout")));req.on("error",reject);req.end();
    });
    if(response.location) {
      current=officialUrl(new URL(response.location,current).href);
      if(!current) throw new Error("source_unverified");
      continue;
    }
    const parsed=extractPage(response.html);
    const page={url:current,...parsed,checkedAt:new Date().toISOString(),fromCache:false};
    // No complete page or personal roster in cache. Exclude mobile/ID-looking paragraphs.
    page.paragraphs=page.paragraphs.filter(s=>!/\b\d{6}-[1-8]\d{6}|01[016789][- ]?\d{3,4}[- ]?\d{4}|명단|주민등록번호/.test(s));
    if(cache.size>=30) cache.delete(cache.keys().next().value!);
    cache.set(current,{expires:Date.now()+300_000,page});
    return page;
  }
  throw new Error("source_unavailable");
}
