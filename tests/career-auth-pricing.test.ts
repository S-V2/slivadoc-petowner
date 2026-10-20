import assert from "node:assert/strict";
import test from "node:test";
import { careerLoginURL, careerReturnPath } from "../shared/career-auth.ts";
import { sitterPackageRate } from "../shared/pet-sitter.ts";
import {
  sendCareerApplication,
  CareerSubmissionError,
  careerSubmitError,
} from "../shared/careers.ts";
test("career return accepts only internal career paths and preserves role filters", () => {
  const path = "/career/pet-sitter?employment=PART_TIME#career-role-title";
  assert.equal(careerReturnPath(path), path);
  assert.equal(
    new URL(careerLoginURL(path), "http://localhost").searchParams.get(
      "returnTo",
    ),
    path,
  );
  for (const bad of [
    "https://example.com",
    "//evil.test/career",
    "/career/../../evil",
    "/account",
    "/career%2fevil",
    "/career/\\evil",
  ])
    assert.equal(careerReturnPath(bad), null);
});
test("package display uses server rounding and never discounts extra pets", () => {
  const sitter = {
    daily_rate: 10001,
    weekly_rate: 63000,
    extra_pet_rate: 25000,
    discount_enabled: true,
    discount_percent: 15,
  } as Parameters<typeof sitterPackageRate>[0];
  assert.equal(sitterPackageRate(sitter), 8501);
  assert.equal(sitterPackageRate(sitter, true), 53550);
  assert.equal(
    sitterPackageRate({ ...sitter, discount_enabled: false }),
    10001,
  );
});
test("application transport requires a token and refreshes a rejected session", async (t) => {
  let token = "expired";
  let attempts = 0;
  t.mock.method(
    globalThis,
    "fetch",
    async (_url: unknown, init: RequestInit) => {
      attempts++;
      assert.equal(
        (init.headers as Record<string, string>).Authorization,
        `Bearer ${token}`,
      );
      return new Response(
        JSON.stringify(
          attempts === 1
            ? { code: "unauthorized" }
            : { id: "receipt", status: "received" },
        ),
        { status: attempts === 1 ? 401 : 201 },
      );
    },
  );
  await assert.rejects(
    () =>
      sendCareerApplication("http://localhost", new FormData(), {
        getToken: () => "",
        refresh: async () => {},
      }),
    CareerSubmissionError,
  );
  assert.equal(attempts, 0);
  const receipt = await sendCareerApplication(
    "http://localhost",
    new FormData(),
    {
      getToken: () => token,
      refresh: async () => {
        token = "fresh";
      },
    },
  );
  assert.equal(receipt.id, "receipt");
  assert.equal(attempts, 2);
});
test("proxy 413 on an oversized CV surfaces the resume-size message, not the network error", async (t) => {
  t.mock.method(
    globalThis,
    "fetch",
    async () => new Response("Request Entity Too Large", { status: 413 }),
  );
  const error = await sendCareerApplication(
    "http://localhost",
    new FormData(),
    {
      getToken: () => "token",
      refresh: async () => {},
    },
  ).catch((e) => e);
  assert.equal(
    careerSubmitError(error, "id"),
    "Pilih CV berformat PDF maksimal 5 MB.",
  );
});
