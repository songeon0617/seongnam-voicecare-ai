import fs from 'node:fs';
const d='docs/voicecare-evaluation/recovery-20260907/sources/';const i=JSON.parse(fs.readFileSync(d+'index.json'));
for(const u of process.argv.slice(2)){
 const h=fs.readFileSync(d+i[u].file+'.html','utf8');console.log(u,'bytes',h.length);
 console.log(h.length<6000?h:h.match(/.{0,80}(금연|전입|공간공유|content-section|content_body|contents|contentBody|<main|주차|__NEXT|__NUXT|src=).{0,180}/g)?.slice(-35));
 const at=h.indexOf('function fn_move_form');if(at>=0)console.log(h.slice(at,at+1600));
 console.log(h.match(/<[^>]*(?:id|class)="[^"]+"[^>]*>/g)?.filter(x=>/content|cont|wrap|section/.test(x)).slice(0,35));
}
