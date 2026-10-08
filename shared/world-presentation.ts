const facilityLabels: Record<string, string> = {
  indoor: "Indoor", outdoor: "Outdoor", semi_outdoor: "Semi outdoor",
  pet_menu: "Pet menu", water_bowl: "Mangkuk minum", waste_station: "Area kebersihan pet",
  pet_event: "Area event pet", pet_lounge: "Pet lounge", pet_store: "Pet shop",
  small_pet_zone: "Zona pet kecil", walking_trail: "Jalur jalan pet",
  agility: "Area agility", parking: "Parkir", elevator: "Lift", wifi: "Wi-Fi", ac: "AC",
  wheelchair_access: "Akses kursi roda", leash_free: "Area tanpa leash", fenced_area: "Area berpagar",
  pet_playground: "Area bermain pet", washing_station: "Area mandi pet", security: "Keamanan",
  pet_relief_area: "Area kebersihan pet", event_hall: "Ruang event", pet_parking: "Area tunggu pet", vet_corner: "Pojok dokter hewan",
  staff: "Staf pendamping", garden_dining: "Area makan taman", valet: "Valet", pet_garden: "Taman pet",
  concierge: "Concierge", grooming_room: "Ruang grooming", shade: "Area teduh", pet_spa: "Spa pet",
  day_care: "Penitipan harian", room_service: "Layanan kamar", pet_pool: "Kolam pet",
  table: "Meja", room: "Kamar", unit: "Unit", meeting_room: "Ruang pertemuan", birthday: "Ulang tahun",
};

/** Format presentation only; API codes and partner-entered names stay intact. */
export function worldLabel(value: string): string {
  const clean = value.trim();
  return facilityLabels[clean.toLowerCase()] ?? clean.replace(/_+/g, " ").replace(/\s+/g, " ");
}

export function facilityNames(values: ReadonlyArray<string | { name: string }>): string[] {
  return [...new Set(values.map(value => worldLabel(typeof value === "string" ? value : value.name)).filter(Boolean))];
}
