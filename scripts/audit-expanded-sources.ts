import { mkdirSync, writeFileSync } from "node:fs";
import { request } from "node:https";
import { createHash } from "node:crypto";
import { PUBLIC_INFORMATION_DOCUMENTS } from "../src/data/public-data/documents";
import { officialSourceCa } from "../src/lib/search/official-source-ca";
import { extractOfficialDocument } from "../src/lib/search/extract-official-document";

const directory = process.env.VOICECARE_RESULT_DIRECTORY ?? "docs/voicecare-evaluation/final-expanded-20260907";
mkdirSync(`${directory}/sources`, { recursive: true });
const documents = PUBLIC_INFORMATION_DOCUMENTS.map(d => ({...d}));
const urls = [...new Set(documents.flatMap(d => [d.originalUrl, ...("supportingSources" in d ? d.supportingSources.map(s => s.url) : [])]))];
async function get(url: string, hops = 0): Promise<{url: string; status: number; html: string; redirects: number}> {
  if (hops > 3 || new URL(url).hostname !== "www.seongnam.go.kr" || new URL(url).protocol !== "https:") throw Error("unexpected_redirect");
  return new Promise((resolve, reject) => {
    const req = request(url, { ca: officialSourceCa(), rejectUnauthorized: true, signal: AbortSignal.timeout(15000), headers: { Accept: "text/html" } }, res => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume(); get(new URL(res.headers.location, url).href, hops + 1).then(resolve, reject); return;
      }
      const chunks: Buffer[] = []; let size = 0;
      res.on("data", (chunk: Buffer) => { size += chunk.length; if (size > 3_000_000) req.destroy(Error("too_large")); else chunks.push(chunk); });
      res.on("error", reject);
      res.on("end", () => resolve({ url, status: res.statusCode ?? 0, html: Buffer.concat(chunks).toString("utf8"), redirects: hops }));
    });
    req.on("error", reject); req.end();
  });
}
async function main() {
  const results = [];
  for (const url of urls) {
    const checkedAt = new Date().toISOString();
    try {
      const page = await get(url), parsed = extractOfficialDocument(page.html, page.url);
      const file = createHash("sha256").update(url).digest("hex");
      writeFileSync(`${directory}/sources/${file}.html`, page.html);
      const row = { requestedUrl: url, url: page.url, status: page.status, redirects: page.redirects, checkedAt, sha256: createHash("sha256").update(page.html).digest("hex"), file, ...parsed };
      writeFileSync(`${directory}/sources/${file}.json`, JSON.stringify(row, null, 2));
      results.push(row); console.log(page.status, url, parsed.textLength);
    } catch (error) { results.push({ requestedUrl: url, checkedAt, error: error instanceof Error ? error.message : "unknown" }); }
  }
  const categories = Object.fromEntries([...new Set(documents.map(d => d.category))].map(c => [c, documents.filter(d => d.category === c).length]));
  writeFileSync(`${directory}/source-audit.json`, JSON.stringify({ documents, documentCount: documents.length, uniqueUrlCount: urls.length, categories, results }, null, 2));
  if (results.some(r => !("status" in r) || r.status !== 200)) process.exitCode = 1;
}
void main();
