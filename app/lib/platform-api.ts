import {
  apiRequest,
  hasSession,
  getAccessToken,
  refreshSession,
  getCurrentUserID,
  getCurrentUser,
  clearSession,
  invalidateGetCache,
  saveTokens,
  logoutSession,
  startAutomaticRefresh,
  ApiError,
} from "./session.ts";

export const PLATFORM_API_URL =
  process.env.NEXT_PUBLIC_PLATFORM_API_URL ?? "http://localhost:8080";

export async function getTransactionInvoiceHTML(
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
  const path = `/api/v1/transaction-documents/${referenceType}/${referenceID}/invoice`;
  const send = () =>
    fetch(`${PLATFORM_API_URL}${path}`, {
      headers: {
        Accept: "text/html",
        ...(getAccessToken()
          ? { Authorization: `Bearer ${getAccessToken()}` }
          : {}),
      },
    });
  let response = await send();
  if (response.status === 401) {
    await refreshSession();
    response = await send();
  }
  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as {
      message?: string;
    };
    throw new ApiError(
      payload.message ?? "Invoice belum dapat dimuat",
      response.status,
    );
  }
  return response.text();
}

export type PlatformList<T> = {
  data: T[];
  count: number;
};

export type PetOwnerPet = {
  id: string;
  name: string;
  species: string;
  species_group: string;
  species_common_name: string;
  species_scientific_name: string;
  species_attributes: Record<string, unknown>;
  emoji: string;
  type: string;
  breed: string;
  sex: string;
  birth_date?: string;
  age_months: number;
  color: string;
  weight_kg: number;
  microchip_number: string;
  allergies: string;
  medical_notes: string;
  vaccination_status: string;
  photo_url: string;
  medical_record_count: number;
  last_medical_record_at?: string;
  health_score: number;
  // "owner" for the caller's own pet, otherwise the family access role.
  access_role?: string;
  permissions?: string[];
};

export type PetSpecies = {
  code: string;
  label: string;
  group: string;
  scientific_name: string;
  emoji: string;
  care_profile: string;
  profile_schema: {
    required: string[];
    optional: string[];
  };
};

export type PetOwnerUser = {
  id: string;
  public_code?: string;
  email: string;
  full_name: string;
  phone: string;
  member_since: string;
};

export type NotificationItem = {
  id: string;
  category: string;
  title: string;
  body: string;
  action_route: string;
  read_at?: string | null;
  created_at: string;
  metadata?: Record<string, unknown>;
};

export type ActivityType =
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

export type ActivityShipmentEvent = {
  status_code: string;
  status: string;
  description: string;
  location: string;
  journey_type?: string;
  reference_stt_no?: string;
  occurred_at: string;
};

export type ActivityShipment = {
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
  events: ActivityShipmentEvent[];
};

export type ActivityFulfillment = {
  id: string;
  business_id: string;
  business_name: string;
  status: string;
  delivered_at?: string | null;
  return_until?: string | null;
  return_requested: boolean;
};

export type PetOwnerActivityCenterItem = {
  id: string;
  type: ActivityType;
  reference_id: string;
  code: string;
  title: string;
  subtitle: string;
  status: string;
  payment_status: string;
  amount: number;
  state: "upcoming" | "ongoing" | "history";
  needs_action: boolean;
  payable: boolean;
  payment_reference_type: string;
  scheduled_at?: string | null;
  ends_at?: string | null;
  occurred_at: string;
  updated_at: string;
  description?: string;
  pet_id?: string;
  pet_name?: string;
  latitude?: number | null;
  longitude?: number | null;
  address?: string;
  city?: string;
  // booking
  service_id?: string;
  service_name?: string;
  service_duration_minutes?: number;
  business_name?: string;
  branch_name?: string;
  notes?: string;
  // order
  item_count?: number;
  items?: Array<{
    product_id: string;
    name: string;
    quantity: number;
    line_total: number;
  }>;
  subtotal?: number;
  shipping_fee?: number;
  discount_amount?: number;
  points_discount?: number;
  total_amount?: number;
  shipments?: ActivityShipment[];
  // consultation
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
  // academy
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
  // event
  event_id?: string;
  venue?: string;
  ticket_quantity?: number;
  qr_token?: string;
  paid_at?: string | null;
  // reservation
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
  // document
  product_name?: string;
  origin_city?: string;
  destination_city?: string;
  departure_at?: string | null;
  missing_requirements?: string[];
  issued_document_url?: string;
  // donation
  fundraiser_id?: string;
  fundraiser_title?: string;
  beneficiary_name?: string;
  anonymous?: boolean;
  message?: string;
  // hotel
  room_name?: string;
  checked_in_at?: string | null;
  checked_out_at?: string | null;
  // booking cancellation (pet-owner bookings only)
  source?: "clinic";
  cancellable_until?: string;
  cancellation_cutoff_hours?: number;
  cancellation_policy?: string;
  // order cancel and return (Pet Shop orders)
  cancellable?: boolean;
  fulfillments?: ActivityFulfillment[];
  // home_service
  job_code?: string;
  service_type?: string;
  pickup_address?: string;
  destination_address?: string;
  driver_name?: string;
};

export type PetOwnerActivityCenterResponse =
  PlatformList<PetOwnerActivityCenterItem> & {
    summary: Record<ActivityType, number>;
    next_cursor: string | null;
  };

