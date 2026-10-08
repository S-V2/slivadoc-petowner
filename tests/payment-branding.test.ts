import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const webPayment = readFileSync(
  "app/components/payments/QrisPayment.tsx",
  "utf8",
);
const mobilePayment = readFileSync(
  "mobile/src/components/QrisPayment.tsx",
  "utf8",
);

test("web and mobile payment UI ignore provider-owned labels and descriptions", () => {
  for (const source of [webPayment, mobilePayment]) {
    assert.doesNotMatch(source, /\{(?:method|item)\.label\}/);
    assert.doesNotMatch(source, /\{(?:method|item)\.description\}/);
    assert.match(source, /neutralPaymentMessage/);
  }
});
