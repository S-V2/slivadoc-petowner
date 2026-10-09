"use client";
import { useEffect, useState } from "react";
import { LocalizedImage as Image } from "./LocalizedCopy";
import { Icon } from "./Icon";
import { usePetOwnerI18n } from "./PetOwnerI18n";
import { getPetSpots, type PetSpot } from "../lib/platform-api";
import type { LocationResult } from "../lib/petowner-api";

export function HomePetSpotRecommendations({
  location,
  onOpen,
  onLocation,
}: {
  location: LocationResult | null;
  onOpen: (id?: string) => void;
  onLocation: () => void;
}) {
  const { t } = usePetOwnerI18n();
  const [spots, setSpots] = useState<PetSpot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const latitude = location?.latitude,
    longitude = location?.longitude;
  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (active) {
        setLoading(true);
        setError(false);
      }
    });
    getPetSpots(
      latitude != null && longitude != null
        ? { latitude, longitude }
        : undefined,
    )
      .then((result) => {
        if (active)
          setSpots(
            [...result.data]
              .sort(
                (a, b) =>
                  (a.distance_km ?? Infinity) - (b.distance_km ?? Infinity),
              )
              .slice(0, 4),
          );
      })
      .catch(() => {
        if (active) setError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [latitude, longitude, attempt]);
  const categories: Record<string, string> = {
    cafe: "Kafe ramah pet",
    park: "Taman ramah pet",
    hotel: "Hotel ramah pet",
    mall: "Pusat belanja",
    restaurant: "Restoran ramah pet",
  };
  return (
    <section className="home-petspots" aria-label={t("Rekomendasi PetSpot")}>
      <header className="home-section-heading home-section-heading--action">
        <div>
          <span className="home-section-eyebrow">EXPLORE TOGETHER</span>
          <h2>
            {t(
              location
                ? "PetSpot terdekat untuk waktu bersama"
                : "PetSpot pilihan untuk waktu bersama",
            )}
          </h2>
          <p>
            {t(
              location
                ? "Temukan tempat ramah pet di sekitar lokasi pilihanmu."
                : "Pilih lokasi untuk menemukan tempat ramah pet terdekat.",
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={() => (location ? onOpen() : onLocation())}
        >
          {t(location ? "Jelajahi PetSpot" : "Pilih lokasi")}
          <Icon name="arrow" size={16} />
        </button>
      </header>
      {loading ? (
        <div className="empty-state compact" role="status">
          {t("Mencari PetSpot…")}
        </div>
      ) : error ? (
        <div className="empty-state compact">
          <p>{t("PetSpot belum dapat dimuat.")}</p>
          <button
            className="secondary-button"
            onClick={() => setAttempt((value) => value + 1)}
          >
            {t("Coba lagi")}
          </button>
        </div>
      ) : spots.length ? (
        <div className="home-petspot-grid">
          {spots.map((spot) => (
            <article className="home-petspot-card" key={spot.id}>
              <div className="home-petspot-cover">
                {spot.cover_url ? (
                  <Image
                    src={spot.cover_url}
                    alt={spot.name}
                    fill
                    sizes="(max-width:760px) 100vw, 25vw"
                    unoptimized
                  />
                ) : (
                  <Icon name="map" size={48} />
                )}{" "}
                {location &&
                  spot.distance_km != null &&
                  Number.isFinite(spot.distance_km) && (
                    <span>
                      <Icon name="map" size={13} />
                      {spot.distance_km.toFixed(1)} km
                    </span>
                  )}
              </div>
              <div className="home-petspot-body">
                <small>{t(categories[spot.category] ?? "Ramah pet")}</small>
                <h3>{spot.name}</h3>
                <p>
                  <Icon name="map" size={15} />
                  {spot.city || spot.address}
                </p>
                {spot.review_count > 0 && (
                  <p>
                    <Icon name="star" size={15} />
                    {spot.rating.toFixed(1)} · {spot.review_count} {t("ulasan")}
                  </p>
                )}
                <button onClick={() => onOpen(spot.id)}>
                  {t("Lihat tempat")}
                  <Icon name="arrow" size={16} />
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-state compact">
          <Icon name="map" size={28} />
          <p>{t("Belum ada rekomendasi PetSpot di lokasi ini.")}</p>
          <button className="secondary-button" onClick={onLocation}>
            {t("Ubah lokasi")}
          </button>
        </div>
      )}
    </section>
  );
}
