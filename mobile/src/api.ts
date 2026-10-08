import * as SecureStore from "expo-secure-store";

import { NativeModules, Platform } from "react-native";
import { io, type Socket } from "socket.io-client";
import { uniqueById } from "./collections";
import { PET_PROFILE_REQUIRED_MESSAGE, petOwnerMutationRequiresPet as mobileMutationRequiresPet } from "../../shared/petowner-flow";
export { PET_PROFILE_REQUIRED_MESSAGE, petOwnerMutationRequiresPet as mobileMutationRequiresPet } from "../../shared/petowner-flow";
import { buildMobilePawDatingDiscoveryPath } from "./pawdating";
import type { PetSpeciesOption } from "../../shared/pet-profile";

export { uniqueById } from "./collections";
export { buildMobilePawDatingDiscoveryPath } from "./pawdating";

function resolveDevelopmentHost() {
  const scriptUrl = String(NativeModules.SourceCode?.scriptURL ?? "");
  const match = scriptUrl.match(/^[a-z]+:\/\/\[?([^\]/:]+)]?/i);
  return match?.[1] || undefined;
}

const developmentHost =
  resolveDevelopmentHost() ??
  (Platform.OS === "android" ? "10.0.2.2" : "localhost");

function normalizeServiceURL(value?: string) {
  return String(value ?? "")
    .trim()
    .replace(/\/$/, "");
}

function resolveServiceURL(value: string | undefined, developmentPort: number) {
  const configured = normalizeServiceURL(value);
  if (configured) return configured;
  return __DEV__ ? `http://${developmentHost}:${developmentPort}` : "";
}

function requireServiceURL(value: string, variableName: string) {
  if (value) return value;
  throw new Error(
    `Konfigurasi ${variableName} belum tersedia untuk build ini. Hubungi tim Slivadoc.`,
  );
}

export const PETOWNER_API_URL = resolveServiceURL(
  process.env.EXPO_PUBLIC_PETOWNER_API_URL,
  8090,
);
export const PLATFORM_API_URL = resolveServiceURL(
  process.env.EXPO_PUBLIC_PLATFORM_API_URL,
  8080,
);

export type AssistantMessage = { role: "user" | "assistant"; content: string };

const SECURE_ACCESS_KEY = "slivadoc_mobile_access_token";
const SECURE_REFRESH_KEY = "slivadoc_mobile_refresh_token";

let platformAccessToken = "";
let platformRefreshToken = "";
let refreshPromise: Promise<string> | null = null;
let mobileOwnerHasPet: boolean | undefined;

export async function restorePlatformSession(): Promise<boolean> {
  try {
    const [access, refresh] = await Promise.all([
      SecureStore.getItemAsync(SECURE_ACCESS_KEY),
      SecureStore.getItemAsync(SECURE_REFRESH_KEY),
    ]);
    if (access) {
      platformAccessToken = access;
      platformRefreshToken = refresh ?? "";
      return true;
    } else if (refresh) {
      platformRefreshToken = refresh;
      const newAccess = await refreshMobileSession();
      return Boolean(newAccess);
    }
    return false;
  } catch {
    return false;
  }
}

export async function setPlatformTokens(access: string, refresh: string) {
  platformAccessToken = access;
  platformRefreshToken = refresh;
  try {
    await Promise.all([
      access
        ? SecureStore.setItemAsync(SECURE_ACCESS_KEY, access)
        : SecureStore.deleteItemAsync(SECURE_ACCESS_KEY),
      refresh
        ? SecureStore.setItemAsync(SECURE_REFRESH_KEY, refresh)
        : SecureStore.deleteItemAsync(SECURE_REFRESH_KEY),
    ]);
  } catch (err) {
    console.warn("[Mobile API] Gagal menyimpan secure tokens", err);
  }
}

export function setPlatformAccessToken(token: string) {
  platformAccessToken = token;
}

export function hasPlatformSession() {
  return Boolean(platformAccessToken || platformRefreshToken);
}

export async function clearMobileSession() {
  platformAccessToken = "";
  platformRefreshToken = "";
  mobileOwnerHasPet = undefined;
  petownerSocket?.disconnect();
  mobileCache.clear();
  mobileInFlight.clear();
  try {
    await Promise.all([
      SecureStore.deleteItemAsync(SECURE_ACCESS_KEY),
      SecureStore.deleteItemAsync(SECURE_REFRESH_KEY),
    ]);
  } catch {}
}

async function performMobileSessionRefresh(): Promise<string> {
  if (!platformRefreshToken) {
    await clearMobileSession();
    throw new Error("Session berakhir. Silakan login kembali.");
  }
  const baseURL = requireServiceURL(
    PLATFORM_API_URL,
    "EXPO_PUBLIC_PLATFORM_API_URL",
  );
  const response = await fetch(`${baseURL}/api/v1/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: platformRefreshToken }),
  });
  const payload = (await response.json().catch(() => ({}))) as {
    access_token?: string;
    refresh_token?: string;
    message?: string;
  };
  if (!response.ok || !payload.access_token || !payload.refresh_token) {
    await clearMobileSession();
    throw new Error(
      payload.message ?? "Session berakhir. Silakan login kembali.",
    );
  }
  await setPlatformTokens(payload.access_token, payload.refresh_token);
  return payload.access_token;
}

export function refreshMobileSession(): Promise<string> {
  if (refreshPromise) return refreshPromise;
  const pending = performMobileSessionRefresh();
  refreshPromise = pending;
  pending.then(
    () => {
      if (refreshPromise === pending) refreshPromise = null;
    },
    () => {
      if (refreshPromise === pending) refreshPromise = null;
    },
  );
  return pending;
}

const mobileCache = new Map<string, { expires: number; value: unknown }>();
const mobileInFlight = new Map<string, Promise<unknown>>();
export function clearMobileCache() {
  mobileCache.clear();
}

export class MobileApiError extends Error {
  status: number;
  code: string;
  constructor(message: string, status: number, code = "") {
    super(message);
    this.name = "MobileApiError";
    this.status = status;
    this.code = code;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const baseURL = requireServiceURL(
    PETOWNER_API_URL,
    "EXPO_PUBLIC_PETOWNER_API_URL",
  );
  const send = (token: string) =>
    fetch(`${baseURL}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init?.headers,
      },
    });

  let response = await send(platformAccessToken);
  if (response.status === 401 && platformRefreshToken) {
    try {
      const newToken = await refreshMobileSession();
      response = await send(newToken);
    } catch {}
  }
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

