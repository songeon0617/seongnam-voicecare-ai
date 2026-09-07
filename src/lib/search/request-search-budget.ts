import "server-only";
export const REQUEST_SEARCH_LIMITS = {aiCalls:1,searchCalls:1,originalFetches:16,timeoutMs:25000} as const;
/** One object accompanies every provider/search/discovery fetch in a request. */
export function createRequestSearchBudget(parent:AbortSignal) {
  const signal=AbortSignal.any([parent,AbortSignal.timeout(REQUEST_SEARCH_LIMITS.timeoutMs)]);
  const usage={aiCalls:0,searchCalls:0,originalFetches:0,maxOriginalFetches:REQUEST_SEARCH_LIMITS.originalFetches};
  return {signal,usage,consume(kind:"aiCalls"|"searchCalls"|"originalFetches") {
    signal.throwIfAborted();
    if(usage[kind]>=REQUEST_SEARCH_LIMITS[kind])throw Error("request_budget_exhausted");
    usage[kind]++;
  }};
}
