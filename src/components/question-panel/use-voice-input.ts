"use client";

import { useEffect, useRef, useState } from "react";
import { getVoiceRecognition, recognitionErrorMessage } from "@/lib/speech/browser-speech";

export function useVoiceInput(onTranscript: (text: string) => void, onNotice: (message: string) => void) {
  const [state, setState] = useState<"idle" | "starting" | "listening" | "processing">("idle");
  const [preview, setPreview] = useState("");
  const [failed, setFailed] = useState(false);
  const session = useRef<{ dispose: () => void } | null>(null);
  const effectGeneration = useRef(0);

  useEffect(() => {
    const generationRef = effectGeneration;
    const generation = ++generationRef.current;
    const hidden = () => { if (document.hidden) { session.current?.dispose(); setState("idle"); setPreview(""); } };
    document.addEventListener("visibilitychange", hidden);
    return () => {
      document.removeEventListener("visibilitychange", hidden);
      const capturedSession = session.current;
      // React can disconnect/reconnect passive effects during hydration. A same-turn
      // reconnect must not destroy a microphone session started by a replayed event.
      queueMicrotask(() => {
        if (generationRef.current === generation && session.current === capturedSession) capturedSession?.dispose();
      });
    };
  }, []);

  function cancel() {
    session.current?.dispose();
    setState("idle");
    setPreview("");
    setFailed(false);
  }

  function fail(message: string) {
    cancel();
    setFailed(true);
    onNotice(message);
  }

  function start() {
    cancel();
    if (!window.isSecureContext) {
      fail("안전한 연결에서만 음성을 사용할 수 있어요. 지금은 글자로 질문해 주세요.");
      return;
    }
    const Recognition = getVoiceRecognition();
    if (!Recognition) {
      fail("이 브라우저는 음성 입력을 지원하지 않습니다. 글자로 질문해 주세요.");
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
        fail("음성 입력 대기 시간이 지났습니다. 다시 말하거나 글자로 질문해 주세요.");
      }, 30_000);
      recognition.lang = "ko-KR";
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      recognition.onstart = () => {
        if (session.current !== current) return;
        setState("listening");
        onNotice("듣고 있어요. 질문을 말씀해 주세요.");
      };
      recognition.onaudioend = () => {
        if (session.current !== current) return;
        setState("processing");
        onNotice("말씀하신 내용을 확인하고 있어요.");
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
        fail(recognitionErrorMessage(event.error));
      };
      recognition.onend = () => {
        if (session.current !== current) return;
        const finalText = transcript.trim();
        cancel();
        if (!finalText) fail(recognitionErrorMessage("no-speech"));
        else if ((finalText.match(/[가-힣a-z0-9]/gi)?.length ?? 0) < 2) {
          fail("음성을 잘 듣지 못했어요. 질문을 조금 더 길게 말하거나 글자로 적어 주세요.");
        } else onTranscript(finalText);
      };
      setState("starting");
      onNotice("마이크 연결을 준비하고 있습니다. 권한 요청이 나타나면 확인해 주세요.");
      recognition.start();
    } catch {
      fail("음성 입력을 시작하지 못했습니다. 마이크 권한을 확인하거나 글자로 질문해 주세요.");
    }
  }

  return { state, preview, failed, start, cancel };
}
