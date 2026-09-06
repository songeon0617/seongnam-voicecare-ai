import type {
  PublicDataSource,
  PublicDocumentFreshnessStatus,
  PublicDocumentStatus,
} from "@/types/public-data";

/**
 * 공식 자료를 얼마나 충분히 확인했는지 나타낸다.
 * 상태가 `verified`가 아니면 UI에서 제한 사항을 함께 알려야 한다.
 */
export type InformationVerificationStatus =
  | "verified"
  | "partially_verified"
  | "insufficient_data"
  | "unverified";

export interface SourceReference {
  /** 답변 안에서 출처를 연결할 때 사용하는 고유 식별자 */
  id: string;
  /** 공식 출처 목록의 PublicDataSource id */
  sourceId: PublicDataSource["id"];
  organizationName: string;
  title: string;
  url: string;
  supportingSources?: readonly { title: string; url: string }[];
  /** 원문을 마지막으로 확인한 ISO 8601 날짜·시각. 미확인 시 null */
  checkedAt: string | null;
  /** 답변 생성에 사용된 원문 문서의 검토 상태 */
  documentStatus: PublicDocumentStatus;
  /** 답변 생성에 사용된 원문 문서의 최신성 상태 */
  freshnessStatus: PublicDocumentFreshnessStatus;
  /** 이 출처가 답변의 어떤 내용을 뒷받침하는지에 대한 짧은 설명 */
  evidenceSummary?: string;
}

export interface ActionStep {
  order: number;
  title: string;
  description: string;
  /** 이 단계를 뒷받침하는 SourceReference의 id */
  sourceIds?: string[];
}

export interface ContactInformation {
  label?: string;
  phone?: string;
  url?: string;
  availableHours?: string;
}

export interface ServiceLocation {
  organizationName: string;
  address?: string;
  url?: string;
}

export interface NextAction {
  title: string;
  description: string;
  url?: string;
}

export interface InformationVerification {
  status: InformationVerificationStatus;
  /** 공식 자료를 마지막으로 확인한 날짜(YYYY-MM-DD). 확인하지 못했다면 null */
  checkedAt: string | null;
  /** 자료 부족, 상충하는 정보 등 사용자가 알아야 할 제한 사항 */
  details?: string;
}

export interface PublicInformationAnswer {
  userQuestion: string;
  title: string;
  plainLanguageSummary: string;
  eligibility?: string[];
  requiredItems?: string[];
  steps: ActionStep[];
  contacts?: ContactInformation[];
  locations?: ServiceLocation[];
  /** 공식 자료로 다음 행동을 확인하지 못한 경우 null */
  nextAction: NextAction | null;
  /** 자료를 찾지 못한 경우 빈 배열로 유지하고 verification에 이유를 기록한다. */
  sources: SourceReference[];
  verification: InformationVerification;
}

/**
 * 타입과 UI 연동을 확인하기 위한 개발용 예시다.
 * 실제 성남시 공공정보, 자격 조건, 연락처를 포함하지 않는다.
 */
export const DEVELOPMENT_EXAMPLE_ANSWER: PublicInformationAnswer = {
  userQuestion: "[개발용 예시] 공공정보를 어떻게 확인하나요?",
  title: "개발용 예시 답변",
  plainLanguageSummary:
    "구조화된 답변 형식을 확인하기 위한 데이터입니다. 실제 공공정보가 아닙니다.",
  steps: [
    {
      order: 1,
      title: "공식 자료 연결 확인",
      description:
        "실제 기능을 연결한 뒤 공식 자료에서 확인된 내용만 안내합니다.",
    },
  ],
  nextAction: null,
  sources: [],
  verification: {
    status: "unverified",
    checkedAt: null,
    details: "개발용 예시이며 공식 자료를 조회하지 않았습니다.",
  },
};
