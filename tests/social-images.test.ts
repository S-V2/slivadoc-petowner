import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import sharp from "sharp";
import { socialImages, pageMetadata } from "../app/lib/seo-config.ts";

test("every default social image fully decodes to an opaque 1200 × 630 JPEG", async () => {
  for (const image of Object.values(socialImages)) {
    const pathname = new URL(image.url).pathname;
    const data = await readFile(new URL(`../public${pathname}`, import.meta.url));
    assert.ok(data.length < 200_000, `${pathname} must stay lightweight for preview crawlers`);
    const { info, data: pixels } = await sharp(data, { failOn: "error" })
      .raw().toBuffer({ resolveWithObject: true });
    assert.equal(info.width, 1200);
    assert.equal(info.height, 630);
    assert.equal(info.channels, 3, "previews must have a full opaque background");
    assert.equal(pixels.length, 1200 * 630 * 3, "decode the whole image, not just its header");
    assert.equal((await sharp(data).metadata()).format, "jpeg");
  }
});

test("Career metadata selects its own preview while custom images remain supported", () => {
  for (const path of ["/career", "/career/pet-groomer"]) {
    const metadata = pageMetadata({ title: "Career", description: "Pet Care roles", path });
    assert.deepEqual(metadata.openGraph?.images, [socialImages.career]);
    assert.deepEqual(metadata.twitter?.images, [{ url: socialImages.career.url, alt: socialImages.career.alt }]);
  }
  const image = { url: "https://example.test/place.jpg", alt: "Place photograph" };
  assert.deepEqual(pageMetadata({ title: "Place", description: "Place details", path: "/places/example", image }).openGraph?.images, [image]);
  assert.deepEqual(pageMetadata({ title: "Home", description: "Pet care", path: "/" }).openGraph?.images, [socialImages.default]);
});
