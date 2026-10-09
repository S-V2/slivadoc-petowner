"use client";
import { LocalizedCopy, LocalizedButton, LocalizedInput } from "../LocalizedCopy";

import { useMemo, useRef, useState } from "react";
import { Icon } from "../Icon";
import GeoMap, { type GeoPoint } from "../platform/GeoMap";
import { reverseGeocode, searchLocation, type LocationResult } from "../../lib/petowner-api";
import { DEVICE_LOCATION_LABEL, PIN_LOCATION_LABEL, resolveLocation } from "../../lib/device-location";

type Props = {
  current: LocationResult | null;
  authenticated: boolean;
  onLogin: () => void;
  onSelect: (location: LocationResult) => void;
  onClose: () => void;
};

export default function LocationModal({ current, authenticated, onLogin, onSelect, onClose }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Array<LocationResult & { id?: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [pin, setPin] = useState<GeoPoint | null>(null);
  const [picked, setPicked] = useState<LocationResult | null>(null);
  const pinSeq = useRef(0);
  const [loginPrompt, setLoginPrompt] = useState(false);

  const useDeviceLocation = () => {
    if (!navigator.geolocation) {
      setError("Browser ini tidak mendukung akses lokasi.");
      return;
    }
    setLoading(true);
    setError("");
    navigator.geolocation.getCurrentPosition(async (position) => {
      try {
        const location = await resolveLocation(
          { latitude: position.coords.latitude, longitude: position.coords.longitude },
          { authenticated, reverse: reverseGeocode, guestLabel: DEVICE_LOCATION_LABEL },
        );
        onSelect(location);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Lokasi tidak dapat diterjemahkan.");
      } finally {
        setLoading(false);
      }
    }, (cause) => {
      setLoading(false);
      setError(cause.code === 1 ? "Izin lokasi ditolak. Izinkan lokasi pada pengaturan browser atau cari alamat manual." : "Lokasi perangkat belum dapat ditemukan.");
    }, { enableHighAccuracy: true, timeout: 12_000, maximumAge: 60_000 });
  };

  const runSearch = async () => {
    if (query.trim().length < 3) return;
    if (!authenticated) {
      setLoginPrompt(true);
      return;
    }
    setLoading(true);
    setError("");
    try {
      setResults(await searchLocation(query.trim()));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Pencarian lokasi gagal.");
    } finally {
      setLoading(false);
    }
  };

  const mapLocation = pin ?? current ?? results[0] ?? null;
  const mapPin = useMemo(() => mapLocation && { latitude: mapLocation.latitude, longitude: mapLocation.longitude }, [mapLocation?.latitude, mapLocation?.longitude]); // eslint-disable-line react-hooks/exhaustive-deps
  const dropPin = async (point: GeoPoint) => {
    const seq = ++pinSeq.current;
    setPin(point);
    setPicked(null);
    setError("");
    try {
      const location = await resolveLocation(point, { authenticated, reverse: reverseGeocode, guestLabel: PIN_LOCATION_LABEL });
      if (seq === pinSeq.current) setPicked(location);
    } catch (cause) {
      if (seq === pinSeq.current) setError(cause instanceof Error ? cause.message : "Lokasi pin tidak dapat diterjemahkan.");
    }
  };

  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      <div className="modal location-modal" onMouseDown={(event) => event.stopPropagation()}>
        <header>
          <div><span className="section-eyebrow"><LocalizedCopy>{"LOKASI LAYANAN"}</LocalizedCopy></span><h2><LocalizedCopy>{"Pilih lokasi spesifik"}</LocalizedCopy></h2><p><LocalizedCopy>{"Dipakai untuk mencari klinik, grooming, home care, dan komunitas terdekat."}</LocalizedCopy></p></div>
          <LocalizedButton className="modal-close" type="button" onClick={onClose}><Icon name="close" /></LocalizedButton>
        </header>
        <LocalizedButton className="detect-location" type="button" onClick={useDeviceLocation} disabled={loading}>
          <span><Icon name="map" size={20} /></span><p><b><LocalizedCopy>{loading ? "Mendeteksi lokasi..." : "Gunakan lokasi perangkat"}</LocalizedCopy></b><small><LocalizedCopy>{"Browser akan meminta izin lokasi satu kali"}</LocalizedCopy></small></p><Icon name="chevron" size={17} />
        </LocalizedButton>
        <div className="location-search">
          <Icon name="search" size={18} />
          <LocalizedInput value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => event.key === "Enter" && runSearch()} placeholder="Cari alamat, kecamatan, atau kota" />
          <LocalizedButton type="button" onClick={runSearch} disabled={loading || query.trim().length < 3}><LocalizedCopy>{"Cari"}</LocalizedCopy></LocalizedButton>
        </div>
        <LocalizedCopy>{error && <div className="integration-error"><LocalizedCopy>{error}</LocalizedCopy></div>}</LocalizedCopy>
        <LocalizedCopy>{loginPrompt && <div className="integration-error location-login-prompt"><LocalizedCopy>{"Masuk untuk mencari alamat. Lokasi perangkat dan pin di peta tetap bisa dipakai tanpa akun."}</LocalizedCopy><LocalizedButton type="button" className="primary-button small" onClick={onLogin}><LocalizedCopy>{"Masuk ke akun"}</LocalizedCopy></LocalizedButton></div>}</LocalizedCopy>
        <LocalizedCopy>{results.length > 0 && <div className="location-results"><LocalizedCopy>{results.map((item) => <LocalizedButton type="button" key={item.id ?? item.label} onClick={() => onSelect(item)}><Icon name="map" size={17} /><span><b><LocalizedCopy>{item.label.split(",")[0]}</LocalizedCopy></b><small><LocalizedCopy>{item.label}</LocalizedCopy></small></span></LocalizedButton>)}</LocalizedCopy></div>}</LocalizedCopy>
        <div className="map-preview"><GeoMap pin={mapPin} onPinChange={(point) => void dropPin(point)} /></div>
        <small className="map-hint"><LocalizedCopy>{"Ketuk peta atau geser pin untuk memilih lokasi."}</LocalizedCopy></small>
        {picked && <button className="detect-location" type="button" onClick={() => onSelect(picked)}><span><Icon name="check" size={20} /></span><p><b><LocalizedCopy>{"Gunakan lokasi pin ini"}</LocalizedCopy></b><small><LocalizedCopy>{picked.label}</LocalizedCopy></small></p><Icon name="chevron" size={17} /></button>}
        <LocalizedCopy>{current && <div className="selected-location"><Icon name="check" size={16} /><p><small><LocalizedCopy>{"LOKASI TERPILIH"}</LocalizedCopy></small><b><LocalizedCopy>{current.label}</LocalizedCopy></b></p></div>}</LocalizedCopy>
      </div>
    </div>
  );
}
