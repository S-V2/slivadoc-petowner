import assert from "node:assert/strict";
import test from "node:test";
import { answerPetQuestion, isPetTopic, retrievePetKnowledge } from "../src/pet-agent.js";

test("accepts pet topics and rejects unrelated topics", () => {
  assert.equal(isPetTopic("Kucing saya muntah dua kali"), true);
  assert.equal(isPetTopic("Buatkan strategi trading Bitcoin"), false);
});

test("retrieves relevant pet knowledge", () => {
  const result = retrievePetKnowledge("anjing saya muntah dan diare");
  assert.ok(result.some((item) => item.id === "digestive-care"));
});

test("offline assistant remains pet-only", async () => {
  const rejected = await answerPetQuestion({ message: "Siapa presiden Indonesia?", userId: "test" }, { openAIKey: "", openAIModel: "test" });
  assert.equal(rejected.status, 422);
  assert.equal(rejected.body.error, "topic_not_allowed");

  const accepted = await answerPetQuestion({ message: "Anjing saya muntah, apa yang harus diperhatikan?", userId: "test" }, { openAIKey: "", openAIModel: "test" });
  assert.equal(accepted.status, 200);
  assert.equal(accepted.body.mode, "offline_dataset");
});

test("falls back safely when OpenAI moderation is rate limited", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ error: { code: "insufficient_quota" } }), {
    status: 429,
    headers: { "Content-Type": "application/json" },
  });

  try {
    const result = await answerPetQuestion(
      { message: "Kucing saya muntah, apa yang perlu diperhatikan?", userId: "rate-limit-test" },
      { openAIKey: "test-key", openAIModel: "test-model" },
    );
    assert.equal(result.status, 200);
    assert.equal(result.body.mode, "offline_dataset");
    assert.equal(result.body.degraded, true);
    assert.equal(result.body.fallbackReason, "openai_quota_or_rate_limit");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("falls back safely when the Responses API is rate limited", async () => {
  const originalFetch = globalThis.fetch;
  let requestCount = 0;
  globalThis.fetch = async () => {
    requestCount += 1;
    if (requestCount === 1) {
      return new Response(JSON.stringify({ results: [{ flagged: false }] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ error: { code: "rate_limit_exceeded" } }), {
      status: 429,
      headers: { "Content-Type": "application/json" },
    });
  };

  try {
    const result = await answerPetQuestion(
      { message: "Anjing saya diare, apa yang perlu dipantau?", userId: "responses-rate-limit-test" },
      { openAIKey: "test-key", openAIModel: "test-model" },
    );
    assert.equal(result.status, 200);
    assert.equal(result.body.mode, "offline_dataset");
    assert.equal(result.body.fallbackReason, "openai_quota_or_rate_limit");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
