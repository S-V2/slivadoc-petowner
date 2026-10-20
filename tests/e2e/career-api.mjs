// SSR fetches cannot be intercepted by page.route. Keep the public Career
// catalog deterministic and local in UI tests, with the original 28-role seed.
// This server is started only by Playwright and is never part of the app.
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
const catalog = JSON.parse(
  readFileSync(new URL("./career-catalog.json", import.meta.url), "utf8"),
);
const server = createServer((request, response) => {
  const path = new URL(request.url, "http://127.0.0.1").pathname;
  response.setHeader("Content-Type", "application/json");
  response.setHeader("Access-Control-Allow-Origin", "*");
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
    response.end(JSON.stringify(catalog));
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
          ? { data: position, consent_version: catalog.consent_version }
          : { code: "not_found", message: "Position unavailable" },
      ),
    );
    return;
  }
  response.end(JSON.stringify({ data: [], count: 0 }));
});
server.listen(4181, "127.0.0.1");
for (const signal of ["SIGTERM", "SIGINT"])
  process.on(signal, () => server.close(() => process.exit(0)));
