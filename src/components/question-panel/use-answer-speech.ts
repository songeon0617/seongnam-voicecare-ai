"use client";

import { useEffect, useRef, useState } from "react";
import { splitSpeechText } from "@/lib/speech/browser-speech";

export function useAnswerSpeech(onNotice: (message: string) => void) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const active = useRef<{ dispose: () => void } | null>(null);
  const voices = useRef<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    const synth = window.speechSynthesis;
    if (!synth) return;
    const updateVoices = () => {
      try { voices.current = synth.getVoices(); } catch { voices.current = []; }
    };
    updateVoices();
    synth.addEventListener?.("voiceschanged", updateVoices);
    return () => {
      synth.removeEventListener?.("voiceschanged", updateVoices);
      active.current?.dispose();
    };
  }, []);

  function stop() {
    active.current?.dispose();
    setIsSpeaking(false);
  }

  function play(text: string) {
    stop();
    const synth = window.speechSynthesis;
    if (!synth || !window.SpeechSynthesisUtterance) {
      onNotice("이 브라우저는 답변 듣기를 지원하지 않습니다. 화면의 답변을 확인해 주세요.");
      return;
    }
    try {
      const available = synth.getVoices();
      if (available.length > 0) voices.current = available;
      const korean = voices.current.filter((voice) => /^ko(?:[-_]|$)/i.test(voice.lang));
      const voice = korean.find((item) => item.localService) ?? korean[0];
      if (!voice) {
        onNotice("한국어 읽기 음성이 아직 준비되지 않았습니다. 잠시 후 다시 누르거나 기기의 한국어 음성을 설치해 주세요. 화면의 답변은 그대로 이용할 수 있습니다.");
        return;
      }
      const chunks = splitSpeechText(text);
      if (chunks.length === 0) return;
      let index = 0;
      let utterance: SpeechSynthesisUtterance | null = null;
      let timeout: ReturnType<typeof setTimeout> | undefined;
      const current = {
        dispose() {
          if (active.current !== current) return;
          active.current = null;
          clearTimeout(timeout);
          if (utterance) utterance.onend = utterance.onerror = null;
          try { synth.cancel(); } catch { /* 음성 실패가 텍스트 흐름을 막지 않는다. */ }
        },
      };
      active.current = current;
      const fail = () => {
        if (active.current !== current) return;
        stop();
        onNotice("답변 읽기를 완료하지 못했습니다. 다시 듣거나 화면의 답변을 확인해 주세요.");
      };
      const speakNext = () => {
        if (active.current !== current) return;
        if (index >= chunks.length) {
          stop();
          onNotice("답변 본문 읽기를 마쳤습니다. 출처와 확인 상태도 확인해 주세요.");
          return;
        }
        try {
          const chunk = new SpeechSynthesisUtterance(chunks[index++]);
          utterance = chunk;
          utterance.lang = "ko-KR";
          utterance.voice = voice;
          utterance.rate = 1;
          utterance.onend = () => {
            if (active.current !== current || utterance !== chunk) return;
            chunk.onend = chunk.onerror = null;
            utterance = null;
            clearTimeout(timeout);
            speakNext();
          };
          utterance.onerror = () => {
            if (active.current === current && utterance === chunk) fail();
          };
          // 엔진이 start/end/error를 주지 않아도 영구 재생 상태가 되지 않는다.
          timeout = setTimeout(fail, 45_000);
          synth.speak(utterance);
        } catch { fail(); }
      };
      setIsSpeaking(true);
      onNotice("답변 본문을 읽고 있습니다. 중지 버튼으로 멈출 수 있습니다.");
      speakNext();
    } catch {
      stop();
      onNotice("답변 듣기를 시작하지 못했습니다. 화면의 답변을 확인해 주세요.");
    }
  }

  return { isSpeaking, play, stop };
}
