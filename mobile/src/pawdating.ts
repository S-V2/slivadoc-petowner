export type PawDatingDiscoveryLocation = {
  latitude: number;
  longitude: number;
};

export function buildMobilePawDatingDiscoveryPath(
  location?: PawDatingDiscoveryLocation,
) {
  const params = new URLSearchParams({
    min_level: "2",
    min_health_score: "80",
  });
  if (location) {
    params.set("latitude", String(location.latitude));
    params.set("longitude", String(location.longitude));
  }
  return `/api/v1/public/pawdating/profiles?${params.toString()}`;
}
