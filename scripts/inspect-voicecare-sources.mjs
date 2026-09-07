import fs from 'node:fs';
const d='docs/voicecare-evaluation/recovery-20260907/sources/';
const i=JSON.parse(fs.readFileSync(d+'index.json'));
for(const u of process.argv.slice(2)) {
 const h=fs.readFileSync(d+i[u].file+'.html','utf8');
 console.log(u);
 console.log([...h.matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)].map(m=>({href:m[1],title:m[2].replace(/<[^>]+>/g,'').trim()})).filter(x=>/여권|발급|청년|주차|금연|전입|쓰레기|폐기물|교통|복지|관련사이트|버스|오시는/.test(x.title)).slice(0,100));
}
