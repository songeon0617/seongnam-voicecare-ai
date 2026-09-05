import type { Page } from "@playwright/test";
import type { VoiceRecognition } from "../../src/lib/speech/browser-speech";

declare global {
  interface Window {
    voiceTest: {
      sessions: VoiceRecognition[];
      spoken: SpeechSynthesisUtterance[];
      aborts: number;
      cancels: number;
      final(text: string): void;
      interim(text: string): void;
      error(code: string): void;
      end(): void;
      finishSpeech(): void;
      failSpeech(): void;
      loadKoreanVoice(): void;
    };
  }
}

export async function installSpeechMock(page: Page, options: {
  recognition?: "standard" | "prefixed" | "none";
  synthesis?: boolean;
  korean?: boolean;
  throwStart?: boolean;
  insecure?: boolean;
} = {}) {
  await page.addInitScript((options) => {
    const sessions: VoiceRecognition[] = [];
    const spoken: SpeechSynthesisUtterance[] = [];
    // native utterance.voice는 실제 브라우저 Voice 인스턴스만 받으므로 함께 mock한다.
    class Utterance extends EventTarget {
      text: string;
      lang = "";
      voice: SpeechSynthesisVoice | null = null;
      rate = 1;
      onend: SpeechSynthesisUtterance["onend"] = null;
      onerror: SpeechSynthesisUtterance["onerror"] = null;
      constructor(text = "") { super(); this.text = text; }
    }
    Object.defineProperty(window, "SpeechSynthesisUtterance", { configurable: true, value: Utterance });
    const koreanVoice = { lang: "ko-KR", name: "Test Korean", localService: true } as SpeechSynthesisVoice;
    let voices: SpeechSynthesisVoice[] = options.korean === false ? [] : [koreanVoice];
    const synth = new EventTarget();
    const latest = () => sessions[sessions.length - 1];
    window.voiceTest = {
      sessions, spoken, aborts: 0, cancels: 0,
      final(text) { latest().onresult?.({ results: [{ isFinal: true, 0: { transcript: text } }] }); },
      interim(text) { latest().onresult?.({ results: [{ isFinal: false, 0: { transcript: text } }] }); },
      error(code) { latest().onerror?.({ error: code }); },
      end() { latest().onend?.(); },
      finishSpeech() { const last = spoken[spoken.length - 1]; last.onend?.call(last, new Event("end") as SpeechSynthesisEvent); },
      failSpeech() { const last = spoken[spoken.length - 1]; last.onerror?.call(last, new Event("error") as SpeechSynthesisErrorEvent); },
      loadKoreanVoice() { voices = [koreanVoice]; synth.dispatchEvent(new Event("voiceschanged")); },
    };
    class Recognition implements VoiceRecognition {
      lang = "";
      continuous = true;
      interimResults = false;
      maxAlternatives = 0;
      onstart: VoiceRecognition["onstart"] = null;
      onaudioend: VoiceRecognition["onaudioend"] = null;
      onresult: VoiceRecognition["onresult"] = null;
      onerror: VoiceRecognition["onerror"] = null;
      onend: VoiceRecognition["onend"] = null;
      constructor() { sessions.push(this); }
      start() {
        if (options.throwStart) throw new Error("test start failure");
        this.onstart?.();
      }
      abort() { window.voiceTest.aborts++; this.onerror?.({ error: "aborted" }); this.onend?.(); }
    }
    Object.defineProperty(window, "SpeechRecognition", { configurable: true, value: options.recognition === "none" || options.recognition === "prefixed" ? undefined : Recognition });
    Object.defineProperty(window, "webkitSpeechRecognition", { configurable: true, value: options.recognition === "prefixed" ? Recognition : undefined });
    if (options.insecure) Object.defineProperty(window, "isSecureContext", { value: false });
    Object.assign(synth, {
      getVoices: () => voices,
      speak: (utterance: SpeechSynthesisUtterance) => { spoken.push(utterance); },
      cancel: () => { window.voiceTest.cancels++; if (spoken.length) window.voiceTest.failSpeech(); },
    });
    Object.defineProperty(window, "speechSynthesis", { configurable: true, value: options.synthesis === false ? undefined : synth });
  }, options);
}
