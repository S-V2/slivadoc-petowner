import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import test from "node:test";
import {
  isNetworkLoggerEnabled,
  redactNetworkAction,
  redactNetworkBody,
  redactNetworkHeaders,
  redactNetworkURL,
  type NetworkLoggerAction,
} from "../mobile/src/debug/network-redaction.ts";

const mobileRequire = createRequire(new URL("../mobile/package.json", import.meta.url));
// Load only the pure interceptor in Node; the package's UI requires a native runtime.
const inspectorRoot = dirname(mobileRequire.resolve("react-native-network-inspector-devtools"));
const { installFetchInterceptor } = mobileRequire(join(inspectorRoot, "utils/fetchInterceptor.js"));

test("network reports redact nested secrets while retaining useful backend errors", () => {
  const input = { code: "yokke_not_configured", message: "Gateway not configured", request_id: "req-123", data: [{ access_token: "access-private", refreshToken: "refresh-private", profile: { password: "pw-private", otp: "123456" } }] };
  const output = redactNetworkBody(JSON.stringify(input))!;
  for (const secret of ["access-private", "refresh-private", "pw-private", "123456"]) assert.ok(!output.includes(secret));
  const sanitized = JSON.parse(output);
  assert.equal(sanitized.code, input.code);
  assert.equal(sanitized.request_id, input.request_id);
  assert.equal(sanitized.data[0].refreshToken, "[REDACTED]");
  assert.equal(input.data[0]!.access_token, "access-private");
  assert.ok(!redactNetworkBody('{"password":"private-cut-off')!.includes("private-cut-off"));
  assert.ok(!redactNetworkBody("refresh_token=private-url-encoded&grant_type=refresh")!.includes("private-url-encoded"));
  assert.ok(!redactNetworkBody('{"cookie":"session=private-cut-off')!.includes("private-cut-off"));
});

test("headers and URLs hide credentials without hiding response request IDs", () => {
  const headers = { Authorization: "Bearer private-access", Cookie: "session=private", "Set-Cookie": "session=private", "X-API-Key": "api-private", "X-Request-ID": "req-123", "Content-Type": "application/json" };
  const sanitized = redactNetworkHeaders(headers);
  assert.equal(sanitized.Authorization, "[REDACTED]");
  assert.equal(sanitized["Set-Cookie"], "[REDACTED]");
  assert.equal(sanitized["X-Request-ID"], "req-123");
  assert.equal(headers.Authorization, "Bearer private-access");
  const url = redactNetworkURL("https://user:private-password@api.example.test/payment?access_token=private-token&reference_id=order-123#private-fragment");
  assert.ok(!url.includes("private"));
  assert.ok(url.includes("reference_id=order-123"));
  const repeated = new URL(redactNetworkURL("https://api.example.test/pets?species=dog&species=cat&token=private"));
  assert.deepEqual(repeated.searchParams.getAll("species"), ["dog", "cat"]);
});

test("the fetch logger preserves real requests and HTTP errors and sanitizes stored copies", async () => {
  const actions: NetworkLoggerAction[] = [];
  const input = "https://api.example.test/api/v1/payment-methods";
  const init = { headers: { Authorization: "Bearer private-access" }, method: "POST", body: JSON.stringify({ password: "private-password" }) };
  const response = new Response(JSON.stringify({ code: "yokke_not_configured", message: "Gateway not configured", access_token: "private-response" }), { status: 503, headers: { "X-Request-ID": "req-503", "Set-Cookie": "session=private-cookie" } });
  const original = async (url: unknown, options: unknown) => { assert.equal(url, input); assert.equal(options, init); return response; };
  const target = { fetch: original };
  const stop = installFetchInterceptor({ current: (action: NetworkLoggerAction) => actions.push(redactNetworkAction(action)) }, { current: [] }, { target });
  try {
    const result = await target.fetch(input, init);
    assert.equal(result, response);
    assert.equal(result.status, 503);
    assert.equal((await result.json()).access_token, "private-response");
    const added = actions.find((action) => action.type === "ADD_ENTRY");
    assert.ok(added?.type === "ADD_ENTRY");
    assert.equal(added.payload.requestHeaders.Authorization, "[REDACTED]");
    assert.ok(!added.payload.requestBody?.includes("private-password"));
    const updated = actions.find((action) => action.type === "UPDATE_ENTRY");
    assert.ok(updated?.type === "UPDATE_ENTRY");
    assert.equal(updated.payload.patch.status, 503);
    assert.equal(updated.payload.patch.state, "error");
    assert.equal(updated.payload.patch.responseHeaders?.["x-request-id"], "req-503");
    assert.ok(!updated.payload.patch.responseBody?.includes("private-response"));
    assert.ok((updated.payload.patch.duration ?? -1) >= 0);
  } finally { stop(); }
});

test("transport failures stay rejected and remain visible as network errors", async () => {
  const actions: NetworkLoggerAction[] = [];
  const failure = new TypeError("Network request failed");
  const target = { fetch: async () => { throw failure; } };
  const stop = installFetchInterceptor({ current: (action: NetworkLoggerAction) => actions.push(redactNetworkAction(action)) }, { current: [] }, { target });
  try {
    await assert.rejects(target.fetch(), (error) => error === failure);
    const updated = actions.find((action) => action.type === "UPDATE_ENTRY");
    assert.ok(updated?.type === "UPDATE_ENTRY");
    assert.equal(updated.payload.patch.state, "error");
    assert.equal(updated.payload.patch.responseBody, "Network request failed");
  } finally { stop(); }
});

test("network logging is disabled in production unless explicitly enabled for QA", () => {
  assert.equal(isNetworkLoggerEnabled(false), false);
  assert.equal(isNetworkLoggerEnabled(false, "0"), false);
  assert.equal(isNetworkLoggerEnabled(true, "0"), true);
  assert.equal(isNetworkLoggerEnabled(false, "1"), true);
});
