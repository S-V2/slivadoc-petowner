import assert from "node:assert/strict";
import { access, readFile, stat } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

test("Pet Owner web dan mobile memakai master logo Slivadoc", async () => {
  const assets = [
    "public/brand/slivadoc-logo.png",
    "public/brand/slivadoc-favicon.png",
    "mobile/assets/slivadoc-logo.png",
    "mobile/assets/icon.png",
    "mobile/assets/splash.png",
    "mobile/assets/adaptive-icon.png",
  ];

  for (const asset of assets) {
    const target = new URL(asset, root);
    const [bytes, info] = await Promise.all([readFile(target), stat(target)]);
    assert.deepEqual(bytes.subarray(0, 8), pngSignature, `${asset} harus PNG valid`);
    assert.ok(info.size > 500, `${asset} tidak boleh kosong`);
  }

  await assert.rejects(access(new URL("public/favicon.svg", root)));
  await assert.rejects(access(new URL("mobile/assets/icon.svg", root)));
});

test("Pet Owner mengunci loading brand dan skala tipografi responsif", async () => {
  const [component, loading, layout, css, mobile] = await Promise.all([
    readFile(new URL("app/components/BrandLogo.tsx", root), "utf8"),
    readFile(new URL("app/loading.tsx", root), "utf8"),
    readFile(new URL("app/layout.tsx", root), "utf8"),
    readFile(new URL("app/globals.css", root), "utf8"),
    readFile(new URL("mobile/App.tsx", root), "utf8"),
  ]);

  assert.match(component, /\/brand\/slivadoc-logo\.png/);
  assert.match(loading, /<BrandLogo markOnly priority/);
  assert.match(layout, /slivadoc-favicon\.png/);
  assert.match(css, /--type-page-title:\s*32px/);
  assert.match(css, /--type-page-title:\s*26px/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(mobile, /assets\/slivadoc-logo\.png/);
  assert.match(mobile, /Menyiapkan Slivadoc/);
});
