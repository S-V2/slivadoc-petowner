// Last-touch attribution for the Klinik & Petshop menu: a store opened from the
// menu marks the session, a store opened anywhere else clears the mark, and the
// next booking or order creation sends it and clears it again.
export const ENTRY_POINT_KEY = "slivadoc.entry_point";
export const CLINIC_ENTRY_POINT = "klinik_petshop";

type EntryStore = Pick<Storage, "getItem" | "setItem" | "removeItem">;

const sessionStore = (): EntryStore | null => {
  try {
    return typeof window === "undefined" ? null : window.sessionStorage;
  } catch {
    return null;
  }
};

export function recordStoreOpen(
  source: typeof CLINIC_ENTRY_POINT | "other",
  store: EntryStore | null = sessionStore(),
) {
  if (!store) return;
  if (source === CLINIC_ENTRY_POINT) store.setItem(ENTRY_POINT_KEY, CLINIC_ENTRY_POINT);
  else store.removeItem(ENTRY_POINT_KEY);
}

export function readEntryPoint(store: EntryStore | null = sessionStore()) {
  return store?.getItem(ENTRY_POINT_KEY) === CLINIC_ENTRY_POINT ? CLINIC_ENTRY_POINT : undefined;
}

export const clearEntryPoint = (store: EntryStore | null = sessionStore()) =>
  store?.removeItem(ENTRY_POINT_KEY);
