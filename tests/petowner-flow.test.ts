import assert from "node:assert/strict";
import test from "node:test";
import { apiRequest, clearSession, saveTokens } from "../app/lib/session.ts";
import { petOwnerMutationRequiresPet } from "../shared/petowner-flow.ts";

class Storage {
  values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
}

async function sessionStory(run: (calls: string[], events: string[]) => Promise<void>) {
  const original = { fetch: globalThis.fetch, storage: globalThis.localStorage, window: globalThis.window };
  const calls: string[] = [];
  const events: string[] = [];
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: new Storage() });
  Object.defineProperty(globalThis, "window", { configurable: true, value: { dispatchEvent: (event: Event) => { events.push(event.type); return true; } } });
  clearSession();
  saveTokens({ access_token: "owner-a", refresh_token: "refresh-a" });
  globalThis.fetch = (async (input: string, init: RequestInit = {}) => {
    const path = new URL(String(input)).pathname;
    calls.push(`${init.method ?? "GET"} ${path}`);
    return Response.json(path.endsWith("/bootstrap") ? { pets: [] } : { id: "created-record" });
  }) as typeof fetch;
  try { await run(calls, events); }
  finally {
    clearSession();
    globalThis.fetch = original.fetch;
    Object.defineProperty(globalThis, "localStorage", { configurable: true, value: original.storage });
    Object.defineProperty(globalThis, "window", { configurable: true, value: original.window });
  }
}

test("mobile prerequisites cover writes across every transactional and social journey", () => {
  const paths = [
    "/api/v1/petowner/bookings", "/api/v1/petowner/orders/quote",
    "/api/v1/petowner/orders/id/cancel", "/api/v1/petowner/favorites/toggle",
    "/api/v1/petowner/products/id/reviews", "/api/v1/petowner/academy/programs/id/reviews",
    "/api/v1/petowner/petship/check-in", "/api/v1/petowner/fundraisers",
    "/api/v1/petowner/reminders", "/api/v1/community/posts/id/react",
    "/api/v1/pethub/posts/id/comments", "/api/v1/consultations/id/messages",
    "/api/v1/trainer-consultations", "/api/v1/adoptions/id/applications",
    "/api/v1/academy/enrollments", "/api/v1/events/id/registrations",
    "/api/v1/pet-document-requests", "/api/v1/pawdating/interests",
    "/api/v1/payment-intents",
  ];
  for (const path of paths) {
    assert.equal(petOwnerMutationRequiresPet(`${path}?source=web`, "post"), true, path);
    assert.equal(petOwnerMutationRequiresPet(path, "GET"), false, path);
  }
  for (const path of ["/api/v1/petowner/pets", "/api/v1/petowner/profile", "/api/v1/petowner/support-chat", "/api/v1/public/search"])
    assert.equal(petOwnerMutationRequiresPet(path, "POST"), false, path);
});

test("an owner without pets can browse, edit their account and contact support; writes wait for pet creation", async () => {
  await sessionStory(async (calls, events) => {
    await apiRequest("/api/v1/petowner/bootstrap", { cache: "no-store" });
    await assert.rejects(apiRequest("/api/v1/petowner/orders", { method: "POST" }), { status: 428, code: "pet_profile_required" });
    assert.equal(calls.some((call) => call === "POST /api/v1/petowner/orders"), false);
    assert.ok(events.includes("slivadoc:pet-required"));
    await apiRequest("/api/v1/public/discovery/products");
    await apiRequest("/api/v1/petowner/profile", { method: "PATCH" });
    await apiRequest("/api/v1/petowner/support-chat", { method: "POST", body: JSON.stringify({ body: "Bantu akun saya" }) });
    await apiRequest("/api/v1/petowner/pets", { method: "POST", body: JSON.stringify({ name: "Milo", species: "dog" }) });
    await apiRequest("/api/v1/petowner/bookings", { method: "POST" });
    assert.ok(calls.includes("POST /api/v1/petowner/bookings"));
  });
});

test("pet prerequisites survive token refresh and reset when a different owner signs in", async () => {
  await sessionStory(async (calls) => {
    await apiRequest("/api/v1/petowner/bootstrap", { cache: "no-store" });
    const regularFetch = globalThis.fetch;
    let attempted = false;
    globalThis.fetch = (async (input: string, init: RequestInit = {}) => {
      const path = new URL(String(input)).pathname;
      if (path === "/api/v1/auth/refresh") return Response.json({ access_token: "owner-a-refreshed", refresh_token: "refresh-a-next" });
      if (path === "/api/v1/public/search" && !attempted) { attempted = true; return Response.json({ message: "Expired" }, { status: 401 }); }
      return regularFetch(input, init);
    }) as typeof fetch;
    await apiRequest("/api/v1/public/search", { cache: "no-store" });
    await assert.rejects(apiRequest("/api/v1/community/posts", { method: "POST" }), { code: "pet_profile_required" });
    saveTokens({ access_token: "owner-b", refresh_token: "refresh-b" });
    await apiRequest("/api/v1/community/posts", { method: "POST" });
    assert.ok(calls.includes("POST /api/v1/community/posts"));
    await apiRequest("/api/v1/petowner/bootstrap", { cache: "no-store" });
    await assert.rejects(apiRequest("/api/v1/petowner/bookings", { method: "POST" }), { code: "pet_profile_required" });
  });
});
