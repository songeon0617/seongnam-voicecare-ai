import { PUBLIC_INFORMATION_DOCUMENTS } from "@/data/public-data/documents";
import { PUBLIC_DATA_SOURCES } from "@/data/public-data/sources";
import type {
  PublicInformationCategory,
  PublicInformationDocument,
} from "@/types/public-data";
import type {
  PublicInformationSearchOptions,
  PublicInformationSearchResult,
} from "@/types/public-information-search";

export type {
  PublicInformationSearchOptions,
  PublicInformationSearchResult,
} from "@/types/public-information-search";

export const DEFAULT_PUBLIC_INFORMATION_TOP_K = 3;

/**
 * 제목·태그의 강한 일치 한 번 또는 여러 보조 필드의 일치가 있어야 결과로
 * 인정한다. 단순히 "신청" 같은 일반 표현 하나만 맞는 문서는 제외하기 위한 값이다.
 */
export const DEFAULT_PUBLIC_INFORMATION_THRESHOLD = 10;

interface SearchConcept {
  label: string;
  aliases: readonly string[];
}

interface SearchFeature {
  label: string;
  aliases: readonly string[];
}

const FIELD_WEIGHTS = {
  title: 8,
  searchTags: 6,
  targetAudiences: 4,
  relatedRegions: 3,
  content: 2,
  category: 1,
} as const;

const SEARCH_CONCEPTS: readonly SearchConcept[] = [
  {
    label: "노인",
    aliases: ["노인", "어르신", "고령자"],
  },
  {
    label: "특별교통수단",
    aliases: ["특별교통수단", "콜택시", "이동지원 차량", "이동지원차량"],
  },
  {
    label: "택시바우처",
    aliases: [
      "택시바우처",
      "택시 바우처",
      "택시요금 지원",
      "택시요금지원",
      "택시 지원",
      "택시지원",
    ],
  },
  {
    label: "노인복지관",
    aliases: ["노인복지관", "노인종합복지관", "복지관", "노인복지시설"],
  },
  {
    label: "노인맞춤돌봄",
    aliases: [
      "노인맞춤돌봄",
      "노인 돌봄",
      "어르신 돌봄",
      "돌봄 서비스",
      "돌봄서비스",
    ],
  },
  {
    label: "긴급복지",
    aliases: ["긴급복지", "긴급복지지원", "긴급복지 지원"],
  },
  {
    label: "방문건강관리",
    aliases: [
      "방문건강관리",
      "방문 건강관리",
      "방문간호",
      "방문 간호",
      "가정 방문",
      "집으로 와서",
      "집에 와서",
      "찾아와서",
    ],
  },
  {
    label: "독거",
    aliases: ["독거", "혼자 사는", "혼자사는", "홀로 사는", "홀로사는"],
  },
  {
    label: "휠체어",
    aliases: ["휠체어", "보행장애", "보행 장애"],
  },
  {
    label: "분당구",
    aliases: ["분당", "분당구"],
  },
  {
    label: "신청",
    aliases: ["신청", "접수", "이용등록"],
  },
] as const;

const CATEGORY_TERMS: Record<PublicInformationCategory, readonly string[]> = {
  disability_welfare: ["장애인 복지", "장애인복지"],
  senior_welfare: ["노인 복지", "노인복지", "어르신", "돌봄"],
  welfare_support: ["복지 지원", "복지지원"],
  mobility_support: ["이동 지원", "이동지원", "교통약자", "택시"],
  administrative_service: ["행정 서비스", "행정서비스"],
  welfare_facility: ["복지 시설", "복지시설", "복지관"],
  other: [],
};

const STOP_WORDS = new Set([
  "관련",
  "방법",
  "서비스",
  "알려줘",
  "알려주세요",
  "어떻게",
  "어디",
  "이용하고",
  "싶어",
  "싶어요",
  "타는데",
  "해야",
  "해야해",
]);

const PARTICLE_SUFFIXES = ["에서", "에게", "으로", "과", "와", "은", "는", "이", "가", "을", "를", "에", "도"];

