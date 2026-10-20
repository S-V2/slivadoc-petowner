import assert from "node:assert/strict";
import test from "node:test";
import { authFormIsValid } from "../app/lib/auth-form.ts";

test("checking button readiness never dispatches native invalid events", () => {
  const firstField = { validity: { valid: false } };
  const form = {
    elements: [
      firstField,
      { validity: { valid: true } },
      {},
    ],
    checkValidity() {
      throw new Error("Invalid events must not fire before submit");
    },
  } as unknown as HTMLFormElement;
  assert.equal(authFormIsValid(form), false);
  firstField.validity.valid = true;
  assert.equal(authFormIsValid(form), true);
});

test("consent and pattern failures keep submission unavailable; missing form is not ready", () => {
  assert.equal(authFormIsValid(null), false);
  const form = {
    elements: [{ validity: { valid: true } }, { validity: { valid: false } }],
  } as unknown as HTMLFormElement;
  assert.equal(authFormIsValid(form), false);
});
