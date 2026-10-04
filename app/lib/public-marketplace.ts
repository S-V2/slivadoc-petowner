import { cache } from "react";

const PLATFORM_API_URL = (
  process.env.NEXT_PUBLIC_PLATFORM_API_URL ?? "http://localhost:8080"
).replace(/\/$/, "");

type ProductPayload = {
  id?: unknown;
  business_id?: unknown;
  business_name?: unknown;
  branch_id?: unknown;
  branch_name?: unknown;
  city?: unknown;
  name?: unknown;
  sku?: unknown;
  barcode?: unknown;
  category?: unknown;
  description?: unknown;
  image_url?: unknown;
  price?: unknown;
  stock?: unknown;
  minimum_stock?: unknown;
  available?: unknown;
  rating?: unknown;
  review_count?: unknown;
  sold_count?: unknown;
  brand_name?: unknown;
  manufacturer?: unknown;
  origin_country?: unknown;
  net_content?: unknown;
  ingredients?: unknown;
  usage_instructions?: unknown;
  storage_instructions?: unknown;
  warnings?: unknown;
  package_contents?: unknown;
  return_policy?: unknown;
  warranty_policy?: unknown;
  registration_type?: unknown;
  registration_number?: unknown;
  halal_certificate_number?: unknown;
  sni_number?: unknown;
  business_license_status?: unknown;
};

export type PublicProduct = {
  id: string;
  slug: string;
  businessId: string;
  businessName: string;
  branchId: string;
  branchName: string;
  city: string;
  name: string;
  sku: string;
  barcode: string;
  category: string;
  description: string;
  imageUrl: string;
  price: number;
  stock: number;
  minimumStock: number;
  available: boolean;
  rating: number;
  reviewCount: number;
  soldCount: number;
  brandName: string;
  manufacturer: string;
  originCountry: string;
  netContent: string;
  ingredients: string;
  usageInstructions: string;
  storageInstructions: string;
  warnings: string;
  packageContents: string;
  returnPolicy: string;
  warrantyPolicy: string;
  registrationType: string;
  registrationNumber: string;
  halalCertificateNumber: string;
  sniNumber: string;
  businessLicenseStatus: string;
};

const UUID_AT_END =
  /([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i;

function text(value: unknown) {
  return typeof value === "string" ? value : "";
}

function finite(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

export function productSlug(name: string, id: string) {
  const label = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("id")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 72);
  return `${label || "produk-pet"}-${id}`;
}

export function productIDFromSlug(slug: string) {
  return slug.match(UUID_AT_END)?.[1] ?? "";
}

function normalizeProduct(value: ProductPayload): PublicProduct | null {
  const id = text(value.id);
  const name = text(value.name);
  if (!UUID_AT_END.test(id) || !name) return null;
  return {
    id,
    slug: productSlug(name, id),
    businessId: text(value.business_id),
    businessName: text(value.business_name),
    branchId: text(value.branch_id),
    branchName: text(value.branch_name),
    city: text(value.city),
    name,
    sku: text(value.sku),
    barcode: text(value.barcode),
    category: text(value.category) || "Kebutuhan pet",
    description: text(value.description),
    imageUrl: text(value.image_url),
    price: Math.max(0, finite(value.price)),
    stock: Math.max(0, finite(value.stock)),
    minimumStock: Math.max(0, finite(value.minimum_stock)),
    available: value.available === true && finite(value.stock) > 0,
    rating: Math.max(0, Math.min(5, finite(value.rating))),
    reviewCount: Math.max(0, Math.round(finite(value.review_count))),
    soldCount: Math.max(0, finite(value.sold_count)),
    brandName: text(value.brand_name),
    manufacturer: text(value.manufacturer),
    originCountry: text(value.origin_country),
    netContent: text(value.net_content),
    ingredients: text(value.ingredients),
    usageInstructions: text(value.usage_instructions),
    storageInstructions: text(value.storage_instructions),
    warnings: text(value.warnings),
    packageContents: text(value.package_contents),
    returnPolicy: text(value.return_policy),
    warrantyPolicy: text(value.warranty_policy),
    registrationType: text(value.registration_type),
    registrationNumber: text(value.registration_number),
    halalCertificateNumber: text(value.halal_certificate_number),
    sniNumber: text(value.sni_number),
    businessLicenseStatus: text(value.business_license_status),
  };
}

export const getPublicProducts = cache(async (): Promise<PublicProduct[]> => {
  try {
    const response = await fetch(
      `${PLATFORM_API_URL}/api/v1/public/discovery/products`,
      { cache: "no-store", headers: { accept: "application/json" } },
    );
    if (!response.ok) return [];
    const payload = (await response.json()) as { data?: ProductPayload[] };
    return (payload.data ?? [])
      .map(normalizeProduct)
      .filter((product): product is PublicProduct => product !== null);
  } catch {
    return [];
  }
});

export const getPublicProduct = cache(async (slug: string) => {
  const productID = productIDFromSlug(slug);
  if (!productID) return null;
  try {
    const response = await fetch(
      `${PLATFORM_API_URL}/api/v1/public/discovery/products/${productID}`,
      { cache: "no-store", headers: { accept: "application/json" } },
    );
    if (response.ok)
      return normalizeProduct((await response.json()) as ProductPayload);
  } catch {
    // A catalogue fallback below keeps product pages available during a
    // rolling deployment where the list handler is live before this detail
    // handler reaches every backend instance.
  }
  const products = await getPublicProducts();
  return products.find((product) => product.id === productID) ?? null;
});
