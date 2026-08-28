import { NativeModules, Platform } from "react-native";
import { io } from "socket.io-client";

function resolveDevelopmentHost() {
  const scriptUrl = String(NativeModules.SourceCode?.scriptURL ?? "");
  const match = scriptUrl.match(/^[a-z]+:\/\/\[?([^\]/:]+)]?/i);
  return match?.[1] || undefined;
}

const developmentHost =
  resolveDevelopmentHost() ??
  (Platform.OS === "android" ? "10.0.2.2" : "localhost");

export const PETOWNER_API_URL =
  process.env.EXPO_PUBLIC_PETOWNER_API_URL ?? `http://${developmentHost}:8090`;
export const PLATFORM_API_URL =
  process.env.EXPO_PUBLIC_PLATFORM_API_URL ?? `http://${developmentHost}:8080`;

export type AssistantMessage = { role: "user" | "assistant"; content: string };

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${PETOWNER_API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(platformAccessToken
        ? { Authorization: `Bearer ${platformAccessToken}` }
        : {}),
      ...init?.headers,
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(
      payload.answer ??
        payload.message ??
        payload.error ??
        "Layanan pet owner belum tersedia",
    );
  return payload as T;
}

let platformAccessToken = "";
export function setPlatformAccessToken(token: string) {
  platformAccessToken = token;
  realtime.auth = { token };
}
export function hasPlatformSession() {
  return Boolean(platformAccessToken);
}

const mobileCache = new Map<string, { expires: number; value: unknown }>();
const mobileInFlight = new Map<string, Promise<unknown>>();
export function clearMobileCache() {
  mobileCache.clear();
}

async function platformRequest<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const method = String(init?.method ?? "GET").toUpperCase();
  const key = `${path}:${platformAccessToken.slice(-12)}`;
  if (method === "GET") {
    const cached = mobileCache.get(key);
    if (cached && cached.expires > Date.now()) return cached.value as T;
    const pending = mobileInFlight.get(key);
    if (pending) return pending as Promise<T>;
  }
  const run = (async () => {
    const response = await fetch(`${PLATFORM_API_URL}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(platformAccessToken
          ? { Authorization: `Bearer ${platformAccessToken}` }
          : {}),
        ...init?.headers,
      },
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok)
      throw new Error(payload.message ?? "Layanan Slivadoc belum tersedia");
    if (method === "GET")
      mobileCache.set(key, { expires: Date.now() + 15_000, value: payload });
    else mobileCache.clear();
    return payload as T;
  })();
  if (method === "GET") mobileInFlight.set(key, run);
  try {
    return await run;
  } finally {
    if (method === "GET") mobileInFlight.delete(key);
  }
}

export type MobilePet = {
  id: string;
  name: string;
  species: string;
  breed: string;
  age_months: number;
  weight_kg: number;
  health_score: number;
  allergies: string;
  medical_notes: string;
  vaccination_status: string;
  photo_url: string;
  last_medical_record_at?: string;
};
export type MobileOwner = {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  member_since: string;
};
export type MobileNotification = {
  id: string;
  category: string;
  title: string;
  body: string;
  read_at?: string | null;
  created_at: string;
};
export type MobileActivity = {
  id: string;
  pet_id: string;
  category: string;
  title: string;
  description: string;
  status: string;
  action_route: string;
  action_label: string;
  metadata: Record<string, unknown>;
  starts_at?: string;
  occurred_at: string;
};
export type MobileBootstrap = {
  user: MobileOwner;
  pets: MobilePet[];
  notifications: MobileNotification[];
  activities: MobileActivity[];
  favorites: Array<{
    entity_type: string;
    entity_id: string;
    created_at: string;
  }>;
  points: {
    balance: number;
    earned: number;
    redeemed: number;
    formula: {
      enabled: boolean;
      point_value_rupiah?: number;
      expiry_days?: number;
      settlement_hold_days?: number;
      max_redemption_bps?: number;
      min_redemption_points?: number;
      payment_methods?: Array<{
        method: string;
        label: string;
        mode: string;
        divisor: number;
        points_per_unit: number;
        fixed_points: number;
      }>;
      rules?: string[];
    };
  };
};
export type MobileService = {
  id: string;
  branch_id: string;
  name: string;
  category: string;
  price: number;
  distance_km?: number | null;
  city: string;
  address: string;
  business_name: string;
  branch_name: string;
  duration_minutes: number;
};
export type MobileMedicalRecord = {
  id: string;
  record_type: string;
  title: string;
  complaint: string;
  diagnosis: string;
  treatment: string;
  clinical_notes: string;
  doctor_name: string;
  occurred_at: string;
  weight_kg?: number;
  temperature_c?: number;
  next_control_at?: string;
};
export type MobilePaymentMethod = {
  code: string;
  method: "qris" | "virtual_account";
  bank_code?: string;
  label: string;
  description: string;
};
export type MobilePaymentIntent = {
  id: string;
  order_id: string;
  provider: string;
  method: "qris" | "virtual_account";
  bank_code?: string;
  status: string;
  payment_status: string;
  amount: number;
  currency: string;
  reference_type: string;
  reference_id: string;
  qr_url?: string;
  va_number?: string;
  va_name?: string;
  expires_at?: string;
};

export async function loginMobile(email: string, password: string) {
  const response = await fetch(`${PLATFORM_API_URL}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(payload.message ?? "Email atau password salah");
  setPlatformAccessToken(payload.access_token);
  mobileCache.clear();
  return payload as { access_token: string; refresh_token: string };
}
export async function registerMobileOwner(input: {
  full_name: string;
  phone: string;
  email: string;
  password: string;
}) {
  const response = await fetch(
    `${PLATFORM_API_URL}/api/v1/auth/petowner/register`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
  );
  const payload = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(payload.message ?? "Registrasi belum dapat diproses");
  return payload as {
    user_id: string;
    message: string;
    development_otp?: string;
  };
}
export async function verifyMobileRegistrationOTP(email: string, otp: string) {
  return platformRequest<{ message: string }>(
    "/api/v1/auth/register/verify-otp",
    { method: "POST", body: JSON.stringify({ email, otp }) },
  );
}
export async function resendMobileRegistrationOTP(email: string) {
  return platformRequest<{ message: string; development_otp?: string }>(
    "/api/v1/auth/otp/resend",
    {
      method: "POST",
      body: JSON.stringify({ email, purpose: "registration" }),
    },
  );
}
export function logoutMobile() {
  setPlatformAccessToken("");
  mobileCache.clear();
}
export const getMobileBootstrap = () =>
  platformRequest<MobileBootstrap>("/api/v1/petowner/bootstrap");
export const getMobileServices = (options?: {
  search?: string;
  category?: string;
  latitude?: number;
  longitude?: number;
}) => {
  const query = new URLSearchParams();
  Object.entries(options ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== "") query.set(key, String(value));
  });
  return platformRequest<{ data: MobileService[] }>(
    `/api/v1/public/discovery/services${query.size ? `?${query}` : ""}`,
  );
};
export const getMobileMedicalRecords = (petId: string) =>
  platformRequest<{ data: MobileMedicalRecord[] }>(
    `/api/v1/pets/${petId}/medical-records`,
  );
