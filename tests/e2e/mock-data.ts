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
    notifications: [],
    unread_notifications: 0,
    activities: [],
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

const months = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/**
 * GET /api/v1/commerce/dashboard for an Official Brand without purchase orders
 * yet, on `today`: Postgres to_char labels, 14 traffic days, 6 months.
 */
export function commerceDashboard(today = "2026-09-07") {
  const end = Date.parse(`${today}T00:00:00Z`);
  const day = (index: number) => {
    const date = new Date(end - (13 - index) * 86_400_000);
    return {
      day: date.toISOString().slice(0, 10),
      label: `${String(date.getUTCDate()).padStart(2, "0")} ${months[date.getUTCMonth()]}`,
    };
  };
  const month = (index: number) => {
    const date = new Date(end);
    date.setUTCDate(1);
    date.setUTCMonth(date.getUTCMonth() - 5 + index);
    return {
      month_start: date.toISOString().slice(0, 10),
      label: `${months[date.getUTCMonth()]} ${String(date.getUTCFullYear()).slice(2)}`,
    };
  };
  return {
    currency: "IDR",
    income_basis: "verified_payments_net_of_refunds",
    tracking_mode: "lion_parcel_integrated",
    channels: [],
    low_stock: [],
    daily_traffic: Array.from({ length: 14 }, (_, index) => ({
      ...day(index),
      orders: 0,
      slivadoc_orders: 0,
      partner_orders: 0,
      gmv: 0,
      collected: 0,
      units: 0,
    })),
    status_distribution: [],
    fulfillment_kpis: [
      {
        total_orders: 0,
        shipped_orders: 0,
        tracked_orders: 0,
        completed_orders: 0,
        avg_dispatch_hours: 0,
        avg_transit_hours: 0,
        open_exceptions: 0,
      },
    ],
    document_health: [
      {
        total_orders: 0,
        invoices_generated: 0,
        delivery_note_expected: 0,
        delivery_notes_generated: 0,
        receipt_expected: 0,
        receipts_confirmed: 0,
        orders_with_evidence: 0,
        evidence_pending_review: 0,
      },
    ],
    // Official Brand only: brandExecutiveInsights.
    monthly_performance: Array.from({ length: 6 }, (_, index) => ({
      ...month(index),
      orders: 0,
      gmv: 0,
      collected: 0,
      units: 0,
    })),
    order_funnel: [],
    top_products: [],
    top_partners: [],
    receivable_aging: [],
    recent_activity: [],
    targets: [],
    brand_kpis: [
      {
        active_products: 0,
        available_units: 0,
        reserved_units: 0,
        active_partners: 0,
        active_warehouses: 0,
        open_returns: 0,
        integration_alerts: 0,
      },
    ],
  };
}

/**
 * A row of GET /api/v1/commerce/orders as the brand sees it:
 * brand_purchase_orders plus its shipment, documents and payment proof.
 * brand_legal_name is "" outside Operations and Finance.
 */
export function purchaseOrder(overrides: Record<string, unknown> = {}) {
  const row = {
    id: "53000000-0000-4000-8000-000000000001",
    number: "PO-QA-001",
    brand_id: "51000000-0000-4000-8000-000000000001",
    channel: "partner",
    buyer_business_id: "59000000-0000-4000-8000-000000000001",
    buyer_branch_id: "55000000-0000-4000-8000-000000000001",
    created_by: "54000000-0000-4000-8000-000000000002",
    idempotency_key: "5a000000-0000-4000-8000-000000000001",
    request_hash:
      "9f2c4e1b7a6d3c8e5f0a1b2c3d4e5f60718293a4b5c6d7e8f9012a3b4c5d6e7f",
    buyer_name: "Pet Shop QA",
    shipping_address: "Jl. QA nomor 10, Jakarta",
    contact_phone: "081234567890",
    notes: "",
    due_date: "2026-09-30",
    status: "submitted",
    subtotal: 50000,
    paid_amount: 0,
    courier: "",
    tracking_number: "",
    version: 1,
    created_at: "2026-09-07T08:00:00Z",
    updated_at: "2026-09-07T08:00:00Z",
    cooperation_mode: "brand_to_partner",
    transfer_reference: "",
    shipping_fee: 0,
    shipping_destination: {},
    shipment_id: null,
    shipping_quote_id: null,
    brand_name: "Brand QA",
    shipping_number: "",
    provider_shipment_id: "",
    provider_stt_no: "",
    shipping_status: "",
    shipping_provider_status: "",
    pickup_status: "",
    shipping_service: "",
    estimated_sla: "",
    shipping_label_url: "",
    brand_legal_name: "",
    invoice_number: null,
    receipt_status: null,
    evidence_count: 0,
    payment_proof_status: "missing",
    payment_proof_url: null,
    payment_proof_file_name: null,
    approval_ready: false,
    ...overrides,
  };
  return {
    ...row,
    outstanding: row.subtotal + row.shipping_fee - row.paid_amount,
  };
}