export type PetOwnerInvoice = {
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

export type PetOwnerInvoiceDetail = PetOwnerInvoice & {
  items: Array<{
    item_type: "product" | "service" | "fee";
    description: string;
    quantity: number;
    unit_price: number;
    discount_amount: number;
    line_total: number;
  }>;
};

export type FavoriteItem = {
  entity_type: string;
  entity_id: string;
  created_at: string;
};

export type MembershipLevel = {
  id: string;
  name: string;
  icon: string;
  min_points: number;
  max_points: number | null;
};

export type MembershipStatus = Omit<MembershipLevel, "max_points"> & {
  next_level_points: number | null;
  points_to_next: number;
};

export type RewardFormula = {
  enabled: boolean;
  point_value_rupiah?: number;
  earn_divisor_rupiah?: number;
  expiry_days?: number;
  settlement_hold_days?: number;
  max_redemption_bps?: number;
  min_redemption_points?: number;
  membership_levels?: MembershipLevel[];
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

export type PointsSummary = {
  balance: number;
  earned: number;
  redeemed: number;
  pending?: number;
  membership?: MembershipStatus;
  formula: RewardFormula;
};

export type ShippingRate = {
  service_code: string;
  service_type: string;
  fee: number;
  normal_fee: number;
  estimated_sla: string;
  chargeable_weight_kg: number;
  insurance_fee: number;
};

export type ShippingQuote = {
  branch_id: string;
  business_id: string;
  branch_name: string;
  origin: string;
  destination: string;
  distance_km?: number;
  selected_service?: string;
  selected_fee?: number;
  selected_sla?: string;
  rates: ShippingRate[];
};

export type OrderShippingInput = {
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
  branch_id?: string;
  selections: Array<{ branch_id: string; service_code: string }>;
};
export type PetOwnerShippingRegion = {
  code: string;
  name: string;
};

export type PetOwnerShippingAddress = {
  id: string;
  label: string;
  recipient_name: string;
  phone: string;
  address: string;
  post_code: string;
  province: PetOwnerShippingRegion;
  regency: PetOwnerShippingRegion;
  district: PetOwnerShippingRegion;
  village: PetOwnerShippingRegion;
  area: string;
  latitude?: number | null;
  longitude?: number | null;
  is_primary: boolean;
};

export type PetOwnerShippingAddressInput = Omit<
  PetOwnerShippingAddress,
  "id" | "area" | "is_primary"
> & {
  is_primary?: boolean;
};
// Authoritative cart breakdown from POST /api/v1/petowner/orders/quote. The
// client renders these numbers instead of recomputing the fee or the discounts:
// its own copy of that arithmetic is exactly what drifted from the server.
export type OrderQuote = {
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
  amount: number;
  max_redeemable_points: number;
  point_value_rupiah: number;
  min_redemption_points: number;
  max_redemption_bps: number;
  shipping_ready: boolean;
  shipping_quotes: ShippingQuote[];
};

export type PetOwnerOrder = OrderQuote & {
  id: string;
  order_number: string;
  status: string;
  payment_status: string;
  reference_type: string;
};

export type OrderQuoteInput = {
  items: Array<{
    product_id: string;
    quantity: number;
  }>;
  voucher_code?: string;
  redeem_points?: number;
  shipping?: OrderShippingInput;
};

export type PetOwnerBootstrap = {
  user: PetOwnerUser;
  pets: PetOwnerPet[];
  notifications: NotificationItem[];
  unread_notifications: number;
  favorites: FavoriteItem[];
  points: PointsSummary;
};

export type FamilyAccess = {
  id: string;
  member_user_id: string;
  email: string;
  full_name: string;
  role: string;
  permissions: string[];
  status: string;
  accepted_at?: string;
  created_at: string;
};

export type LostPetMode = {
  active: boolean;
  id?: string;
  public_token?: string;
  status?: string;
  last_seen_at?: string;
  last_seen_location?: string;
  latitude?: number;
  longitude?: number;
  radius_km?: number;
  description?: string;
  contact_phone?: string;
  reward_amount?: number;
};

export type DiscoveryService = {
  id: string;
  branch_id: string;
  business_id: string;
  business_name: string;
  branch_name: string;
  name: string;
  category: string;
  image_url: string;
  image_urls: string[];
  duration_minutes: number;
  price: number;
  original_price?: number;
  discount_percent?: number;
  address: string;
  city: string;
  latitude?: number | null;
  longitude?: number | null;
  distance_km?: number | null;
  rating?: number | null;
  review_count?: number | null;
  description: string;
  inclusions: string[];
  supported_species: string[];
  cancellation_policy: string;
  business_license_status:
    "not_submitted" | "pending" | "verified" | "rejected";
  cancellation_cutoff_hours?: number;
};

export type DiscoveryServiceDetail = DiscoveryService & {
  capacity: number;
  phone: string;
  timezone: string;
  opening_hours: Record<string, string | string[]>;
  exclusions: string[];
  preparation: string[];
  aftercare: string[];
  pet_requirements: Record<string, unknown>;
  reschedule_policy: string;
  business_license_number: string;
};

export type ServiceAvailabilitySlot = {
  starts_at: string;
  ends_at: string;
  local_time: string;
  remaining_capacity: number;
};

export type ServiceAvailability = {
  data: Array<{
    date: string;
    label: string;
    slots: ServiceAvailabilitySlot[];
  }>;
  service_id: string;
  branch_id: string;
  timezone: string;
  duration_minutes: number;
  reason: string;
};

export type DiscoveryProduct = {
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
  brand_name: string;
  manufacturer: string;
  origin_country: string;
  net_content: string;
  ingredients: string;
  usage_instructions: string;
  storage_instructions: string;
  warnings: string;
  package_contents: string;
  return_policy: string;
  warranty_policy: string;
  registration_type: string;
  registration_number: string;
  halal_certificate_number: string;
  sni_number: string;
  business_license_status:
    "not_submitted" | "pending" | "verified" | "rejected";
};

export type PetOwnerSupportTicket = {
  id: string;
  ticket_number: string;
  category: string;
  priority: string;
  subject: string;
  description: string;
  status: string;
  resolution: string;
  reference_type: string;
  reference_id?: string | null;
  response_due_at?: string | null;
  first_response_at?: string | null;
  created_at: string;
  updated_at: string;
  resolved_at?: string | null;
};

export type ProductReview = {
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

export type ProductReviewList = PlatformList<ProductReview> & {
  rating: number;
};

export type MarketplaceStoreProfile = {
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

export type MarketplaceStoreReview = {
  id: string;
  product_id: string;
  product_name: string;
  reviewer_name: string;
  rating: number;
  comment: string;
  updated_at: string;
};

export type MarketplaceStoreResponse = {
  store: MarketplaceStoreProfile;
  categories: Array<{ name: string; product_count: number }>;
  reviews: MarketplaceStoreReview[];
};

export type MarketplaceChatThread = {
  id: string;
  business_id: string;
  business_name: string;
  store_logo_url: string;
  buyer_user_id: string;
  buyer_name: string;
  product_id: string;
  product_name: string;
  product_image_url: string;
  last_message: string;
  last_message_created_at: string;
  last_message_at: string;
  store_is_online: boolean;
  store_last_seen_at: string;
  unread_count: number;
};

export type MarketplaceChatMessage = {
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
export type RegionOption = {
  id: string;
  code: string;
  name: string;
};

export type GlobalSearchResult = {
  category: string;
  id: string;
  title: string;
  subtitle: string;
  route: string;
};

export type MedicalRecord = {
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
  attachments: unknown[];
  prescriptions: unknown[];
  next_control_at?: string;
};

export type CommunityPost = {
  id: string;
  user_id: string;
  author_name: string;
  pet_id: string;
  pet_name: string;
  group_id: string;
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

export type CommunityComment = {
  id: string;
  user_id: string;
  author_name: string;
  body: string;
  parent_id?: string;
  created_at: string;
};

export type CommunityGroup = {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  city: string;
  cover_url: string;
  visibility: string;
  member_count: number;
  owner: boolean;
  joined: boolean;
  membership_status?: "" | "pending" | "active" | "blocked";
};

export type CommunityGroupMessage = {
  id: string;
  sender_user_id: string;
  sender_name: string;
  body: string;
  created_at: string;
  mine: boolean;
};

export type AcademyProgram = {
  id: string;
  academy_id: string;
  academy_name: string;
  title: string;
  category: string;
  level: string;
  description: string;
  duration_weeks: number;
  session_count: number;
  price: number;
  original_price: number;
  discount_percent: number;
  capacity: number;
  participant_count: number;
  cover_url: string;
  image_urls: string[];
  status: string;
  trainer_name: string;
  trainer_rating: number;
  next_schedule: string;
  running_since: string;
  rating: number;
  review_count: number;
  featured: boolean;
  supported_species?: string[];
};

export type AcademyReview = {
  id: string;
  reviewer_name: string;
  pet_name: string;
  rating: number;
  comment: string;
  verified_enrollment: boolean;
  created_at: string;
  updated_at: string;
};

export type AcademyTrainer = {
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
    category: string;
    level: string;
    price: number;
    duration_weeks: number;
    session_count: number;
    supported_species: string[];
  }>;
};

export type AcademySchedule = {
  id: string;
  trainer_id?: string;
  trainer_name: string;
  starts_at: string;
  ends_at: string;
  location: string;
  online_url: string;
  remaining_capacity: number;
};

export type AcademyProgramDetail = AcademyProgram & {
  supported_species: string[];
  trainers: AcademyTrainer[];
  schedules: AcademySchedule[];
  reviews: AcademyReview[];
};

export type PetEvent = {
  id: string;
  title: string;
  slug: string;
  category: string;
  description: string;
  banner_url: string;
  image_urls: string[];
  venue: string;
  address: string;
  city: string;
  latitude?: number;
  longitude?: number;
  starts_at: string;
  ends_at: string;
  capacity: number;
  registered_count: number;
  price: number;
  status: string;
  featured: boolean;
  pet_spot_id?: string;
  pet_spot_name?: string;
  ticket_unit: "person" | "owner_pet";
  allowed_pet_species: string[];
  pet_requirements: string[];
  terms: string;
};

export type PetSpot = {
  id: string;
  name: string;
  category: string;
  description: string;
  address: string;
  city: string;
  latitude: number;
  longitude: number;
  phone: string;
  website_url: string;
  cover_url: string;
  image_urls: string[];
  pet_facilities: string[];
  opening_hours: Record<string, string>;
  rating: number;
  review_count: number;
  verified: boolean;
  distance_km?: number | null;
  reservable?: boolean;
  deposit_type?: "percentage" | "fixed";
  deposit_value?: number;
  reservation_policy?: Record<string, unknown>;
};

export type PetSpotUnit = {
  id: string;
  code: string;
  name: string;
  resource_type: string;
  floor_name: string;
  capacity: number;
  base_price: number;
  description: string;
  amenities: string[];
  image_urls: string[];
  pet_policy: Record<string, unknown>;
  booking_rules: Record<string, unknown>;
  available: boolean;
  minimum_deposit_type: "inherit" | "percentage" | "fixed";
  minimum_deposit_value: number;
};
export type PetSpotReservation = {
  id: string;
  reservation_number: string;
  deposit_amount: number;
  remaining_amount: number;
  subtotal: number;
  hold_expires_at: string;
  reference_type: string;
};

export type PetHubStream = {
  id: string;
  channel_id: string;
  title: string;
  description: string;
  thumbnail_url: string;
  playback_url: string;
  provider: string;
  status: string;
  scheduled_at?: string;
  started_at?: string;
  viewer_count: number;
  channel_name: string;
  channel_handle: string;
  channel_avatar_url: string;
  verified: boolean;
};

export type PetHubPost = {
  id: string;
  channel_id?: string;
  author_name: string;
  content: string;
  media_url: string;
  post_type: string;
  like_count: number;
  comment_count: number;
  repost_count: number;
  created_at: string;
  channel_name: string;
  channel_handle: string;
  channel_avatar_url: string;
  verified: boolean;
  following?: boolean;
};

export type Veterinarian = {
  id: string;
  full_name: string;
  strv_number: string;
  specialties: string[];
  bio: string;
  photo_url: string;
  experience_years: number;
  rating: number;
  consultation_count: number;
  languages: string[];
  availability_status: string;
  starting_price: number;
};

export type ConsultationPlan = {
  id: string;
  veterinarian_id: string;
  doctor_name: string;
  specialties: string[];
  name: string;
  mode: "chat" | "voice" | "video" | "bundle";
  description: string;
  duration_minutes: number;
  followup_days: number;
  chat_quota: number;
  voice_minutes: number;
  video_minutes: number;
  price: number;
  discount_percent: number;
  features: string[];
};

export type Trainer = {
  id: string;
  full_name: string;
  specialties: string[];
  certification: string;
  bio: string;
  photo_url: string;
  experience_years: number;
  rating: number;
  consultation_count: number;
  languages: string[];
  availability_status: string;
  cancellation_policy: string;
  starting_price: number;
};

export type TrainerConsultationPlan = Omit<
  ConsultationPlan,
  "veterinarian_id" | "doctor_name"
> & {
  trainer_id: string;
  trainer_name: string;
};

export type TrainerAvailabilitySlot = {
  starts_at: string;
  duration_minutes: number;
};

export type VeterinarianAvailabilitySlot = TrainerAvailabilitySlot;

export type Consultation = {
  id: string;
  order_number: string;
  room_key: string;
  amount: number;
  status: string;
  payment_status?: string;
  doctor_name?: string;
  trainer_name?: string;
  provider_name?: string;
  provider_type?: "veterinarian" | "trainer";
  plan_name?: string;
  mode?: string;
  pet_name?: string;
  scheduled_at?: string;
  payment?: {
    method?: string;
    status?: string;
    mode?: string;
    qr_string?: string;
    actions?: Array<{
      name?: string;
      method?: string;
      url?: string;
    }>;
  };
};

export type ConsultationMessage = {
  id: string;
  sender_user_id: string;
  sender_name: string;
  client_message_id: string;
  message_type: string;
  body: string;
  attachment_url: string;
  read_at?: string;
  created_at: string;
};

export type AdoptionListing = {
  id: string;
  name: string;
  species: string;
  breed: string;
  sex: string;
  age_months: number;
  size: string;
  city: string;
  description: string;
  personality: string[];
  health_status: string;
  vaccinated: boolean;
  sterilized: boolean;
  photo_urls: string[];
  adoption_fee: number;
  featured: boolean;
  source_type: string;
  submitted_by_name: string;
};

export type CareReminder = {
  id: string;
  pet_id: string;
  pet_name: string;
  reminder_type: string;
  title: string;
  notes: string;
  due_at: string;
  timezone: string;
  recurrence: string;
  recurrence_days?: number;
  lead_minutes: number[];
  channels: string[];
  status: string;
  last_completed_at?: string;
};

export type DocumentProduct = {
  id: string;
  code: string;
  name: string;
  category: string;
  description: string;
  requirements: string[];
  processing_days: number;
  service_fee: number;
  government_fee: number;
  total_fee: number;
};

export type PublicCampaign = {
  id: string;
  name: string;
  campaign_type: string;
  objective: string;
  banner_url: string;
  placement: string;
  audience: string;
  starts_on: string;
  ends_on: string;
};

export type PetshipPlace = {
  id: string;
  name: string;
  category: string;
  address: string;
  city: string;
  latitude: number;
  longitude: number;
  geofence_radius_m: number;
  active_petowners: number;
  distance_km?: number | null;
};

export type PetshipPresence = {
  id: string;
  pet_name: string;
  species: string;
  breed: string;
  photo_url: string;
  owner_first_name: string;
  message: string;
  checked_in_at: string;
  last_seen_at: string;
};

export type Fundraiser = {
  id: string;
  title: string;
  slug: string;
  story: string;
  beneficiary_name: string;
  city: string;
  goal_amount: number;
  raised_amount: number;
  progress_percent: number;
  cover_url: string;
  ends_at?: string;
  published_at?: string;
  donor_count: number;
};

export type MyFundraiser = {
  id: string;
  title: string;
  slug: string;
  status: string;
  goal_amount: number;
  raised_amount: number;
  moderation_notes: string;
  created_at: string;
};

export type PaymentMethod = {
  code: string;
  /** "qris" from the current backend; a backend that predates the cutover may list others. */
  method: string;
  label: string;
  description: string;
};

export type PaymentIntent = {
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
  provider_reference_no?: string;
  qr_string?: string;
  qr_url?: string;
  expires_at?: string;
  paid_at?: string;
};

export type PetHubComment = {
  id: string;
  user_id: string;
  author_name: string;
  content: string;
  created_at: string;
};

export type PetHubStory = {
  id: string;
  user_id: string;
  author_name: string;
  photo_url: string;
  caption: string;
  view_count: number;
  expires_at: string;
  created_at: string;
};

export type PawDatingProfile = {
  id: string;
  pet_id?: string;
  name: string;
  species: string;
  breed: string;
  sex: "male" | "female";
  birth_date: string;
  age_months: number;
  weight_kg: number;
  color: string;
  city: string;
  distance_km?: number | null;
  profile_level: number;
  level_name: string;
  pedigree_status: string;
  description: string;
  temperament: string[];
  traits: string[];
  preferred_breeds?: string[];
  photo_urls: string[];
  health_score: number;
  breeding_history_count: number;
  health_verification: string;
  eligibility_status: string;
  risk_level: string;
  health_valid_until: string;
  owner_display: string;
  owner?: {
    name: string;
    verified: boolean;
    member_since: string;
    city: string;
  };
  status?: string;
  visibility?: string;
  vaccine_book_uploaded?: boolean;
  rejection_reason?: string;
  marketplace_reviewed_at?: string;
  health_report?: PawDatingHealthReport;
};

export type PawDatingHealthReport = {
  id: string;
  examination_at: string;
  valid_until: string;
  clinic_name: string;
  veterinarian_name: string;
  veterinarian_license: string;
  verification_level: number;
  verification_status: string;
  eligibility_status: string;
  risk_level: string;
  physical_exam?: Record<string, string>;
  vaccination_checks?: Record<string, string>;
  parasite_checks?: Record<string, string>;
  infectious_disease_tests?: Record<string, string>;
  reproductive_tests?: Record<string, string>;
  genetic_tests?: Array<{
    test: string;
    result: string;
  }>;
  orthopedic_checks?: Record<string, string>;
  cardiac_checks?: Record<string, string>;
  ophthalmic_checks?: Record<string, string>;
  laboratory_results?: Array<{
    panel: string;
    result: string;
  }>;
  findings: string;
  recommendations: string;
  restrictions: string[];
};

export type PawDatingCompatibility = {
  score: number;
  grade: "excellent" | "good" | "manual_review" | "blocked";
  breakdown: Record<string, number>;
  risk_flags: string[];
  recommendations: string[];
};

export type PawDatingInterest = {
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

export type PawDatingMessage = {
  id: string;
  sender_user_id: string;
  sender_name: string;
  message_type: string;
  body: string;
  attachment_url: string;
  read_at?: string;
  created_at: string;
};

export type PawDatingStandards = {
  principles: string[];
  levels: Array<{
    level: number;
    name: string;
    requirements: string[];
  }>;
  minimum_age_months: Record<string, number>;
  report_validity_days: number;
  blocked_conditions: string[];
};

export const clearPlatformCache = invalidateGetCache;
export {
  hasSession,
  getAccessToken,
  getCurrentUserID,
  getCurrentUser,
  clearSession,
  saveTokens,
  logoutSession,
  startAutomaticRefresh,
  ApiError,
};

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  return apiRequest<T>(path, init);
}
export const getAcademyPrograms = () =>
  request<PlatformList<AcademyProgram>>("/api/v1/public/academy/programs");

export const getAcademyProgram = (programId: string) =>
  request<AcademyProgramDetail>(
    `/api/v1/public/academy/programs/${programId}`,
  );

export const getAcademyProgramReviews = (programId: string) =>
  request<PlatformList<AcademyReview>>(
    `/api/v1/public/academy/programs/${programId}/reviews`,
  );

export const saveAcademyProgramReview = (
  programId: string,
  input: { rating: number; comment: string },
) =>
  request<{ id: string; verified_enrollment: boolean }>(
    `/api/v1/petowner/academy/programs/${programId}/reviews`,
    { method: "POST", body: JSON.stringify(input) },
  );

export const getAcademyTrainers = (input?: {
  academy_id?: string;
  species?: string;
  q?: string;
}) => {
  const params = new URLSearchParams();
  if (input?.academy_id) params.set("academy_id", input.academy_id);
  if (input?.species) params.set("species", input.species);
  if (input?.q) params.set("q", input.q);
  const query = params.toString();
  return request<PlatformList<AcademyTrainer>>(
    `/api/v1/public/academy/trainers${query ? `?${query}` : ""}`,
  );
};

export const getAcademyTrainer = (trainerId: string) =>
  request<AcademyTrainer>(`/api/v1/public/academy/trainers/${trainerId}`);

export const trackAcademyProgramClick = (programId: string) =>
  request<void>(`/api/v1/public/academy/programs/${programId}/click`, {
    method: "POST",
  });

export const enrollAcademy = (input: {
  program_id: string;
  participant_name: string;
  pet_name: string;
  pet_id?: string;
  schedule_id?: string;
}) =>
  request<{ id: string; status: string; amount: number; message: string }>(
    "/api/v1/academy/enrollments",
    { method: "POST", body: JSON.stringify(input) },
  );

export const getPetEvents = () =>
  request<PlatformList<PetEvent>>("/api/v1/public/events");

export const registerEvent = (
  eventId: string,
  input: {
    participant_name: string;
    participant_email: string;
    ticket_quantity: number;
    pet_id?: string;
  },
) =>
  request<{
    id: string;
    qr_token: string;
    status: string;
    amount: number;
    payment_status: "pending" | "paid" | "expired" | "refunded";
    payment_method: "qris";
    pet_name?: string;
  }>(`/api/v1/events/${eventId}/registrations`, {
    method: "POST",
    body: JSON.stringify(input),
  });

export const getPetSpots = (options?: {
  latitude?: number;
  longitude?: number;
  search?: string;
  category?: string;
  max_distance_km?: number;
}) => {
  const query = new URLSearchParams();
  Object.entries(options ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== "") query.set(key, String(value));
  });
  return request<PlatformList<PetSpot>>(
    `/api/v1/public/petspots${query.size ? `?${query}` : ""}`,
  );
};

export const getPetHubStreams = () =>
  request<PlatformList<PetHubStream>>("/api/v1/public/pethub/streams");
export const getPetHubFeed = async (options?: {
  tab?: string;
  type?: string;
  search?: string;
}) => {
  const query = new URLSearchParams();
  Object.entries(options ?? {}).forEach(([key, value]) => {
    if (value) query.set(key, value);
  });
  if (options?.tab === "following") {
    const userID = await getCurrentUserID();
    if (userID) {
      query.set("viewer_id", userID);
    }
  }
  return request<PlatformList<PetHubPost>>(
    `/api/v1/public/pethub/feed${query.size ? `?${query}` : ""}`,
  );
};

export const createPetHubPost = (input: {
  author_name: string;
  content: string;
  post_type: string;
  media_url?: string;
}) =>
  request<{ id: string; message: string }>("/api/v1/pethub/posts", {
    method: "POST",
    body: JSON.stringify(input),
  });

export const reactPetHubPost = (postId: string) =>
  request<{ liked: boolean }>(`/api/v1/pethub/posts/${postId}/reactions`, {
    method: "POST",
  });

export const togglePetHubChannel = (channelId: string) =>
  request<{ channel_id: string; following: boolean }>(
    `/api/v1/pethub/channels/${channelId}/follow`,
    { method: "POST" },
  );
const publicQuery = (
  path: string,
  values: Record<string, string | undefined>,
) => {
  const query = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value) query.set(key, value);
  });
  const suffix = query.toString();
  return suffix ? `${path}?${suffix}` : path;
};

