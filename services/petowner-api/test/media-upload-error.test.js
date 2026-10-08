import assert from "node:assert/strict";
import test from "node:test";
import { mediaUploadFailure } from "../src/media-upload-error.js";
test("media storage timeout is actionable and does not leak provider credentials", () => {
  const result = mediaUploadFailure({
    name: "TimeoutError",
    http_code: 499,
    message: "secret provider details",
  });
  assert.equal(result.status, 503);
  assert.equal(result.error, "media_storage_unreachable");
  assert.match(result.message, /belum diterbitkan/);
  assert.doesNotMatch(result.message, /secret/);
});
test("provider configuration failures remain distinct from upload failures", () => {
  assert.equal(
    mediaUploadFailure({ http_code: 401 }).error,
    "media_storage_configuration",
  );
  assert.equal(
    mediaUploadFailure({ http_code: 500 }).error,
    "media_upload_unavailable",
  );
});
