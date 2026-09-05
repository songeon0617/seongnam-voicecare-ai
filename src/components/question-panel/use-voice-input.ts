"use client";

import { useEffect, useRef, useState } from "react";
import { getVoiceRecognition, recognitionErrorMessage } from "@/lib/speech/browser-speech";

export function useVoiceInput(onTranscript: (text: string) => void, onNotice: (message: string) => void) {
  const [state, setState] = useState<"idle" | "starting" | "listening" | "processing">("idle");
  const [preview, setPreview] = useState("");
  const session = useRef<{ dispose: () => void } | null>(null);

  useEffect(() => () => session.current?.dispose(), []);

  function cancel() {
    session.current?.dispose();
    setState("idle");
    setPreview("");
  }

  function start() {
    cancel();
    if (!window.isSecureContext) {
      onNotice("음성 입력은 HTTPS 또는 localhost에서 사용할 수 있습니다. 지금은 글자로 질문해 주세요.");
      return;
    }
    const Recognition = getVoiceRecognition();
    if (!Recognition) {
      onNotice("이 브라우저는 음성 입력을 지원하지 않습니다. 글자로 질문해 주세요.");
      return;
    }

    try {
      const recognition = new Recognition();
      let transcript = "";
      const current = {
        dispose() {
          if (session.current !== current) return;
          session.current = null;
          clearTimeout(timeout);
          recognition.onstart = recognition.onaudioend = recognition.onresult = recognition.onerror = recognition.onend = null;
          try { recognition.abort(); } catch { /* 종료된 인식 세션도 안전하게 정리한다. */ }
        },
      };
      session.current = current;
      const timeout = setTimeout(() => {
        if (session.current !== current) return;
        cancel();
        onNotice("음성 입력 대기 시간이 지났습니다. 다시 시도하거나 글자로 질문해 주세요.");
      }, 30_000);
      recognition.lang = "ko-KR";
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      recognition.onstart = () => {
        if (session.current !== current) return;
        setState("listening");
        onNotice("듣고 있습니다. 질문을 말씀해 주세요. 취소하려면 마이크 버튼을 다시 누르세요.");
      };
      recognition.onaudioend = () => {
        if (session.current !== current) return;
        setState("processing");
        onNotice("음성을 글자로 바꾸고 있습니다.");
      };
      recognition.onresult = (event) => {
        if (session.current !== current) return;
        const results = Array.from(event.results);
        // 결과 목록은 세션 전체 스냅샷이다. 누적 append로 중복 문장을 만들지 않는다.
        transcript = results.filter((result) => result.isFinal).map((result) => result[0].transcript).join(" ");
        setPreview(results.map((result) => result[0].transcript).join(" "));
      };
      recognition.onerror = (event) => {
        if (session.current !== current) return;
        cancel();
        onNotice(recognitionErrorMessage(event.error));
      };
      recognition.onend = () => {
        if (session.current !== current) return;
        const finalText = transcript.trim();
        cancel();
        if (finalText) onTranscript(finalText);
        else onNotice(recognitionErrorMessage("no-speech"));
      };
      setState("starting");
      onNotice("마이크 연결을 준비하고 있습니다. 권한 요청이 나타나면 확인해 주세요.");
      recognition.start();
    } catch {
      cancel();
      onNotice("음성 입력을 시작하지 못했습니다. 마이크 권한을 확인하거나 글자로 질문해 주세요.");
    }
  }

  return { state, preview, start, cancel };
}