async function platformRequest<T>(
  path: string,
  init?: RequestInit,
  retry = true,
): Promise<T> {
  const method = String(init?.method ?? "GET").toUpperCase();
  if (mobileOwnerHasPet === false && mobileMutationRequiresPet(path, method)) {
    throw new Error(PET_PROFILE_REQUIRED_MESSAGE);
  }
  const key = `${path}:${platformAccessToken.slice(-12)}`;
  if (method === "GET" && init?.cache !== "no-store") {
    const cached = mobileCache.get(key);
    if (cached && cached.expires > Date.now()) return cached.value as T;
    const pending = mobileInFlight.get(key);
    if (pending) return pending as Promise<T>;
  }
  const run = (async () => {
    const baseURL = requireServiceURL(
      PLATFORM_API_URL,
      "EXPO_PUBLIC_PLATFORM_API_URL",
    );
    const send = (token: string) =>
      fetch(`${baseURL}${path}`, {
        ...init,
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...init?.headers,
        },
      });

    let response = await send(platformAccessToken);
    if (response.status === 401 && retry && platformRefreshToken) {
      try {
        const newToken = await refreshMobileSession();
        response = await send(newToken);
      } catch {}
    }
    const payload = await response.json().catch(() => ({}));
    if (!response.ok)
      throw new MobileApiError(
        payload.message ?? "Layanan Slivadoc belum tersedia",
        response.status,
        typeof payload.code === "string" ? payload.code : "",
      );
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
  species_group?: string;
  species_common_name?: string;
  emoji?: string;
  breed: string;
  age_months: number;
  weight_kg: number;
  health_score: number;
  allergies: string;
  medical_notes: string;
  vaccination_status: string;
  photo_url: string;
  last_medical_record_at?: string;
  access_role?: string;
  permissions?: string[];
};
export type MobileOwner = {
  id: string;
  public_code?: string;
  email: string;
  full_name: string;
  phone: string;
  member_since: string;
  email_verified?: boolean;
  email_verified_at?: string | null;
  phone_verified?: boolean;
  phone_verified_at?: string | null;
};
export type MobileNotification = {
  id: string;
  category: string;
  title: string;
  body: string;
  action_route?: string;
  read_at?: string | null;
  created_at: string;
  metadata?: Record<string, unknown>;
};
export type MobileFamilyAccess = {
  id: string;
  member_user_id: string;
  email: string;
  full_name: string;
  role: string;
  permissions: string[];
  status: string;
  accepted_at?: string | null;
  created_at: string;
};
export type MobileActivityType =
  | "booking"
  | "order"
  | "consultation"
  | "academy"
  | "event"
  | "reservation"
  | "document"
  | "donation"
  | "hotel"
  | "home_service";
export type MobileActivityState = "all" | "upcoming" | "ongoing" | "history";
export type MobileActivityOrderItem = {
  id: string;
  product_id: string;
  name: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  business_id: string;
  business_name: string;
  branch_id: string;
  branch_name: string;
  image_url: string;
};
export type MobileShipmentEvent = {
  status_code: string;
  status: string;
  description: string;
  location: string;
  journey_type?: string;
  reference_stt_no?: string;
  occurred_at: string;
};
export type MobileShipment = {
  id: string;
  shipping_number: string;
  provider: string;
  provider_shipment_id: string;
  stt_no: string;
  service_code: string;
  status: string;
  provider_status: string;
  pickup_status: string;
  fee: number;
  estimated_sla: string;
  print_url: string;
  events: MobileShipmentEvent[];
};
export type MobileOrderFulfillment = {
  id: string;
  business_id: string;
  business_name: string;
  status: string;
  delivered_at?: string | null;
  return_until?: string | null;
  return_requested?: boolean;
};
export type MobileActivityCenterItem = {
  id: string;
  type: MobileActivityType;
  reference_id: string;
  code: string;
  title: string;
  subtitle: string;
  status: string;
  payment_status: string;
  amount: number;
  state: Exclude<MobileActivityState, "all">;
  scheduled_at?: string | null;
  ends_at?: string | null;
  needs_action: boolean;
  payable: boolean;
  payment_reference_type: string;
  occurred_at: string;
  updated_at: string;
  service_id?: string;
  service_name?: string;
  service_category?: string;
  service_duration_minutes?: number;
  service_price?: number;
  business_id?: string;
  business_name?: string;
  branch_id?: string;
  branch_name?: string;
  address?: string;
  city?: string;
  latitude?: number | null;
  longitude?: number | null;
  pet_id?: string;
  pet_name?: string;
  notes?: string;
  subtotal?: number;
  platform_fee?: number;
  shipping_fee?: number;
  discount_amount?: number;
  voucher_code?: string;
  points_redeemed?: number;
  points_discount?: number;
  total_amount?: number;
  item_count?: number;
  items?: MobileActivityOrderItem[];
  shipments?: MobileShipment[];
  paid_at?: string | null;
  provider_id?: string | null;
  provider_type?: "trainer" | "veterinarian";
  provider_name?: string;
  trainer_id?: string | null;
  trainer_name?: string;
  veterinarian_id?: string | null;
  doctor_name?: string;
  plan_id?: string;
  plan_name?: string;
  mode?: string;
  description?: string;
  duration_minutes?: number;
  followup_days?: number;
  followup_until?: string | null;
  plan_price?: number;
  complaint?: string;
  diagnosis?: string;
  doctor_notes?: string;
  started_at?: string | null;
  ended_at?: string | null;
  room_key?: string;
  program_id?: string;
  program_title?: string;
  academy_name?: string;
  session_count?: number;
  progress_percent?: number;
  progress_notes?: string;
  last_progress_at?: string | null;
  participant_name?: string;
  location?: string;
  online_url?: string;
  event_id?: string;
  venue?: string;
  ticket_quantity?: number;
  qr_token?: string;
  spot_id?: string;
  spot_name?: string;
  spot_category?: string;
  resource_name?: string;
  resource_code?: string;
  guest_count?: number;
  pet_count?: number;
  deposit_amount?: number;
  remaining_amount?: number;
  hold_expires_at?: string;
  product_name?: string;
  origin_city?: string;
  destination_city?: string;
  departure_at?: string | null;
  missing_requirements?: string[];
  issued_document_url?: string;
  fundraiser_id?: string;
  fundraiser_title?: string;
  beneficiary_name?: string;
  anonymous?: boolean;
  message?: string;
  room_name?: string;
  checked_in_at?: string | null;
  checked_out_at?: string | null;
  source?: "clinic";
  cancellable_until?: string;
  cancellation_cutoff_hours?: number;
  cancellation_policy?: string;
  job_code?: string;
  service_type?: string;
  pickup_address?: string;
  destination_address?: string;
  driver_name?: string;
  cancellable?: boolean;
  fulfillments?: MobileOrderFulfillment[];
};
export type MobileActivityCenterResponse = {
  data: MobileActivityCenterItem[];
  summary: Record<MobileActivityType, number>;
  next_cursor: string | null;
};

export type MobileMembership = {
  id: string;
  name: string;
  icon: string;
  min_points: number;
  next_level_points: number | null;
  points_to_next: number;
};

export type MobileBootstrap = {
  user: MobileOwner;
  pets: MobilePet[];
  notifications: MobileNotification[];
  unread_notifications?: number;
  favorites: Array<{
    entity_type: string;
    entity_id: string;
    created_at: string;
  }>;
  points: {
    balance: number;
    earned: number;
    redeemed: number;
    membership?: MobileMembership;
    formula: {
      enabled: boolean;
      point_value_rupiah?: number;
      expiry_days?: number;
      settlement_hold_days?: number;
      max_redemption_bps?: number;
      min_redemption_points?: number;
      membership_levels?: Array<{
        id: string;
        name: string;
        icon: string;
        min_points: number;
        max_points: number | null;
      }>;
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
  business_id: string;
  name: string;
  category: string;
  image_url: string;
  image_urls: string[];
  price: number;
  original_price?: number;
  discount_percent?: number;
  distance_km?: number | null;
  city: string;
  address: string;
  business_name: string;
  branch_name: string;
  duration_minutes: number;
  rating?: number | null;
  review_count?: number | null;
  description?: string;
  inclusions?: string[];
  supported_species?: string[];
  cancellation_policy?: string;
  cancellation_cutoff_hours?: number;
  business_license_status?: "not_submitted" | "pending" | "verified" | "rejected";
};
export type MobileServiceAvailability = {
  data: Array<{
    date: string;
    label: string;
    slots: Array<{
      starts_at: string;
      ends_at: string;
      local_time: string;
      remaining_capacity: number;
    }>;
  }>;
  service_id: string;
  branch_id: string;
  timezone: string;
  duration_minutes: number;
  reason: string;
};
export type MobileProduct = {
  id: string;
  business_id: string;
  business_name: string;
  store_logo_url: string;
  store_is_online: boolean;
  store_last_seen_at: string;
  branch_id?: string;
  branch_name: string;
  city: string;
  name: string;
  sku: string;
  barcode: string;
  category: string;
  description: string;
  image_url: string;
  image_urls: string[];
  price: number;
  original_price?: number;
  discount_percent?: number;
  stock: number;
  minimum_stock: number;
  available: boolean;
  rating: number;
  review_count: number;
  sold_count: number;
  created_at: string;
};

function productText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function productNumber(value: unknown) {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : 0;
}

function normalizeMobileProduct(product: MobileProduct): MobileProduct {
  const businessName =
    productText(product.business_name) ||
    productText(product.branch_name) ||
    "Pet Partner Slivadoc";
  const branchName = productText(product.branch_name) || businessName;
  const stock = Math.max(0, productNumber(product.stock));

  return {
    ...product,
    business_id:
      productText(product.business_id) ||
      productText(product.branch_id) ||
      `partner:${businessName.toLowerCase().replace(/\s+/g, "-")}`,
    business_name: businessName,
    store_logo_url: productText(product.store_logo_url),
    store_is_online: product.store_is_online === true,
    store_last_seen_at: productText(product.store_last_seen_at),
    branch_id: productText(product.branch_id) || undefined,
    branch_name: branchName,
    city: productText(product.city) || "Online",
    name: productText(product.name) || "Produk pet",
    sku: productText(product.sku),
    barcode: productText(product.barcode),
    category: productText(product.category) || "Kebutuhan pet",
    description: productText(product.description),
    image_url: productText(product.image_url),
    image_urls: Array.from(new Set([
      ...(Array.isArray(product.image_urls) ? product.image_urls.map(productText) : []),
      productText(product.image_url),
    ].filter(Boolean))),
    price: Math.max(0, productNumber(product.price)),
    original_price: Math.max(
      productNumber(product.price),
      productNumber(product.original_price),
    ),
    discount_percent: Math.max(0, productNumber(product.discount_percent)),
    stock,
    minimum_stock: Math.max(0, productNumber(product.minimum_stock)),
    available:
      typeof product.available === "boolean" ? product.available : stock > 0,
    rating: Math.min(5, Math.max(0, productNumber(product.rating))),
    review_count: Math.max(0, productNumber(product.review_count)),
    sold_count: Math.max(0, productNumber(product.sold_count)),
    created_at: productText(product.created_at),
  };
}

export type MobileMarketplaceStore = {
  id: string;
  name: string;
  logo_url: string;
  banner_url: string;
  about: string;
  city: string;
  joined_at: string;
  is_online: boolean;
  last_seen_at: string;
  product_count: number;
  category_count: number;
  rating: number;
  review_count: number;
  sold_count: number;
};

export type MobileMarketplaceStoreResponse = {
  store: MobileMarketplaceStore;
  categories: Array<{ name: string; product_count: number }>;
  reviews: Array<{
    id: string;
    product_id: string;
    product_name: string;
    reviewer_name: string;
    rating: number;
    comment: string;
    updated_at: string;
  }>;
};

export type MobileMarketplaceChatMessage = {
  id: string;
  thread_id: string;
  sender_user_id: string;
  sender_type: "buyer" | "store";
  sender_name: string;
  product_id: string;
  product_name: string;
  body: string;
  created_at: string;
};

export type MobileMarketplaceChatThread = {
  id: string;
  business_id: string;
  business_name: string;
  store_logo_url: string;
  product_id: string;
  product_name: string;
  last_message: string;
  last_message_created_at: string;
  store_is_online: boolean;
  store_last_seen_at: string;
  unread_count: number;
};

export type MobileProductReview = {
  id: string;
  product_id: string;
  user_id: string;
  reviewer_name: string;
  rating: number;
  comment: string;
  verified_purchase: boolean;
  created_at: string;
  updated_at: string;
};
export type MobileRegionOption = {
  id: string;
  code: string;
  name: string;
};
export type MobileOrderQuote = {
  subtotal: number;
  platform_fee: number;
  shipping_fee: number;
  voucher_code: string;
  voucher_description: string;
  voucher_discount: number;
  voucher_error: string;
  points_redeemed: number;
  points_discount: number;
  total_amount: number;
  max_redeemable_points: number;
  point_value_rupiah: number;
  min_redemption_points: number;
  max_redemption_bps: number;
  shipping_ready: boolean;
  shipping_quotes: Array<{
    branch_id: string;
    branch_name: string;
    origin: string;
    destination: string;
    selected_service?: string;
    selected_fee?: number;
    selected_sla?: string;
    rates: Array<{
      service_code: string;
      service_type: string;
      fee: number;
      normal_fee: number;
      estimated_sla: string;
      chargeable_weight_kg: number;
      insurance_fee: number;
    }>;
  }>;
};
export type MobileOrderInput = {
  items: Array<{ product_id: string; quantity: number }>;
  voucher_code?: string;
  redeem_points?: number;
  shipping?: {
    address: {
      name: string;
      phone: string;
      email?: string;
      address: string;
      post_code?: string;
      area: string;
      geoloc?: string;
    };
    shipment_type: "PICKUP" | "DROPOFF";
    use_insurance: boolean;
    selections: Array<{ branch_id: string; service_code: string }>;
  };
};
export type MobileGlobalSearchResult = {
  category: string;
  id: string;
  title: string;
  subtitle: string;
  route: string;
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
  /** "qris" from the current backend; a backend that predates the cutover may list others. */
  method: string;
  label: string;
  description: string;
};
export type MobilePaymentIntent = {
  id: string;
  order_id: string;
  provider: string;
  /** "qris"; rows written before the cutover can carry other legacy methods. */
  method: string;
  status: string;
  payment_status: string;
  amount: number;
  currency: string;
  reference_type: string;
  reference_id: string;
  qr_string?: string;
  qr_url?: string;
  expires_at?: string;
};

export async function loginMobile(email: string, password: string) {
  const baseURL = requireServiceURL(
    PLATFORM_API_URL,
    "EXPO_PUBLIC_PLATFORM_API_URL",
  );
  const response = await fetch(`${baseURL}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(payload.message ?? "Email atau password salah");
  await setPlatformTokens(payload.access_token, payload.refresh_token);
  mobileCache.clear();
  return payload as { access_token: string; refresh_token: string };
}
export async function registerMobileOwner(input: {
  full_name: string;
  phone: string;
  email: string;
  password: string;
}) {
  const baseURL = requireServiceURL(
    PLATFORM_API_URL,
    "EXPO_PUBLIC_PLATFORM_API_URL",
  );
  const response = await fetch(`${baseURL}/api/v1/auth/petowner/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
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
export async function logoutMobile() {
  try {
    const baseURL = requireServiceURL(
      PLATFORM_API_URL,
      "EXPO_PUBLIC_PLATFORM_API_URL",
    );
    if (platformAccessToken) {
      await fetch(`${baseURL}/api/v1/auth/logout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${platformAccessToken}`,
        },
      }).catch(() => {});
    }
  } finally {
    await clearMobileSession();
  }
}
export const getMobileBootstrap = async () => {
  const result = await platformRequest<MobileBootstrap>(
    "/api/v1/petowner/bootstrap",
  );
  const pets = uniqueById(result.pets);
  mobileOwnerHasPet = pets.length > 0;
  return {
    ...result,
    pets,
    notifications: uniqueById(result.notifications),
  };
};
export const getMobilePetSpecies = () => platformRequest<{ data: PetSpeciesOption[]; count: number }>("/api/v1/public/pet-species");
export async function createMobilePet(input: ReturnType<typeof import("../../shared/pet-profile").petProfilePayload>) {
  const result = await platformRequest<{ id: string; species: string; species_group: string; message: string }>("/api/v1/petowner/pets", { method: "POST", body: JSON.stringify(input) });
  mobileOwnerHasPet = true;
  clearMobileCache();
  return result;
}
export const updateMobilePetOwnerProfile = (input: {
  full_name: string;
  phone: string;
}) =>
  platformRequest<{ full_name: string; phone: string; message: string }>(
    "/api/v1/petowner/profile",
    { method: "PATCH", body: JSON.stringify(input) },
  );
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
  ).then((result) => ({ ...result, data: uniqueById(result.data) }));
};
export const getMobileServiceAvailability = (
  serviceId: string,
  branchId: string,
  days = 14,
) =>
  platformRequest<MobileServiceAvailability>(
    `/api/v1/public/discovery/services/${encodeURIComponent(serviceId)}/availability?branch_id=${encodeURIComponent(branchId)}&days=${days}`,
    { cache: "no-store" },
  );

const activityCenterPath =
  "/api/v1/petowner/activities?view=center&type=all&state=all&limit=100";

// Aktivitas changes the moment a payment settles, so it skips the 15 s GET cache.
export const getMobileActivityCenter = (cursor?: string) => {
  const path = cursor
    ? `${activityCenterPath}&cursor=${encodeURIComponent(cursor)}`
    : activityCenterPath;
  for (const key of mobileCache.keys())
    if (key.startsWith(`${path}:`)) mobileCache.delete(key);
  return platformRequest<MobileActivityCenterResponse>(path).then(
    (result) => ({
      ...result,
      data: uniqueById(result.data),
      next_cursor: result.next_cursor ?? null,
    }),
  );
};

const activityTypesByReference: Record<string, MobileActivityType> = {
  academy_enrollment: "academy",
  event_registration: "event",
  consultation: "consultation",
  document_request: "document",
  petspot_reservation: "reservation",
  petowner_booking: "booking",
  shop_order: "order",
  fundraiser_donation: "donation",
};

export function activityTypeForReference(
  referenceType: string,
): MobileActivityType | undefined {
  return activityTypesByReference[referenceType];
}

export const getMobileProducts = (options?: {
  search?: string;
  category?: string;
  business_id?: string;
}) => {
  const query = new URLSearchParams();
  Object.entries(options ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== "") query.set(key, String(value));
  });
  return platformRequest<{ data: MobileProduct[]; count: number }>(
    `/api/v1/public/discovery/products${query.size ? `?${query}` : ""}`,
  ).then((result) => ({
    ...result,
    data: uniqueById(result.data.map(normalizeMobileProduct)),
  }));
};

