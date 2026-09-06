import type { PublicInformationAnswer } from "@/types/public-information";
import type {
  AnswerGenerationMetadata,
  PublicInformationSearchResponse,
} from "@/types/public-information-search";

// 사실을 담지 않는 서버 검토 표현만 허용한다. 원문 재서술은 허용하지 않는다.
export const ANSWER_INTRODUCTIONS = {
  neutral: "검색된 공식 자료의 내용을 안내합니다.",
  friendly: "찾은 공식 자료를 함께 살펴볼게요.",
} as const;

export const ANSWER_LAYOUTS = ["paragraphs", "document_sections"] as const;

export interface AnswerPresentationPlan {
  introduction: keyof typeof ANSWER_INTRODUCTIONS;
  layout: (typeof ANSWER_LAYOUTS)[number];
}

/** 출처/구조화된 답변 객체를 제공자에게 전달하지 않는다. */
export interface AnswerGenerationInput {
  question: string;
  documents: { title: string; content: string }[];
}

export type AnswerPresentationGenerator = (
  input: AnswerGenerationInput,
) => Promise<unknown>;

export interface AnswerGenerationResult {
  answer: PublicInformationAnswer;
  answerGeneration: AnswerGenerationMetadata;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** JSON schema는 보조 수단이다. 실제 신뢰 경계에서 키와 값을 다시 검사한다. */
export function isAnswerPresentationPlan(
  value: unknown,
): value is AnswerPresentationPlan {
  return (
    isRecord(value) &&
    Object.keys(value).length === 2 &&
    Object.hasOwn(value, "introduction") &&
    Object.hasOwn(value, "layout") &&
    (value.introduction === "neutral" || value.introduction === "friendly") &&
    (value.layout === "paragraphs" || value.layout === "document_sections")
  );
}

/**
 * 서버 검색 결과만 입력한다. LLM 문자열을 답변에 복사/병합하지 않는다.
 * 문서별 전체 본문과 순서를 보존해 조건·예외의 생략이나 문서 간 혼합을 막는다.
 */
/** @deprecated 이전 표현 생성의 호환/회귀 테스트용. 현재 API 답변은 항상 deterministic 매핑이다. */
export async function generatePublicInformationAnswer(
  search: PublicInformationSearchResponse,
  generate: AnswerPresentationGenerator,
): Promise<AnswerGenerationResult> {
  const fallback = search.answer;

  if (search.results.length === 0) {
    return {
      answer: fallback,
      answerGeneration: { status: "skipped", reason: "no_results" },
    };
  }

  // 제공자가 입력 객체를 변경해도 서버 원문/답변을 바꿀 수 없도록 별도 복사한다.
  const documents = search.results.map(({ document }) => ({
    title: document.title,
    content: document.content,
  }));

  try {
    const plan = await generate({
      question: search.query,
      documents: documents.map((document) => ({ ...document })),
    });

    if (!isAnswerPresentationPlan(plan)) {
      return {
        answer: fallback,
        answerGeneration: { status: "fallback", reason: "invalid_output" },
      };
    }

    const body = documents.map((document) =>
      documents.length > 1 || plan.layout === "document_sections"
        ? `「${document.title}」\n${document.content}`
        : document.content,
    ).join("\n\n");

    return {
      answer: {
        ...fallback,
        plainLanguageSummary: `${ANSWER_INTRODUCTIONS[plan.introduction]}\n\n${body}`,
      },
      answerGeneration: { status: "generated", mode: "constrained_presentation" },
    };
  } catch {
    // API 키, 질문, 제공자 오류 본문은 로그나 응답에 노출하지 않는다.
    return {
      answer: fallback,
      answerGeneration: { status: "fallback", reason: "provider_error" },
    };
  }
}
