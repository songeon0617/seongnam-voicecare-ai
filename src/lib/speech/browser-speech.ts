/** TypeScript DOM에 아직 공통 정의가 없는 인식 API의 사용 범위만 정의한다. */
export interface VoiceRecognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onaudioend: (() => void) | null;
  onresult: ((event: { results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  abort(): void;
}

export function getVoiceRecognition() {
  const browser = window as Window & {
    SpeechRecognition?: new () => VoiceRecognition;
    webkitSpeechRecognition?: new () => VoiceRecognition;
  };
  return browser.SpeechRecognition ?? browser.webkitSpeechRecognition;
}

export function recognitionErrorMessage(error: string) {
  switch (error) {
    case "not-allowed":
    case "service-not-allowed":
      return "마이크 또는 음성 인식 권한이 허용되지 않았습니다. 브라우저 권한을 확인하거나 글자로 질문해 주세요.";
    case "audio-capture":
      return "마이크를 사용할 수 없습니다. 연결 상태를 확인하거나 글자로 질문해 주세요.";
    case "network":
      return "음성 인식 서비스에 연결하지 못했습니다. 인터넷 연결을 확인하거나 글자로 질문해 주세요.";
    case "language-not-supported":
      return "이 브라우저에서 한국어 음성 인식을 사용할 수 없습니다. 글자로 질문해 주세요.";
    case "aborted":
      return "음성 입력을 취소했습니다. 글자로도 질문할 수 있습니다.";
    default:
      return "말씀을 인식하지 못했습니다. 다시 시도하거나 글자로 질문해 주세요.";
  }
}

/** 긴 답변을 작은 발화로 나누되 원문 문자를 삭제·추가·재서술하지 않는다. */
export function splitSpeechText(text: string): string[] {
  const characters = Array.from(text);
  const chunks: string[] = [];
  let offset = 0;
  while (offset < characters.length) {
    let end = Math.min(offset + 160, characters.length);
    if (end < characters.length) {
      for (let index = end - 1; index > offset + 60; index--) {
        if (/\s/.test(characters[index])) {
          end = index + 1;
          break;
        }
      }
    }
    chunks.push(characters.slice(offset, end).join(""));
    offset = end;
  }
  return chunks;
}
