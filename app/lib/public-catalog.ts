const API = (process.env.NEXT_PUBLIC_PLATFORM_API_URL ?? "http://localhost:8080").replace(/\/$/, "");

// Public discovery is paginated. Stopping at the first 100 records hides the
// rest of the inventory from server-rendered category pages and sitemaps.
export async function publicCatalog<T>(kind: "services" | "products", regionCode = ""): Promise<T[]> {
  const rows: T[] = [];
  const pageSize = 100;
  for (let offset = 0; ; offset += pageSize) {
    const query = new URLSearchParams({ limit: String(pageSize), offset: String(offset) });
    if (regionCode) query.set("region_code", regionCode);
    const response = await fetch(`${API}/api/v1/public/discovery/${kind}?${query}`, {
      cache: "no-store", headers: { accept: "application/json" }, signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) throw new Error(`Public ${kind} unavailable (${response.status})`);
    const payload = await response.json() as { data?: T[]; has_more?: boolean; region_code?: string };
    // Older backends ignore region_code. Never label their nationwide results
    // as if they came from a specific village.
    if (regionCode && payload.region_code !== regionCode) return [];
    if (!Array.isArray(payload.data)) throw new Error(`Invalid public ${kind} payload`);
    rows.push(...payload.data);
    if (!payload.has_more) return rows;
    if (payload.data.length !== pageSize || offset >= 99900) throw new Error(`Invalid or excessive ${kind} pagination`);
  }
}
