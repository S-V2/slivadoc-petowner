"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "../Icon";
import { ClinicOpenState } from "./ClinicBranchInfo";
import { LocalizedButton, LocalizedCopy, LocalizedInput } from "../LocalizedCopy";
import { usePetOwnerI18n } from "../PetOwnerI18n";
import { SlivaSelect } from "../SlivaSelect";
import GeoMap, { type GeoMarker, type GeoPoint } from "../platform/GeoMap";
import type { LocationResult } from "../../lib/petowner-api";
import {
  getDiscoveryBranch,
  getDiscoveryBranches,
  type DiscoveryBranch,
} from "../../lib/platform-api";
import { DEVICE_LOCATION_LABEL, PIN_LOCATION_LABEL } from "../../lib/device-location";
import {
  CLINIC_RADIUS_OPTIONS,
  branchPlace,
  clinicQuery,
  clinicTypeLabel,
  defaultClinicFilters,
  formatDistanceKm,
  hasClinicFilters,
  type ClinicFilters,
  type ClinicTypeFilter,
} from "../../lib/clinic-directory";

export type OpenClinicBranch = (
  branch: DiscoveryBranch,
  options?: { fromMenu?: boolean; replace?: boolean },
) => void;

type Props = {
  location: LocationResult | null;
  onOpenLocation: () => void;
  onOpenBranch: OpenClinicBranch;
};

type Page = {
  key: string;
  items: DiscoveryBranch[];
  hasMore: boolean;
  failed: boolean;
};

const typeChips: Array<{ id: ClinicTypeFilter; label: string }> = [
  { id: "all", label: "Semua" },
  { id: "clinic", label: "Klinik" },
  { id: "petshop", label: "Petshop" },
];

function ClinicCard({
  branch,
  onOpen,
  onHover,
}: {
  branch: DiscoveryBranch;
  onOpen: () => void;
  onHover?: (active: boolean) => void;
}) {
  const { t, language } = usePetOwnerI18n();
  const image = branch.banner_url || branch.logo_url;
  const distance = formatDistanceKm(branch.distance_km);
  return (
    <article
      className="clinic-card"
      data-branch-id={branch.branch_id}
      onMouseEnter={() => onHover?.(true)}
      onMouseLeave={() => onHover?.(false)}
    >
      <button
        type="button"
        className="clinic-card-main"
        aria-label={`${t("Buka")} ${branch.business_name}, ${branch.branch_name}`}
        onClick={onOpen}
      >
        <span className="clinic-card-media">
          {image ? (
            <Image src={image} alt="" fill sizes="(max-width: 860px) 100vw, 320px" unoptimized />
          ) : (
            <Icon name="clinic" size={34} />
          )}
          <span className="clinic-type-badge" data-type={branch.type}>
            {clinicTypeLabel(branch.type, language)}
          </span>
        </span>
        <span className="clinic-card-body">
          <h3>{branch.business_name}</h3>
          <small className="clinic-card-branch">{branch.branch_name}</small>
          <span className="clinic-card-place">
            <Icon name="map" size={14} />
            <span>
              {distance ? <b>{distance}</b> : null}
              {distance ? " · " : null}
              {[branch.address, branchPlace(branch)].filter(Boolean).join(", ")}
            </span>
          </span>
          <ClinicOpenState branch={branch} />
          <span className="clinic-card-rating">
            <span className="clinic-card-rating-label">
              <LocalizedCopy>{"Rating toko"}</LocalizedCopy>
              <small title={t("Rata-rata dari semua cabang")}>
                <LocalizedCopy>{"Rata-rata semua cabang"}</LocalizedCopy>
              </small>
            </span>
            {branch.rating !== null && branch.review_count > 0 ? (
              <b>
                <Icon name="star" size={13} />
                {branch.rating.toFixed(1)}
                <small>{`(${t(`${branch.review_count} ulasan`)})`}</small>
              </b>
            ) : (
              <small>
                <LocalizedCopy>{"Belum ada rating"}</LocalizedCopy>
              </small>
            )}
          </span>
          <span className="clinic-card-counts">
            {t(`${branch.service_count} layanan · ${branch.product_count} produk`)}
          </span>
        </span>
      </button>
    </article>
  );
}