export const getVeterinarians = (specialty?: string) =>
  request<PlatformList<Veterinarian>>(
    publicQuery("/api/v1/public/veterinarians", { specialty }),
  );

export const getConsultationPlans = (
  veterinarianId?: string,
  specialty?: string,
) =>
  request<PlatformList<ConsultationPlan>>(
    publicQuery("/api/v1/public/consultation-plans", {
      veterinarian_id: veterinarianId,
      specialty,
    }),
  );

export const getTrainers = (specialty?: string) =>
  request<PlatformList<Trainer>>(
    publicQuery("/api/v1/public/trainers", { specialty }),
  );

export const getTrainerConsultationPlans = (
  trainerId?: string,
  specialty?: string,
) =>
  request<PlatformList<TrainerConsultationPlan>>(
    publicQuery("/api/v1/public/trainer-consultation-plans", {
      trainer_id: trainerId,
      specialty,
    }),
  );

export const getPetSpotAvailability = (
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
  return request<PlatformList<PetSpotUnit>>(
    `/api/v1/public/petspots/${encodeURIComponent(spotId)}/availability?${query}`,
    { cache: "no-store" },
  );
};

export const createPetSpotReservation = (input: {
  resource_id: string;
  guest_name: string;
  guest_phone: string;
  guest_count: number;
  pet_count: number;
  starts_at: string;
  ends_at: string;
  special_request: string;
}) =>
  request<PetSpotReservation>("/api/v1/petowner/petspot-reservations", {
    method: "POST",
    body: JSON.stringify(input),
  });

