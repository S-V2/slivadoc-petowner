const PLATFORM_API_URL = (process.env.NEXT_PUBLIC_PLATFORM_API_URL ?? "http://localhost:8080").replace(/\/$/, "");

type PublicService = {
  id: string;
  branch_id: string;
  business_id: string;
  business_name: string;
  branch_name: string;
  name: string;
  category: string;
  duration_minutes: number;
  price: number;
  address: string;
  city: string;
  latitude?: number | null;
  longitude?: number | null;
  rating?: number | null;
  review_count?: number | null;
};

export type PublicPlace = {
  slug: string;
  branchId: string;
  businessId: string;
  name: string;
  branchName: string;
  address: string;
  city: string;
  latitude?: number | null;
  longitude?: number | null;
  rating?: number | null;
  reviewCount?: number | null;
  services: Array<{ id: string; name: string; category: string; durationMinutes: number; price: number }>;
};

export function directorySlug(name: string, branchName: string, branchId: string) {
  const label = `${name}-${branchName}`.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 72);
  return `${label || "mitra-slivadoc"}-${branchId}`;
}

export async function getPublicPlaces(): Promise<PublicPlace[]> {
  try {
    const response = await fetch(`${PLATFORM_API_URL}/api/v1/public/discovery/services`, { cache: "no-store", headers: { accept: "application/json" } });
    if (!response.ok) return [];
    const payload = await response.json() as { data?: PublicService[] };
    const groups = new Map<string, PublicPlace>();
    for (const service of payload.data ?? []) {
      if (!service.branch_id || !service.business_name || !service.branch_name) continue;
      const current = groups.get(service.branch_id) ?? {
        slug: directorySlug(service.business_name, service.branch_name, service.branch_id),
        branchId: service.branch_id,
        businessId: service.business_id,
        name: service.business_name,
        branchName: service.branch_name,
        address: service.address,
        city: service.city,
        latitude: service.latitude,
        longitude: service.longitude,
        rating: service.rating,
        reviewCount: service.review_count,
        services: [],
      };
      if (!current.services.some((item) => item.id === service.id)) current.services.push({ id: service.id, name: service.name, category: service.category, durationMinutes: service.duration_minutes, price: service.price });
      groups.set(service.branch_id, current);
    }
    return [...groups.values()].sort((a, b) => a.city.localeCompare(b.city, "id") || a.name.localeCompare(b.name, "id"));
  } catch {
    return [];
  }
}

export async function getPublicPlace(slug: string) {
  const places = await getPublicPlaces();
  return places.find((item) => item.slug === slug);
}

export function placeSchemaType(place: PublicPlace) {
  const categories = place.services.map((service) => service.category.toLowerCase()).join(" ");
  if (/clinic|klinik|veter|doctor|dokter/.test(categories)) return "VeterinaryCare";
  if (/shop|store|retail|petshop/.test(categories)) return "PetStore";
  return "LocalBusiness";
}
