import "server-only";
import { createOpenAIIntentRouter } from "@/lib/ai/openai-intent-router";
import { createServiceCatalog, getRoutingDocuments } from "@/lib/ai/service-catalog";
import { InvalidRouterOutputError, RouterTimeoutError, isIntentRoute, constrainClarificationCandidates, guardClarificationMeaning, type IntentRouterConfiguration } from "@/lib/ai/intent-router";
import { mapDocumentsToPublicInformationAnswer } from "@/lib/public-information/map-documents-to-answer";
import { CLARIFICATIONS, type ClarificationContext, type IntentRoute, type RoutingMetadata, type ServiceId } from "@/types/public-information-router";
import type { PublicInformationSearchResponse } from "@/types/public-information-search";
import { getSafetyGuidance, matchSafetyBoundary } from "@/lib/safety/safety-boundary";
import type { SafetyCategory } from "@/types/public-information-safety";
import { searchPublicInformation } from "./search-public-information";
import { confidentKeywordResult, keywordDecision, locationGuard, serviceScopeGuard } from "./keyword-routing";
import { regionBoundaryGuard } from "./region-boundary";
import { createPublicInformationSearchResponse, validatePublicInformationSearchRequest, type PublicInformationSearchServiceResult } from "./create-public-information-search-response";

function finishSafety(query: string, category: SafetyCategory): PublicInformationSearchServiceResult {
  const guidance = getSafetyGuidance(category);
  return { status: 200, body: {
    query, results: [], hasResults: false, kind: "safety",
    safety: { category, phoneNumbers: [...guidance.phoneNumbers], requiresUserAction: true },
    answer: {
      userQuestion: query, title: guidance.title, plainLanguageSummary: guidance.summary,
      steps: [], nextAction: null, sources: [],
      verification: { status: "insufficient_data", checkedAt: null,
        details: "복지 정책 답변이 아닌 검토된 고정 안전 안내입니다." },
    },
    answerGeneration: { status: "skipped", reason: "deterministic" },
  } };
}

function finish(search: PublicInformationSearchResponse, decision: IntentRoute, source: RoutingMetadata["source"], reason?: RoutingMetadata["reason"]): PublicInformationSearchServiceResult {
  const documents = decision.route === "DIRECT"
    ? getRoutingDocuments().filter((document) => decision.serviceIds.includes(document.id as ServiceId)) : [];
  const results = documents.map((document) => search.results.find((result) => result.document.id === document.id) ?? { document, score: 0, matchedTerms: [] });
  const answer = mapDocumentsToPublicInformationAnswer(search.query, documents);
  if (decision.route !== "DIRECT") {
    const message = decision.route === "CLARIFY" ? CLARIFICATIONS[decision.clarificationId].question
      : "현재 등록된 성남시 공식 서비스 자료 범위에서는 이 요청을 지원하지 않습니다. 다른 도움이 필요하면 다시 질문해 주세요.";
    answer.title = decision.route === "CLARIFY" ? "도움의 종류를 확인해 주세요" : "현재 지원 범위 밖의 요청입니다";
    answer.plainLanguageSummary = message;
    answer.verification.details = message;
  }
  return { status: 200, body: {
    query: search.query, results, hasResults: results.length > 0, answer,
    kind: decision.route === "DIRECT" ? "answer" : decision.route === "CLARIFY" ? "clarification" : "unsupported",
    ...(decision.route === "CLARIFY" ? { clarification: { id: decision.clarificationId } } : {}),
    routing: { source, decision, ...(reason ? { reason } : {}) },
    answerGeneration: { status: "skipped", reason: "deterministic" },
  } };
}

function fallback(search: PublicInformationSearchResponse, reason: RoutingMetadata["reason"]) {
  const confident = confidentKeywordResult(search.query, search.results);
  if (confident) {
    const decision = keywordDecision(search.query, confident.document.id as ServiceId);
    const guard = serviceScopeGuard(search.query, decision);
    return finish(search, guard ?? decision, guard ? "guard" : "fallback", reason);
  }
  // 원래 검색은 기준선으로 보존하지만 애매한 후보를 사실 답변으로 승격하지 않는다.
  return finish(search, { route: "CLARIFY", serviceIds: [], intent: "other", clarificationId: "service_required" }, "fallback", reason);
}

/** 명확한 keyword는 0회, 나머지는 라우터 최대 1회. 표현 생성 호출은 없다. */
export async function createPublicInformationResponseWithAnswer(
  payload: unknown,
  configure: () => IntentRouterConfiguration = createOpenAIIntentRouter,
  searcher: typeof searchPublicInformation = searchPublicInformation,
): Promise<PublicInformationSearchServiceResult> {
  const validation = validatePublicInformationSearchRequest(payload);
  if (!validation.valid) return validation.response;
  const safetyCategory = matchSafetyBoundary(validation.request.query);
  if (safetyCategory) return finishSafety(validation.request.query, safetyCategory);
  const response = createPublicInformationSearchResponse(validation.request, searcher);
  if (response.status !== 200 || !("results" in response.body)) return response;
  const search = response.body;
  const context = (payload as { context?: ClarificationContext }).context;
  const regionGuard = regionBoundaryGuard(search.query)
    ?? (context ? regionBoundaryGuard(context.question) : null);
  if (regionGuard) return finish(search, regionGuard, "guard");
  const guard = locationGuard(search.query) ?? (context?.clarificationId === "region_required"
    && !confidentKeywordResult(search.query, search.results) ? locationGuard(`${context.question} ${search.query}`) : null);
  const confident = !context && confidentKeywordResult(search.query, search.results);
  if (confident && !guard) {
    const decision = keywordDecision(search.query, confident.document.id as ServiceId);
    const scopeGuard = serviceScopeGuard(search.query, decision);
    return finish(search, scopeGuard ?? decision, scopeGuard ? "guard" : "keyword");
  }
  try {
    const configuration = configure();
    if (configuration.status !== "ready") return guard ? finish(search, guard, "guard", configuration.status) : fallback(search, configuration.status);
    const catalog = createServiceCatalog();
    const allowedIds = catalog.map((entry) => entry.serviceId);
    const output = await configuration.route({ question: search.query, catalog: structuredClone(catalog),
      ...(context ? { context: { question: context.question, clarificationId: context.clarificationId } } : {}) });
    if (!isIntentRoute(output, allowedIds)) return guard ? finish(search, guard, "guard", "invalid_output") : fallback(search, "invalid_output");
    // 거리 자료가 없다는 서버 제한은 모델이 DIRECT라고 해도 우회할 수 없다.
    if (guard) return finish(search, guard, "guard");
    const scopeGuard = serviceScopeGuard(search.query, output);
    if (scopeGuard) return finish(search, scopeGuard, "guard");
    return finish(search, constrainClarificationCandidates(guardClarificationMeaning(search.query, output)), "ai");
  } catch (cause) {
    const reason = cause instanceof RouterTimeoutError ? "timeout" : cause instanceof InvalidRouterOutputError ? "invalid_output" : "provider_error";
    return guard ? finish(search, guard, "guard", reason) : fallback(search, reason);
  }
}
