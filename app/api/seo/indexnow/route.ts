import { SEO, absoluteUrl } from "../../../lib/seo-config";

const INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow";

function configuredKey() {
  return process.env.INDEXNOW_KEY?.trim() ?? "";
}

function isAuthorized(request: Request) {
  const secret = process.env.SEO_WEBHOOK_SECRET?.trim();
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET() {
  const key = configuredKey();
  if (!key) return Response.json({ error: "IndexNow belum dikonfigurasi" }, { status: 404 });
  return new Response(key, { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=3600" } });
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) return Response.json({ error: "Tidak diizinkan" }, { status: 401 });
  const key = configuredKey();
  if (!key) return Response.json({ error: "INDEXNOW_KEY belum dikonfigurasi" }, { status: 503 });
  const payload = await request.json().catch(() => ({})) as { urls?: unknown };
  if (!Array.isArray(payload.urls)) return Response.json({ error: "urls wajib berupa array" }, { status: 400 });
  const origin = new URL(SEO.siteUrl).origin;
  const urls = [...new Set(payload.urls.filter((item): item is string => typeof item === "string").map((item) => {
    try { return new URL(item, SEO.siteUrl).toString(); } catch { return ""; }
  }).filter((item) => item && new URL(item).origin === origin))].slice(0, 10_000);
  if (!urls.length) return Response.json({ error: "Tidak ada URL Slivadoc yang valid" }, { status: 400 });
  const response = await fetch(INDEXNOW_ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify({ host: new URL(SEO.siteUrl).host, key, keyLocation: absoluteUrl("/api/seo/indexnow"), urlList: urls }),
  });
  if (!response.ok) return Response.json({ error: "IndexNow menolak pengiriman", status: response.status }, { status: 502 });
  return Response.json({ submitted: urls.length, status: response.status });
}
