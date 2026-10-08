export type CalendarKind = "date" | "datetime-local" | "time";
export function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function parseCalendarDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return undefined;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12);
  return dateKey(date) === value.slice(0, 10) ? date : undefined;
}
export function monthDays(year: number, month: number) {
  const first = new Date(year, month, 1, 12);
  const offset = (first.getDay() + 6) % 7;
  return Array.from({ length: 42 }, (_, index) => new Date(year, month, 1 + index - offset, 12));
}
export function calendarValue(day: string, time: string, kind: CalendarKind, separator = "T") {
  return kind === "time" ? time : kind === "date" ? day : `${day}${separator}${time}`;
}
export function withinDateBounds(day: string, min?: string, max?: string) {
  return (!min || day >= min.slice(0, 10)) && (!max || day <= max.slice(0, 10));
}
export function validCalendarValue(value: string, kind: CalendarKind, min?: string, max?: string) {
  const time = kind === "time" ? value : value.slice(11);
  if (kind !== "date" && !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return false;
  if (kind !== "time" && (!parseCalendarDate(value) || (kind === "date" ? value.length !== 10 : !/^\d{4}-\d{2}-\d{2}T/.test(value)))) return false;
  return (!min || value >= min) && (!max || value <= max);
}