export const getMobileMarketplaceStore = (businessId: string) =>
  platformRequest<MobileMarketplaceStoreResponse>(
    `/api/v1/public/marketplace/stores/${encodeURIComponent(businessId)}`,
    { cache: "no-store" },
  );

export const createMobileMarketplaceChat = (input: {
  business_id: string;
  product_id?: string;
}) =>
  platformRequest<{ id: string }>("/api/v1/petowner/marketplace/chats", {
    method: "POST",
    body: JSON.stringify(input),
  });

export const getMobileMarketplaceChats = () =>
  platformRequest<{ data: MobileMarketplaceChatThread[]; count: number }>(
    "/api/v1/petowner/marketplace/chats",
    { cache: "no-store" },
  );

export const getMobileMarketplaceChatMessages = (threadId: string) =>
  platformRequest<{
    data: MobileMarketplaceChatMessage[];
    count: number;
    viewer: "buyer" | "store";
  }>(`/api/v1/marketplace/chats/${encodeURIComponent(threadId)}/messages`, {
    cache: "no-store",
  });

export const sendMobileMarketplaceChatMessage = (
  threadId: string,
  input: { body: string; product_id?: string },
) =>
  platformRequest<MobileMarketplaceChatMessage>(
    `/api/v1/marketplace/chats/${encodeURIComponent(threadId)}/messages`,
    { method: "POST", body: JSON.stringify(input) },
  );

