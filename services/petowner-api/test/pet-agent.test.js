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
