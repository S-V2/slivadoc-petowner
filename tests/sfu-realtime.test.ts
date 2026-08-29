import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const careRoom = readFileSync(
  new URL("../app/components/platform/CareMarketplace.tsx", import.meta.url),
  "utf8",
);
const sfu = readFileSync(
  new URL("../app/lib/consultation-sfu.ts", import.meta.url),
  "utf8",
);
const media = `${careRoom}\n${sfu}`;

test("consultation chat remains Socket.IO and media is Cloudflare Realtime SFU", () => {
  assert.match(media, /io\(realtime/);
  assert.match(media, /consultation:message/);
  assert.match(media, /call:ring/);
  assert.match(media, /call:accept/);
  assert.match(media, /call:reject/);
  assert.match(media, /call:end/);
  assert.match(media, /getConsultationMessages/);
  assert.match(media, /sendConsultationMessage/);
  assert.match(media, /media\/session/);
  assert.match(media, /startConsultationMedia/);
  assert.match(media, /new RTCPeerConnection/);
  assert.doesNotMatch(media, /twilio-video/);
  assert.doesNotMatch(media, /twilio-token/);
  assert.doesNotMatch(media, /call:ice-candidate/);
});
