# Social preview images

The default site preview and Career previews use complete, opaque 1200 × 630 JPEGs:

- `/social/slivadoc-20261020.jpg`
- `/social/slivadoc-career-20261020.jpg`

`app/lib/seo-config.ts` supplies the absolute HTTPS image URL, alt text, dimensions, and MIME type. The root layout uses the default card; Career catalog and role pages use the Career card. Explicit place/product images continue to override the defaults. Article structured data uses the valid default image as well.

Regenerate the committed JPEGs with `npm run social:images`. The generator uses vector artwork and the existing Slivadoc logo, then fully decodes each output. The tests decode all pixels with strict error handling, check the opaque RGB background, dimensions, and size, and verify the actual server-rendered Open Graph/Twitter metadata. Inspect regenerated files visually before publishing.

The previous `slivadoc-pet-hero.png` is truncated inside an IDAT chunk: the chunk requires bytes through 1,897,015, but the file ends at 786,444. A PNG header or HTTP 200 alone does not establish that an image is decodable. Metadata must not use that legacy asset.

When image content changes again, publish a new versioned filename and update the metadata reference. Social applications may cache previews for an existing page URL, and messages already sent may retain an older preview. Verify the current page metadata and retrieve/decode the exact referenced image with the crawler user agent; do not claim a third-party preview cache was purged.
