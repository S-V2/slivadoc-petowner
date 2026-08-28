import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const careRoom = readFileSync(
  new URL("../app/components/platform/CareMarketplace.tsx", import.meta.url),
  "utf8",
);

test("consultation chat remains Socket.IO and media is room-scoped Twilio Video", () => {
  assert.match(careRoom, /io\(realtime/);
  assert.match(careRoom, /consultation:message/);
  assert.match(careRoom, /twilio-token/);
  assert.match(careRoom, /import\("twilio-video"\)/);
  assert.match(careRoom, /call:ring/);
  assert.match(careRoom, /call:accept/);
  assert.match(careRoom, /call:reject/);
  assert.match(careRoom, /call:end/);
  assert.match(careRoom, /getConsultationMessages/);
  assert.match(careRoom, /sendConsultationMessage/);
  assert.doesNotMatch(careRoom, /new RTCPeerConnection/);
  assert.doesNotMatch(careRoom, /call:ice-candidate/);
});
