import {
  createPublicInformationSearchError,
  createPublicInformationSearchResponse,
} from "@/lib/search/create-public-information-search-response";

export async function POST(request: Request) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return Response.json(
      createPublicInformationSearchError(
        "invalid_json",
        "올바른 JSON 요청 본문이 필요합니다.",
      ),
      { status: 400 },
    );
  }

  const response = createPublicInformationSearchResponse(payload);
  return Response.json(response.body, { status: response.status });
}
