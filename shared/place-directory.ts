// Publishing a place is independent of whether its account can take orders.
export function isInformationPlace(place: { source?: string; business_id?: string | null; can_transact?: boolean; verified?: boolean }) {
  return place.source === "manual" || !place.business_id || place.can_transact === false || place.verified === false;
}

export function hasPlacePin<T extends { latitude: number | null; longitude: number | null }>(place: T): place is T & { latitude: number; longitude: number } {
  return typeof place.latitude === "number" && Number.isFinite(place.latitude) && place.latitude >= -90 && place.latitude <= 90
    && typeof place.longitude === "number" && Number.isFinite(place.longitude) && place.longitude >= -180 && place.longitude <= 180;
}

type DirectoryPlace = {
  latitude: number | null;
  longitude: number | null;
  business_name?: string;
  address?: string;
  district?: string;
  city?: string;
};

// A missing pin still has a real destination: let Google Maps resolve the address.
export function placeDirectionsUrl(place: DirectoryPlace) {
  const destination = hasPlacePin(place)
    ? `${place.latitude},${place.longitude}`
    : [place.business_name, place.address, place.district, place.city]
      .map((part) => part?.trim()).filter(Boolean).join(", ");
  return destination
    ? `https://www.google.com/maps/dir/?api=1&destination=${hasPlacePin(place) ? destination : encodeURIComponent(destination)}`
    : undefined;
}

// Directory references do not contain marketplace reviews or published catalogues.
export function directoryStoreProfile(place: {
  branch_id: string; business_id: string | null; business_name: string;
  logo_url?: string | null; banner_url?: string | null; description?: string;
  city: string;
}) {
  return {
    id: place.business_id || place.branch_id,
    name: place.business_name,
    logo_url: place.logo_url || "",
    banner_url: place.banner_url || "",
    about: place.description || `Temukan alamat, jam operasional, dan informasi kunjungan ke ${place.business_name}.`,
    city: place.city,
    joined_at: "", is_online: false, last_seen_at: "",
    product_count: 0, category_count: 0, rating: 0, review_count: 0, sold_count: 0,
  };
}
