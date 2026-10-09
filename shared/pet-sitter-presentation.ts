export const sitterPetOptions = [
  { value: "", label: "Semua pet" },
  { value: "cat", label: "Kucing" },
  { value: "dog", label: "Anjing" },
  { value: "rabbit", label: "Kelinci" },
  { value: "bird", label: "Burung" },
  { value: "small_mammal", label: "Pet kecil" },
  { value: "reptile", label: "Reptil" },
  { value: "other", label: "Lainnya" },
] as const;

export const sitterInitials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .filter((word) => /[\p{L}\p{N}]/u.test(word))
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();

export function sitterPalette(name: string) {
  const palettes = [
    { background: "#D8F1FF", foreground: "#05689F", soft: "#F1FAFF" },
    { background: "#C7ECFF", foreground: "#07547E", soft: "#EBF8FF" },
    { background: "#E0F3FF", foreground: "#1B709E", soft: "#F6FBFF" },
  ] as const;
  return (
    palettes[
      Array.from(name).reduce((sum, char) => sum + char.charCodeAt(0), 0) %
        palettes.length
    ] ?? palettes[0]
  );
}

export function sittingDateLabel(value: string) {
  return new Date(value.slice(0, 10) + "T12:00:00+07:00").toLocaleDateString(
    "id-ID",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "Asia/Jakarta",
    },
  );
}

export const sittingProgressSteps = [
  "Diajukan",
  "Pembayaran",
  "Terjadwal",
  "Perawatan",
  "Selesai",
];
export function sittingProgressIndex(status: string) {
  return [
    "requested",
    "awaiting_payment",
    "confirmed",
    "in_progress",
    "completed",
  ].indexOf(status);
}

export function sitterGridColumns(width: number) {
  return width >= 1600 ? 5 : width >= 1280 ? 4 : width >= 700 ? 3 : 2;
}
export function sitterDistanceLabel(distance?: number | null) {
  return distance == null
    ? ""
    : `${distance < 0.1 ? "< 0,1" : distance.toLocaleString("id-ID", { maximumFractionDigits: 1 })} km`;
}
