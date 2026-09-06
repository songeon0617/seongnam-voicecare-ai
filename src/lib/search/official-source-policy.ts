/** Explicit institutions only; a provider's domain filter is not a security boundary. */
export const OFFICIAL_HOSTS = ["www.seongnam.go.kr", "seongnam.go.kr"] as const;
export function officialUrl(input: string): string | null {
  try {
    const url = new URL(input);
    if (url.protocol !== "https:" || url.username || url.password || (url.port && url.port !== "443") ||
      !OFFICIAL_HOSTS.some(host => url.hostname === host)) return null;
    const path = decodeURIComponent(url.pathname).toLowerCase();
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
