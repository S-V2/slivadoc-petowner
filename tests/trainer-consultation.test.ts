import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) =>
  readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const webApi = read("app/lib/platform-api.ts");
const webMarketplace = read("app/components/platform/CareMarketplace.tsx");
const mobileApi = read("mobile/src/api.ts");
const mobileWorld = read("mobile/src/screens/WorldScreen.tsx");

test("web pet owners can choose a trainer package, live slot, and BatPay method", () => {
  assert.match(webApi, /\/api\/v1\/public\/trainers/);
  assert.match(webApi, /\/api\/v1\/public\/trainer-consultation-plans/);
  assert.match(webApi, /\/api\/v1\/trainer-consultations/);
  assert.match(webMarketplace, /getTrainerAvailability/);
  assert.match(webMarketplace, /selectedTrainerSlot|selectedSlot/);
  assert.match(webMarketplace, /PaymentMethodPicker/);
  assert.match(webMarketplace, /provider_type:\s*"trainer"/);
});

test("mobile combines doctor and trainer consultations without bypassing scheduling", () => {
  assert.match(mobileApi, /getMobileTrainerConsultationPlans/);
  assert.match(mobileApi, /getMobileTrainerAvailability/);
  assert.match(mobileApi, /createMobileTrainerConsultation/);
  assert.match(mobileApi, /trainer-consultations/);
  assert.match(mobileWorld, /trainerConsult\.value\.data/);
  assert.match(
    mobileWorld,
    /selected\.mode !== "chat" && !selectedTrainerSlot/,
  );
  assert.match(mobileWorld, /"consultation",\s*source\.id,\s*paymentMethod/);
});

test("trainer consultations reuse the paid realtime room", () => {
  assert.match(webMarketplace, /ConsultationRoom/);
  assert.match(webMarketplace, /consultation\.provider_name/);
  assert.match(webMarketplace, /consultation:message/);
  assert.match(webMarketplace, /startConsultationMedia/);
});
