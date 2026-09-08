import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("home Tanya Dokter opens the consultation catalogue instead of live chat", () => {
  const app = read("mobile/App.tsx");
  const home = read("mobile/src/screens/HomeScreen.tsx");

  assert.match(home, /onOpenConsultation/);
  assert.match(home, /Tanya Dokter[\s\S]*onPress: onOpenConsultation/);
  assert.doesNotMatch(home, /onOpenChat/);
  assert.match(app, /onOpenConsultation=\{\(\) => openConsultation\(\)\}/);
  assert.match(app, /result\.route === "consult"[\s\S]*openConsultation\(\)/);
});

test("Android and iOS get a visible back control outside the home tab", () => {
  const app = read("mobile/App.tsx");

  assert.match(app, /\{tab !== "home" \? \(/);
  assert.doesNotMatch(app, /Platform\.OS === "android" && tab !== "home"/);
  assert.match(app, /accessibilityLabel="Kembali ke halaman sebelumnya"/);
  assert.match(app, /onPress=\{\(\) => goBack\(\)\}/);
});

test("community group experience is database-backed chat without call controls", () => {
  const api = read("mobile/src/api.ts");
  const groups = read("mobile/src/screens/CommunityGroups.tsx");
  const room = groups.slice(groups.indexOf("function GroupRoom"), groups.indexOf("const styles"));

  assert.match(api, /GET|platformRequest/);
  assert.match(api, /\/api\/v1\/community\/groups\?scope=/);
  assert.match(api, /\/api\/v1\/community\/groups\/\$\{id\}\/messages/);
  assert.match(groups, /Chat saya/);
  assert.match(groups, /Temukan grup/);
  assert.match(groups, /createMobileCommunityGroup/);
  assert.match(groups, /sendMobileCommunityGroupMessage/);
  assert.doesNotMatch(room, /name="call/);
  assert.doesNotMatch(room, /name="videocam/);
});

test("PetHub exposes stories, feed, reels, media upload, and bounded composers", () => {
  const api = read("mobile/src/api.ts");
  const hub = read("mobile/src/screens/PetHubExperience.tsx");
  const ui = read("mobile/src/components/ui.tsx");

  assert.match(api, /getMobilePetHubStories/);
  assert.match(api, /getMobilePetHubReels/);
  assert.match(api, /createMobilePetHubMediaPost/);
  assert.match(api, /\/api\/uploads\/media/);
  assert.match(hub, /\["feed", "reels"\]/);
  assert.match(hub, /mediaTypes: composerMode === "reel" \? \["videos"\] : \["images", "videos"\]/);
  assert.match(hub, /maxHeight="86%"/);
  assert.match(ui, /maxHeight = "86%"/);
});
