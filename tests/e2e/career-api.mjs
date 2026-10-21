// SSR fetches cannot be intercepted by page.route. Keep the public Career
// catalog deterministic and local in UI tests, with the original 28-role seed.
// This server is started only by Playwright and is never part of the app.
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
const catalog = JSON.parse(
  readFileSync(new URL("./career-catalog.json", import.meta.url), "utf8"),
);
const viewers = new Map();
const positionStats = position => ({
  ...position,
  applicant_count: 0,
  detail_viewer_count: viewers.get(position.id)?.size ?? 0,
});
const server = createServer(async (request, response) => {
  const path = new URL(request.url, "http://127.0.0.1").pathname;
  response.setHeader("Content-Type", "application/json");
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type");
  response.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  if (request.method === "OPTIONS") { response.writeHead(204); response.end(); return; }
  if (request.method === "POST" && /^\/api\/v1\/public\/careers\/[^/]+\/views$/.test(path)) {
    const position = catalog.data.find(item => item.id === path.split("/").at(-2));
    if (!position) { response.writeHead(404); response.end(JSON.stringify({ code: "position_unavailable", message: "Position unavailable" })); return; }
    try {
      let body = "";
      for await (const chunk of request) body += chunk;
      const { visitor_id } = JSON.parse(body);
      if (typeof visitor_id !== "string") throw new Error("Missing visitor");
      const seen = viewers.get(position.id) ?? new Set();
      seen.add(visitor_id);
      viewers.set(position.id, seen);
      response.end(JSON.stringify({ applicant_count: 0, detail_viewer_count: seen.size }));
    } catch {
      response.writeHead(422);
      response.end(JSON.stringify({ code: "invalid_career_visitor", message: "Invalid visitor" }));
    }
    return;
  }
  if (request.method !== "GET") {
    response.writeHead(405);
    response.end(JSON.stringify({ message: "Read-only UI test fixture" }));
    return;
  }
  if (path === "/health") {
    response.end(JSON.stringify({ status: "ready" }));
    return;
  }
  if (path === "/api/v1/public/careers") {
    response.end(JSON.stringify({ ...catalog, data: catalog.data.map(positionStats) }));
    return;
  }
  if (path.startsWith("/api/v1/public/careers/")) {
    const position = catalog.data.find(
      (item) => item.id === path.split("/").at(-1),
    );
    response.writeHead(position ? 200 : 404);
    response.end(
      JSON.stringify(
        position
          ? { data: positionStats(position), consent_version: catalog.consent_version }
          : { code: "not_found", message: "Position unavailable" },
      ),
    );
    return;
  }
  response.end(JSON.stringify({ data: [], count: 0 }));
});
server.listen(Number(process.env.CAREER_FIXTURE_PORT ?? 4181), "127.0.0.1");
for (const signal of ["SIGTERM", "SIGINT"])
  process.on(signal, () => server.close(() => process.exit(0)));
