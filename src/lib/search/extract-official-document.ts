import "server-only";
import { parse, type DefaultTreeAdapterMap } from "parse5";
import { officialUrl } from "./official-source-policy";

type Node = DefaultTreeAdapterMap["node"];
const normalized = (s:string) => s.normalize("NFKC").replace(/\s+/g," ").trim();
const children = (n:Node):Node[] => "childNodes" in n ? n.childNodes : [];
const tag = (n:Node) => "tagName" in n ? n.tagName : "";
const attr = (n:Node,key:string) => "attrs" in n ? n.attrs.find(a=>a.name===key)?.value??"" : "";
const excluded = (n:Node) => /^(script|style|nav|header|footer|form|noscript|template|svg)$/.test(tag(n)) ||
  attr(n,"aria-hidden")==="true" || ("attrs" in n && n.attrs.some(a=>a.name==="hidden")) || /display\s*:\s*none|visibility\s*:\s*hidden/i.test(attr(n,"style"));
function text(n:Node):string {
  if(excluded(n))return "";
  if(n.nodeName==="#text")return "value" in n?n.value:"";
  return children(n).map(text).join(" ");
}
function find(n:Node,p:(n:Node)=>boolean):Node|undefined {
  if(excluded(n))return undefined;
  if(p(n))return n;
  for(const child of children(n)){const match=find(child,p);if(match)return match;}
}

/** Whole heading groups, including sibling conditions and table headers; never character slices. */
export function extractOfficialDocument(html:string) {
  const document=parse(html);
  const title=normalized(text(find(document,n=>tag(n)==="title")??document)).slice(0,180)||"성남시 공식 안내";
  // Seongnam's actual article has content-section; content-body includes tab navigation.
  const root=find(document,n=>attr(n,"class").split(/\s+/).includes("content-section")) ??
    find(document,n=>tag(n)==="main") ?? find(document,n=>attr(n,"class").split(/\s+/).includes("content-body")) ??
    find(document,n=>tag(n)==="body") ?? document;
  const complete=normalized(text(root));
  const paragraphs=complete.length>=20&&complete.length<=900?[complete]:[];
  const blocks:{heading:number;value:string}[]=[];
  function visit(n:Node) {
    if(excluded(n))return;
    const t=tag(n),value=normalized(text(n));
    if(/^h[1-6]$/.test(t)){if(value)blocks.push({heading:Number(t[1]),value});return;}
    // Keep complete lists/tables: row headings, nested exceptions and footnotes stay attached.
    if(/^(p|ul|ol|table|dl)$/.test(t)){if(value)blocks.push({heading:0,value});return;}
    if(n.nodeName==="#text"){if(value)blocks.push({heading:0,value});return;}
    children(n).forEach(visit);
  }
  visit(root);
  const level=Math.min(...blocks.filter(b=>b.heading>0).map(b=>b.heading));
  const preamble:string[]=[];const groups:string[][]=[];let current:string[]|undefined;
  for(const block of blocks){
    if(block.heading===level){current=[block.value];groups.push(current);}
    else if(current)current.push(block.value);else preamble.push(block.value);
  }
  // A document without reliable section boundaries stays whole or is omitted.
  const sections=(groups.length?groups.map(g=>normalized([...preamble,...g].join(" "))):[complete])
    .filter(s=>s.length>=20&&s.length<=6000);
  const navigation: {url:string;title:string}[]=[];
  function links(n:Node){
    if(tag(n)==="a"){
      try{const url=officialUrl(new URL(attr(n,"href"),"https://www.seongnam.go.kr/").href),label=normalized(text(n));
        if(url&&label.length>=2&&label.length<=80&&!navigation.some(l=>l.url===url))navigation.push({url,title:label});}catch{}
    }
    children(n).forEach(links);
  }
  links(document);
  return {title,paragraphs,sections,navigation:navigation.slice(0,1200),textLength:complete.length,omittedSections:(groups.length||1)-sections.length};
}
