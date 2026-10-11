"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { reverseGeocode, type LocationResult } from "../lib/petowner-api";
import { DEVICE_LOCATION_LABEL } from "../lib/device-location";
import { LOCATION_KEY, LOCATION_PREFERENCES_KEY, LOCATION_REFRESH_MS, parseStoredLocation, parseLocationPreferences, type LocationPreferences, type LocationSource } from "../lib/location-session";

const locationEvent = "slivadoc:location-changed";

export function useCurrentLocation(authenticated: boolean) {
  const [location, setLocation] = useState<LocationResult | null>(null);
  const preferences = useRef<LocationPreferences>({ updatedAt: 0 });
  const revision = useRef(0);
  const lastAttempt = useRef(0);
  const save = useCallback((value: LocationResult, source: LocationSource = "manual") => {
    preferences.current = { source, updatedAt: Date.now() };
    revision.current++;
    try {
      localStorage.setItem(LOCATION_KEY, JSON.stringify(value));
      localStorage.setItem(LOCATION_PREFERENCES_KEY, JSON.stringify(preferences.current));
    } catch { /* Keep the current selection when storage is unavailable. */ }
    setLocation(value);
    window.dispatchEvent(new CustomEvent(locationEvent, { detail: { value, preferences: preferences.current } }));
  }, []);

  useEffect(() => {
    let active = true;
    let pending = false;
    const read = () => {
      try {
        preferences.current = parseLocationPreferences(localStorage.getItem(LOCATION_PREFERENCES_KEY));
        setLocation(parseStoredLocation(localStorage.getItem(LOCATION_KEY)));
        revision.current++;
      } catch { /* Browsers may block persistent storage. */ }
    };
    const sync = (event: Event) => {
      if (event instanceof StorageEvent) {
        if (event.key !== LOCATION_KEY && event.key !== LOCATION_PREFERENCES_KEY && event.key !== null) return;
        read();
      } else {
        const detail = (event as CustomEvent<{ value: LocationResult; preferences: LocationPreferences }>).detail;
        if (detail) { preferences.current = detail.preferences; revision.current++; setLocation(detail.value); }
      }
      window.clearInterval(timer);
      timer = window.setInterval(() => void refresh(), LOCATION_REFRESH_MS);
    };
    const refresh = async () => {
      const now = Date.now();
      if (!active || pending || document.visibilityState === "hidden" || !navigator.geolocation || preferences.current.source === "manual"
        || now - Math.min(now, Math.max(preferences.current.updatedAt, lastAttempt.current)) < LOCATION_REFRESH_MS) return;
      pending = true;
      const currentRevision = revision.current;
      try {
        let permitted = preferences.current.source === "device";
        try {
          if (navigator.permissions) permitted = (await navigator.permissions.query({ name: "geolocation" })).state === "granted";
        } catch { /* Use a previously selected device location when permission queries are unavailable. */ }
        if (!active || currentRevision !== revision.current || !permitted) { pending = false; return; }
        lastAttempt.current = now;
        navigator.geolocation.getCurrentPosition(async ({ coords }) => {
          let value: LocationResult = { latitude: coords.latitude, longitude: coords.longitude, label: DEVICE_LOCATION_LABEL };
          if (authenticated) { try { value = await reverseGeocode(coords.latitude, coords.longitude); } catch { /* Coordinates remain usable without geocoding. */ } }
          if (active && currentRevision === revision.current) save(value, "device");
          pending = false;
        }, () => { pending = false; }, { enableHighAccuracy: false, timeout: 12_000, maximumAge: 60_000 });
      } catch { pending = false; }
    };
    queueMicrotask(() => { if (active) { read(); void refresh(); } });
    let timer = window.setInterval(() => void refresh(), LOCATION_REFRESH_MS);
    const resume = () => void refresh();
    window.addEventListener("storage", sync);
    window.addEventListener(locationEvent, sync);
    window.addEventListener("focus", resume);
    document.addEventListener("visibilitychange", resume);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener("storage", sync);
      window.removeEventListener(locationEvent, sync);
      window.removeEventListener("focus", resume);
      document.removeEventListener("visibilitychange", resume);
    };
  }, [authenticated, save]);
  return [location, save] as const;
}