function normalizeText(value: string) {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase("ko-KR")
    .replace(/[^0-9a-z가-힣]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function compactText(value: string) {
  return normalizeText(value).replace(/\s/g, "");
}

function stripParticle(token: string) {
  for (const suffix of PARTICLE_SUFFIXES) {
    if (token.length > suffix.length + 1 && token.endsWith(suffix)) {
      return token.slice(0, -suffix.length);
    }
  }

  return token;
}

function includesAlias(value: string, alias: string) {
  return compactText(value).includes(compactText(alias));
}

function buildSearchFeatures(query: string): SearchFeature[] {
  const normalizedQuery = normalizeText(query);
  const compactQuery = compactText(query);
  const features: SearchFeature[] = [];
  const coveredAliases = new Set<string>();

  for (const concept of SEARCH_CONCEPTS) {
    const matchingAlias = concept.aliases.find((alias) =>
      compactQuery.includes(compactText(alias)),
    );

    if (!matchingAlias) {
      continue;
    }

    features.push({ label: concept.label, aliases: concept.aliases });
    for (const alias of concept.aliases) {
      coveredAliases.add(compactText(alias));
    }
  }

  const directTerms = normalizedQuery
    .split(" ")
    .map(stripParticle)
    .filter((term) => term.length >= 2 && !STOP_WORDS.has(term));

  for (const term of new Set(directTerms)) {
    const compactTerm = compactText(term);
    const isCoveredByConcept = [...coveredAliases].some(
      (alias) => alias === compactTerm,
    );

    if (!isCoveredByConcept) {
      features.push({ label: term, aliases: [term] });
    }
  }

  return features;
}

function scoreDocument(
  document: PublicInformationDocument,
  query: string,
  features: readonly SearchFeature[],
): PublicInformationSearchResult {
  const fields = {
    title: [document.title],
    searchTags: document.searchTags,
    targetAudiences: document.targetAudiences,
    relatedRegions: document.relatedRegions,
    content: [document.content],
    category: CATEGORY_TERMS[document.category],
  } satisfies Record<keyof typeof FIELD_WEIGHTS, readonly string[]>;

  let score = 0;
  const matchedTerms: string[] = [];

  for (const feature of features) {
    let matched = false;

    for (const [fieldName, values] of Object.entries(fields) as Array<
      [keyof typeof FIELD_WEIGHTS, readonly string[]]
    >) {
      const matchesField = values.some((value) =>
        feature.aliases.some((alias) => includesAlias(value, alias)),
      );

      if (matchesField) {
        score += FIELD_WEIGHTS[fieldName];
        matched = true;
      }
    }

    if (matched) {
      matchedTerms.push(feature.label);
    }
  }

  if (compactText(query).includes(compactText(document.title))) {
    score += 10;
  }

  return { document, score, matchedTerms };
}

/**
 * 현재 등록된 공식 데이터셋에서 활성 문서만 검색한다.
 * 향후 검색 구현을 교체해도 UI가 동일한 결과 구조를 사용할 수 있게 한다.
 */
export function searchPublicInformation(
  query: string,
  options: PublicInformationSearchOptions = {},
): PublicInformationSearchResult[] {
  const officialSourceIds = new Set(
    PUBLIC_DATA_SOURCES.filter(
      (source) => source.enabled && source.isOfficial,
    ).map((source) => source.id),
  );
  const registeredOfficialDocuments = PUBLIC_INFORMATION_DOCUMENTS.filter(
    (document) => officialSourceIds.has(document.sourceId),
  );

  return searchPublicInformationDocuments(
    query,
    registeredOfficialDocuments,
    options,
  );
}

/** 활성 상태 필터를 포함한 순수 문서 검색 코어다. */
export function searchPublicInformationDocuments(
  query: string,
  documents: readonly PublicInformationDocument[],
  options: PublicInformationSearchOptions = {},
): PublicInformationSearchResult[] {
  if (!normalizeText(query)) {
    return [];
  }

  const topK = Math.max(
    0,
    Math.floor(options.topK ?? DEFAULT_PUBLIC_INFORMATION_TOP_K),
  );
  const threshold = Math.max(
    0,
    options.threshold ?? DEFAULT_PUBLIC_INFORMATION_THRESHOLD,
  );

  if (topK === 0) {
    return [];
  }

  const features = buildSearchFeatures(query);

  return documents
    .filter((document) => document.status === "active")
    .map((document) => scoreDocument(document, query, features))
    .filter((result) => result.score > 0 && result.score >= threshold)
    .sort(
      (first, second) =>
        second.score - first.score ||
        first.document.title.localeCompare(second.document.title, "ko-KR"),
    )
    .slice(0, topK);
}
