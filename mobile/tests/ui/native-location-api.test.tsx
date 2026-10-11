import { expect, jest, test } from "@jest/globals";
import { request } from "node:http";
import { clearMobileCache, getDiscoveryBranches, getMobilePetSpots } from "../../src/api";

// Opt-in local integration check: use the native API client against the actual
// public catalog, allowing only GETs to the local backend. No fixture imports.
const check = process.env.SLIVADOC_NATIVE_READONLY_API === "1" ? test : test.skip;
check("the native client receives real nearby catalogs in ascending distance with server filters", async () => {
  clearMobileCache();
  const requests: Array<{ path: string; status: number }> = [];
  const transport = jest.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    const url = new URL(String(input));
    if ((init?.method ?? "GET") !== "GET" || !url.pathname.startsWith("/api/v1/public/")) throw new Error("Read-only public API check rejected this request");
    return new Promise<Response>((resolve, reject) => {
      const connection = request({ hostname: "127.0.0.1", port: 8080, path: url.pathname + url.search, method: "GET" }, response => {
        let body = "";
        response.setEncoding("utf8"); response.on("data", chunk => { body += chunk; });
        response.on("end", () => {
          requests.push({ path: url.pathname + url.search, status: response.statusCode ?? 0 });
          resolve(new Response(body, { status: response.statusCode ?? 500 }));
        });
      });
      connection.on("error", reject); connection.setTimeout(5_000, () => connection.destroy(new Error("Local API timed out"))); connection.end();
    });
  });
  const point = { latitude: -6.2, longitude: 106.8 };
  function sortedWithin(items: Array<{ distance_km?: number | null }>, radius: number) {
    const distances = items.map(item => item.distance_km);
    expect(distances.every(value => typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= radius)).toBe(true);
    expect(distances).toEqual([...distances].sort((a, b) => Number(a) - Number(b)));
  }
  try {
    const shops = await getDiscoveryBranches({ ...point, type: "petshop", max_distance_km: 25, limit: 50 });
    expect(shops.data.length).toBeGreaterThan(0); sortedWithin(shops.data, 25);
    expect(shops.data.every(item => item.type === "petshop" || item.type === "hybrid")).toBe(true);
    const spots = await getMobilePetSpots({ ...point, max_distance_km: 25 });
    expect(spots.data.length).toBeGreaterThan(0); sortedWithin(spots.data, 25);
    const cafes = await getMobilePetSpots({ ...point, max_distance_km: 5, category: "cafe" });
    expect(cafes.data.length).toBeGreaterThan(0); sortedWithin(cafes.data, 5);
    expect(cafes.data.every(item => item.category === "cafe")).toBe(true);
    const search = await getMobilePetSpots({ ...point, max_distance_km: 25, search: "Senopati" });
    expect(search.data.length).toBeGreaterThan(0); sortedWithin(search.data, 25);
    expect(search.data.every(item => `${item.name} ${item.address} ${item.description}`.toLowerCase().includes("senopati"))).toBe(true);
    expect(requests.every(value => value.status === 200)).toBe(true);
    console.info("Native public API verified", JSON.stringify({ shops: shops.data.length, spots: spots.data.length, cafesWithin5km: cafes.data.length, search: search.data.length, requests }));
  } finally { transport.mockRestore(); clearMobileCache(); }
}, 20_000);
