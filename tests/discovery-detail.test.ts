import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const app = readFileSync(new URL("../app/components/PetOwnerApp.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

test("Jelajahi service detail is a structured responsive booking surface", () => {
  assert.match(app, /service-detail-hero/);
  assert.match(app, /Layanan terverifikasi/);
  assert.match(app, /Yang tersedia untuk pet-mu/);
  assert.match(app, /Booking lebih tenang bersama Slivadoc/);
  assert.match(app, /Pilih jadwal & booking/);
  assert.match(app, /role="dialog"/);
  assert.match(styles, /\.service-detail-highlight/);
  assert.match(styles, /\.service-detail-modal\{overflow-x:hidden\}/);
  assert.match(styles, /@media\(max-width:620px\)/);
});
