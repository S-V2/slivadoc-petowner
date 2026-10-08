export const isPetSpotStay = (category: string) =>
  ["boarding_house", "apartment", "hotel"].includes(category);

export function petSpotBookingWindow(input: {
  category: string;
  date: string;
  time: string;
  endDate: string;
  minutes: number;
}) {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(input.date) ||
    !/^\d{2}:\d{2}$/.test(input.time)
  )
    return null;
  const validDate = (value: string) =>
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
  try {
    if (
      !validDate(input.date) ||
      (isPetSpotStay(input.category) && !validDate(input.endDate))
    )
      return null;
  } catch {
    return null;
  }
  const [hour, minute] = input.time.split(":").map(Number);
  if (hour > 23 || minute > 59 || !Number.isFinite(input.minutes)) return null;
  const start = new Date(`${input.date}T${input.time}:00+07:00`);
  const stay = isPetSpotStay(input.category);
  const end = stay
    ? new Date(`${input.endDate}T${input.time}:00+07:00`)
    : new Date(start.getTime() + input.minutes * 60000);
  const duration = (end.getTime() - start.getTime()) / 60000;
  const days = Math.ceil(duration / 1440);
  if (
    !Number.isFinite(duration) ||
    duration <= 0 ||
    duration > 366 * 1440 ||
    (stay && days < (input.category === "boarding_house" ? 30 : 1))
  )
    return null;
  return { starts_at: start.toISOString(), ends_at: end.toISOString(), days };
}

export function petSpotQuote(
  spot: { category: string; deposit_type?: string; deposit_value?: number },
  unit: {
    base_price: number;
    minimum_deposit_type: string;
    minimum_deposit_value: number;
    booking_rules: Record<string, unknown>;
  },
  days: number,
) {
  const periods = !isPetSpotStay(spot.category)
    ? 1
    : unit.booking_rules?.rate_period === "month"
      ? Math.ceil(days / 30)
      : days;
  const baseSubtotal = unit.base_price * periods;
  const kind =
    unit.minimum_deposit_type === "inherit"
      ? spot.deposit_type
      : unit.minimum_deposit_type;
  const value =
    unit.minimum_deposit_type === "inherit"
      ? (spot.deposit_value ?? 0)
      : unit.minimum_deposit_value;
  const deposit = Math.ceil(
    kind === "fixed" ? value : (baseSubtotal * value) / 100,
  );
  // Matches the API: a fixed DP can establish the minimum reservation charge.
  const subtotal = Math.max(baseSubtotal, deposit);
  return { periods, subtotal, deposit, remaining: subtotal - deposit };
}

const labels: Record<string, string> = {
  cafe: "Cafe",
  restaurant: "Restoran",
  park: "Taman",
  hotel: "Hotel",
  boarding_house: "Kosan / Coliving",
  apartment: "Apartemen",
  mall: "Mall",
  workspace: "Workspace",
  beach: "Pantai",
  store: "Pet shop",
};
export const petSpotCategory = (value: string) =>
  labels[value] ?? "Pet-friendly venue";
