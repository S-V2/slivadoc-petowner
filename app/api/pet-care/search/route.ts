import { matchPetCareKeywords } from "../../../../shared/pet-care-keywords";
export function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q") ?? "";
  if (query.length > 180)
    return Response.json({ error: "Query too long" }, { status: 400 });
  return Response.json(
    { data: matchPetCareKeywords(query) },
    { headers: { "Cache-Control": "public, max-age=300" } },
  );
}
