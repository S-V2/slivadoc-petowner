export type ShippingRegionLevel =
  | "province"
  | "regency"
  | "district"
  | "village";

export type ShippingRegionOption = Readonly<{
  code: string;
  name: string;
}>;

/**
 * A region is stored as the complete option, instead of only its label, so the
 * checkout payload cannot accidentally lose the authoritative master-data code.
 */
export type ShippingDestinationSelection = {
  province: ShippingRegionOption | null;
  regency: ShippingRegionOption | null;
  district: ShippingRegionOption | null;
  village: ShippingRegionOption | null;
};

/** The recipient fields entered by the pet owner. `area` is derived from regions. */
export type ShippingAddressForm = {
  name: string;
  phone: string;
  address: string;
  post_code: string;
};

export type ShippingAddressPayload = {
  name: string;
  phone: string;
  address: string;
  post_code: string;
  area: string;
};

export type ShippingQuoteItem = Readonly<{
  product_id: string;
  quantity: number;
}>;

export function isShippingQuoteRequestCurrent(
  requestSequence: number,
  currentSequence: number,
  requestKey: string,
  currentKey: string,
) {
  return (
    requestSequence === currentSequence &&
    requestKey.length > 0 &&
    requestKey === currentKey
  );
}

export type ShippingDestinationErrorKey =
  | keyof ShippingAddressForm
  | ShippingRegionLevel;

export type ShippingDestinationErrors = Partial<
  Record<ShippingDestinationErrorKey, string>
>;

const REGION_LEVELS: readonly ShippingRegionLevel[] = [
  "province",
  "regency",
  "district",
  "village",
];

function normalizeText(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function normalizeAreaName(value: string) {
  return normalizeText(value).toUpperCase();
}

function normalizePhone(value: string) {
  const trimmed = value.trim();
  const digits = trimmed.replace(/\D/g, "");
  return trimmed.startsWith("+") ? `+${digits}` : digits;
}

function hasCompleteOption(option: ShippingRegionOption | null) {
  return Boolean(option?.code.trim() && option.name.trim());
}

export function createEmptyShippingDestination(): ShippingDestinationSelection {
  return {
    province: null,
    regency: null,
    district: null,
    village: null,
  };
}

export function createEmptyShippingAddress(): ShippingAddressForm {
  return {
    name: "",
    phone: "",
    address: "",
    post_code: "",
  };
}

/**
 * Applies a selection and clears every dependent level below it. The input is
 * never mutated, which keeps this safe to pass directly to a React state setter.
 */
export function resetShippingDestination(
  current: ShippingDestinationSelection,
  changedLevel: ShippingRegionLevel,
  selected: ShippingRegionOption | null,
): ShippingDestinationSelection {
  const next = { ...current, [changedLevel]: selected };
  const changedIndex = REGION_LEVELS.indexOf(changedLevel);

  for (let index = changedIndex + 1; index < REGION_LEVELS.length; index += 1) {
    next[REGION_LEVELS[index]!] = null;
  }

  return next;
}

export function shippingDestinationErrors(
  address: ShippingAddressForm,
  destination: ShippingDestinationSelection,
): ShippingDestinationErrors {
  const errors: ShippingDestinationErrors = {};
  const recipientName = normalizeText(address.name);
  const phone = normalizePhone(address.phone);
  const fullAddress = normalizeText(address.address);
  const postcode = address.post_code.trim();

  if (recipientName.length < 2) {
    errors.name = "Nama penerima wajib diisi";
  }
  if (!/^(?:\+?62|0)\d{8,13}$/.test(phone)) {
    errors.phone = "Nomor telepon Indonesia belum valid";
  }
  if (fullAddress.length < 8) {
    errors.address = "Alamat lengkap wajib diisi";
  }
  if (!/^\d{5}$/.test(postcode)) {
    errors.post_code = "Kode pos wajib terdiri dari 5 digit";
  }

  for (const level of REGION_LEVELS) {
    if (!hasCompleteOption(destination[level])) {
      errors[level] = `${level} wajib dipilih`;
    }
  }

  return errors;
}

export function isShippingDestinationComplete(
  address: ShippingAddressForm,
  destination: ShippingDestinationSelection,
) {
  return (
    Object.keys(shippingDestinationErrors(address, destination)).length === 0
  );
}

/**
 * Builds the strict address shape accepted by checkout. All four master-region
 * selections are validated here, while Lion Parcel's destination is derived
 * from the district and regency names in `area`.
 */
export function buildShippingAddressPayload(
  address: ShippingAddressForm,
  destination: ShippingDestinationSelection,
): ShippingAddressPayload {
  const errors = shippingDestinationErrors(address, destination);
  if (Object.keys(errors).length > 0) {
    throw new Error("Tujuan pengiriman belum lengkap atau belum valid");
  }

  const regency = destination.regency!;
  const district = destination.district!;

  return {
    name: normalizeText(address.name),
    phone: normalizePhone(address.phone),
    address: normalizeText(address.address),
    post_code: address.post_code.trim(),
    area: `${normalizeAreaName(district.name)}, ${normalizeAreaName(regency.name)}`,
  };
}

/**
 * A canonical dependency key for background quotes. Item order and cosmetic
 * whitespace do not trigger duplicate calls; cart or destination changes do.
 */
export function createShippingAutoQuoteKey(
  items: readonly ShippingQuoteItem[],
  address: ShippingAddressForm,
  destination: ShippingDestinationSelection,
) {
  const canonicalItems = items
    .map((item) => ({
      product_id: normalizeText(item.product_id),
      quantity: Number.isFinite(item.quantity)
        ? Math.max(0, Math.trunc(item.quantity))
        : 0,
    }))
    .sort(
      (left, right) =>
        left.product_id.localeCompare(right.product_id) ||
        left.quantity - right.quantity,
    );

  const canonicalDestination = Object.fromEntries(
    REGION_LEVELS.map((level) => {
      const option = destination[level];
      return [
        level,
        option
          ? {
              code: option.code.trim(),
              name: normalizeAreaName(option.name),
            }
          : null,
      ];
    }),
  );

  return `shipping-quote:v1:${JSON.stringify({
    items: canonicalItems,
    address: {
      name: normalizeText(address.name),
      phone: normalizePhone(address.phone),
      address: normalizeText(address.address),
      post_code: address.post_code.trim(),
    },
    destination: canonicalDestination,
  })}`;
}
