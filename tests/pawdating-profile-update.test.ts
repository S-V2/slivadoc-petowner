import assert from "node:assert/strict";
import test from "node:test";

import {
  clearPlatformCache,
  updatePawDatingProfile,
} from "../app/lib/platform-api.ts";

// The backend routes profile edits as PUT /api/v1/pawdating/profiles/{id};
// any other method never reaches the handler.
test("editing a PAW Dating profile sends PUT to the profile route", async () => {
  const original = globalThis.fetch;
  const calls: { url: string; method: string; body: unknown }[] = [];
  globalThis.fetch = (async (input: string, init: RequestInit = {}) => {
    calls.push({
      url: String(input),
      method: String(init.method ?? "GET").toUpperCase(),
      body: init.body ? JSON.parse(String(init.body)) : undefined,
    });
    return {
      ok: true,
      status: 200,
      json: async () => ({ id: "profile-1", status: "draft", message: "ok" }),
    } as Response;
  }) as typeof globalThis.fetch;
  clearPlatformCache();
  try {
    const input = {
      city: "Bandung",
      description: "Betina yang ramah dan sehat sekali",
    };
    await updatePawDatingProfile("profile-1", input);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].method, "PUT");
    assert.match(calls[0].url, /\/api\/v1\/pawdating\/profiles\/profile-1$/);
    assert.deepEqual(calls[0].body, input);
  } finally {
    globalThis.fetch = original;
    clearPlatformCache();
  }
});
