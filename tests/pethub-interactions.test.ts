import test from "node:test";
import assert from "node:assert/strict";
import { PET_HUB_STORY_DURATION_MS, petHubContentLink, storyProgress } from "../app/lib/pethub-interactions.ts";
test("story is 30 seconds and progress remains bounded", () => {
  assert.equal(PET_HUB_STORY_DURATION_MS,30000);
  assert.equal(storyProgress(-1),0);
  assert.equal(storyProgress(15000),0.5);
  assert.equal(storyProgress(30000),1);
  assert.equal(storyProgress(90000),1);
});
test("PetHub shares address the Slivadoc posting, not the media CDN", () => {
  const url=new URL(petHubContentLink("album /?&"));
  assert.equal(url.origin,"https://slivadoc.com");
  assert.equal(url.searchParams.get("view"),"pethub");
  assert.equal(url.searchParams.get("post"),"album /?&");
});
