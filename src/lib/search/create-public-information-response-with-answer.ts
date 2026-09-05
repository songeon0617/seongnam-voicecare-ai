import { generatePublicInformationAnswer } from "@/lib/ai/generate-public-information-answer";
import {
  createOpenAIAnswerGenerator,
  type AnswerGeneratorConfiguration,
} from "@/lib/ai/openai-answer-generator";
import {
  createPublicInformationSearchResponse,
  type PublicInformationSearchServiceResult,
} from "./create-public-information-search-response";

/** 검색·안전 매핑의 동기 서비스는 유지하고 AI는 후속 단계에서만 호출한다. */
export async function createPublicInformationResponseWithAnswer(
  payload: unknown,
  configure: () => AnswerGeneratorConfiguration = createOpenAIAnswerGenerator,
): Promise<PublicInformationSearchServiceResult> {
  const response = createPublicInformationSearchResponse(payload);
  if (response.status !== 200 || !("results" in response.body)) {
    return response;
  }

  const search = response.body;
  if (search.results.length === 0) {
    return {
      ...response,
      body: { ...search, answerGeneration: { status: "skipped", reason: "no_results" } },
    };
  }

  try {
    const configuration = configure();
    if (configuration.status !== "ready") {
      return {
        ...response,
        body: { ...search, answerGeneration: { status: "skipped", reason: configuration.status } },
      };
    }

    const generated = await generatePublicInformationAnswer(search, configuration.generate);
    return { ...response, body: { ...search, ...generated } };
  } catch {
    return {
      ...response,
      body: { ...search, answerGeneration: { status: "fallback", reason: "provider_error" } },
    };
  }
}
