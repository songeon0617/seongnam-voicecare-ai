import { mkdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { PUBLIC_INFORMATION_DOCUMENTS } from '../src/data/public-data/documents';
import { fetchOfficialSource } from '../src/lib/search/fetch-official-source';

// Direct official HTTPS reads only. No model/provider or production API is invoked.
async function main() {
  const dir = process.argv[2];
  if (!dir) throw new Error('Provide a private evidence output directory');
  mkdirSync(dir, {recursive:true});
  const urls = [...new Set(PUBLIC_INFORMATION_DOCUMENTS.flatMap(d => [d.originalUrl, ...('supportingSources' in d ? d.supportingSources.map(s=>s.url) : [])]))];
  const rows = [];
  for (const url of urls) {
    const id = createHash('sha256').update(url).digest('hex');
    try {
      const page = await fetchOfficialSource(url, AbortSignal.timeout(15000), (_,html)=>writeFileSync(`${dir}/${id}.html`,html));
      writeFileSync(`${dir}/${id}.json`,JSON.stringify(page,null,2));
      rows.push({url,id,status:'read',checkedAt:page.checkedAt,title:page.title});
    } catch(e) { rows.push({url,id,status:'failed',error:String(e)}); }
    console.log(JSON.stringify(rows.at(-1)));
  }
  writeFileSync(`${dir}/index.json`,JSON.stringify(rows,null,2));
}
void main();