function ClinicSkeleton() {
  return (
    <div className="clinic-card clinic-card--skeleton" aria-hidden="true">
      <span className="clinic-card-media" />
      <span className="clinic-card-body">
        <i style={{ width: "62%", height: 16 }} />
        <i style={{ width: "38%" }} />
        <i style={{ width: "88%" }} />
        <i style={{ width: "46%" }} />
        <i style={{ width: "70%" }} />
      </span>
    </div>
  );
}

export default function ClinicDirectory({ location, onOpenLocation, onOpenBranch }: Props) {
  const { t, language } = usePetOwnerI18n();
  const [filters, setFilters] = useState<ClinicFilters>(defaultClinicFilters);
  const [searchText, setSearchText] = useState("");
  const [tab, setTab] = useState<"list" | "map">("list");
  const [page, setPage] = useState<Page | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [moreState, setMoreState] = useState<"idle" | "loading" | "failed">("idle");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [focus, setFocus] = useState<GeoPoint | null>(null);
  const deepLinked = useRef(false);

  const latitude = location?.latitude;
  const longitude = location?.longitude;
  const coords = useMemo(
    () =>
      latitude !== undefined && longitude !== undefined ? { latitude, longitude } : null,
    [latitude, longitude],
  );
  const queryKey = JSON.stringify([filters, coords, attempt]);
  const loading = page?.key !== queryKey;
  const items = useMemo(() => (loading ? [] : (page?.items ?? [])), [loading, page]);

  useEffect(() => {
    const timer = window.setTimeout(
      () => setFilters((current) => (current.search === searchText ? current : { ...current, search: searchText })),
      350,
    );
    return () => window.clearTimeout(timer);
  }, [searchText]);

  useEffect(() => {
    let active = true;
    getDiscoveryBranches(clinicQuery(filters, coords))
      .then((result) => {
        if (!active) return;
        setMoreState("idle");
        setPage({ key: queryKey, items: result.data, hasMore: result.has_more, failed: false });
      })
      .catch(() => {
        if (!active) return;
        setMoreState("idle");
        setPage({ key: queryKey, items: [], hasMore: false, failed: true });
      });
    return () => {
      active = false;
    };
  }, [filters, coords, queryKey]);

  // ?view=clinics&branch=<id>: resolve the branch, then hand over to the store page.
  useEffect(() => {
    if (deepLinked.current) return;
    deepLinked.current = true;
    const branchId = new URLSearchParams(window.location.search).get("branch");
    if (!branchId) return;
    getDiscoveryBranch(branchId)
      .then((branch) => onOpenBranch(branch, { replace: true }))
      .catch(() => {
        const url = new URL(window.location.href);
        url.searchParams.delete("branch");
        window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
      });
  }, [onOpenBranch]);

  async function loadMore() {
    if (!page || loading || moreState === "loading") return;
    setMoreState("loading");
    try {
      const result = await getDiscoveryBranches(clinicQuery(filters, coords, page.items.length));
      setPage((current) => {
        if (!current || current.key !== page.key) return current;
        const seen = new Set(current.items.map((item) => item.branch_id));
        return {
          ...current,
          items: [...current.items, ...result.data.filter((item) => !seen.has(item.branch_id))],
          hasMore: result.has_more,
        };
      });
      setMoreState("idle");
    } catch {
      setMoreState("failed");
    }
  }

  const patch = (next: Partial<ClinicFilters>) => setFilters((current) => ({ ...current, ...next }));
  const reset = () => {
    setSearchText("");
    setFilters(defaultClinicFilters);
  };

  const selected = items.find((item) => item.branch_id === selectedId) ?? null;
  const markers = useMemo<GeoMarker[]>(
    () => [
      ...items.map((item) => ({
        id: item.branch_id,
        latitude: item.latitude,
        longitude: item.longitude,
        label: `${item.business_name} ${item.branch_name}`,
        onClick: () => {
          setSelectedId(item.branch_id);
          setFocus({ latitude: item.latitude, longitude: item.longitude });
        },
      })),
      ...(coords ? [{ id: "near-me", ...coords, label: t("Posisimu"), color: "#1d4ed8" }] : []),
    ],
    [items, coords, t],
  );

  const filtered = hasClinicFilters(filters);
  const failed = !loading && page?.failed;

  const more = page?.hasMore ? (
    <div className="clinic-more">
      {moreState === "failed" && (
        <p role="alert">
          <LocalizedCopy>{"Daftar berikutnya belum dapat dimuat."}</LocalizedCopy>
        </p>
      )}
      <LocalizedButton
        type="button"
        className="secondary-button"
        disabled={moreState === "loading"}
        onClick={() => void loadMore()}
      >
        <LocalizedCopy>{moreState === "loading" ? "Memuat…" : "Muat lagi"}</LocalizedCopy>
      </LocalizedButton>
    </div>
  ) : null;

  return (
    <section className="clinic-directory" aria-busy={loading}>
      <header className="clinic-toolbar">
        <div className="clinic-location">
          <Icon name="map" size={16} />
          <span>
            <small>
              <LocalizedCopy>{"LOKASIMU"}</LocalizedCopy>
            </small>
            <b>
              {location ? (
                [DEVICE_LOCATION_LABEL, PIN_LOCATION_LABEL].includes(location.label)
                  ? t(location.label)
                  : location.label.split(",").slice(0, 2).join(", ")
              ) : (
                <LocalizedCopy>{"Belum dipilih"}</LocalizedCopy>
              )}
            </b>
          </span>
          <LocalizedButton type="button" className="secondary-button small" onClick={onOpenLocation}>
            <LocalizedCopy>{location ? "Ganti lokasi" : "Pilih lokasi"}</LocalizedCopy>
          </LocalizedButton>
        </div>
        <div className="clinic-tabs" role="tablist" aria-label="Tampilan hasil">
          {(["list", "map"] as const).map((id) => (
            <LocalizedButton
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              className={tab === id ? "active" : ""}
              onClick={() => setTab(id)}
            >
              {id === "list" ? (language === "en" ? "List" : "Daftar") : <LocalizedCopy>{"Peta"}</LocalizedCopy>}
            </LocalizedButton>
          ))}
        </div>
      </header>

      {!coords && (
        <div className="clinic-banner" role="note">
          <Icon name="map" size={20} />
          <p>
            <b>
              <LocalizedCopy>{"Pilih lokasi untuk melihat yang terdekat"}</LocalizedCopy>
            </b>
            <small>
              <LocalizedCopy>
                {"Tanpa lokasi, daftar diurutkan berdasarkan kota dan nama."}
              </LocalizedCopy>
            </small>
          </p>
          <LocalizedButton type="button" className="primary-button small" onClick={onOpenLocation}>
            <LocalizedCopy>{"Pilih lokasi"}</LocalizedCopy>
          </LocalizedButton>
        </div>
      )}

      <div className="clinic-filters">
        <div className="clinic-chips" role="group" aria-label="Jenis tempat">
          {typeChips.map((chip) => (
            <LocalizedButton
              key={chip.id}
              type="button"
              aria-pressed={filters.type === chip.id}
              className={filters.type === chip.id ? "active" : ""}
              onClick={() => patch({ type: chip.id })}
            >
              <LocalizedCopy>{chip.label}</LocalizedCopy>
            </LocalizedButton>
          ))}
        </div>
        <label className="clinic-search">
          <Icon name="search" size={17} />
          <LocalizedInput
            type="search"
            aria-label="Cari nama klinik atau petshop"
            placeholder="Cari nama klinik atau petshop"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
          />
        </label>
        <SlivaSelect
          className="clinic-radius"
          aria-label="Radius pencarian"
          disabled={!coords}
          value={coords && filters.radiusKm ? String(filters.radiusKm) : ""}
          onChange={(event) => patch({ radiusKm: event.target.value ? Number(event.target.value) : null })}
        >
          <option value="">{coords ? t("Semua jarak") : t("Radius (pilih lokasi)")}</option>
          {CLINIC_RADIUS_OPTIONS.map((km) => (
            <option key={km} value={km}>{`${km} km`}</option>
          ))}
        </SlivaSelect>
        <LocalizedButton
          type="button"
          aria-pressed={filters.openNow}
          className={`clinic-open-toggle ${filters.openNow ? "active" : ""}`}
          onClick={() => patch({ openNow: !filters.openNow })}
        >
          <Icon name="clock" size={15} />
          <LocalizedCopy>{"Buka sekarang"}</LocalizedCopy>
        </LocalizedButton>
      </div>

      {tab === "map" && !loading && !failed && items.length > 0 ? (
        <div className="clinic-map-pane">
          <GeoMap className="clinic-map" markers={markers} activeId={activeId} focus={focus} />
          {selected ? (
            <ClinicCard branch={selected} onOpen={() => onOpenBranch(selected, { fromMenu: true })} />
          ) : (
            <p className="clinic-map-hint">
              <LocalizedCopy>{"Ketuk penanda untuk melihat tempatnya."}</LocalizedCopy>
            </p>
          )}
          {more}
        </div>
      ) : loading ? (
        <div className="clinic-grid" role="status" aria-label={t("Memuat klinik dan petshop")}>
          {Array.from({ length: 6 }, (_, index) => (
            <ClinicSkeleton key={index} />
          ))}
        </div>
      ) : failed ? (
        <div className="empty-state clinic-empty" role="alert">
          <Icon name="clinic" size={30} />
          <h3>
            <LocalizedCopy>{"Klinik dan petshop belum dapat dimuat"}</LocalizedCopy>
          </h3>
          <p>
            <LocalizedCopy>{"Periksa koneksimu, lalu coba lagi."}</LocalizedCopy>
          </p>
          <LocalizedButton type="button" className="primary-button small" onClick={() => setAttempt((n) => n + 1)}>
            <LocalizedCopy>{"Coba lagi"}</LocalizedCopy>
          </LocalizedButton>
        </div>
      ) : items.length === 0 ? (
        <div className="empty-state clinic-empty">
          <Icon name="clinic" size={30} />
          <h3>
            <LocalizedCopy>
              {filtered ? "Tidak ada yang cocok dengan filtermu" : "Belum ada klinik atau petshop"}
            </LocalizedCopy>
          </h3>
          <p>
            <LocalizedCopy>
              {filtered
                ? "Coba ubah jenis, radius, atau kata kunci pencarian."
                : "Klinik dan petshop yang sudah terverifikasi akan muncul di sini."}
            </LocalizedCopy>
          </p>
          {filtered && (
            <LocalizedButton type="button" className="secondary-button small" onClick={reset}>
              <LocalizedCopy>{"Reset filter"}</LocalizedCopy>
            </LocalizedButton>
          )}
        </div>
      ) : (
        <>
          <div className="clinic-grid">
            {items.map((branch) => (
              <ClinicCard
                key={branch.branch_id}
                branch={branch}
                onOpen={() => onOpenBranch(branch, { fromMenu: true })}
                onHover={(active) =>
                  setActiveId((current) => (active ? branch.branch_id : current === branch.branch_id ? null : current))
                }
              />
            ))}
          </div>
          {more}
        </>
      )}
    </section>
  );
}
