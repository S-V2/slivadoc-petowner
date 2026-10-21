export type CareerEngagement = {
  applicant_count: number;
  detail_viewer_count: number;
};

const visitorKey = "slivadoc.career.visitor.v1";
const visitorPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function careerVisitorID(): string | null {
  try {
    const saved = localStorage.getItem(visitorKey);
    if (saved && visitorPattern.test(saved)) return saved;
    const created = globalThis.crypto?.randomUUID?.();
    if (!created) return null;
    localStorage.setItem(visitorKey, created);
    return created;
  } catch {
    // Without persistent storage, skip tracking instead of counting each reload.
    return null;
  }
}

export async function recordCareerDetailView(
  api: string,
  positionID: string,
  visitorID: string,
  signal: AbortSignal,
): Promise<CareerEngagement> {
  const response = await fetch(`${api.replace(/\/$/, "")}/api/v1/public/careers/${encodeURIComponent(positionID)}/views`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "omit",
    cache: "no-store",
    body: JSON.stringify({ visitor_id: visitorID }),
    signal,
  });
  if (!response.ok) throw new Error("Career engagement unavailable");
  const stats = await response.json() as CareerEngagement;
  if (![stats.applicant_count, stats.detail_viewer_count].every(value => Number.isSafeInteger(value) && value >= 0)) {
    throw new Error("Invalid career engagement");
  }
  return stats;
}
