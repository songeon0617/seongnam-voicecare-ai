import { mkdirSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { fetchOfficialSource } from "../src/lib/search/fetch-official-source";
const dir = "docs/voicecare-evaluation/submission-final-20260907/sources";
mkdirSync(dir, {recursive:true});
async function main() {
  for (const url of process.argv.slice(2)) {
    const file = createHash("sha256").update(url).digest("hex");
    try {
      const page = await fetchOfficialSource(url, AbortSignal.timeout(15000), (_url, html) => writeFileSync(`${dir}/${file}.html`, html));
      writeFileSync(`${dir}/${file}.json`, JSON.stringify(page,null,2));
      console.log(JSON.stringify({url,title:page.title,sections:page.sections,links:page.navigation?.filter(l=>/전입|인터넷 민원|민원.*신고|바란다|금연|음식물|버스|교통정보/.test(l.title))}));
    } catch(error) { console.log(JSON.stringify({url,error:error instanceof Error?error.message:"failed"})); }
  }
}
void main();
