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
  assert.match(
    mobileWorld,
    /setSelected\(plan\);[\s\S]*loadTrainerSlots\(plan\)/,
  );
  assert.match(
    mobileWorld,
    /trainerAvailabilityRequest\.current !== requestID/,
  );
  assert.match(mobileWorld, /"consultation",\s*source\.id,\s*paymentMethod/);
});

test("trainer consultations reuse the paid realtime room", () => {
  assert.match(webMarketplace, /ConsultationRoom/);
  assert.match(webMarketplace, /consultation\.provider_name/);
  assert.match(webMarketplace, /consultation:message/);
  assert.match(webMarketplace, /startConsultationMedia/);
});

test("web consultation catalog filters provider type and specialty", () => {
  assert.match(webMarketplace, /type ConsultProviderFilter = [^;]*"all"/);
  assert.match(webMarketplace, /chooseConsultProvider\("veterinarian"\)/);
  assert.match(webMarketplace, /chooseConsultProvider\("trainer"\)/);
  assert.match(webMarketplace, /consultationSpecialties/);
  assert.match(webMarketplace, /hasSpecialty\(doctor\.specialties/);
  assert.match(webMarketplace, /hasSpecialty\(trainer\.specialties/);
  assert.match(webMarketplace, /Semua spesialisasi/);
  assert.match(webApi, /specialties: string\[\]/);
  assert.match(webApi, /specialty/);
});

test("mobile consultation catalog filters combined plans by provider and specialty", () => {
  assert.match(mobileWorld, /type ConsultProviderFilter = [^;]*"all"/);
  assert.match(mobileWorld, /item\.provider_type === consultProvider/);
  assert.match(mobileWorld, /item\.specialties \?\? \[\]/);
  assert.match(mobileWorld, /Semua spesialisasi/);
  assert.match(mobileWorld, /visibleItems\.map/);
  assert.match(mobileApi, /specialties\?: string\[\]/);
});
