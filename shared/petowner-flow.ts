// Shared by the native client and web: mobile defines the Pet Owner journey.
export const worldFeatures = [
  { mode: "academy", label: "Pet Academy" },
  { mode: "events", label: "Pet Event" },
  { mode: "petspot", label: "PetSpot" },
  { mode: "pethub", label: "PetHub" },
  { mode: "consult", label: "Konsultasi" },
  { mode: "adoption", label: "Adopsi" },
  { mode: "documents", label: "Pet Documents" },
  { mode: "pawdating", label: "PAW Dating" },
] as const;

export type PetOwnerWorldMode = (typeof worldFeatures)[number]["mode"];
export function isWorldMode(value: unknown): value is PetOwnerWorldMode {
  return worldFeatures.some((item) => item.mode === value);
}

export const PET_PROFILE_REQUIRED_MESSAGE =
  "Tambahkan profil pet terlebih dahulu. Tanpa pet, akun hanya dapat melihat konten.";

const petProtectedMutationPatterns = [
  /^\/api\/v1\/petowner\/(?:bookings|orders|favorites\/toggle|products\/[^/]+\/reviews|academy\/programs\/[^/]+\/reviews|petship|fundraisers|reminders)(?:\/|$)/,
  /^\/api\/v1\/community\//,
  /^\/api\/v1\/pethub\//,
  /^\/api\/v1\/consultations(?:\/|$)/,
  /^\/api\/v1\/trainer-consultations$/,
  /^\/api\/v1\/adoptions\//,
  /^\/api\/v1\/academy\/enrollments$/,
  /^\/api\/v1\/events\/[^/]+\/registrations$/,
  /^\/api\/v1\/pet-document-requests$/,
  /^\/api\/v1\/pawdating\//,
  /^\/api\/v1\/payment-intents$/,
];

export function petOwnerMutationRequiresPet(path: string, method = "GET") {
  if (method.toUpperCase() === "GET") return false;
  const pathname = path.split("?", 1)[0] ?? path;
  return petProtectedMutationPatterns.some((pattern) => pattern.test(pathname));
}
