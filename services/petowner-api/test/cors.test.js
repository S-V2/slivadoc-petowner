import assert from "node:assert/strict";
import test from "node:test";
import { createCorsOriginValidator, isOriginAllowed, parseAllowedOrigins } from "../src/cors.js";

test("normalizes configured CORS origins", () => {
  assert.deepEqual(parseAllowedOrigins(" https://pet.slivadoc.id/, http://localhost:5173 "), [
    "https://pet.slivadoc.id",
    "http://localhost:5173",
  ]);
});

test("allows exact and wildcard subdomain origins", () => {
  const allowed = parseAllowedOrigins("https://pet.slivadoc.id,https://*.chatgpt.site");
  assert.equal(isOriginAllowed("https://pet.slivadoc.id", allowed), true);
  assert.equal(isOriginAllowed("https://slivadoc.preview.chatgpt.site", allowed), true);
  assert.equal(isOriginAllowed("https://chatgpt.site", allowed), false);
  assert.equal(isOriginAllowed("https://attacker.example", allowed), false);
});

test("allows native and server clients without an Origin header", () => {
  assert.equal(isOriginAllowed(undefined, ["https://pet.slivadoc.id"]), true);
});

test("validator returns false for denied browser origins", async () => {
  const validate = createCorsOriginValidator(["https://pet.slivadoc.id"]);
  const result = await new Promise((resolve, reject) => validate("https://attacker.example", (error, allowed) => error ? reject(error) : resolve(allowed)));
  assert.equal(result, false);
});