export const getTrainerAvailability = (trainerId: string, planId: string) =>
  request<
    PlatformList<TrainerAvailabilitySlot> & {
      timezone: string;
      from: string;
      until: string;
    }
  >(
    `/api/v1/public/trainers/${trainerId}/availability?plan_id=${encodeURIComponent(planId)}&days=14`,
  );

export const getVeterinarianAvailability = (
  veterinarianId: string,
  planId: string,
) =>
  request<
    PlatformList<VeterinarianAvailabilitySlot> & {
      timezone: string;
      from: string;
      until: string;
    }
  >(
    `/api/v1/public/veterinarians/${veterinarianId}/availability?plan_id=${encodeURIComponent(planId)}&days=14`,
  );

export const createTrainerConsultation = (input: Record<string, unknown>) =>
  request<Consultation>("/api/v1/trainer-consultations", {
    method: "POST",
    body: JSON.stringify(input),
  });

export const createConsultation = (input: Record<string, unknown>) =>
  request<Consultation>("/api/v1/consultations", {
    method: "POST",
    body: JSON.stringify(input),
  });

export const getMyConsultations = () =>
  request<PlatformList<Consultation>>("/api/v1/consultations", {
    cache: "no-store",
  });

export const getConsultationMessages = (consultationId: string) =>
  request<PlatformList<ConsultationMessage>>(
    `/api/v1/consultations/${consultationId}/messages`,
    { cache: "no-store" },
  );

