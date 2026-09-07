/** Static service summaries cannot establish a current status or an unstored procedure. */
export function needsLiveOfficialEvidence(query: string): boolean {
  return /오늘|지금|현재|올해|내일|내년|작년|지난|이번|실시간|마감|모집|중단|폐지|변경|바뀌|인상|인하|종료|차이|비교|중복|지문|고장|안돼|안되|오류|취소|분실|재발급|수급.{0,6}확정|내가.{0,6}대상|\b20\d{2}\b/.test(query);
}
