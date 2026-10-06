import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

// Deliberately accepts only the isolated local QA servers, never production.
const api = "http://localhost:8086/api/v1";
const mediaAPI = "http://localhost:8096";
const password = process.env.PETHUB_QA_PASSWORD;
assert.ok(password, "Set PETHUB_QA_PASSWORD for the existing QA demo account");
let token = "";
async function request(path, body, base = api) {
  const response = await fetch(base + path, {
    method: body === undefined ? "GET" : "POST",
    signal: AbortSignal.timeout(20000),
    headers: {
      ...(body instanceof FormData
        ? {}
        : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body:
      body === undefined
        ? undefined
        : body instanceof FormData
          ? body
          : JSON.stringify(body),
  });
  const data = await response.json();
  assert.ok(
    response.ok,
    `${path}: ${response.status} ${data.message || data.error || ""}`,
  );
  return data;
}
const login = await request("/auth/login", {
  email: "pawdating.milo@slivadoc.local",
  password,
});
token = login.access_token;
assert.ok(token);
async function upload(path, name, type) {
  const form = new FormData();
  form.append("file", new Blob([await readFile(path)], { type }), name);
  form.append("folder", "pethub/qa");
  const result = await request("/api/uploads/media", form, mediaAPI);
  assert.match(result.url, /^https:\/\//);
  assert.equal(
    result.resourceType,
    type.startsWith("video/") ? "video" : "image",
  );
  return result.url;
}
const hostedOnly = process.env.PETHUB_QA_HOSTED_ONLY === "1";
const photos = hostedOnly ? [
  "https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&w=900&q=82",
  "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&w=900&q=82",
] : await Promise.all([
  upload("public/brand/slivadoc-logo.png", "qa-logo.png", "image/png"),
  upload("public/brand/slivadoc-favicon.png", "qa-icon.png", "image/png"),
]);
const label = `[QA E2E] ${Date.now()}`;
const created = await request("/pethub/posts", {
  content: `${label} album upload nyata`,
  post_type: "photo",
  media_urls: photos,
});
const feed = async () =>
  (
    await request(`/public/pethub/feed?search=${encodeURIComponent(label)}`)
  ).data.find((p) => p.id === created.id);
assert.deepEqual((await feed()).media_urls, photos);
assert.equal((await feed()).comment_count, 0);
assert.equal(
  (await request(`/pethub/posts/${created.id}/reactions`, {})).like_count,
  1,
);
assert.equal((await feed()).liked, true);
await request(`/pethub/posts/${created.id}/comments`, {
  content: `${label} komentar tersimpan`,
});
const comments = await request(`/pethub/posts/${created.id}/comments`);
assert.equal(comments.count, 1);
assert.equal((await feed()).comment_count, comments.count);
assert.equal(
  (await request(`/pethub/posts/${created.id}/save`, {})).saved,
  true,
);
assert.equal((await feed()).saved, true);
assert.equal(
  (await request(`/pethub/posts/${created.id}/save`, {})).saved,
  false,
);
assert.equal(
  (await request(`/pethub/posts/${created.id}/reactions`, {})).like_count,
  0,
);
const video = process.env.PETHUB_QA_VIDEO
  ? await upload(process.env.PETHUB_QA_VIDEO, "qa-reel.mp4", "video/mp4")
  : "https://res.cloudinary.com/demo/video/upload/dog.mp4";
await request("/pethub/posts", {
  content: `${label} reel`,
  post_type: "video",
  media_urls: [video],
});
for (const [media_type, media_url] of [
  ["image", photos[0]],
  ["video", video],
]) {
  const story = await request("/pethub/stories", {
    media_type,
    media_url,
    caption: `${label} story ${media_type}`,
  });
  for (let i = 0; i < 2; i++)
    assert.equal(
      (await request(`/pethub/stories/${story.id}/views`, {})).view_count,
      1,
    );
  const row = (await request("/public/pethub/stories")).data.find(
    (s) => s.id === story.id,
  );
  assert.equal(row.media_type, media_type);
  assert.equal(row.view_count, 1);
  assert.ok(Date.parse(row.expires_at) > Date.now());
}
console.log(
  JSON.stringify({
    result: "PASS",
    album: created.id,
  checks: [
    hostedOnly ? "hosted photos (upload skipped explicitly)" : "real photo upload",
      "DB album",
      "like/unlike persistence",
      "comment counts",
      "bookmark persistence",
      "video post",
      "photo/video story",
      "unique views",
    ],
    videoUpload: Boolean(process.env.PETHUB_QA_VIDEO),
  }),
);
