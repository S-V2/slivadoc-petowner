export function petOwnerIntlLocale(): "id-ID" | "en-US" {
  return typeof document !== "undefined" && document.documentElement.lang.startsWith("en") ? "en-US" : "id-ID";
}