export const getMobileProductReviews = (productId: string) =>
  platformRequest<{
    data: MobileProductReview[];
    count: number;
    rating: number;
  }>(`/api/v1/public/products/${productId}/reviews`).then((result) => ({
    ...result,
    data: uniqueById(result.data),
  }));

export const REVIEW_HIDDEN_MESSAGE =
  "Ulasanmu disembunyikan moderator dan tidak bisa diubah. Hubungi dukungan jika ada keberatan.";

export const saveMobileProductReview = (
  productId: string,
  input: { rating: number; comment: string },
) =>
  platformRequest<{ id: string; message: string }>(
    `/api/v1/petowner/products/${productId}/reviews`,
    { method: "POST", body: JSON.stringify(input) },
  ).catch((cause: unknown) => {
    if (cause instanceof MobileApiError && cause.code === "review_hidden")
      throw new MobileApiError(REVIEW_HIDDEN_MESSAGE, cause.status, cause.code);
    throw cause;
  });

export const cancelMobileOrder = (orderId: string) =>
  platformRequest<{ id: string; status: string; refund_queued: boolean }>(
    `/api/v1/petowner/orders/${encodeURIComponent(orderId)}/cancel`,
    { method: "POST" },
  );

export const requestMobileOrderReturn = (
  orderId: string,
  fulfillmentId: string,
  reason: string,
) =>
  platformRequest<{ id: string; ticket_number: string; status: string }>(
    `/api/v1/petowner/orders/${encodeURIComponent(orderId)}/fulfillments/${encodeURIComponent(fulfillmentId)}/return-request`,
    { method: "POST", body: JSON.stringify({ reason }) },
  );

export type MobileInvoice = {
  id: string;
  invoice_number: string;
  business_name: string;
  branch_name: string;
  status: "pending" | "paid" | "void" | "refunded" | "partially_refunded";
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total_amount: number;
  paid_amount: number;
  refunded_amount: number;
  issued_at: string | null;
  paid_at: string | null;
};
export type MobileInvoiceDetail = MobileInvoice & {
  items: Array<{
    item_type: "product" | "service" | "fee";
    description: string;
    quantity: number;
    unit_price: number;
    discount_amount: number;
    line_total: number;
  }>;
};

export const getMobileInvoices = (limit = 50) =>
  platformRequest<{ data: MobileInvoice[]; count: number }>(
    `/api/v1/petowner/invoices?limit=${limit}`,
    { cache: "no-store" },
  );

export const getMobileInvoice = (invoiceId: string) =>
  platformRequest<MobileInvoiceDetail>(
    `/api/v1/petowner/invoices/${encodeURIComponent(invoiceId)}`,
    { cache: "no-store" },
  );

function normalizeMobileRegionOptions(payload: unknown): MobileRegionOption[] {
  const records = Array.isArray(payload)
    ? payload
    : payload &&
        typeof payload === "object" &&
        Array.isArray((payload as { data?: unknown }).data)
      ? (payload as { data: unknown[] }).data
      : [];
  const seen = new Set<string>();

  return records.flatMap((record) => {
    if (!record || typeof record !== "object") return [];
    const candidate = record as Partial<
      Record<keyof MobileRegionOption, unknown>
    >;
    const id = String(candidate.id ?? candidate.code ?? "").trim();
    const code = String(candidate.code ?? candidate.id ?? "").trim();
    const name = String(candidate.name ?? "").trim();
    const key = id || code || name.toLocaleLowerCase("id-ID");
    if (!key || !name || seen.has(key)) return [];
    seen.add(key);
    return [{ id, code, name }];
  });
}

function getMobileRegionOptions(path: string) {
  return platformRequest<unknown>(path).then((payload) => ({
    data: normalizeMobileRegionOptions(payload),
  }));
}

export const getMobileProvinces = () =>
  getMobileRegionOptions("/api/v1/regions/provinces");

export const getMobileRegencies = (provinceId: string) =>
  getMobileRegionOptions(
    `/api/v1/regions/regencies?province_id=${encodeURIComponent(provinceId.trim())}`,
  );

export const getMobileDistricts = (regencyId: string) =>
  getMobileRegionOptions(
    `/api/v1/regions/districts?regency_id=${encodeURIComponent(regencyId.trim())}`,
  );

export const getMobileVillages = (districtId: string) =>
  getMobileRegionOptions(
    `/api/v1/regions/villages?district_id=${encodeURIComponent(districtId.trim())}`,
  );

