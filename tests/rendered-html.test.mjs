import assert from "node:assert/strict";
import test from "node:test";

async function render(pathname = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${Math.random()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request(`http://localhost${pathname}`, {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("renders Slivadoc SEO metadata and entity schema", async () => {
  const response = await render();

  assert.equal(response.status, 200);
  assert.match(
    response.headers.get("content-type") ?? "",
    /^text\/html\b/i,
  );
  const html = await response.text();
  assert.match(html, /<title>Slivadoc[^<]+Ekosistem Pet Care/i);
  assert.match(html, /Temukan dokter hewan, pet clinic, petshop, grooming/i);
  assert.match(html, /property="og:image"[^>]+slivadoc-pet-hero\.png/i);
  assert.match(html, /"@type":"Organization"/i);
  assert.match(html, /href="\/layanan\//i);
  assert.doesNotMatch(html, /\/_vinext\/image/i);
  assert.doesNotMatch(html, /codex-preview/i);
});

test("serves crawlable service, sitemap, robots, and RSS routes", async () => {
  const service = await render("/layanan/dokter-hewan-online");
  assert.equal(service.status, 200);
  const serviceHtml = await service.text();
  assert.match(serviceHtml, /Konsultasi Dokter Hewan Online/i);
  assert.match(serviceHtml, /"@type":"Service"/i);
  assert.match(serviceHtml, /rel="canonical"[^>]+\/layanan\/dokter-hewan-online/i);

  const sitemap = await render("/sitemap.xml");
  assert.equal(sitemap.status, 200);
  assert.match(sitemap.headers.get("content-type") ?? "", /xml/i);
  assert.match(await sitemap.text(), /\/panduan\/panduan-vaksin-kucing/);

  const robots = await render("/robots.txt");
  assert.equal(robots.status, 200);
  const robotsText = await robots.text();
  assert.match(robotsText, /Sitemap: https:\/\/slivadoc\.id\/sitemap\.xml/i);
  assert.match(robotsText, /Disallow: \/api\//i);

  const feed = await render("/feed.xml");
  assert.equal(feed.status, 200);
  assert.match(feed.headers.get("content-type") ?? "", /application\/rss\+xml/i);
});

test("every sitemap URL renders unique crawlable metadata", async () => {
  const sitemapResponse = await render("/sitemap.xml");
  const sitemapXml = await sitemapResponse.text();
  const urls = [...sitemapXml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
  assert.ok(urls.length >= 30, `expected at least 30 SEO URLs, received ${urls.length}`);
  assert.equal(new Set(urls).size, urls.length, "sitemap URLs must be unique");

  const pages = await Promise.all(urls.map(async (url) => {
    const pathname = new URL(url).pathname;
    const response = await render(pathname);
    return { pathname, response, html: await response.text() };
  }));
  const titles = new Set();
  for (const { pathname, response, html } of pages) {
    assert.equal(response.status, 200, `${pathname} must render successfully`);
    assert.match(html, /<title>[^<]{10,}<\/title>/i, `${pathname} must have a title`);
    assert.match(html, /<meta name="description" content="[^"]{50,}"/i, `${pathname} must have a useful description`);
    assert.match(html, new RegExp(`rel="canonical"[^>]+${pathname === "/" ? "/" : pathname.replaceAll("/", "\\/")}`, "i"), `${pathname} must self-canonicalize`);
    assert.doesNotMatch(html, /name="robots" content="[^"]*noindex/i, `${pathname} must be indexable`);
    if (pathname !== "/") assert.match(html, /<h1\b/i, `${pathname} must have an H1`);
    const title = html.match(/<title>([^<]+)<\/title>/i)?.[1];
    assert.ok(title && !titles.has(title), `${pathname} must have a unique title`);
    titles.add(title);
  }
});
