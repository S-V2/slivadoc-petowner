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

// REGRESSION — Cloudflare rejects a local track without `mid` (406 invalid_params
// "tracks[0]: Missing mid in track"), and the gateway reports that only as a
// generic 502 cloudflare_sfu_unavailable, so "Mulai video" failed with no usable
// diagnostic. RTCRtpTransceiver.mid is null until setLocalDescription is applied,
// so the mid MUST be collected after it, never at addTransceiver time.
test("local track mids are collected after setLocalDescription, not at addTransceiver", () => {
  const sld = sfu.indexOf("setLocalDescription(offer)");
  const collect = sfu.indexOf("getTransceivers()");
  assert.ok(sld > 0, "setLocalDescription(offer) not found");
  assert.ok(collect > 0, "mids are no longer collected from getTransceivers()");
  assert.ok(
    collect > sld,
    "mid is read before setLocalDescription, so it is null and Cloudflare rejects the publish",
  );
  // The old shape: reading .mid off the value returned by addTransceiver.
  assert.doesNotMatch(
    sfu,
    /const\s+transceiver\s*=\s*pc\.addTransceiver[\s\S]{0,200}?mid:\s*transceiver\.mid/,
    "mid is being read from addTransceiver's return value again",
  );
  // A published local track without a mid must never be sent.
  assert.doesNotMatch(sfu, /mid:\s*[A-Za-z_$][\w$]*\.mid\s*\?\?\s*undefined/);
});
