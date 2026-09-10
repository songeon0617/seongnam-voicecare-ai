import { createPublicInformationSearchHandler } from "@/lib/search/handle-public-information-search";
import { archiveResponse, VOICECARE_ARCHIVED } from "@/lib/archive";

export const runtime = "nodejs";
// 모듈당 하나의 제한기를 공유한다. 요청마다 재생성하지 않는다.
export const POST = VOICECARE_ARCHIVED ? archiveResponse : createPublicInformationSearchHandler();
