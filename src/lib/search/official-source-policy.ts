/** Explicit institutions only; a provider's domain filter is not a security boundary. */
// Reviewed institutional links, not a wildcard for arbitrary municipal subdomains.
// City's /sitemap links snlib, waste.isdc and snspring; recycle's department footer
// identifies 성남시 자원순환과. Captures live in the recovery audit's sources directory.
export const OFFICIAL_PUBLISHERS: Readonly<Record<string,string>> = {
  "www.seongnam.go.kr":"성남시청", "seongnam.go.kr":"성남시청",
  "recycle.seongnam.go.kr":"성남시청",
  "www.snlib.go.kr":"성남시 도서관사업소", "snlib.go.kr":"성남시 도서관사업소",
  "waste.isdc.co.kr":"성남도시개발공사", "www.snspring.or.kr":"성남시 청년지원센터",
  "job.seongnam.go.kr":"성남시 일자리센터",
  "www.isdc.co.kr":"성남도시개발공사", "www.snart.or.kr":"성남문화재단",
  "park.isdc.co.kr":"성남도시개발공사",
};
export const OFFICIAL_HOSTS = Object.keys(OFFICIAL_PUBLISHERS);
export function officialPublisher(url:string):string|undefined {
  try{return OFFICIAL_PUBLISHERS[new URL(url).hostname];}catch{return undefined;}
}
export function officialUrl(input: string): string | null {
  try {
    const url = new URL(input);
    if (url.protocol !== "https:" || url.username || url.password || (url.port && url.port !== "443") ||
      !OFFICIAL_HOSTS.some(host => url.hostname === host)) return null;
    const path = decodeURIComponent(url.pathname).toLowerCase();
    if ([...url.searchParams.values()].some(value=>/board_(review|joboffer)|board_center/i.test(value))) return null;
    if (/introduceEmployee|question(List|View)|story(List|View)|personalInfo|useAgreement|emailPolicy/i.test(path)) return null;
    if (/\\|\x00/.test(path) || /(?:download|attach|filedown|staff|search|login|member|board|bbs|freeboard|opinion|review)/i.test(path) ||
      /\.(?:pdf|hwpx?|xlsx?|zip|docx?|csv)$/i.test(path)) return null;
    if ([...url.searchParams.keys()].some(key => /url|redirect|callback|file|download/i.test(key))) return null;
    for (const key of [...url.searchParams.keys()]) if (key.startsWith("utm_")) url.searchParams.delete(key);
    url.hash = "";
    return url.href;
  } catch { return null; }
}

export function redactQuestion(value: string): { text: string; redacted: boolean } {
  const text = value.normalize("NFKC")
    .replace(/https?:\/\/\S+/gi, "[링크 제외]")
    .replace(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi, "[이메일 제외]")
    .replace(/\b\d{6}\s*-?\s*[1-8]\d{6}\b/g, "[개인번호 제외]")
    .replace(/(?:\+82[-\s]?)?0?1[016789][\s.-]?\d{3,4}[\s.-]?\d{4}/g, "[연락처 제외]")
    .replace(/\b\d{2,6}(?:[ -]\d{2,6}){2,}\b/g, "[번호 제외]");
  return {text, redacted:text !== value.normalize("NFKC")};
}
