"use client";

import { useState } from "react";
import { Icon } from "../Icon";
import { reverseGeocode, searchLocation, type LocationResult } from "../../lib/petowner-api";

type Props = {
  current: LocationResult | null;
  onSelect: (location: LocationResult) => void;
  onClose: () => void;
};

export default function LocationModal({ current, onSelect, onClose }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Array<LocationResult & { id?: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const useDeviceLocation = () => {
    if (!navigator.geolocation) {
      setError("Browser ini tidak mendukung akses lokasi.");
      return;
    }
    setLoading(true);
    setError("");
    navigator.geolocation.getCurrentPosition(async (position) => {
      try {
        const location = await reverseGeocode(position.coords.latitude, position.coords.longitude);
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

  const mapLocation = current ?? results[0] ?? null;
  const mapSrc = mapLocation
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${mapLocation.longitude - 0.01}%2C${mapLocation.latitude - 0.007}%2C${mapLocation.longitude + 0.01}%2C${mapLocation.latitude + 0.007}&layer=mapnik&marker=${mapLocation.latitude}%2C${mapLocation.longitude}`
    : "";

  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      <div className="modal location-modal" onMouseDown={(event) => event.stopPropagation()}>
        <header>
          <div><span className="section-eyebrow">LOKASI LAYANAN</span><h2>Pilih lokasi spesifik</h2><p>Dipakai untuk mencari klinik, grooming, home care, dan komunitas terdekat.</p></div>
          <button className="modal-close" type="button" onClick={onClose}><Icon name="close" /></button>
        </header>
        <button className="detect-location" type="button" onClick={useDeviceLocation} disabled={loading}>
          <span><Icon name="map" size={20} /></span><p><b>{loading ? "Mendeteksi lokasi..." : "Gunakan lokasi perangkat"}</b><small>Browser akan meminta izin lokasi satu kali</small></p><Icon name="chevron" size={17} />
        </button>
        <div className="location-search">
          <Icon name="search" size={18} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => event.key === "Enter" && runSearch()} placeholder="Cari alamat, kecamatan, atau kota" />
          <button type="button" onClick={runSearch} disabled={loading || query.trim().length < 3}>Cari</button>
        </div>
        {error && <div className="integration-error">{error}</div>}
        {results.length > 0 && <div className="location-results">{results.map((item) => <button type="button" key={item.id ?? item.label} onClick={() => onSelect(item)}><Icon name="map" size={17} /><span><b>{item.label.split(",")[0]}</b><small>{item.label}</small></span></button>)}</div>}
        {mapSrc && <div className="map-preview"><iframe title="Peta lokasi Slivadoc" src={mapSrc} loading="lazy" /><span>© OpenStreetMap contributors</span></div>}
        {current && <div className="selected-location"><Icon name="check" size={16} /><p><small>LOKASI TERPILIH</small><b>{current.label}</b></p></div>}
      </div>
    </div>
  );
}
