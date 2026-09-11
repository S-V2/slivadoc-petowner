import assert from "node:assert/strict";
import test from "node:test";

import {
  buildShippingArea,
  buildShippingAddressPayload,
  buildMarketplaceShippingPayload,
  createShippingAutoQuoteKey,
  isShippingDestinationComplete,
  isShippingQuoteRequestCurrent,
  resetShippingDestination,
  shippingDestinationErrors,
  type ShippingAddressForm,
  type ShippingDestinationSelection,
  type ShippingRegionOption,
} from "../mobile/src/shipping.ts";

const province = { code: "31", name: "DKI Jakarta" } as const;
const regency = { code: "31.73", name: "Kota Jakarta Barat" } as const;
const district = { code: "31.73.06", name: "Kalideres" } as const;
const village = { code: "31.73.06.1001", name: "Kalideres" } as const;

const completeAddress: ShippingAddressForm = {
  name: "Evans Moris Cheahn",
  phone: "+62 823-9123-9651",
  address: "Jl. Peta Barat No. 21, RT 03/RW 02",
  post_code: "11840",
};

const completeDestination: ShippingDestinationSelection = {
  province,
  regency,
  district,
  village,
};

test("destination requires recipient fields, all four regions, and a five-digit postcode", () => {
  assert.equal(
    isShippingDestinationComplete(completeAddress, completeDestination),
    true,
  );

  const missing = shippingDestinationErrors(
    { ...completeAddress, name: "", phone: "", address: "", post_code: "1184" },
    { ...completeDestination, village: null },
  );
  assert.deepEqual(Object.keys(missing).sort(), [
    "address",
    "name",
    "phone",
    "post_code",
    "village",
  ]);
  assert.equal(
    isShippingDestinationComplete(
      { ...completeAddress, post_code: "118400" },
      completeDestination,
    ),
    false,
  );
});

test("changing a region clears only the dependent dropdown selections", () => {
  const newProvince = { code: "32", name: "Jawa Barat" };
  assert.deepEqual(
    resetShippingDestination(completeDestination, "province", newProvince),
    {
      province: newProvince,
      regency: null,
      district: null,
      village: null,
    },
  );

  const newRegency = { code: "31.74", name: "Kota Jakarta Selatan" };
  assert.deepEqual(
    resetShippingDestination(completeDestination, "regency", newRegency),
    {
      province,
      regency: newRegency,
      district: null,
      village: null,
    },
  );

  const newDistrict = { code: "31.73.07", name: "Cengkareng" };
  assert.deepEqual(
    resetShippingDestination(completeDestination, "district", newDistrict),
    {
      province,
      regency,
      district: newDistrict,
      village: null,
    },
  );

  const newVillage = { code: "31.73.06.1002", name: "Kamal" };
  assert.deepEqual(
    resetShippingDestination(completeDestination, "village", newVillage),
    { ...completeDestination, village: newVillage },
  );
  assert.equal(completeDestination.village, village, "input is not mutated");
});

test("shipping area matches the tariff payload format used by dashboard", () => {
  assert.equal(
    buildShippingArea(" Kecamatan   Kalideres ", " Kota Jakarta Barat "),
    "KALIDERES, JAKARTA BARAT",
  );
  assert.equal(
    buildShippingArea("Andir", "Kota Bandung"),
    "ANDIR, BANDUNG",
  );
  assert.equal(
    buildShippingArea("Kuta", "Kabupaten Badung"),
    "KUTA, BADUNG",
  );
});

test("mobile payload canonicalizes destination and contains only strict API fields", () => {
  const payload = buildShippingAddressPayload(
    {
      ...completeAddress,
      name: "  Evans   Moris ",
      address: "  Jl. Peta Barat   No. 21 ",
    },
    {
      province: { code: " 31 ", name: " DKI Jakarta " },
      regency: { code: " 31.73 ", name: " Kota   Jakarta Barat " },
      district: { code: " 31.73.06 ", name: " Kalideres " },
      village: { code: " 31.73.06.1001 ", name: " Kalideres " },
    },
  );

  assert.deepEqual(
    {
      ...payload,
    },
    {
      name: "Evans Moris",
      phone: "+6282391239651",
      address: "Jl. Peta Barat No. 21",
      post_code: "11840",
      area: "KALIDERES, JAKARTA BARAT",
    },
  );
});

test("mobile shipping request sends the canonical destination payload", () => {
  assert.deepEqual(
    buildMarketplaceShippingPayload(completeAddress, completeDestination, {
      "branch-1": "REGPACK",
    }),
    {
      address: {
        name: "Evans Moris Cheahn",
        phone: "+6282391239651",
        address: "Jl. Peta Barat No. 21, RT 03/RW 02",
        post_code: "11840",
        area: "KALIDERES, JAKARTA BARAT",
      },
      shipment_type: "PICKUP",
      use_insurance: false,
      selections: [{ branch_id: "branch-1", service_code: "REGPACK" }],
    },
  );
});

test("auto-quote key is deterministic and changes with the destination or cart", () => {
  const cart = [
    { product_id: "food-2", quantity: 1 },
    { product_id: "food-1", quantity: 2 },
  ];
  const key = createShippingAutoQuoteKey(
    cart,
    completeAddress,
    completeDestination,
  );

  assert.equal(
    key,
    createShippingAutoQuoteKey(
      [...cart].reverse(),
      { ...completeAddress },
      { ...completeDestination },
    ),
    "cart insertion order does not affect the key",
  );
  assert.notEqual(
    key,
    createShippingAutoQuoteKey(
      [
        { product_id: "food-1", quantity: 3 },
        { product_id: "food-2", quantity: 1 },
      ],
      completeAddress,
      completeDestination,
    ),
    "quantity changes trigger another quote",
  );

  const otherVillage: ShippingRegionOption = {
    code: "31.73.06.1002",
    name: "Kamal",
  };
  assert.notEqual(
    key,
    createShippingAutoQuoteKey(cart, completeAddress, {
      ...completeDestination,
      village: otherVillage,
    }),
    "destination changes trigger another quote",
  );
});

test("a late quote response cannot become current after its input changes", async () => {
  let resolveOldQuote!: (value: string) => void;
  const oldQuote = new Promise<string>((resolve) => {
    resolveOldQuote = resolve;
  });
  const oldRequest = { sequence: 1, key: "destination-a" };
  let currentSequence = oldRequest.sequence;
  let currentKey = oldRequest.key;

  currentSequence += 1;
  currentKey = "destination-b";
  resolveOldQuote("old response");
  await oldQuote;

  assert.equal(
    isShippingQuoteRequestCurrent(
      oldRequest.sequence,
      currentSequence,
      oldRequest.key,
      currentKey,
    ),
    false,
  );
  assert.equal(
    isShippingQuoteRequestCurrent(
      currentSequence,
      currentSequence,
      currentKey,
      currentKey,
    ),
    true,
  );
});
