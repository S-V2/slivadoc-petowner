import assert from "node:assert/strict";
import test from "node:test";
import {
  createCorsOriginValidator,
  getDefaultOrigins,
  isOriginAllowed,
  parseAllowedOrigins,
  resolveAllowedOrigins,
} from "../src/cors.js";

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

test("returns localhost defaults in development and empty in production", () => {
  assert.deepEqual(getDefaultOrigins("development"), [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:5173",
    "http://localhost:8081",
  ]);
  assert.deepEqual(getDefaultOrigins("production"), []);
});

test("resolves allowed origins combining defaults and configured origins", () => {
  const devOrigins = resolveAllowedOrigins("https://pet.slivadoc.id", "development");
  assert.ok(devOrigins.includes("http://localhost:3000"));
  assert.ok(devOrigins.includes("https://pet.slivadoc.id"));
  assert.equal(devOrigins.includes("https://slivadoc-pet-owner.evans-moris21.chatgpt.site"), false);

  const prodOrigins = resolveAllowedOrigins("https://pet.slivadoc.id", "production");
  assert.deepEqual(prodOrigins, ["https://pet.slivadoc.id"]);
});