export const createMobileBooking = (input: Record<string, unknown>) =>
  platformRequest<{
    id: string;
    booking_code: string;
    amount: number;
    status: string;
    message: string;
  }>("/api/v1/petowner/bookings", {
    method: "POST",
    body: JSON.stringify(input),
  });
export const getMobilePaymentMethods = () =>
  platformRequest<{ data: MobilePaymentMethod[] }>("/api/v1/payment-methods");
export const createMobilePaymentIntent = (
  referenceType: string,
  referenceId: string,
  paymentMethod: string,
) =>
  platformRequest<MobilePaymentIntent>("/api/v1/payment-intents", {
    method: "POST",
    headers: {
      "Idempotency-Key": `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    },
    body: JSON.stringify({
      reference_type: referenceType,
      reference_id: referenceId,
      payment_method: paymentMethod,
    }),
  });
export const getMobilePaymentIntent = (paymentId: string) =>
  platformRequest<MobilePaymentIntent>(`/api/v1/payment-intents/${paymentId}`);
export const readMobileNotification = (id: string) =>
  platformRequest<{ read: boolean }>(`/api/v1/notifications/${id}/read`, {
    method: "PATCH",
  });
export const readAllMobileNotifications = () =>
  platformRequest<{ updated: number }>("/api/v1/notifications/read-all", {
    method: "PATCH",
  });
export const toggleMobileFavorite = (entityId: string) =>
  platformRequest<{ favorite: boolean }>("/api/v1/petowner/favorites/toggle", {
    method: "POST",
    body: JSON.stringify({ entity_type: "service", entity_id: entityId }),
  });
export type MobileCommunityPost = {
  id: string;
  author_name: string;
  pet_id: string;
  pet_name: string;
  group_name: string;
  body: string;
  category: string;
  image_url: string;
  location: string;
  like_count: number;
  comment_count: number;
  liked: boolean;
  created_at: string;
};
export type MobileCommunityComment = {
  id: string;
  author_name: string;
  body: string;
  created_at: string;
};
export const getMobileCommunityPosts = (tab = "for_you") =>
  platformRequest<{ data: MobileCommunityPost[] }>(
    `/api/v1/public/community/posts?tab=${encodeURIComponent(tab)}`,
  );
export const createMobileCommunityPost = (input: Record<string, unknown>) =>
  platformRequest<{ id: string; created_at: string; message: string }>(
    "/api/v1/community/posts",
    { method: "POST", body: JSON.stringify(input) },
  );
export const reactMobileCommunityPost = (id: string) =>
  platformRequest<{ liked: boolean; like_count: number }>(
    `/api/v1/community/posts/${id}/reactions`,
    { method: "POST" },
  );
export const getMobileCommunityComments = (id: string) =>
  platformRequest<{ data: MobileCommunityComment[] }>(
    `/api/v1/community/posts/${id}/comments`,
  );
export const createMobileCommunityComment = (id: string, body: string) =>
  platformRequest<{ id: string; created_at: string; message: string }>(
    `/api/v1/community/posts/${id}/comments`,
    { method: "POST", body: JSON.stringify({ body }) },
  );

export type WorldItem = {
  id: string;
  title?: string;
  name?: string;
  description?: string;
  category?: string;
  academy_name?: string;
  trainer_name?: string;
  full_name?: string;
  doctor_name?: string;
  specialties?: string[];
  mode?: string;
  veterinarian_id?: string;
  duration_minutes?: number;
  total_fee?: number;
  processing_days?: number;
  requirements?: string[];
  breed?: string;
  sex?: string;
  species?: string;
  age_months?: number;
  health_status?: string;
  health_score?: number;
  health_valid_until?: string;
  health_verification?: string;
  eligibility_status?: string;
  risk_level?: string;
  profile_level?: number;
  level_name?: string;
  pedigree_status?: string;
  temperament?: string[];
  vaccinated?: boolean;
  sterilized?: boolean;
  personality?: string[];
  price?: number;
  next_schedule?: string;
  starts_at?: string;
  venue?: string;
  address?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  rating?: number;
  distance_km?: number;
  pet_facilities?: string[];
  status?: string;
  viewer_count?: number;
  channel_name?: string;
  playback_url?: string;
  content?: string;
  author_name?: string;
  like_count?: number;
  comment_count?: number;
};
export const getMobileAcademy = () =>
  platformRequest<{ data: WorldItem[] }>("/api/v1/public/academy/programs");
export const trackMobileAcademyProgramClick = (programId: string) =>
  platformRequest<void>(`/api/v1/public/academy/programs/${programId}/click`, {
    method: "POST",
  });
export const getMobileEvents = () =>
  platformRequest<{ data: WorldItem[] }>("/api/v1/public/events");
export const getMobilePetSpots = () =>
  platformRequest<{ data: WorldItem[] }>("/api/v1/public/petspots");
export const getMobileStreams = () =>
  platformRequest<{ data: WorldItem[] }>("/api/v1/public/pethub/streams");
export const getMobilePetHubFeed = () =>
  platformRequest<{ data: WorldItem[] }>("/api/v1/public/pethub/feed");
export const getMobileVeterinarians = () =>
  platformRequest<{ data: WorldItem[] }>("/api/v1/public/veterinarians");
export const getMobileConsultationPlans = () =>
  platformRequest<{ data: WorldItem[] }>("/api/v1/public/consultation-plans");
export const getMobileAdoptions = () =>
  platformRequest<{ data: WorldItem[] }>("/api/v1/public/adoptions");
export const getMobileDocumentProducts = () =>
  platformRequest<{ data: WorldItem[] }>("/api/v1/public/pet-documents");
export const getMobilePawDatingProfiles = () =>
  platformRequest<{ data: WorldItem[] }>(
    "/api/v1/public/pawdating/profiles?min_level=2&min_health_score=80&max_distance_km=200",
  );
export const getMobileMyPawDatingProfiles = () =>
  platformRequest<{ data: WorldItem[] }>("/api/v1/pawdating/profiles");
export const sendMobilePawDatingInterest = (
  targetProfileId: string,
  sourceProfileId: string,
) =>
  platformRequest<{ id: string; status: string; message: string }>(
    `/api/v1/pawdating/profiles/${targetProfileId}/interests`,
    {
      method: "POST",
      body: JSON.stringify({
        source_profile_id: sourceProfileId,
        interest_type: "interest",
        introduction_message:
          "Halo, kami tertarik mendiskusikan kecocokan pet setelah meninjau laporan kesehatan kedua pet.",
      }),
    },
  );
export const createMobileConsultation = (plan: WorldItem, complaint: string) =>
  platformRequest<{ id: string; room_key: string; amount: number }>(
    "/api/v1/consultations",
    {
      method: "POST",
      body: JSON.stringify({
        veterinarian_id: plan.veterinarian_id,
        plan_id: plan.id,
        complaint,
        scheduled_at: new Date(Date.now() + 3600000).toISOString(),
      }),
    },
  );
export const applyMobileAdoption = (
  listingId: string,
  input: Record<string, unknown>,
) =>
  platformRequest<{ id: string }>(
    `/api/v1/adoptions/${listingId}/applications`,
    { method: "POST", body: JSON.stringify(input) },
  );
export const createMobileDocumentRequest = (
  productId: string,
  input: Record<string, unknown>,
) =>
  platformRequest<{ id: string; request_number: string; amount: number }>(
    "/api/v1/pet-document-requests",
    {
      method: "POST",
      body: JSON.stringify({ product_id: productId, ...input }),
    },
  );
export const commentMobilePetHubPost = (postId: string, content: string) =>
  platformRequest<{ id: string }>(`/api/v1/pethub/posts/${postId}/comments`, {
    method: "POST",
    body: JSON.stringify({ content }),
  });
export const enrollMobileAcademy = (
  programId: string,
  participantName: string,
  petName: string,
) =>
  platformRequest<{ id: string; amount: number; message: string }>(
    "/api/v1/academy/enrollments",
    {
      method: "POST",
      body: JSON.stringify({
        program_id: programId,
        participant_name: participantName,
        pet_name: petName,
      }),
    },
  );
export const registerMobileEvent = (
  eventId: string,
  participantName: string,
  participantEmail: string,
) =>
  platformRequest<{ id: string; qr_token: string; amount: number }>(
    `/api/v1/events/${eventId}/registrations`,
    {
      method: "POST",
      body: JSON.stringify({
        participant_name: participantName,
        participant_email: participantEmail,
        ticket_quantity: 1,
      }),
    },
  );
export const createMobilePetHubPost = (content: string, authorName: string) =>
  platformRequest<{ id: string }>("/api/v1/pethub/posts", {
    method: "POST",
    body: JSON.stringify({
      author_name: authorName,
      content,
      post_type: "thread",
    }),
  });
export const reactMobilePetHubPost = (postId: string) =>
  platformRequest<{ liked: boolean }>(
    `/api/v1/pethub/posts/${postId}/reactions`,
    { method: "POST" },
  );

export function askSlivaCare(
  message: string,
  history: AssistantMessage[],
  context?: {
    userId?: string;
    pet?: {
      name: string;
      species: string;
      breed: string;
      age: string;
      weight: string;
    };
  },
) {
  return request<{
    answer: string;
    mode: "openai" | "offline_dataset";
    degraded?: boolean;
    fallbackReason?: string;
    notice?: string;
  }>("/api/assistant/chat", {
    method: "POST",
    body: JSON.stringify({
      message,
      history: history.slice(-8),
      userId: context?.userId ?? "guest",
      pet: context?.pet,
    }),
  });
}

export function reverseGeocode(latitude: number, longitude: number) {
  return request<{ latitude: number; longitude: number; label: string }>(
    `/api/location/reverse?lat=${latitude}&lng=${longitude}`,
  );
}

export async function uploadMobileImage(
  uri: string,
  mimeType = "image/jpeg",
  fileName = "pet-photo.jpg",
  folder = "pets",
) {
  const body = new FormData();
  body.append("folder", folder);
  body.append("file", {
    uri,
    type: mimeType,
    name: fileName,
  } as unknown as Blob);
  const response = await fetch(`${PETOWNER_API_URL}/api/uploads/images`, {
    method: "POST",
    headers: platformAccessToken
      ? { Authorization: `Bearer ${platformAccessToken}` }
      : undefined,
    body,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(payload.message ?? payload.error ?? "Upload foto gagal");
  return payload as { url: string; publicId: string };
}

export const realtime = io(PETOWNER_API_URL, {
  autoConnect: false,
  auth: { token: platformAccessToken },
  transports: ["websocket", "polling"],
});