export const sendConsultationMessage = (
  consultationId: string,
  input: {
    client_message_id: string;
    message_type: string;
    body: string;
    attachment_url?: string;
  },
) =>
  request<{ id: string; created_at: string; client_message_id: string }>(
    `/api/v1/consultations/${consultationId}/messages`,
    { method: "POST", body: JSON.stringify(input) },
  );

export const isPetOwnerAuthenticated = () => hasSession();

export const getCurrentPetOwnerUserID = () => getCurrentUserID();
export const getAdoptions = () =>
  request<PlatformList<AdoptionListing>>("/api/v1/public/adoptions");

export const applyAdoption = (
  listingId: string,
  input: Record<string, unknown>,
) =>
  request<{ id: string; status: string }>(
    `/api/v1/adoptions/${listingId}/applications`,
    { method: "POST", body: JSON.stringify(input) },
  );

export type MyAdoptionListing = {
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

export type AdoptionApplicationStatus =
  | "submitted"
  | "screening"
  | "home_visit"
  | "approved"
  | "rejected"
  | "withdrawn"
  | "completed";

export type AdoptionApplicationRecord = {
  id: string;
  listing_id: string;
  applicant_name: string;
  phone: string;
  address: string;
  housing_type: string;
  has_other_pets: boolean;
  experience: string;
  reason: string;
  status: AdoptionApplicationStatus;
  status_note: string;
  created_at: string;
  updated_at: string;
};

export type MyAdoptionApplication = {
  id: string;
  listing_id: string;
  listing_name: string;
  listing_status: string;
  status: AdoptionApplicationStatus;
  status_note: string;
  created_at: string;
  updated_at: string;
};

export const getMyAdoptionListings = () =>
  request<PlatformList<MyAdoptionListing>>("/api/v1/petowner/adoptions");

export const getAdoptionListingApplications = (listingId: string) =>
  request<PlatformList<AdoptionApplicationRecord>>(
    `/api/v1/petowner/adoptions/${listingId}/applications`,
  );

export const reviewAdoptionApplication = (
  applicationId: string,
  status: "screening" | "home_visit" | "approved" | "rejected" | "completed",
  note: string,
) =>
  request<{ id: string; status: AdoptionApplicationStatus }>(
    `/api/v1/petowner/adoption-applications/${applicationId}/status`,
    { method: "PATCH", body: JSON.stringify({ status, note }) },
  );

export const getMyAdoptionApplications = () =>
  request<PlatformList<MyAdoptionApplication>>(
    "/api/v1/petowner/adoption-applications",
  );

export const withdrawAdoptionApplication = (applicationId: string) =>
  request<{ id: string; status: AdoptionApplicationStatus }>(
    `/api/v1/petowner/adoption-applications/${applicationId}/withdraw`,
    { method: "POST" },
  );

export const createAdoptionListing = (input: Record<string, unknown>) =>
  request<{ id: string; status: string; message: string }>(
    "/api/v1/petowner/adoptions",
    { method: "POST", body: JSON.stringify(input) },
  );

export const getDocumentProducts = () =>
  request<PlatformList<DocumentProduct>>("/api/v1/public/pet-documents");

export const getPublicCampaigns = () =>
  request<PlatformList<PublicCampaign>>("/api/v1/public/campaigns");

export const getPetshipPlaces = (options?: {
  latitude?: number;
  longitude?: number;
}) => {
  const q = new URLSearchParams();
  Object.entries(options ?? {}).forEach(([key, value]) => {
    if (value !== undefined) q.set(key, String(value));
  });
  return request<PlatformList<PetshipPlace> & { privacy: string }>(
    `/api/v1/public/petship/places${q.size ? `?${q}` : ""}`,
  );
};

export const getPetshipPresences = (placeId: string) =>
  request<PlatformList<PetshipPresence>>(
    `/api/v1/public/petship/places/${placeId}/presences`,
  );

export const checkInPetship = (input: {
  pet_id: string;
  place_id: string;
  visibility: "nearby" | "friends";
  message: string;
}) =>
  request<{ id: string; expires_at: string; message: string }>(
    "/api/v1/petowner/petship/presence",
    { method: "PUT", body: JSON.stringify(input) },
  );

export const heartbeatPetship = () =>
  request<{ expires_at: string }>("/api/v1/petowner/petship/heartbeat", {
    method: "POST",
  });

export const checkoutPetship = () =>
  request<{ message: string }>("/api/v1/petowner/petship/presence", {
    method: "DELETE",
  });

export const getFundraisers = () =>
  request<PlatformList<Fundraiser>>("/api/v1/public/fundraisers");

export const getMyFundraisers = () =>
  request<PlatformList<MyFundraiser>>("/api/v1/petowner/fundraisers");

export const createFundraiser = (input: Record<string, unknown>) =>
  request<{ id: string; status: string; message: string }>(
    "/api/v1/petowner/fundraisers",
    { method: "POST", body: JSON.stringify(input) },
  );

export const createFundraiserDonation = (
  fundraiserId: string,
  input: { amount: number; message: string; anonymous: boolean },
) =>
  request<{
    id: string;
    payment_reference: string;
    payment_status: string;
    amount: number;
    mode: string;
    message: string;
  }>(`/api/v1/petowner/fundraisers/${fundraiserId}/donations`, {
    method: "POST",
    body: JSON.stringify(input),
  });

export const createDocumentRequest = (input: Record<string, unknown>) =>
  request<{
    id: string;
    request_number: string;
    amount: number;
    status: string;
  }>("/api/v1/pet-document-requests", {
    method: "POST",
    body: JSON.stringify(input),
  });

export const resubmitPetDocuments = (
  id: string,
  docs: Array<{
    requirement: string;
    url: string;
    file_name: string;
    mime_type: string;
  }>,
) =>
  request<{ id: string; status: string }>(
    `/api/v1/pet-document-requests/${id}/documents`,
    { method: "PATCH", body: JSON.stringify({ submitted_documents: docs }) },
  );

export const getMyDocumentRequests = () =>
  request<
    PlatformList<{
      id: string;
      status: string;
      submitted_documents: Array<Record<string, unknown>>;
    }>
  >("/api/v1/pet-document-requests", { cache: "no-store" });

export const getPetHubComments = (postId: string) =>
  request<PlatformList<PetHubComment>>(
    `/api/v1/pethub/posts/${postId}/comments`,
  );

export const createPetHubComment = (postId: string, content: string) =>
  request<{ id: string }>(`/api/v1/pethub/posts/${postId}/comments`, {
    method: "POST",
    body: JSON.stringify({ content }),
  });

export const getPetHubStories = () =>
  request<PlatformList<PetHubStory>>("/api/v1/public/pethub/stories");

export const createPetHubStory = (photoUrl: string, caption: string) =>
  request<{ id: string; expires_in: number }>("/api/v1/pethub/stories", {
    method: "POST",
    body: JSON.stringify({ photo_url: photoUrl, caption }),
  });

export const getPawDatingProfiles = (query = "") =>
  request<PlatformList<PawDatingProfile>>(
    `/api/v1/public/pawdating/profiles${query ? `?${query}` : ""}`,
  );

export const getPawDatingProfile = (
  profileId: string,
  location?: { latitude: number; longitude: number },
) => {
  const params = new URLSearchParams();
  if (location) {
    params.set("latitude", String(location.latitude));
    params.set("longitude", String(location.longitude));
  }
  const query = params.toString();
  return request<PawDatingProfile>(
    `/api/v1/public/pawdating/profiles/${profileId}${query ? `?${query}` : ""}`,
  );
};

export const getPawDatingStandards = () =>
  request<PawDatingStandards>("/api/v1/public/pawdating/standards");

export const getMyPawDatingProfiles = () =>
  request<PlatformList<PawDatingProfile>>("/api/v1/pawdating/profiles");

export const createPawDatingProfile = (input: Record<string, unknown>) =>
  request<{
    id: string;
    status: string;
    profile_level: number;
    message: string;
  }>("/api/v1/pawdating/profiles", {
    method: "POST",
    body: JSON.stringify(input),
  });

export const updatePawDatingProfile = (
  profileId: string,
  input: Record<string, unknown>,
) =>
  request<{ id: string; message: string }>(
    `/api/v1/pawdating/profiles/${profileId}`,
    { method: "PUT", body: JSON.stringify(input) },
  );

export const createPawDatingHealthReport = (
  profileId: string,
  input: Record<string, unknown>,
) =>
  request<{
    id: string;
    verification_status: string;
    message: string;
  }>(`/api/v1/pawdating/profiles/${profileId}/health-reports`, {
    method: "POST",
    body: JSON.stringify(input),
  });

export const submitPawDatingProfile = (profileId: string) =>
  request<{ id: string; status: string; message: string }>(
    `/api/v1/pawdating/profiles/${profileId}/submit`,
    { method: "POST" },
  );

export const getPawDatingCompatibility = (targetId: string, sourceId: string) =>
  request<{ compatibility: PawDatingCompatibility }>(
    `/api/v1/pawdating/profiles/${targetId}/compatibility?source_profile_id=${sourceId}`,
  );

export const sendPawDatingInterest = (
  targetId: string,
  input: {
    source_profile_id: string;
    interest_type: "interest" | "super_interest";
    introduction_message: string;
  },
) =>
  request<{
    id: string;
    status: string;
    compatibility: PawDatingCompatibility;
    message: string;
  }>(`/api/v1/pawdating/profiles/${targetId}/interests`, {
    method: "POST",
    body: JSON.stringify(input),
  });

export const recordPawDatingPass = (targetId: string, sourceId: string) =>
  request<{ id: string; profile_id: string; decision: "pass" }>(
    `/api/v1/pawdating/profiles/${targetId}/swipes`,
    {
      method: "POST",
      body: JSON.stringify({ source_profile_id: sourceId, decision: "pass" }),
    },
  );

export const getPawDatingInterests = () =>
  request<PlatformList<PawDatingInterest>>("/api/v1/pawdating/interests");

export const respondPawDatingInterest = (
  interestId: string,
  action: "accept" | "decline",
) =>
  request<{
    id: string;
    status: string;
    match_id?: string;
    message?: string;
  }>(`/api/v1/pawdating/interests/${interestId}`, {
    method: "PATCH",
    body: JSON.stringify({ action }),
  });

export const getPawDatingMessages = (matchId: string) =>
  request<PlatformList<PawDatingMessage>>(
    `/api/v1/pawdating/matches/${matchId}/messages`,
  );

export const createPawDatingMessage = (matchId: string, body: string) =>
  request<{ id: string; created_at: string }>(
    `/api/v1/pawdating/matches/${matchId}/messages`,
    { method: "POST", body: JSON.stringify({ message_type: "text", body }) },
  );

export const reportPawDatingProfile = (
  profileId: string,
  category: string,
  details: string,
) =>
  request<{ id: string; status: string; message: string }>(
    "/api/v1/pawdating/reports",
    {
      method: "POST",
      body: JSON.stringify({
        profile_id: profileId,
        category,
        details,
        evidence_urls: [],
      }),
    },
  );

export const getPetOwnerBootstrap = () =>
  request<PetOwnerBootstrap>("/api/v1/petowner/bootstrap");

export const getPetSpecies = () =>
  request<PlatformList<PetSpecies>>("/api/v1/public/pet-species");

export const updatePetOwnerProfile = (input: {
  full_name: string;
  phone: string;
}) =>
  request<{ full_name: string; phone: string; message: string }>(
    "/api/v1/petowner/profile",
    { method: "PATCH", body: JSON.stringify(input) },
  );
export const getPetOwnerShippingAddresses = () =>
  request<{ addresses: PetOwnerShippingAddress[] }>(
    "/api/v1/petowner/shipping-addresses",
  );

export const createPetOwnerShippingAddress = (
  input: PetOwnerShippingAddressInput,
) =>
  request<{ address: PetOwnerShippingAddress; message: string }>(
    "/api/v1/petowner/shipping-addresses",
    { method: "POST", body: JSON.stringify(input) },
  );

export const updatePetOwnerShippingAddress = (
  addressID: string,
  input: PetOwnerShippingAddressInput,
) =>
  request<{ address: PetOwnerShippingAddress; message: string }>(
    `/api/v1/petowner/shipping-addresses/${addressID}`,
    { method: "PATCH", body: JSON.stringify(input) },
  );

export const deletePetOwnerShippingAddress = (addressID: string) =>
  request<{ message: string }>(
    `/api/v1/petowner/shipping-addresses/${addressID}`,
    { method: "DELETE" },
  );

export const setPrimaryPetOwnerShippingAddress = (addressID: string) =>
  request<{ address: PetOwnerShippingAddress; message: string }>(
    `/api/v1/petowner/shipping-addresses/${addressID}/primary`,
    { method: "PATCH", body: "{}" },
  );

export const createPetOwnerPet = (input: Record<string, unknown>) =>
  request<{
    id: string;
    species: string;
    species_group: string;
    message: string;
  }>("/api/v1/petowner/pets", { method: "POST", body: JSON.stringify(input) });

export const updatePetOwnerPet = (
  petId: string,
  input: Record<string, unknown>,
) =>
  request<{ id: string; message: string }>(`/api/v1/petowner/pets/${petId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });

export const getPetFamily = (petId: string) =>
  request<PlatformList<FamilyAccess>>(`/api/v1/petowner/pets/${petId}/family`);

export const invitePetFamily = (
  petId: string,
  input: Record<string, unknown>,
) =>
  request<{ id: string; message: string }>(
    `/api/v1/petowner/pets/${petId}/family`,
    { method: "POST", body: JSON.stringify(input) },
  );

export const revokePetFamily = (accessId: string) =>
  request<{ message: string }>(`/api/v1/petowner/family/${accessId}`, {
    method: "DELETE",
  });

export const getLostPetMode = (petId: string) =>
  request<LostPetMode>(`/api/v1/petowner/pets/${petId}/lost-mode`);

export const activateLostPetMode = (
  petId: string,
  input: Record<string, unknown>,
) =>
  request<LostPetMode & { message: string }>(
    `/api/v1/petowner/pets/${petId}/lost-mode`,
    { method: "POST", body: JSON.stringify(input) },
  );

export const closeLostPetMode = (petId: string, status: "found" | "closed") =>
  request<{ status: string; message: string }>(
    `/api/v1/petowner/pets/${petId}/lost-mode`,
    { method: "PATCH", body: JSON.stringify({ status }) },
  );

export const getNotifications = (category = "", limit = 100) =>
  request<{
    data: NotificationItem[];
    count: number;
    unread_count: number;
  }>(
    `/api/v1/notifications?limit=${limit}&category=${encodeURIComponent(
      category,
    )}`,
  );

export const readNotification = (id: string) =>
  request<{ read: boolean }>(`/api/v1/notifications/${id}/read`, {
    method: "PATCH",
  });

export const readAllNotifications = (category = "") =>
  request<{ updated: number }>(
    `/api/v1/notifications/read-all?category=${encodeURIComponent(category)}`,
    { method: "PATCH" },
  );

export const getPetOwnerFavorites = () =>
  request<PlatformList<FavoriteItem>>("/api/v1/petowner/favorites", {
    cache: "no-store",
  });

export const togglePetOwnerFavorite = (
  entity_type: string,
  entity_id: string,
) =>
  request<{ favorite: boolean }>("/api/v1/petowner/favorites/toggle", {
    method: "POST",
    body: JSON.stringify({ entity_type, entity_id }),
  });

export const getPetOwnerActivityCenter = (cursor = "") =>
  request<PetOwnerActivityCenterResponse>(
    `/api/v1/petowner/activities?view=center&type=all&state=all&limit=100${
      cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""
    }`,
    { cache: "no-store" },
  );

export const getPetOwnerInvoices = (limit = 50) =>
  request<PlatformList<PetOwnerInvoice>>(
    `/api/v1/petowner/invoices?limit=${limit}`,
    { cache: "no-store" },
  );

export const getPetOwnerInvoice = (invoiceId: string) =>
  request<PetOwnerInvoiceDetail>(
    `/api/v1/petowner/invoices/${encodeURIComponent(invoiceId)}`,
    { cache: "no-store" },
  );

export const getPetOwnerPoints = () =>
  request<
    PointsSummary & {
      transactions: Array<{
        id: string;
        reference_type: string;
        reference_id?: string;
        transaction_amount: number;
        points: number;
        multiplier: number;
        description: string;
        available_at: string;
        expires_at?: string;
        created_at: string;
      }>;
    }
  >("/api/v1/petowner/points");

export const getDiscoveryServices = (options?: {
  search?: string;
  category?: string;
  latitude?: number;
  longitude?: number;
}) => {
  const q = new URLSearchParams();
  Object.entries(options ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== "") q.set(key, String(value));
  });
  return request<PlatformList<DiscoveryService>>(
    `/api/v1/public/discovery/services${q.size ? `?${q}` : ""}`,
  );
};

export const getDiscoveryService = (serviceId: string, branchId: string) =>
  request<DiscoveryServiceDetail>(
    `/api/v1/public/discovery/services/${encodeURIComponent(serviceId)}?branch_id=${encodeURIComponent(branchId)}`,
  );

export const getDiscoveryServiceAvailability = (
  serviceId: string,
  branchId: string,
  options?: { from?: string; days?: number },
) => {
  const query = new URLSearchParams({ branch_id: branchId });
  if (options?.from) query.set("from", options.from);
  if (options?.days) query.set("days", String(options.days));
  return request<ServiceAvailability>(
    `/api/v1/public/discovery/services/${encodeURIComponent(serviceId)}/availability?${query}`,
    { cache: "no-store" },
  );
};

export const getDiscoveryProducts = (search = "", category = "") =>
  request<PlatformList<DiscoveryProduct>>(
    `/api/v1/public/discovery/products?search=${encodeURIComponent(
      search,
    )}&category=${encodeURIComponent(category)}`,
  );

export const getMarketplaceStore = (businessId: string) =>
  request<MarketplaceStoreResponse>(
    `/api/v1/public/marketplace/stores/${encodeURIComponent(businessId)}`,
    { cache: "no-store" },
  );

export const createMarketplaceChat = (input: {
  business_id: string;
  product_id?: string;
}) =>
  request<{ id: string; business_id: string; buyer_user_id: string }>(
    "/api/v1/petowner/marketplace/chats",
    { method: "POST", body: JSON.stringify(input) },
  );

export const getMarketplaceChats = () =>
  request<PlatformList<MarketplaceChatThread>>(
    "/api/v1/petowner/marketplace/chats",
    { cache: "no-store" },
  );

export const getMarketplaceChatMessages = (threadId: string) =>
  request<
    PlatformList<MarketplaceChatMessage> & { viewer: "buyer" | "store" }
  >(`/api/v1/marketplace/chats/${encodeURIComponent(threadId)}/messages`, {
    cache: "no-store",
  });

export const sendMarketplaceChatMessage = (
  threadId: string,
  input: { body: string; product_id?: string },
) =>
  request<MarketplaceChatMessage>(
    `/api/v1/marketplace/chats/${encodeURIComponent(threadId)}/messages`,
    { method: "POST", body: JSON.stringify(input) },
  );

export const getPetOwnerSupportTickets = () =>
  request<PlatformList<PetOwnerSupportTicket>>(
    "/api/v1/petowner/support-tickets",
    { cache: "no-store" },
  );

export const createPetOwnerSupportTicket = (input: {
  category: string;
  subject: string;
  description: string;
  reference_type: string;
  reference_id?: string;
}) =>
  request<{
    id: string;
    ticket_number: string;
    status: string;
    response_due_at: string;
    message: string;
  }>("/api/v1/petowner/support-tickets", {
    method: "POST",
    body: JSON.stringify(input),
  });

export const getProductReviews = (productId: string) =>
  request<ProductReviewList>(`/api/v1/public/products/${productId}/reviews`);

export const saveProductReview = (
  productId: string,
  input: { rating: number; comment: string },
) =>
  request<{ id: string; message: string }>(
    `/api/v1/petowner/products/${productId}/reviews`,
    { method: "POST", body: JSON.stringify(input) },
  );

export const getPetOwnerProvinces = () =>
  request<PlatformList<RegionOption>>("/api/v1/regions/provinces");

export const getPetOwnerRegencies = (provinceID: string) =>
  request<PlatformList<RegionOption>>(
    `/api/v1/regions/regencies?province_id=${encodeURIComponent(provinceID)}`,
  );

export const getPetOwnerDistricts = (regencyID: string) =>
  request<PlatformList<RegionOption>>(
    `/api/v1/regions/districts?regency_id=${encodeURIComponent(regencyID)}`,
  );

export const getPetOwnerVillages = (districtID: string) =>
  request<PlatformList<RegionOption>>(
    `/api/v1/regions/villages?district_id=${encodeURIComponent(districtID)}`,
  );

export const globalSearch = (query: string, category = "") =>
  request<PlatformList<GlobalSearchResult>>(
    `/api/v1/public/search?q=${encodeURIComponent(
      query,
    )}&category=${encodeURIComponent(category)}`,
  );

export const createPetOwnerBooking = (input: Record<string, unknown>) =>
  request<{
    id: string;
    booking_code: string;
    amount: number;
    status: string;
    message: string;
  }>("/api/v1/petowner/bookings", {
    method: "POST",
    body: JSON.stringify(input),
  });

export const cancelPetOwnerBooking = (id: string, reason?: string) =>
  request<{ id: string; status: string; refund_queued: boolean }>(
    `/api/v1/petowner/bookings/${id}/cancel`,
    { method: "POST", body: JSON.stringify(reason ? { reason } : {}) },
  );

export const cancelPetOwnerOrder = (orderId: string) =>
  request<{ id: string; status: string; refund_queued: boolean }>(
    `/api/v1/petowner/orders/${orderId}/cancel`,
    { method: "POST" },
  );

export const requestPetOwnerShopReturn = (
  orderId: string,
  fulfillmentId: string,
  reason: string,
) =>
  request<{ id: string; ticket_number: string; status: string }>(
    `/api/v1/petowner/orders/${orderId}/fulfillments/${fulfillmentId}/return-request`,
    { method: "POST", body: JSON.stringify({ reason }) },
  );

export type SupportMessage = {
  id: string;
  ticket_id: string;
  sender_id: string;
  sender_name: string;
  sender_role: "owner" | "support";
  body: string;
  created_at: string;
};

export const getPetOwnerSupportTicketMessages = (ticketId: string) =>
  request<PlatformList<SupportMessage>>(
    `/api/v1/petowner/support-tickets/${ticketId}/messages`,
    { cache: "no-store" },
  );

export const sendPetOwnerSupportTicketMessage = (
  ticketId: string,
  body: string,
) =>
  request<SupportMessage>(
    `/api/v1/petowner/support-tickets/${ticketId}/messages`,
    { method: "POST", body: JSON.stringify({ body }) },
  );

export const getPaymentMethods = () =>
  request<PlatformList<PaymentMethod> & { provider: string; currency: string }>(
    "/api/v1/payment-methods",
  );

export const createPaymentIntent = (
  referenceType: string,
  referenceId: string,
  paymentMethod: string,
) =>
  request<PaymentIntent>("/api/v1/payment-intents", {
    method: "POST",
    headers: { "Idempotency-Key": crypto.randomUUID() },
    body: JSON.stringify({
      reference_type: referenceType,
      reference_id: referenceId,
      payment_method: paymentMethod,
    }),
  });

export const getPaymentIntent = (paymentId: string) =>
  request<PaymentIntent>(`/api/v1/payment-intents/${paymentId}`, {
    cache: "no-store",
  });

const petOwnerOrderPayload = (input: OrderQuoteInput) => ({
  items: input.items,
  voucher_code: input.voucher_code ?? "",
  redeem_points: input.redeem_points ?? 0,
  ...(input.shipping ? { shipping: input.shipping } : {}),
});

export const quotePetOwnerOrder = (input: OrderQuoteInput) =>
  request<OrderQuote>("/api/v1/petowner/orders/quote", {
    method: "POST",
    body: JSON.stringify(petOwnerOrderPayload(input)),
  });

export const createPetOwnerOrder = (input: OrderQuoteInput) =>
  request<PetOwnerOrder>("/api/v1/petowner/orders", {
    method: "POST",
    body: JSON.stringify(petOwnerOrderPayload(input)),
  });

export const getMedicalRecords = (petId: string) =>
  request<PlatformList<MedicalRecord>>(`/api/v1/pets/${petId}/medical-records`);

export const getCommunityPosts = (options?: {
  tab?: string;
  search?: string;
}) => {
  const q = new URLSearchParams();
  Object.entries(options ?? {}).forEach(([key, value]) => {
    if (value) q.set(key, value);
  });
  return request<PlatformList<CommunityPost>>(
    `/api/v1/public/community/posts${q.size ? `?${q}` : ""}`,
  );
};

export const createCommunityPost = (input: Record<string, unknown>) =>
  request<{ id: string; created_at: string; message: string }>(
    "/api/v1/community/posts",
    { method: "POST", body: JSON.stringify(input) },
  );

export const reactCommunityPost = (postId: string) =>
  request<{ liked: boolean; like_count: number }>(
    `/api/v1/community/posts/${postId}/reactions`,
    { method: "POST" },
  );

export const getCommunityComments = (postId: string) =>
  request<PlatformList<CommunityComment>>(
    `/api/v1/community/posts/${postId}/comments`,
  );

export const createCommunityComment = (postId: string, body: string, parentId?: string) =>
  request<{ id: string; created_at: string; message: string }>(
    `/api/v1/community/posts/${postId}/comments`,
    { method: "POST", body: JSON.stringify({ body, parent_id: parentId || undefined }) },
  );

export const getCommunityGroups = (search = "") =>
  request<PlatformList<CommunityGroup>>(
    `/api/v1/public/community/groups?search=${encodeURIComponent(search)}`,
  );

export const createCommunityGroup = (input: Record<string, unknown>) =>
  request<{ id: string; slug: string; message: string }>(
    "/api/v1/community/groups",
    { method: "POST", body: JSON.stringify(input) },
  );

export const joinCommunityGroup = (groupId: string) =>
  request<{ joined: boolean; message: string }>(
    `/api/v1/community/groups/${groupId}/join`,
    { method: "POST" },
  );

export const getCommunityGroupMessages = (groupId: string) =>
  request<PlatformList<CommunityGroupMessage>>(
    `/api/v1/community/groups/${groupId}/messages`,
  );

export const createCommunityGroupMessage = (groupId: string, body: string) =>
  request<{ id: string; created_at: string }>(
    `/api/v1/community/groups/${groupId}/messages`,
    { method: "POST", body: JSON.stringify({ body }) },
  );

export type CommunityGroupMember = {
  user_id: string;
  full_name: string;
  role: "owner" | "moderator" | "member";
  status: "pending" | "active" | "blocked";
  joined_at: string;
};

export const getCommunityGroupMembers = (
  groupId: string,
  status: "pending" | "active",
) =>
  request<PlatformList<CommunityGroupMember>>(
    `/api/v1/community/groups/${groupId}/members?status=${status}`,
  );

export const updateCommunityGroupMember = (
  groupId: string,
  userId: string,
  status: "active" | "blocked",
) =>
  request<{
    group_id: string;
    user_id: string;
    status: "active" | "blocked";
    member_count: number;
  }>(`/api/v1/community/groups/${groupId}/members/${userId}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });

export const getCareReminders = () =>
  request<PlatformList<CareReminder>>("/api/v1/petowner/reminders");

export const createCareReminder = (input: Record<string, unknown>) =>
  request<{ id: string; message: string }>("/api/v1/petowner/reminders", {
    method: "POST",
    body: JSON.stringify(input),
  });

export const completeCareReminder = (id: string) =>
  request<{ id: string; message: string }>(
    `/api/v1/petowner/reminders/${id}/complete`,
    { method: "POST" },
  );

export const snoozeCareReminder = (id: string, minutes: number) =>
  request<{ id: string; message: string }>(
    `/api/v1/petowner/reminders/${id}/snooze`,
    { method: "POST", body: JSON.stringify({ minutes }) },
  );
