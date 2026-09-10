/** Deliberate code-level shutdown. No environment variable can reactivate it. */
export const VOICECARE_ARCHIVED = true;

export function assertVoiceCareActive(): void {
  if (VOICECARE_ARCHIVED) throw new Error("VOICECARE_ARCHIVED: external requests are disabled");
}

export function archiveResponse(): Response {
  return new Response("Seongnam VoiceCare AI is archived. Service and AI requests are disabled.\n", {
    status: 410,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
    },
  });
}
