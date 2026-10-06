// Fully shaped answers of the platform API, shared by the mocked specs. Each
// builder returns what the backend handler sends; tests override only the
// fields their story needs.

/** The signed-in pet owner, as GET /api/v1/auth/me and the bootstrap describe them. */
export const petOwner = {
  id: "58000000-0000-4000-8000-000000000001",
  email: "pet@example.test",
  full_name: "Pet Parent",
  phone: "081234567890",
};

/**
 * GET /api/v1/petowner/bootstrap for a pet owner without pets, notifications
 * or points. public_code is the six-character base36 member code every
 * account gets (users.public_code, NOT NULL).
 */
export function petOwnerBootstrap() {
  return {
    user: {
      ...petOwner,
      public_code: "7K2Q9M",
      member_since: "2026-01-01T08:00:00Z",
    },
    pets: [],
    activities: [],
    notifications: [],
    unread_notifications: 0,
    favorites: [],
    points: {
      balance: 0,
      earned: 0,
      redeemed: 0,
      pending: 0,
      formula: {
        enabled: false,
        point_value_rupiah: 1,
        earn_divisor_rupiah: 10_000,
        expiry_days: 365,
        settlement_hold_days: 7,
        max_redemption_bps: 5_000,
        min_redemption_points: 100,
        rules: [],
      },
    },
  };
}

const activityTypes = [
  "booking",
  "order",
  "consultation",
  "academy",
  "event",
  "reservation",
  "document",
  "donation",
  "hotel",
  "home_service",
] as const;

/**
 * One row of GET /api/v1/petowner/activities: the keys every kind carries.
 * Kind-specific keys come in through the overrides.
 */
export function activityItem(
  overrides: {
    id: string;
    type: (typeof activityTypes)[number];
    title: string;
  } & Record<string, unknown>,
) {
  return {
    reference_id: overrides.id,
    code: overrides.id.slice(0, 12).toUpperCase(),
    subtitle: "",
    status: "confirmed",
    payment_status: "paid",
    amount: 0,
    state: "upcoming",
    needs_action: false,
    payable: false,
    payment_reference_type: "",
    scheduled_at: null,
    occurred_at: "2026-09-23T00:00:00Z",
    updated_at: "2026-09-23T00:00:00Z",
    pet_id: "",
    pet_name: "",
    ...overrides,
  };
}

/**
 * GET /api/v1/petowner/activities?limit=100: one page, the cursor of the next
 * (null on the last) and a count per kind over everything the caller has.
 */
export function activityCenter(
  data: Array<{ type: string }> = [],
  nextCursor: string | null = null,
  all: Array<{ type: string }> = data,
) {
  return {
    data,
    count: data.length,
    next_cursor: nextCursor,
    summary: Object.fromEntries(
      activityTypes.map((type) => [
        type,
        all.filter((item) => item.type === type).length,
      ]),
    ),
  };
}

/** A row of GET /api/v1/petowner/marketplace/chats. */
export function marketplaceChatThread(
  overrides: { id: string; business_id: string } & Record<string, unknown>,
) {
  return {
    business_name: "Sliva Pet Shop",
    store_logo_url: "",
    buyer_user_id: petOwner.id,
    buyer_name: "Pet Parent",
    product_id: "",
    product_name: "",
    product_image_url: "",
    last_message: "Halo",
    last_message_created_at: "2026-10-05T08:00:00Z",
    last_message_at: "2026-10-05T08:00:00Z",
    store_is_online: true,
    store_last_seen_at: "2026-10-05T01:00:00Z",
    unread_count: 0,
    ...overrides,
  };
}

/**
 * A row of GET /api/v1/public/discovery/products: a petshop's product with
 * its live stock, the active branch holding most of it, its published review
 * average and the units sold on paid orders.
 */
export function marketplaceProduct(
  overrides: { id: string; name: string } & Record<string, unknown>,
) {
  return {
    business_id: "59000000-0000-4000-8000-000000000101",
    business_name: "Sliva Pet Shop",
    store_logo_url: "",
    store_is_online: false,
    store_last_seen_at: "",
    branch_id: "55000000-0000-4000-8000-000000000101",
    branch_name: "Sliva Pet Shop Kemang",
    city: "Jakarta Selatan",
    sku: "TEST",
    barcode: "",
    category: "Makanan",
    description: "",
    image_url: "",
    price: 35_000,
    stock: 10,
    minimum_stock: 1,
    available: true,
    rating: 4.8,
    review_count: 12,
    sold_count: 40,
    created_at: "2026-09-01T08:00:00Z",
    ...overrides,
  };
}

/** GET /api/v1/payment-methods: Yokke offers QRIS only. */
export function paymentMethods() {
  return {
    provider: "yokke",
    currency: "IDR",
    data: [
      {
        code: "qris",
        method: "qris",
        label: "QRIS",
        description: "Scan dari seluruh aplikasi bank dan e-wallet",
      },
    ],
  };
}

/**
 * POST /api/v1/payment-intents and GET /api/v1/payment-intents/{paymentID}:
 * a pending Yokke QRIS charge. order_id is the provider order id (the first 20
 * hex digits of the payment id, upper case); Yokke returns no qr_url.
 */
export function paymentIntent(
  overrides: { id: string; reference_id: string; amount: number } & Record<
    string,
    unknown
  >,
) {
  return {
    order_id: overrides.id.replaceAll("-", "").toUpperCase().slice(0, 20),
    provider: "yokke",
    method: "qris",
    status: "pending",
    payment_status: "pending",
    currency: "IDR",
    reference_type: "shop_order",
    provider_reference_no: "YK2609230001",
    qr_string:
      "00020101021226590013ID.CO.YOKKE.WWW0118936000000000000102150000000000000015204599953033605405350005802ID5913SLIVADOC QRIS6007JAKARTA6304A1B2",
    qr_url: "",
    expires_at: "2026-09-23T00:15:00Z",
    paid_at: null,
    ...overrides,
  };
}
