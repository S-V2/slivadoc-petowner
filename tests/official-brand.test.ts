import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

test("Official Brand portal is served by the console, /brand only redirects", () => {
  const page = readFileSync("app/brand/page.tsx", "utf8");
  const app = readFileSync("app/components/PetOwnerApp.tsx", "utf8");
  assert.ok(page.includes("redirect(process.env.NEXT_PUBLIC_CONSOLE_URL"));
  assert.ok(!existsSync("app/brand/portal.tsx"));
  assert.ok(!existsSync("app/components/commerce"));
  assert.ok(app.includes('router.push("/brand")'));
});
