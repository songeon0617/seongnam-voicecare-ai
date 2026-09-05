import "server-only";

/** 단일 프로세스 데모용 제한. IP/사용자 식별자나 DB를 보관하지 않는다. */
export function createSearchRequestLimit(
  { maxRequests = 30, windowMs = 60_000, maxConcurrent = 3 } = {},
  now: () => number = Date.now,
) {
  let windowEndsAt = 0;
  let requests = 0;
  let concurrent = 0;

  return {
    acquire() {
      const time = now();
      if (time >= windowEndsAt) {
        windowEndsAt = time + windowMs;
        requests = 0;
      }
      if (requests >= maxRequests) {
        return { allowed: false as const, retryAfter: Math.max(1, Math.ceil((windowEndsAt - time) / 1000)) };
      }
      if (concurrent >= maxConcurrent) {
        return { allowed: false as const, retryAfter: 1 };
      }
      requests++;
      concurrent++;
      let released = false;
      return {
        allowed: true as const,
        release() {
          if (!released) {
            released = true;
            concurrent--;
          }
        },
      };
    },
  };
}