export const quoteMobileOrder = (
  input: MobileOrderInput,
  signal?: AbortSignal,
) =>
  platformRequest<MobileOrderQuote>("/api/v1/petowner/orders/quote", {
    method: "POST",
    signal,
    body: JSON.stringify(input),
  });

export const createMobileOrder = (input: MobileOrderInput) =>
  platformRequest<
    MobileOrderQuote & {
      id: string;
      order_number: string;
      status: string;
      payment_status: string;
      reference_type: "shop_order";
    }
  >("/api/v1/petowner/orders", {
    method: "POST",
    body: JSON.stringify(input),
  });

export async function getMobileTransactionInvoiceHTML(
  referenceType:
    | "shop_order"
    | "pos_invoice"
    | "brand_purchase_order"
    | "petowner_booking"
    | "consultation"
    | "academy_enrollment"
    | "event_registration"
    | "document_request"
    | "fundraiser_donation",
  referenceID: string,
) {
  const baseURL = requireServiceURL(
    PLATFORM_API_URL,
    "EXPO_PUBLIC_PLATFORM_API_URL",
  );
  const path = `/api/v1/transaction-documents/${referenceType}/${referenceID}/invoice`;
  const send = (token: string) =>
    fetch(`${baseURL}${path}`, {
      headers: {
        Accept: "text/html",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
  let response = await send(platformAccessToken);
  if (response.status === 401 && platformRefreshToken) {
    response = await send(await refreshMobileSession());
  }
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.message ?? "Invoice belum dapat dimuat");
  }
  return response.text();
}

export const getMobilePetFamily = (petId: string) =>
  platformRequest<{ data: MobileFamilyAccess[] }>(
    `/api/v1/petowner/pets/${petId}/family`,
  ).then((result) => ({ ...result, data: uniqueById(result.data) }));

export const inviteMobilePetFamily = (
  petId: string,
  input: {
    email: string;
    full_name: string;
    role: string;
    permissions: string[];
  },
) =>
  platformRequest<{ id: string; message: string }>(
    `/api/v1/petowner/pets/${petId}/family`,
    { method: "POST", body: JSON.stringify(input) },
  );

export const revokeMobilePetFamily = (accessId: string) =>
  platformRequest<{ message: string }>(`/api/v1/petowner/family/${accessId}`, {
    method: "DELETE",
  });
export const getMobileGlobalSearch = (query: string, category = "") =>
  platformRequest<{ data: MobileGlobalSearchResult[] }>(
    `/api/v1/public/search?q=${encodeURIComponent(query)}&category=${encodeURIComponent(category)}`,
  );
export const getMobileMedicalRecords = (petId: string) =>
  platformRequest<{ data: MobileMedicalRecord[] }>(
    `/api/v1/pets/${petId}/medical-records`,
  ).then((result) => ({ ...result, data: uniqueById(result.data) }));
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
export const cancelMobileBooking = (id: string, reason?: string) =>
  platformRequest<{ id: string; status: string; refund_queued: boolean }>(
    `/api/v1/petowner/bookings/${id}/cancel`,
    { method: "POST", body: JSON.stringify(reason ? { reason } : {}) },
  );
export const getMobilePaymentMethods = () =>
  platformRequest<{ data: MobilePaymentMethod[] }>("/api/v1/payment-methods", { cache: "no-store" });
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
export const readAllMobileNotifications = (category = "") =>
  platformRequest<{ updated: number }>(
    `/api/v1/notifications/read-all?category=${encodeURIComponent(category)}`,
    { method: "PATCH" },
  );
export const getMobileNotifications = (limit = 100) =>
  platformRequest<{ data: MobileNotification[]; count: number; unread_count: number }>(
    `/api/v1/notifications?limit=${limit}`,
  );
export const toggleMobileFavorite = (
  entityId: string,
  entityType = "service",
) =>
  platformRequest<{ favorite: boolean }>("/api/v1/petowner/favorites/toggle", {
    method: "POST",
    body: JSON.stringify({ entity_type: entityType, entity_id: entityId }),
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
  user_id: string;
  author_name: string;
  body: string;
  parent_id?: string | null;
  created_at: string;
};
export const getMobileCommunityPosts = (tab = "for_you") =>
  platformRequest<{ data: MobileCommunityPost[] }>(
    `/api/v1/public/community/posts?tab=${encodeURIComponent(tab)}`,
  ).then((result) => ({ ...result, data: uniqueById(result.data) }));
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
  ).then((result) => ({ ...result, data: uniqueById(result.data) }));
export const createMobileCommunityComment = (id: string, body: string, parentId?: string) =>
  platformRequest<{ id: string; created_at: string; message: string }>(
    `/api/v1/community/posts/${id}/comments`,
    { method: "POST", body: JSON.stringify({ body, parent_id: parentId || undefined }) },
  );

export type MobileCommunityGroup = {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  city: string;
  cover_url: string;
  visibility: "public" | "private";
  member_count: number;
  owner: boolean;
  joined: boolean;
  membership_status?: "active" | "pending" | "blocked" | "none";
  last_message?: string;
  last_message_at?: string;
  last_sender_name?: string;
};
export type MobileCommunityGroupMessage = {
  id: string;
  sender_user_id: string;
  sender_name: string;
  body: string;
  created_at: string;
  mine: boolean;
};
export type MobileCommunityGroupInput = {
  name: string;
  description: string;
  category: string;
  city: string;
  visibility: "public" | "private";
  cover_url?: string;
};
export const getMobileCommunityGroups = (scope: "mine" | "discover" = "mine") =>
  platformRequest<{ data: MobileCommunityGroup[] }>(
    `/api/v1/community/groups?scope=${scope}`,
  ).then((result) => ({ ...result, data: uniqueById(result.data) }));
export const createMobileCommunityGroup = (input: MobileCommunityGroupInput) =>
  platformRequest<{ id: string; slug: string; message: string }>(
    "/api/v1/community/groups",
    { method: "POST", body: JSON.stringify(input) },
  );
export const joinMobileCommunityGroup = (id: string) =>
  platformRequest<{ joined: boolean; message: string }>(
    `/api/v1/community/groups/${id}/join`,
    { method: "POST" },
  );
export const getMobileCommunityGroupMessages = (id: string) =>
  platformRequest<{ data: MobileCommunityGroupMessage[] }>(
    `/api/v1/community/groups/${id}/messages`,
  ).then((result) => ({ ...result, data: uniqueById(result.data) }));
export const sendMobileCommunityGroupMessage = (id: string, body: string) =>
  platformRequest<{ id: string; created_at: string }>(
    `/api/v1/community/groups/${id}/messages`,
    { method: "POST", body: JSON.stringify({ body }) },
  );
export type MobileCommunityGroupMember = {
  user_id: string;
  full_name: string;
  role: "owner" | "moderator" | "member";
  status: "pending" | "active" | "blocked";
  joined_at: string;
};
export const getMobileCommunityGroupMembers = (
  id: string,
  status: "pending" | "active",
) =>
  platformRequest<{ data: MobileCommunityGroupMember[] }>(
    `/api/v1/community/groups/${id}/members?status=${status}`,
  );
export const updateMobileCommunityGroupMember = (
  id: string,
  userId: string,
  status: "active" | "blocked",
) =>
  platformRequest<{
    group_id: string;
    user_id: string;
    status: "active" | "blocked";
    member_count: number;
  }>(`/api/v1/community/groups/${id}/members/${userId}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });

export type WorldItem = {
  id: string;
  media_urls?: string[];
  view_count?: number;
  liked?: boolean;
  saved?: boolean;
  title?: string;
  name?: string;
  description?: string;
  category?: string;
  academy_name?: string;
  trainer_name?: string;
  trainers?: MobileAcademyTrainer[];
  schedules?: MobileAcademySchedule[];
  reviews?: MobileAcademyReview[];
  supported_species?: string[];
  full_name?: string;
  doctor_name?: string;
  specialties?: string[];
  mode?: string;
  veterinarian_id?: string;
  trainer_id?: string;
  provider_type?: "veterinarian" | "trainer";
  discount_percent?: number;
  original_price?: number;
  followup_days?: number;
  duration_minutes?: number;
  total_fee?: number;
  processing_days?: number;
  requirements?: string[];
  breed?: string;
  sex?: string;
  species?: string;
  age_months?: number;
  adoption_fee?: number;
  submitted_by_name?: string;
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
  ends_at?: string;
  capacity?: number;
  registered_count?: number;
  pet_spot_id?: string;
  pet_spot_name?: string;
  ticket_unit?: "person" | "owner_pet";
  allowed_pet_species?: string[];
  pet_requirements?: string[];
  terms?: string;
  venue?: string;
  address?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  rating?: number;
  consultation_count?: number;
  experience_years?: number;
  starting_price?: number;
  availability_status?: string;
  distance_km?: number | null;
  pet_facilities?: string[];
  facility_details?: Array<string | { name: string; description?: string; icon?: string; category?: string }>;
  opening_hours?: Record<string, string>;
  phone?: string;
  website_url?: string;
  supported_events?: Array<{ name: string; description?: string; inclusions?: string[] }>;
  resources?: MobilePetSpotResource[];
  petspot_reviews?: MobilePetSpotReview[];
  status?: string;
  viewer_count?: number;
  channel_name?: string;
  playback_url?: string;
  content?: string;
  author_name?: string;
  like_count?: number;
  comment_count?: number;
  review_count?: number;
  participant_count?: number;
  running_since?: string;
  featured?: boolean;
  repost_count?: number;
  media_url?: string;
  photo_url?: string;
  photo_urls?: string[];
  thumbnail_url?: string;
  owner_display?: string;
  owner?: {
    name: string;
    verified: boolean;
    member_since: string;
    city: string;
  };
  health_report?: Record<string, unknown>;
  post_type?: "thread" | "photo" | "video" | "poll" | "update";
  media_type?: "image" | "video";
  channel_avatar_url?: string;
  channel_handle?: string;
  verified?: boolean;
  reservable?: boolean;
  cover_url?: string;
  banner_url?: string;
  image_urls?: string[];
  deposit_type?: "percentage" | "fixed";
  deposit_value?: number;
  reservation_policy?: {
    slot_minutes?: number;
    hold_minutes?: number;
    minimum_notice_minutes?: number;
    maximum_advance_days?: number;
    minimum_duration_minutes?: number;
    maximum_duration_minutes?: number;
    maximum_party_size?: number;
    cancellation_hours?: number;
    cancellation_fee_percent?: number;
    require_vaccine?: boolean;
    house_rules?: string[];
    pet_rules?: string[];
  };
  following?: boolean;
  created_at?: string;
};

export type MobileAcademyTrainer = {
  id: string;
  academy_id: string;
  academy_name: string;
  full_name: string;
  bio: string;
  specialties: string[];
  pet_types: string[];
  certification: string;
  experience_years: number;
  rating: number;
  photo_url: string;
  status: string;
  program_count?: number;
  programs?: Array<{
    id: string;
    title: string;
    level: string;
    price: number;
    session_count: number;
  }>;
};

export type MobileAcademySchedule = {
  id: string;
  trainer_id?: string;
  trainer_name: string;
  starts_at: string;
  ends_at: string;
  location: string;
  online_url: string;
  remaining_capacity: number;
};

export type MobileAcademyReview = {
  id: string;
  reviewer_name: string;
  pet_name: string;
  rating: number;
  comment: string;
  verified_enrollment: boolean;
  created_at: string;
  updated_at: string;
};

export type MobilePawDatingInterest = {
  id: string;
  status: string;
  interest_type: string;
  introduction_message: string;
  created_at: string;
  source_profile_id: string;
  source_name: string;
  target_profile_id: string;
  target_name: string;
  direction: "incoming" | "outgoing";
  match_id?: string;
};

export type MobilePawDatingMessage = {
  id: string;
  sender_user_id: string;
  sender_name: string;
  message_type: string;
  body: string;
  attachment_url: string;
  read_at?: string;
  created_at: string;
};

const getUniqueWorldItems = (path: string) =>
  platformRequest<{ data: WorldItem[] }>(path).then((result) => ({
    ...result,
    data: uniqueById(result.data),
  }));

export const getMobileAcademy = () =>
  getUniqueWorldItems("/api/v1/public/academy/programs");
export const getMobileAcademyProgram = (programId: string) =>
  platformRequest<WorldItem>(`/api/v1/public/academy/programs/${programId}`);
export const getMobileAcademyTrainers = (species?: string) =>
  platformRequest<{ data: MobileAcademyTrainer[] }>(
    `/api/v1/public/academy/trainers${species ? `?species=${encodeURIComponent(species)}` : ""}`,
  );
export const getMobileAcademyTrainer = (trainerId: string) =>
  platformRequest<MobileAcademyTrainer>(
    `/api/v1/public/academy/trainers/${trainerId}`,
  );
export const trackMobileAcademyProgramClick = (programId: string) =>
  platformRequest<void>(`/api/v1/public/academy/programs/${programId}/click`, {
    method: "POST",
  });
export const saveMobileAcademyProgramReview = (
  programId: string,
  input: { rating: number; comment: string },
) =>
  platformRequest<{ id: string; verified_enrollment: boolean }>(
    `/api/v1/petowner/academy/programs/${programId}/reviews`,
    { method: "POST", body: JSON.stringify(input) },
  );
export const getMobileEvents = () =>
  getUniqueWorldItems("/api/v1/public/events");
export const getMobilePetSpots = () =>
  getUniqueWorldItems("/api/v1/public/petspots");
export const getMobilePetSpot = async (spotId: string): Promise<WorldItem> => {
  const venue = await platformRequest<Omit<WorldItem, "reviews"> & { reviews?: MobilePetSpotReview[] }>(`/api/v1/public/petspots/${encodeURIComponent(spotId)}`);
  const { reviews, ...detail } = venue;
  return { ...detail, petspot_reviews: reviews };
};
export type MobilePetSpotReview = {
  id: string;
  reviewer_name: string;
  rating: number;
  comment: string;
  pet_type: string;
  verified_visit: boolean;
  created_at: string;
};
export type MobilePetSpotResource = {
  id: string;
  code: string;
  name: string;
  resource_type:
    "table" | "room" | "unit" | "zone" | "venue" | "parking" | "seat" | "other";
  floor_name: string;
  capacity: number;
  x_percent: number;
  y_percent: number;
  shape: "round" | "square" | "rectangle" | "unit";
  base_price: number;
  minimum_deposit_type: "inherit" | "percentage" | "fixed";
  minimum_deposit_value: number;
  amenities: string[];
  image_urls: string[];
  description: string;
  booking_rules: Record<string, unknown>;
  pet_policy: Record<string, unknown>;
  available: boolean;
};
export type MobilePetSpotReservation = {
  id: string;
  reservation_number: string;
  category?: string;
  resource_name?: string;
  starts_at?: string;
  ends_at?: string;
  spot_id: string;
  spot_name: string;
  resource_id: string;
  subtotal: number;
  deposit_amount: number;
  remaining_amount: number;
  payment_status: string;
  status: string;
  hold_expires_at: string;
  payment_required: true;
  reference_type: "petspot_reservation";
};
export const getMobilePetSpotAvailability = (
  spotId: string,
  startsAt: string,
  endsAt: string,
  guests: number,
) => {
  const query = new URLSearchParams({
    starts_at: startsAt,
    ends_at: endsAt,
    guests: String(guests),
  });
  return platformRequest<{ data: MobilePetSpotResource[]; count: number }>(
    `/api/v1/public/petspots/${spotId}/availability?${query.toString()}`,
  );
};
export const createMobilePetSpotReservation = (input: {
  resource_id: string;
  pet_id?: string;
  guest_name: string;
  guest_phone: string;
  guest_count: number;
  pet_count: number;
  starts_at: string;
  ends_at: string;
  special_request?: string;
}) =>
  platformRequest<MobilePetSpotReservation>(
    "/api/v1/petowner/petspot-reservations",
    { method: "POST", body: JSON.stringify(input) },
  );
export const getMobileStreams = () =>
  getUniqueWorldItems("/api/v1/public/pethub/streams");
export const getMobilePetHubFeed = () =>
  getUniqueWorldItems("/api/v1/public/pethub/feed");
export const getMobilePetHubReels = () =>
  getUniqueWorldItems("/api/v1/public/pethub/feed?type=video");
export const getMobilePetHubStories = () =>
  getUniqueWorldItems("/api/v1/public/pethub/stories");
export const getMobileVeterinarians = () =>
  getUniqueWorldItems("/api/v1/public/veterinarians");
export const getMobileConsultationPlans = () =>
  getUniqueWorldItems("/api/v1/public/consultation-plans").then((result) => ({
    ...result,
    data: result.data.map((item) => ({
      ...item,
      provider_type: "veterinarian" as const,
    })),
  }));
export const getMobileTrainerConsultationPlans = () =>
  getUniqueWorldItems("/api/v1/public/trainer-consultation-plans").then(
    (result) => ({
      ...result,
      data: result.data.map((item) => ({
        ...item,
        provider_type: "trainer" as const,
      })),
    }),
  );
export type MobileTrainerAvailabilitySlot = {
  starts_at: string;
  duration_minutes: number;
};
export const getMobileTrainerAvailability = (
  trainerId: string,
  planId: string,
) =>
  platformRequest<{
    data: MobileTrainerAvailabilitySlot[];
    count: number;
    timezone: string;
  }>(
    `/api/v1/public/trainers/${trainerId}/availability?plan_id=${encodeURIComponent(planId)}&days=14`,
  );
export const getMobileAdoptions = () =>
  getUniqueWorldItems("/api/v1/public/adoptions");
export const getMobileDocumentProducts = () =>
  getUniqueWorldItems("/api/v1/public/pet-documents");
export const getMobilePawDatingProfiles = (location?: {
  latitude: number;
  longitude: number;
}) => getUniqueWorldItems(buildMobilePawDatingDiscoveryPath(location));
export const getMobilePawDatingProfile = (
  profileId: string,
  location?: { latitude: number; longitude: number },
) => {
  const params = new URLSearchParams();
  if (location) {
    params.set("latitude", String(location.latitude));
    params.set("longitude", String(location.longitude));
  }
  const query = params.toString();
  return platformRequest<WorldItem>(
    `/api/v1/public/pawdating/profiles/${profileId}${query ? `?${query}` : ""}`,
  );
};
export const getMobileMyPawDatingProfiles = () =>
  getUniqueWorldItems("/api/v1/pawdating/profiles");
export const getMobilePawDatingInterests = () =>
  platformRequest<{ data: MobilePawDatingInterest[] }>(
    "/api/v1/pawdating/interests",
  );
export const respondMobilePawDatingInterest = (
  interestId: string,
  action: "accept" | "decline",
) =>
  platformRequest<{ id: string; status: string; match_id?: string; message?: string }>(
    `/api/v1/pawdating/interests/${interestId}`,
    { method: "PATCH", body: JSON.stringify({ action }) },
  );
export const getMobilePawDatingMessages = (matchId: string) =>
  platformRequest<{ data: MobilePawDatingMessage[] }>(
    `/api/v1/pawdating/matches/${matchId}/messages`,
  );
export const createMobilePawDatingMessage = (matchId: string, body: string) =>
  platformRequest<{ id: string; created_at: string }>(
    `/api/v1/pawdating/matches/${matchId}/messages`,
    {
      method: "POST",
      body: JSON.stringify({ message_type: "text", body }),
    },
  );
export const createMobilePawDatingProfile = (input: Record<string, unknown>) =>
  platformRequest<{ id: string; status: string; message: string }>(
    "/api/v1/pawdating/profiles",
    { method: "POST", body: JSON.stringify(input) },
  );
export const createMobilePawDatingHealthReport = (
  profileId: string,
  input: Record<string, unknown>,
) =>
  platformRequest<{ id: string; verification_status: string; message: string }>(
    `/api/v1/pawdating/profiles/${profileId}/health-reports`,
    { method: "POST", body: JSON.stringify(input) },
  );
export const submitMobilePawDatingProfile = (profileId: string) =>
  platformRequest<{ id: string; status: string; message: string }>(
    `/api/v1/pawdating/profiles/${profileId}/submit`,
    { method: "POST" },
  );
export const passMobilePawDatingProfile = (
  targetProfileId: string,
  sourceProfileId: string,
) =>
  platformRequest<{ id: string; decision: "pass" }>(
    `/api/v1/pawdating/profiles/${targetProfileId}/swipes`,
    {
      method: "POST",
      body: JSON.stringify({
        source_profile_id: sourceProfileId,
        decision: "pass",
      }),
    },
  );
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
export const createMobileTrainerConsultation = (
  plan: WorldItem,
  goal: string,
  scheduledAt?: string,
  petId?: string,
) =>
  platformRequest<{ id: string; room_key: string; amount: number }>(
    "/api/v1/trainer-consultations",
    {
      method: "POST",
      body: JSON.stringify({
        ...(petId && /^[0-9a-f-]{36}$/i.test(petId) ? { pet_id: petId } : {}),
        trainer_id: plan.trainer_id,
        plan_id: plan.id,
        goal,
        behavior_notes: [],
        scheduled_at: scheduledAt,
      }),
    },
  );
export type MobileAdoptionApplicationInput = {
  applicant_name: string;
  phone: string;
  address: string;
  housing_type: "Rumah milik" | "Rumah sewa" | "Apartemen";
  has_other_pets: boolean;
  experience: string;
  reason: string;
};
export const applyMobileAdoption = (
  listingId: string,
  input: MobileAdoptionApplicationInput,
) =>
  platformRequest<{ id: string }>(
    `/api/v1/adoptions/${listingId}/applications`,
    { method: "POST", body: JSON.stringify(input) },
  );
export const createMobileAdoptionListing = (input: { pet_id: string; city: string; description: string; personality: string[]; health_status: string; vaccinated: boolean; sterilized: boolean; photo_urls: string[]; adoption_fee: number }) =>
  platformRequest<{ id: string; status: string }>("/api/v1/petowner/adoptions", { method: "POST", body: JSON.stringify(input) });
export type MobileAdoptionApplicationStatus =
  | "submitted"
  | "screening"
  | "home_visit"
  | "approved"
  | "rejected"
  | "withdrawn"
  | "completed";
export type MobileMyAdoptionListing = {
  id: string;
  pet_id: string;
  name: string;
  species: string;
  breed: string;
  city: string;
  description: string;
  status: string;
  applicant_count: number;
  created_at: string;
};
export type MobileAdoptionApplicationRecord = {
  id: string;
  listing_id: string;
  applicant_name: string;
  phone: string;
  address: string;
  housing_type: string;
  has_other_pets: boolean;
  experience: string;
  reason: string;
  status: MobileAdoptionApplicationStatus;
  status_note: string;
  created_at: string;
  updated_at: string;
};
export type MobileMyAdoptionApplication = {
  id: string;
  listing_id: string;
  listing_name: string;
  listing_status: string;
  status: MobileAdoptionApplicationStatus;
  status_note: string;
  created_at: string;
  updated_at: string;
};
export const getMobileMyAdoptionApplications = () =>
  platformRequest<{ data: MobileMyAdoptionApplication[] }>(
    "/api/v1/petowner/adoption-applications",
  );
export const withdrawMobileAdoptionApplication = (applicationId: string) =>
  platformRequest<{ id: string; status: MobileAdoptionApplicationStatus }>(
    `/api/v1/petowner/adoption-applications/${applicationId}/withdraw`,
    { method: "POST" },
  );
export const getMobileMyAdoptionListings = () =>
  platformRequest<{ data: MobileMyAdoptionListing[] }>(
    "/api/v1/petowner/adoptions",
  );
export const getMobileAdoptionListingApplications = (listingId: string) =>
  platformRequest<{ data: MobileAdoptionApplicationRecord[] }>(
    `/api/v1/petowner/adoptions/${listingId}/applications`,
  );
export const reviewMobileAdoptionApplication = (
  applicationId: string,
  status: "screening" | "home_visit" | "approved" | "rejected" | "completed",
  note: string,
) =>
  platformRequest<{ id: string; status: MobileAdoptionApplicationStatus }>(
    `/api/v1/petowner/adoption-applications/${applicationId}/status`,
    { method: "PATCH", body: JSON.stringify({ status, note }) },
  );
export type MobileSubmittedDocument = {
  requirement: string;
  url: string;
  file_name: string;
  mime_type: string;
};
export type MobileDocumentRequestInput = {
  pet_id?: string;
  origin_city?: string;
  destination_city?: string;
  departure_at?: string;
  transport_type?: "flight" | "ship";
  submitted_documents: MobileSubmittedDocument[];
};
export const createMobileDocumentRequest = (
  productId: string,
  input: MobileDocumentRequestInput,
) =>
  platformRequest<{ id: string; request_number: string; amount: number }>(
    "/api/v1/pet-document-requests",
    {
      method: "POST",
      body: JSON.stringify({ product_id: productId, ...input }),
    },
  );
export const resubmitMobileDocuments = (
  id: string,
  submitted_documents: MobileSubmittedDocument[],
) =>
  platformRequest<{ id: string; status: string }>(
    `/api/v1/pet-document-requests/${id}/documents`,
    { method: "PATCH", body: JSON.stringify({ submitted_documents }) },
  );
export const commentMobilePetHubPost = (postId: string, content: string) =>
  platformRequest<{ id: string }>(`/api/v1/pethub/posts/${postId}/comments`, {
    method: "POST",
    body: JSON.stringify({ content }),
  });
export type MobilePetHubComment = {
  id: string;
  user_id: string;
  author_name: string;
  content: string;
  created_at: string;
};
export const getMobilePetHubComments = (postId: string) =>
  platformRequest<{ data: MobilePetHubComment[]; count: number }>(
    `/api/v1/pethub/posts/${postId}/comments`,
  ).then((result) => ({ ...result, data: uniqueById(result.data) }));
export const enrollMobileAcademy = (
  programId: string,
  participantName: string,
  petName: string,
  petId?: string,
  scheduleId?: string,
) =>
  platformRequest<{ id: string; amount: number; message: string }>(
    "/api/v1/academy/enrollments",
    {
      method: "POST",
      body: JSON.stringify({
        program_id: programId,
        participant_name: participantName,
        pet_name: petName,
        pet_id: petId,
        schedule_id: scheduleId,
      }),
    },
  );
export const registerMobileEvent = (
  eventId: string,
  participantName: string,
  participantEmail: string,
  petId?: string,
) =>
  platformRequest<{
    id: string;
    qr_token: string;
    amount: number;
    status: string;
    payment_status: "pending" | "paid" | "expired" | "refunded";
  }>(
    `/api/v1/events/${eventId}/registrations`,
    {
      method: "POST",
      body: JSON.stringify({
        participant_name: participantName,
        participant_email: participantEmail,
        ticket_quantity: 1,
        ...(petId ? { pet_id: petId } : {}),
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
export const createMobilePetHubMediaPost = (input: {
  content: string;
  media_url: string;
  media_urls?: string[];
  post_type: "photo" | "video";
}) =>
  platformRequest<{ id: string; message: string }>("/api/v1/pethub/posts", {
    method: "POST",
    body: JSON.stringify(input),
  });
export const createMobilePetHubStory = (input: {
  media_url: string;
  media_type: "image" | "video";
  caption: string;
}) =>
  platformRequest<{ id: string; expires_in: number }>(
    "/api/v1/pethub/stories",
    {
      method: "POST",
      body: JSON.stringify({
        photo_url: input.media_url,
        media_url: input.media_url,
        media_type: input.media_type,
        caption: input.caption,
      }),
    },
  );
export const reactMobilePetHubPost = (postId: string) =>
  platformRequest<{ liked: boolean; like_count: number }>(
    `/api/v1/pethub/posts/${postId}/reactions`,
    { method: "POST" },
  );
export const likeMobilePetHubPost = (postId: string) =>
  platformRequest<{ liked: boolean; like_count: number }>(`/api/v1/pethub/posts/${postId}/like`, { method: "PUT" });
export const saveMobilePetHubPost = (postId: string) => platformRequest<{ saved: boolean }>(`/api/v1/pethub/posts/${postId}/save`, { method: "POST" });
export const viewMobilePetHubStory = (storyId: string) => platformRequest<{ view_count: number }>(`/api/v1/pethub/stories/${storyId}/views`, { method: "POST" });

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

export async function uploadMobileImage(
  uri: string,
  mimeType = "image/jpeg",
  fileName = "pet-photo.jpg",
  folder = "pets",
) {
  const baseURL = requireServiceURL(
    PETOWNER_API_URL,
    "EXPO_PUBLIC_PETOWNER_API_URL",
  );
  const body = new FormData();
  body.append("folder", folder);
  body.append("file", {
    uri,
    type: mimeType,
    name: fileName,
  } as unknown as Blob);
  const response = await fetch(`${baseURL}/api/uploads/images`, {
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

export async function uploadMobileMedia(
  uri: string,
  mimeType: string,
  fileName: string,
  folder = "pethub",
) {
  const baseURL = requireServiceURL(
    PETOWNER_API_URL,
    "EXPO_PUBLIC_PETOWNER_API_URL",
  );
  const body = new FormData();
  body.append("folder", folder);
  body.append("file", {
    uri,
    type: mimeType,
    name: fileName,
  } as unknown as Blob);
  const response = await fetch(`${baseURL}/api/uploads/media`, {
    method: "POST",
    headers: platformAccessToken
      ? { Authorization: `Bearer ${platformAccessToken}` }
      : undefined,
    body,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(payload.message ?? payload.error ?? "Upload media gagal");
  return payload as {
    url: string;
    publicId: string;
    resourceType: "image" | "video";
    thumbnailUrl?: string;
  };
}

export type MobileSupportMessage = {
  id: string;
  ticket_id: string;
  sender_id: string;
  sender_name: string;
  sender_role: "owner" | "support";
  body: string;
  created_at: string;
};
export const getMobileSupportChat = () =>
  platformRequest<{ ticket_id: string | null; messages: MobileSupportMessage[] }>(
    "/api/v1/petowner/support-chat",
    { cache: "no-store" },
  );
export const sendMobileSupportChatMessage = (body: string) =>
  platformRequest<MobileSupportMessage>("/api/v1/petowner/support-chat", {
    method: "POST",
    body: JSON.stringify({ body }),
  });

let petownerSocket: Socket | null = null;
let petownerSocketToken = "";

/** Socket.IO client to the petowner-api (care chat); rebuilt when the access token changes. */
export function petownerRealtime() {
  if (!petownerSocket || petownerSocketToken !== platformAccessToken) {
    petownerSocket?.disconnect();
    petownerSocket = io(
      requireServiceURL(PETOWNER_API_URL, "EXPO_PUBLIC_PETOWNER_API_URL"),
      {
        autoConnect: false,
        auth: { token: platformAccessToken },
        transports: ["websocket", "polling"],
      },
    );
    petownerSocketToken = platformAccessToken;
  }
  return petownerSocket;
}
