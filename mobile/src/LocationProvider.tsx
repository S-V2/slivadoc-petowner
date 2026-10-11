import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from "react";
import { AppState } from "react-native";
import * as ExpoLocation from "expo-location";
import { readDeviceLocation } from "./device-location";
import {
  DEVICE_LOCATION_LABEL, LOCATION_REFRESH_MS, loadLocationPreferences, loadStoredLocation, saveStoredLocation,
  type LocationPreferences, type LocationSource, type StoredLocation,
} from "./location";

type LocationSession = {
  location?: StoredLocation;
  ready: boolean;
  pickerOpen: boolean;
  openPicker: () => void;
  closePicker: () => void;
  selectLocation: (location: StoredLocation, source?: LocationSource) => void;
};
const LocationContext = createContext<LocationSession>({
  ready: true, pickerOpen: false, openPicker: () => undefined, closePicker: () => undefined, selectLocation: () => undefined,
});

export function LocationProvider({ children }: PropsWithChildren) {
  const [location, setLocation] = useState<StoredLocation>();
  const [ready, setReady] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [preferences, setPreferences] = useState<LocationPreferences>({ updatedAt: 0 });
  const revision = useRef(0);
  const pending = useRef(false);
  const writes = useRef(Promise.resolve());
  const selectLocation = useCallback((point: StoredLocation, source: LocationSource = "manual") => {
    revision.current += 1;
    const next = { source, updatedAt: Date.now() };
    setLocation(point);
    setPreferences(next);
    setReady(true);
    // Serialize writes so a slower GPS save cannot overwrite a newer manual pick.
    writes.current = writes.current.then(() => saveStoredLocation(point, next));
  }, []);

  useEffect(() => {
    let active = true;
    const version = revision.current;
    void Promise.all([loadStoredLocation(), loadLocationPreferences()]).then(([point, saved]) => {
      if (!active || version !== revision.current) return;
      setLocation(point);
      // Older native builds saved only a label. Preserve manual address choices.
      setPreferences({ ...saved, source: saved.source ?? (point ? point.label === DEVICE_LOCATION_LABEL ? "device" : "manual" : undefined) });
      setReady(true);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!ready) return;
    let active = true;
    const refresh = async () => {
      if (!active || AppState.currentState !== "active" || pending.current || preferences.source === "manual"
        || Date.now() - preferences.updatedAt < LOCATION_REFRESH_MS) return;
      const version = revision.current;
      pending.current = true;
      try {
        // Background refresh never opens a permission prompt.
        const permission = await ExpoLocation.getForegroundPermissionsAsync();
        if (!active || version !== revision.current || permission.status !== "granted") return;
        const point = await readDeviceLocation();
        if (active && version === revision.current && AppState.currentState === "active") selectLocation(point, "device");
      } catch {
        // Keep the last usable coordinates when permission or GPS is unavailable.
      } finally { pending.current = false; }
    };
    void refresh();
    const timer = setInterval(() => void refresh(), LOCATION_REFRESH_MS);
    const listener = AppState.addEventListener("change", state => { if (state === "active") void refresh(); });
    return () => { active = false; clearInterval(timer); listener.remove(); };
  }, [preferences, ready, selectLocation]);

  const openPicker = useCallback(() => setPickerOpen(true), []);
  const closePicker = useCallback(() => setPickerOpen(false), []);
  const value = useMemo(() => ({ location, ready, pickerOpen, openPicker, closePicker, selectLocation }),
    [location, ready, pickerOpen, openPicker, closePicker, selectLocation]);
  return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>;
}

export function useCurrentLocation() { return useContext(LocationContext); }
