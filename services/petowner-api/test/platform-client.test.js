import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { bearerToken, createPlatformClient, petIDFromConversation, PlatformAuthError } from "../src/platform-client.js";

test("bearer token and care conversation IDs are strict", () => {
  assert.equal(bearerToken("Bearer valid-token"), "valid-token");
  assert.equal(bearerToken("Basic invalid"), "");
  assert.equal(petIDFromConversation("care-70000000-0000-4000-8000-000000000001"), "70000000-0000-4000-8000-000000000001");
  assert.equal(petIDFromConversation("care-victim-pet"), "");
});

test("platform client rejects missing tokens and forwards authenticated identity", async () => {
  const calls = [];
  const client = createPlatformClient("http://platform.test", async (url, init) => {
    calls.push({ url, authorization: new Headers(init.headers).get("Authorization") });
    return new Response(JSON.stringify({ id: "user-1", full_name: "Owner" }), { status: 200, headers: { "Content-Type": "application/json" } });
  });
  await assert.rejects(() => client.identity(""), PlatformAuthError);
  assert.equal((await client.identity("signed-token")).id, "user-1");
  assert.deepEqual(calls, [{ url: "http://platform.test/api/v1/auth/me", authorization: "Bearer signed-token" }]);
});

test("Pet Owner API no longer persists messages or accepts legacy community writes", () => {
  const source = readFileSync(new URL("../src/index.js", import.meta.url), "utf8");
  assert.doesNotMatch(source, /JsonStore|petowner\.json|senderId: z\.string/);
  assert.match(source, /legacy_community_removed/);
  assert.match(source, /io\.use\(async \(socket, next\)/);
  assert.match(source, /app\.post\(\s*"\/api\/uploads\/images",\s*requirePlatformUser/);
  assert.match(source, /app\.post\(\s*"\/api\/assistant\/chat",\s*requirePlatformUser/);
});
