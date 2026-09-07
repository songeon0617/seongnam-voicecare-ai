import "server-only";
import { lookup } from "node:dns/promises";
import { request } from "node:https";
import { isIP } from "node:net";
import { officialUrl } from "./official-source-policy";
import { abortable } from "./bounded-io";
import { officialSourceCa } from "./official-source-ca";
import { extractOfficialDocument } from "./extract-official-document";

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
export interface OriginalPage {url:string;title:string;paragraphs:string[];sections?:string[];navigation?:{url:string;title:string}[];textLength?:number;omittedSections?:number;checkedAt:string;fromCache:boolean;redirectCount?:number}
const cache=new Map<string,{expires:number;page:OriginalPage}>();
/** DNS is checked and pinned into the HTTPS socket; every redirect is revalidated. */
export async function fetchOfficialSource(input:string, signal:AbortSignal, capture?: (url:string,html:string)=>void, chargeRedirect?:()=>void):Promise<OriginalPage> {
  let current=officialUrl(input);
  if (!current) throw new Error("source_unverified");
  const cached=cache.get(current);
  if(!capture&&cached&&cached.expires>Date.now()) return {...cached.page,fromCache:true};
  for(let hop=0;hop<3;hop++) {
    if(hop>0)chargeRedirect?.();
    if(signal.aborted) throw new Error("timeout");
    const url=new URL(current);
    const addresses=await abortable(lookup(url.hostname,{all:true}),signal);
    if(!addresses.length||addresses.some(x=>!publicAddress(x.address))) throw new Error("source_unverified");
    const pinned=addresses[0];
    const response=await new Promise<{status:number;location?:string;html:string}>((resolve,reject)=>{
      const req=request(url,{signal,timeout:5000,ca:officialSourceCa(Date.now(),url.hostname),rejectUnauthorized:true,lookup:(_host,options,callback)=>{
        if(options.all) callback(null,[pinned]); else callback(null,pinned.address,pinned.family);
      },headers:{Accept:"text/html","User-Agent":"VoiceCare/1.0 official-evidence-verification"}},res=>{
        if(res.statusCode&&res.statusCode>=300&&res.statusCode<400) {res.resume();resolve({status:res.statusCode,location:res.headers.location,html:""});return;}
        if(res.statusCode!==200||!res.headers["content-type"]?.includes("text/html")) {res.resume();reject(new Error(`source_http_${res.statusCode??0}`));return;}
        let size=0;const chunks:Buffer[]=[];
        // The current official sitemap is 2.3 MB of markup. Only that exact path
        // gets the larger bounded envelope; none of this HTML is sent to a model.
        const maxBytes=url.pathname==="/sitemap"?3_000_000:600_000;
        res.on("data",(chunk:Buffer)=>{size+=chunk.length;if(size>maxBytes){req.destroy(new Error("source_too_large"));return;}chunks.push(chunk);});
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
    capture?.(current,response.html);
    const parsed=extractOfficialDocument(response.html,current);
    const page={url:current,...parsed,checkedAt:new Date().toISOString(),fromCache:false,redirectCount:hop};
    // Portal home/sitemap widgets and navigation are discovery, not policy evidence.
    if(isNavigationSource(current)){
      page.paragraphs=[];page.sections=[];
    }
    // No complete page or personal roster in cache. Exclude mobile/ID-looking paragraphs.
    page.paragraphs=page.paragraphs.filter(s=>!/\b\d{6}-[1-8]\d{6}|01[016789][- ]?\d{3,4}[- ]?\d{4}|명단|주민등록번호/.test(s));
    page.sections=page.sections.filter(s=>!/\b\d{6}-[1-8]\d{6}|01[016789][- ]?\d{3,4}[- ]?\d{4}|명단|주민등록번호/.test(s));
    if(cache.size>=30) cache.delete(cache.keys().next().value!);
    cache.set(current,{expires:Date.now()+300_000,page});
    return page;
  }
  throw new Error("source_unavailable");
}

export function isNavigationSource(url:string):boolean {
  const path=new URL(url).pathname;
  return /\/(?:index|sitemap)(?:\.(?:do|php))?\/?$/i.test(path)||path==="/"||path.startsWith("/apply/");
}
