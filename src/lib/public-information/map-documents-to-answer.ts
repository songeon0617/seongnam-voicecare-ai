import type { PublicInformationDocument } from "@/types/public-data";
import type {
  InformationVerification,
  PublicInformationAnswer,
  SourceReference,
} from "@/types/public-information";

const NO_INFORMATION_MESSAGE =
  "현재 등록된 공식 자료에서 관련 정보를 찾지 못했습니다.";

function unique(values: readonly string[]) {
  return [...new Set(values)];
}

function getSharedCheckedAt(
  documents: readonly PublicInformationDocument[],
): string | null {
  const checkedDates = documents.map((document) => document.lastVerifiedAt);

  if (checkedDates.some((date) => date === null)) {
    return null;
  }

  return checkedDates
    .filter((date): date is string => date !== null)
    .map((date) => date.slice(0, 10))
    .sort()[0] ?? null;
}

function mapVerification(
  documents: readonly PublicInformationDocument[],
): InformationVerification {
  if (documents.length === 0) {
    return {
      status: "insufficient_data",
      checkedAt: null,
      details: NO_INFORMATION_MESSAGE,
    };
  }

  const checkedAt = getSharedCheckedAt(documents);
  const allVerifiedCurrent = documents.every(
    (document) =>
      document.status === "active" &&
      document.freshness.status === "current" &&
      document.lastVerifiedAt !== null,
  );

  if (allVerifiedCurrent) {
    return {
      status: "verified",
      checkedAt,
      details:
        "사용된 모든 문서가 안내에 사용 가능한 상태이며 최신성 확인일이 기록되어 있습니다.",
    };
  }

  const hasVerifiedActiveDocument = documents.some(
    (document) =>
      document.status === "active" && document.lastVerifiedAt !== null,
  );

  if (hasVerifiedActiveDocument) {
    return {
      status: "partially_verified",
      checkedAt,
      details:
        "공식 문서를 확인했지만 일부 문서가 최신 자료인지 확인되지 않았습니다.",
    };
  }

  return {
    status: "unverified",
    checkedAt: null,
    details:
      "문서는 존재하지만 활성 상태, 최신성 또는 확인일 메타데이터가 충분하지 않습니다.",
  };
}

function mapSource(document: PublicInformationDocument): SourceReference {
  return {
    id: document.id,
    sourceId: document.sourceId,
    organizationName: document.sourceOrganizationName,
    title: document.title,
    url: document.originalUrl,
    checkedAt: document.lastVerifiedAt,
    documentStatus: document.status,
    freshnessStatus: document.freshness.status,
  };
}

/**
 * 검색 문서의 저장된 필드만 PublicInformationAnswer로 옮긴다.
 * 본문에서 전화번호·서류·단계·장소를 추출하거나 새로 생성하지 않는다.
 */
export function mapDocumentsToPublicInformationAnswer(
  userQuestion: string,
  documents: readonly PublicInformationDocument[],
): PublicInformationAnswer {
  if (documents.length === 0) {
    return {
      userQuestion,
      title: "공식 자료 검색 결과",
      plainLanguageSummary: NO_INFORMATION_MESSAGE,
      steps: [],
      nextAction: null,
      sources: [],
      verification: mapVerification(documents),
    };
  }

  const eligibility = unique(
    documents.flatMap((document) => document.targetAudiences),
  );

  return {
    userQuestion,
    title: documents[0].title,
    plainLanguageSummary: documents
      .map((document) => documents.length > 1 ? `「${document.title}」\n${document.content}` : document.content)
      .join("\n\n"),
    // 여러 서비스의 대상을 합쳐 첫 서비스의 신청 자격처럼 표시하지 않는다.
    ...(documents.length === 1 && eligibility.length > 0 ? { eligibility } : {}),
    steps: [],
    nextAction: null,
    sources: documents.map(mapSource),
    verification: mapVerification(documents),
  };
}
