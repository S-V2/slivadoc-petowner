import { expect, test } from "@playwright/test";

const orderID = "53000000-0000-4000-8000-000000000091";
const productID = "52000000-0000-4000-8000-000000000091";
const order = {
  id: orderID,
  number: "BPO-PET-QA-001",
  channel: "partner",
  brand_name: "Brand QA",
  buyer_name: "Pet Shop QA",
  status: "packing",
  subtotal: 50000,
  shipping_fee: 16000,
  paid_amount: 66000,
  payment_proof_status: "verified",
  version: 3,
  shipping_address: "Jl. QA nomor 10, Jakarta",
  contact_phone: "081234567890",
  due_date: "2026-09-30",
  notes: "Kirim pada jam kerja",
  created_at: "2026-09-07T08:00:00Z",
};

const shipment = {
  id: "shipment-pet-qa-001",
  shipping_number: "SLV-PO-PET-QA-001",
  context_type: "purchase_order",
  provider_shipment_id: "C1QA-PET-001",
  provider_stt_no: "STT-PET-QA-001",
  shipment_type: "PICKUP",
  service_code: "JAGOPACK",
  status: "pickup_requested",
  provider_status: "PUP",
  pickup_status: "success",
  use_insurance: true,
  quoted_fee: 16000,
  final_fee: 16000,
  estimated_sla: "1 - 2 Hari",
  print_url: "https://lionparcel.test/print/STT-PET-QA-001",
  events: [
    {
      status_code: "PUP",
      description: "Paket dijemput Lion Parcel",
      location: "Gudang Jakarta",
      occurred_at: "2026-09-07T09:00:00Z",
    },
  ],
};

test("Official Brand portal shows automatic Lion Parcel scans for PO", async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem("slivadoc.access_token", "commerce-shipping-test");
    localStorage.setItem("slivadoc.refresh_token", "commerce-shipping-refresh");
    localStorage.setItem(
      "slivadoc.access_expires_at",
      String(Date.now() + 3_600_000),
    );
  });
  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    const headers = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "authorization,content-type",
      "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,OPTIONS",
    };
    if (request.method() === "OPTIONS") {
      await route.fulfill({ status: 204, headers });
      return;
    }
    const json = (body: unknown) =>
      route.fulfill({ status: 200, headers, contentType: "application/json", body: JSON.stringify(body) });
    if (path === "/api/v1/auth/me")
      return json({
        id: "brand-user-1",
        role: "official_brand",
        email: "brand@slivadoc.test",
        full_name: "Brand QA",
      });
    if (path === "/api/v1/commerce/context")
      return json({
        role: "official_brand",
        brand_id: "51000000-0000-4000-8000-000000000091",
        profiles: [
          {
            id: "51000000-0000-4000-8000-000000000091",
            name: "Brand QA",
            status: "active",
          },
        ],
        branches: [],
        can_pay: false,
        can_manage: false,
        can_configure_cooperation: false,
      });
    if (path === "/api/v1/commerce/dashboard")
      return json({ channels: [], low_stock: [] });
    if (path === "/api/v1/commerce/orders")
      return json({ data: [order], page: 1, has_more: false });
    if (path === `/api/v1/commerce/orders/${orderID}`)
      return json({
        order,
        items: [
          {
            id: productID,
            sku: "QA-001",
            name: "Pakan QA",
            quantity: 2,
            unit: "pcs",
            unit_price: 25000,
          },
        ],
        events: [],
        payments: [],
        documents: [],
        evidence: [],
        receipt: null,
        receipt_items: [],
        shipping_adjustments: [],
        shipment,
      });
    return json({ data: [], page: 1, has_more: false });
  });

  await page.setViewportSize({ width: 1365, height: 900 });
  await page.goto("/brand", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Purchase order" }).click();
  await page.getByRole("button", { name: /BPO-PET-QA-001/ }).click();

  const tracking = page.getByLabel("Tracking pengiriman PO");
  await expect(tracking.getByText("STT-PET-QA-001", { exact: true })).toBeVisible();
  await expect(
    tracking.getByText("Paket dijemput Lion Parcel", { exact: true }),
  ).toBeVisible();
  await expect(
    tracking.getByText("Lion Parcel API + webhook", { exact: true }),
  ).toBeVisible();
  await expect(
    tracking.getByRole("link", { name: "Cetak label Lion Parcel" }),
  ).toHaveAttribute("href", shipment.print_url);
  await expect(page.getByLabel("Courier", { exact: true })).toHaveCount(0);
  await expect(page.getByLabel("Tracking number", { exact: true })).toHaveCount(0);
});
