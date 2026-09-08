import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const webPayment = readFileSync(
  "app/components/payments/BatpayPayment.tsx",
  "utf8",
);
const mobilePayment = readFileSync(
  "mobile/src/components/BatpayPayment.tsx",
  "utf8",
);

test("web and mobile payment UI ignore provider-owned labels and descriptions", () => {
  for (const source of [webPayment, mobilePayment]) {
    assert.doesNotMatch(source, /\{(?:method|item)\.label\}/);
    assert.doesNotMatch(source, /\{(?:method|item)\.description\}/);
    assert.match(source, /paymentMethodLabel/);
    assert.match(source, /paymentMethodDescription/);
    assert.match(source, /neutralPaymentMessage/);
  }
});
