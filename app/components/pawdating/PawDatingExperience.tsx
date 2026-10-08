"use client";
import { petOwnerIntlLocale } from "../../lib/petowner-locale";
import { SlivaFilePicker } from "../SlivaFilePicker";
import { LocalizedCopy, LocalizedButton, LocalizedInput, LocalizedTextarea } from "../LocalizedCopy";
import { SlivaDatePicker } from "../SlivaDatePicker";

import { usePetOwnerFlow } from "../PetOwnerFlow";

import { SlivaSelect } from "../SlivaSelect";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
  type ReactNode,
} from "react";
import type { Pet } from "../../lib/petowner-domain";
import {
  createPawDatingHealthReport,
  createPawDatingMessage,
  createPawDatingProfile,
  getMyPawDatingProfiles,
  getPawDatingCompatibility,
  getPawDatingInterests,
  getPawDatingMessages,
  getPetOwnerFavorites,
  togglePetOwnerFavorite,
  getPawDatingProfile,
  getPawDatingProfiles,
  getPawDatingStandards,
  isPetOwnerAuthenticated,
  respondPawDatingInterest,
  reportPawDatingProfile,
  recordPawDatingPass,
  sendPawDatingInterest,
  submitPawDatingProfile,
  type PawDatingCompatibility,
  type PawDatingHealthReport,
  type PawDatingInterest,
  type PawDatingMessage,
  type PawDatingProfile,
  type PawDatingStandards,
} from "../../lib/platform-api";
import { uploadImage } from "../../lib/petowner-api";

type Tab = "discover" | "mine" | "requests" | "standards";
type Notify = (message: string) => void;
type UserLocation = { latitude: number; longitude: number };

const emptyStandards: PawDatingStandards = {
  principles: [],
  levels: [],
  minimum_age_months: {},
  report_validity_days: 0,
  blocked_conditions: [],
};

const levelTone = ["", "identity", "health", "genetic", "pedigree"];
const speciesEmoji = (profile: PawDatingProfile) =>
  profile.species === "cat" ? "🐈" : profile.species === "rabbit" ? "🐇" : "🐕";
const ageText = (months: number) =>
  `${Math.floor(months / 12)} th ${months % 12} bln`;
const titleCase = (value: string) =>
  value.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());

export default function PawDatingExperience({
  pet,
  notify,
}: {
  pet: Pet;
  notify: Notify;
}) {
  const { requirePet: requireLogin } = usePetOwnerFlow();
  const [tab, setTab] = useState<Tab>("discover");
  const [profiles, setProfiles] = useState<PawDatingProfile[]>([]);
  const [dismissedProfileIds, setDismissedProfileIds] = useState<string[]>([]);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [species, setSpecies] = useState("");
  const [sex, setSex] = useState("");
  const [level, setLevel] = useState("2");
  const [health, setHealth] = useState("80");
  const [city, setCity] = useState("");
  const [distance, setDistance] = useState("200");
  const [selected, setSelected] = useState<PawDatingProfile | null>(null);
  const [myProfiles, setMyProfiles] = useState<PawDatingProfile[]>([]);
  const [interests, setInterests] = useState<PawDatingInterest[]>([]);
  const [standards, setStandards] =
    useState<PawDatingStandards>(emptyStandards);
  const [sourceProfileId, setSourceProfileId] = useState("");
  const [compatibility, setCompatibility] =
    useState<PawDatingCompatibility | null>(null);
  const [interestOpen, setInterestOpen] = useState(false);
  const [message, setMessage] = useState(
    "Halo, kami tertarik berdiskusi setelah meninjau laporan kesehatan kedua pet.",
  );
  const [createOpen, setCreateOpen] = useState(false);
  const [chatInterest, setChatInterest] = useState<PawDatingInterest | null>(
    null,
  );
  const [reportProfile, setReportProfile] = useState<PawDatingProfile | null>(
    null,
  );
  const [submitting, setSubmitting] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);

  const loadProfiles = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (species) params.set("species", species);
    if (sex) params.set("sex", sex);
    if (level) params.set("min_level", level);
    if (health) params.set("min_health_score", health);
    if (city) params.set("city", city);
    if (distance) params.set("max_distance_km", distance);
    if (userLocation) {
      params.set("latitude", String(userLocation.latitude));
      params.set("longitude", String(userLocation.longitude));
    }
    try {
      const result = await getPawDatingProfiles(params.toString());
      setProfiles(result.data);
    } catch (error) {
      setProfiles([]);
      notify(
        error instanceof Error
          ? error.message
          : "Profil PAW Dating belum dapat dimuat",
      );
    } finally {
      setLoading(false);
    }
  }, [city, distance, health, level, notify, sex, species, userLocation]);

  const loadPrivateData = useCallback(async () => {
    if (!isPetOwnerAuthenticated()) return;
    try {
      const [mine, requests, favorites] = await Promise.all([
        getMyPawDatingProfiles(),
        getPawDatingInterests(),
        getPetOwnerFavorites(),
      ]);
      setFavoriteIds(
        favorites.data
          .filter((item) => item.entity_type === "pawdating")
          .map((item) => item.entity_id),
      );
      setMyProfiles(mine.data);
      setInterests(requests.data);
      const published = mine.data.find(
        (profile) => profile.status === "published",
      );
      if (!sourceProfileId && published) setSourceProfileId(published.id);
    } catch (error) {
      notify(
        error instanceof Error ? error.message : "Data akun belum dapat dimuat",
      );
    }
  }, [notify, sourceProfileId]);

  useEffect(() => {
    queueMicrotask(() => void loadProfiles());
  }, [loadProfiles]);
  useEffect(() => {
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      ({ coords }) =>
        setUserLocation({
          latitude: coords.latitude,
          longitude: coords.longitude,
        }),
      () => undefined,
      { enableHighAccuracy: false, maximumAge: 300_000, timeout: 8_000 },
    );
  }, []);
  useEffect(() => {
    getPawDatingStandards()
      .then(setStandards)
      .catch((error) =>
        notify(
          error instanceof Error
            ? error.message
            : "Standar PAW Dating belum dapat dimuat",
        ),
      );
  }, [notify]);
  useEffect(() => {
    if (tab === "mine" || tab === "requests")
      queueMicrotask(() => void loadPrivateData());
  }, [loadPrivateData, tab]);

  const visibleProfiles = useMemo(
    () =>
      profiles.filter((profile) => {
        const needle = search.toLowerCase().trim();
        return (
          !dismissedProfileIds.includes(profile.id) &&
          (!needle ||
            `${profile.name} ${profile.breed} ${profile.city}`
              .toLowerCase()
              .includes(needle)) &&
          (!species || profile.species === species) &&
          (!sex || profile.sex === sex) &&
          profile.profile_level >= Number(level || 1) &&
          profile.health_score >= Number(health || 0) &&
          (!city || profile.city.toLowerCase().includes(city.toLowerCase())) &&
          (profile.distance_km == null ||
            profile.distance_km <= Number(distance || 9999))
        );
      }),
    [
      profiles,
      search,
      species,
      sex,
      level,
      health,
      city,
      distance,
      dismissedProfileIds,
    ],
  );

  async function openProfile(profile: PawDatingProfile) {
    setSelected(profile);
    setCompatibility(null);
    try {
      const detail = await getPawDatingProfile(
        profile.id,
        userLocation ?? undefined,
      );
      setSelected(detail);
    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : "Detail profil belum dapat dimuat",
      );
    }
  }

  async function publishedSourceProfile() {
    const cached = myProfiles.find((profile) => profile.status === "published");
    if (cached) return cached;
    const mine = await getMyPawDatingProfiles();
    setMyProfiles(mine.data);
    const published = mine.data.find(
      (profile) => profile.status === "published",
    );
    if (published) setSourceProfileId(published.id);
    return published;
  }

  async function swipeProfile(
    profile: PawDatingProfile,
    decision: "like" | "pass",
  ) {
    if (submitting) return;
    if (decision === "pass") {
      setDismissedProfileIds((items) => [...items, profile.id]);
      if (!isPetOwnerAuthenticated()) return;
      try {
        const source = await publishedSourceProfile();
        if (source) await recordPawDatingPass(profile.id, source.id);
      } catch {
        // The local pass still keeps the browsing flow uninterrupted.
      }
      return;
    }
    if (!requireLogin()) return;
    setSubmitting(true);
    try {
      const source = await publishedSourceProfile();
      if (!source) {
        notify(
          "Profil pet Anda harus disetujui Marketplace sebelum bisa swipe kanan",
        );
        setTab("mine");
        return;
      }
      const result = await sendPawDatingInterest(profile.id, {
        source_profile_id: source.id,
        interest_type: "interest",
        introduction_message: message,
      });
      setDismissedProfileIds((items) => [...items, profile.id]);
      notify(`Anda menyukai ${profile.name}. ${result.message}`);
    } catch (error) {
      notify(
        error instanceof Error ? error.message : "Swipe kanan belum tersimpan",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleFavorite(profile: PawDatingProfile) {
    if (!isPetOwnerAuthenticated()) {
      window.dispatchEvent(new Event("slivadoc:login-required"));
      return;
    }
    try {
      const result = await togglePetOwnerFavorite("pawdating", profile.id);
      setFavoriteIds((current) =>
        result.favorite
          ? [...current, profile.id]
          : current.filter((id) => id !== profile.id),
      );
      notify(
        result.favorite
          ? `${profile.name} disimpan ke favorit`
          : `${profile.name} dihapus dari favorit`,
      );
    } catch (error) {
      notify(
        error instanceof Error ? error.message : "Favorit belum dapat diperbarui",
      );
    }
  }

  async function checkCompatibility() {
    if (!selected) return;
    if (!isPetOwnerAuthenticated()) {
      window.dispatchEvent(new Event("slivadoc:login-required"));
      return;
    }
    let source = sourceProfileId;
    if (!source) {
      try {
        const mine = await getMyPawDatingProfiles();
        setMyProfiles(mine.data);
        source =
          mine.data.find((profile) => profile.status === "published")?.id ?? "";
        setSourceProfileId(source);
      } catch {
        /* handled below */
      }
    }
    if (!source) {
      notify("Profil pet Anda harus disetujui Marketplace terlebih dahulu");
      setSelected(null);
      setTab("mine");
      return;
    }
    setSubmitting(true);
    try {
      const result = await getPawDatingCompatibility(selected.id, source);
      setCompatibility(result.compatibility);
    } catch (error) {
      notify(
        error instanceof Error ? error.message : "Skor belum dapat dihitung",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function sendInterest(event: FormEvent) {
    event.preventDefault();
    if (!selected) return;
    setSubmitting(true);
    let source = sourceProfileId;
    try {
      if (!source) {
        const mine = await getMyPawDatingProfiles();
        setMyProfiles(mine.data);
        source =
          mine.data.find((profile) => profile.status === "published")?.id ?? "";
        setSourceProfileId(source);
      }
      if (!source) {
        notify("Profil pet Anda harus disetujui Marketplace terlebih dahulu");
        setInterestOpen(false);
        setTab("mine");
        return;
      }
      const result = await sendPawDatingInterest(selected.id, {
        source_profile_id: source,
        interest_type: "interest",
        introduction_message: message,
      });
      setCompatibility(result.compatibility);
      setInterestOpen(false);
      notify(result.message);
    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : "Permintaan belum dapat dikirim",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function respond(
    interest: PawDatingInterest,
    action: "accept" | "decline",
  ) {
    try {
      const result = await respondPawDatingInterest(interest.id, action);
      setInterests((items) =>
        items.map((item) =>
          item.id === interest.id
            ? {
                ...item,
                status: result.status,
                match_id: result.match_id ?? item.match_id,
              }
            : item,
        ),
      );
      notify(
        action === "accept"
          ? "Match dibuat. Ruang diskusi sudah aman dibuka."
          : "Permintaan ditolak dengan aman.",
      );
      if (action === "accept" && result.match_id) {
        setChatInterest({
          ...interest,
          status: "matched",
          match_id: result.match_id,
        });
      }
    } catch (error) {
      notify(
        error instanceof Error ? error.message : "Respons belum dapat disimpan",
      );
    }
  }



  return (
    <section className="pawdating-shell">
      <div className="paw-welfare-banner">
        <span><LocalizedCopy>{"🛡️"}</LocalizedCopy></span>
        <div>
          <strong><LocalizedCopy>{"Welfare-first, bukan sekadar swipe."}</LocalizedCopy></strong>
          <p><LocalizedCopy>{"PAW Dating tidak menjamin hasil breeding. Keputusan akhir wajib mengikuti pemeriksaan dan rekomendasi dokter hewan."}</LocalizedCopy></p>
        </div>
        <LocalizedButton type="button" onClick={() => setTab("standards")}><LocalizedCopy>{"Lihat standar →"}</LocalizedCopy></LocalizedButton>
      </div>

      <nav className="paw-tabs" aria-label="Menu PAW Dating">
        <LocalizedCopy>{(
          [
            {
              id: "discover",
              label: "Jelajahi",
              count: visibleProfiles.length,
            },
            { id: "mine", label: "Profil saya" },
            {
              id: "requests",
              label: "Permintaan",
              count: interests.filter((item) => item.status === "pending")
                .length,
            },
            { id: "standards", label: "Health standards" },
          ] as Array<{ id: Tab; label: string; count?: number }>
        ).map((item) => (
          <LocalizedButton
            key={item.id}
            type="button"
            className={tab === item.id ? "active" : ""}
            onClick={() => setTab(item.id)}
          >
            <LocalizedCopy>{item.label}</LocalizedCopy>
            <LocalizedCopy>{item.count !== undefined && <small><LocalizedCopy>{item.count}</LocalizedCopy></small>}</LocalizedCopy>
          </LocalizedButton>
        ))}</LocalizedCopy>
      </nav>

      <LocalizedCopy>{tab === "discover" && (
        <>
          <div className="paw-filters">
            <label className="paw-search">
              <span><LocalizedCopy>{"⌕"}</LocalizedCopy></span>
              <LocalizedInput
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cari nama, ras, atau kota..."
              />
            </label>
            <label>
              <span><LocalizedCopy>{"Spesies"}</LocalizedCopy></span>
              <SlivaSelect aria-label="Spesies"
                value={species}
                onChange={(event) => setSpecies(event.target.value)}
              >
                <option value="">Semua</option>
                <option value="dog">Anjing</option>
                <option value="cat">Kucing</option>
                <option value="rabbit">Kelinci</option>
              </SlivaSelect>
            </label>
            <label>
              <span><LocalizedCopy>{"Gender"}</LocalizedCopy></span>
              <SlivaSelect aria-label="Gender"
                value={sex}
                onChange={(event) => setSex(event.target.value)}
              >
                <option value="">Semua</option>
                <option value="male">Jantan</option>
                <option value="female">Betina</option>
              </SlivaSelect>
            </label>
            <label>
              <span><LocalizedCopy>{"Minimum level"}</LocalizedCopy></span>
              <SlivaSelect aria-label="Minimum level"
                value={level}
                onChange={(event) => setLevel(event.target.value)}
              >
                <option value="1">Level 1</option>
                <option value="2">Level 2</option>
                <option value="3">Level 3</option>
                <option value="4">Level 4</option>
              </SlivaSelect>
            </label>
            <label>
              <span><LocalizedCopy>{"Health score"}</LocalizedCopy></span>
              <SlivaSelect aria-label="Health score"
                value={health}
                onChange={(event) => setHealth(event.target.value)}
              >
                <option value="0">Semua</option>
                <option value="80">80+</option>
                <option value="90">90+</option>
                <option value="95">95+</option>
              </SlivaSelect>
            </label>
            <label>
              <span><LocalizedCopy>{"Jarak"}</LocalizedCopy></span>
              <SlivaSelect aria-label="Jarak"
                value={distance}
                onChange={(event) => setDistance(event.target.value)}
              >
                <option value="25">≤ 25 km</option>
                <option value="100">≤ 100 km</option>
                <option value="200">≤ 200 km</option>
                <option value="9999">Semua</option>
              </SlivaSelect>
            </label>
          </div>
          <div className="paw-result-head">
            <div>
              <h3><LocalizedCopy>{"Pet terverifikasi untuk "}</LocalizedCopy><LocalizedCopy preserve>{pet.name}</LocalizedCopy></h3>
              <p>
                <LocalizedCopy>{visibleProfiles.length}</LocalizedCopy><LocalizedCopy>{" profil sesuai filter dan standar minimum Anda."}</LocalizedCopy></p>
            </div>
            <label><LocalizedCopy>{"Kota"}</LocalizedCopy><LocalizedCopy>{" "}</LocalizedCopy>
              <LocalizedInput
                value={city}
                onChange={(event) => setCity(event.target.value)}
                placeholder="Jakarta Selatan"
              />
            </label>
          </div>
          {loading ? (
            <div className="paw-loading">
              <i />
              <i />
              <i />
            </div>
          ) : visibleProfiles.length === 0 ? (
            <Empty
              title="Belum ada profil yang sesuai"
              text="Coba longgarkan level, health score, jarak, atau kota."
              action="Reset filter"
              onAction={() => {
                setSpecies("");
                setSex("");
                setLevel("1");
                setHealth("0");
                setCity("");
                setDistance("9999");
              }}
            />
          ) : (
            <PawDatingSwipeDeck
              profiles={visibleProfiles}
              busy={submitting}
              favorites={favoriteIds}
              onFavorite={(profile) => void toggleFavorite(profile)}
              onOpen={(profile) => void openProfile(profile)}
              onSwipe={(profile, decision) =>
                void swipeProfile(profile, decision)
              }
            />
          )}
        </>
      )}</LocalizedCopy>

      <LocalizedCopy>{tab === "mine" && (
        <PrivateGate
          title="Kelola profil PAW Dating"
          text="Login diperlukan untuk membuat profil, mengunggah health report, dan mengatur visibilitas."
          requireLogin={requireLogin}
        >
          <div className="paw-section-head">
            <div>
              <h3><LocalizedCopy>{"Profil pet saya"}</LocalizedCopy></h3>
              <p><LocalizedCopy>{"Setiap pet melewati verifikasi bertahap sebelum tampil ke publik."}</LocalizedCopy></p>
            </div>
            <LocalizedButton
              className="paw-primary"
              type="button"
              onClick={() => setCreateOpen(true)}
            ><LocalizedCopy>{"+ Buat profil"}</LocalizedCopy></LocalizedButton>
          </div>
          {myProfiles.length === 0 ? (
            <Empty
              title="Belum ada profil PAW Dating"
              text="Buat profil, lengkapi screening kesehatan, lalu kirim untuk review dokter."
              action="Mulai verifikasi"
              onAction={() => setCreateOpen(true)}
            />
          ) : (
            <div className="paw-my-grid">
              <LocalizedCopy>{myProfiles.map((profile) => (
                <article key={profile.id} className="paw-my-card">
                  <div className={`paw-avatar ${profile.species}`}>
                    <LocalizedCopy>{speciesEmoji(profile)}</LocalizedCopy>
                  </div>
                  <div>
                    <span
                      className={`paw-level ${levelTone[profile.profile_level]}`}
                    ><LocalizedCopy>{"L"}</LocalizedCopy><LocalizedCopy>{profile.profile_level}</LocalizedCopy><LocalizedCopy>{" ·"}</LocalizedCopy><LocalizedCopy>{" "}</LocalizedCopy>
                      <LocalizedCopy>{profile.level_name?.split("·")[1]}</LocalizedCopy>
                    </span>
                    <h4><LocalizedCopy>{profile.name}</LocalizedCopy></h4>
                    <p>
                      <LocalizedCopy>{profile.breed}</LocalizedCopy><LocalizedCopy>{" · "}</LocalizedCopy><LocalizedCopy>{profile.city}</LocalizedCopy>
                    </p>
                    <div className="paw-progress">
                      <i style={{ width: `${profile.health_score}%` }} />
                    </div>
                    <small><LocalizedCopy>{"Health score "}</LocalizedCopy><LocalizedCopy>{profile.health_score}</LocalizedCopy><LocalizedCopy>{"/100 · Status"}</LocalizedCopy><LocalizedCopy>{" "}</LocalizedCopy>
                      <LocalizedCopy>{titleCase(profile.status ?? "draft")}</LocalizedCopy>
                    </small>
                    <LocalizedCopy>{profile.status === "review" && (
                      <small className="paw-queue-note"><LocalizedCopy>{"Menunggu approval Marketplace · belum tampil publik"}</LocalizedCopy></small>
                    )}</LocalizedCopy>
                    <LocalizedCopy>{profile.rejection_reason && (
                      <small className="paw-rejection-note"><LocalizedCopy>{"Catatan: "}</LocalizedCopy><LocalizedCopy>{profile.rejection_reason}</LocalizedCopy>
                      </small>
                    )}</LocalizedCopy>
                  </div>
                  <LocalizedButton
                    type="button"
                    onClick={() => {
                      if (profile.status === "published")
                        void openProfile(profile);
                      else
                        notify(
                          profile.rejection_reason ||
                            "Profil belum dapat dibuka publik karena masih menunggu approval Marketplace",
                        );
                    }}
                  >
                    <LocalizedCopy>{profile.status === "published"
                      ? "Buka profil →"
                      : "Lihat status"}</LocalizedCopy>
                  </LocalizedButton>
                </article>
              ))}</LocalizedCopy>
            </div>
          )}
        </PrivateGate>
      )}</LocalizedCopy>

      <LocalizedCopy>{tab === "requests" && (
        <PrivateGate
          title="Permintaan dan match"
          text="Identitas dan ruang percakapan hanya terbuka setelah kedua pet parent menyetujui."
          requireLogin={requireLogin}
        >
          <div className="paw-section-head">
            <div>
              <h3><LocalizedCopy>{"Permintaan pasangan"}</LocalizedCopy></h3>
              <p><LocalizedCopy>{"Tinjau profil dan laporan kesehatan sebelum menerima."}</LocalizedCopy></p>
            </div>
            <span className="paw-safe-chip"><LocalizedCopy>{"🔒 Kontak tetap privat"}</LocalizedCopy></span>
          </div>
          {interests.length === 0 ? (
            <Empty
              title="Belum ada permintaan"
              text="Ketertarikan yang Anda kirim atau terima akan muncul di sini."
              action="Mulai jelajahi"
              onAction={() => setTab("discover")}
            />
          ) : (
            <div className="paw-request-list">
              <LocalizedCopy>{interests.map((interest) => (
                <article key={interest.id}>
                  <div className="paw-request-icon"><LocalizedCopy>{"♡"}</LocalizedCopy></div>
                  <div>
                    <span>
                      <LocalizedCopy>{interest.direction === "incoming"
                        ? "Permintaan masuk"
                        : "Terkirim"}</LocalizedCopy>
                    </span>
                    <h4>
                      <LocalizedCopy>{interest.source_name}</LocalizedCopy><LocalizedCopy>{" × "}</LocalizedCopy><LocalizedCopy>{interest.target_name}</LocalizedCopy>
                    </h4>
                    <p>
                      <LocalizedCopy>{interest.introduction_message ||
                        "Ingin mendiskusikan kecocokan pet."}</LocalizedCopy>
                    </p>
                    <small>
                      <LocalizedCopy>{titleCase(interest.interest_type)}</LocalizedCopy><LocalizedCopy>{" ·"}</LocalizedCopy><LocalizedCopy>{" "}</LocalizedCopy>
                      <LocalizedCopy>{new Date(interest.created_at).toLocaleDateString(
                        petOwnerIntlLocale(),
                        { day: "numeric", month: "short", year: "numeric" },
                      )}</LocalizedCopy>
                    </small>
                  </div>
                  <div className="paw-request-status">
                    <b className={interest.status}>
                      <LocalizedCopy>{titleCase(interest.status)}</LocalizedCopy>
                    </b>
                    <LocalizedCopy>{interest.direction === "incoming" &&
                      interest.status === "pending" && (
                        <>
                          <LocalizedButton
                            type="button"
                            onClick={() => void respond(interest, "accept")}
                          ><LocalizedCopy>{"Terima"}</LocalizedCopy></LocalizedButton>
                          <LocalizedButton
                            className="muted"
                            type="button"
                            onClick={() => void respond(interest, "decline")}
                          ><LocalizedCopy>{"Tolak"}</LocalizedCopy></LocalizedButton>
                        </>
                      )}</LocalizedCopy>
                    <LocalizedCopy>{interest.status === "matched" && interest.match_id && (
                      <LocalizedButton
                        type="button"
                        onClick={() => setChatInterest(interest)}
                      ><LocalizedCopy>{"Buka chat"}</LocalizedCopy></LocalizedButton>
                    )}</LocalizedCopy>
                  </div>
                </article>
              ))}</LocalizedCopy>
            </div>
          )}
        </PrivateGate>
      )}</LocalizedCopy>

      <LocalizedCopy>{tab === "standards" && (
        <StandardsView standards={standards} notify={notify} />
      )}</LocalizedCopy>

      <LocalizedCopy>{selected && (
        <ProfileDetail
          profile={selected}
          health={selected.health_report}
          compatibility={compatibility}
          sourceProfiles={myProfiles.filter(
            (profile) => profile.status === "published",
          )}
          sourceProfileId={sourceProfileId}
          setSourceProfileId={setSourceProfileId}
          onClose={() => {
            setSelected(null);
            setCompatibility(null);
          }}
          onCheck={() => void checkCompatibility()}
          onInterest={() => {
            if (requireLogin()) {
              if (!compatibility) {
                void checkCompatibility();
              }
              setInterestOpen(true);
            }
          }}
          onReport={() => setReportProfile(selected)}
          favorite={favoriteIds.includes(selected.id)}
          onFavorite={() => void toggleFavorite(selected)}
          submitting={submitting}
        />
      )}</LocalizedCopy>
      <LocalizedCopy>{interestOpen && selected && (
        <div
          className="paw-modal-backdrop"
          onMouseDown={() => setInterestOpen(false)}
        >
          <form
            className="paw-small-modal"
            onSubmit={sendInterest}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <LocalizedButton
              className="paw-modal-close"
              type="button"
              onClick={() => setInterestOpen(false)}
            ><LocalizedCopy>{"×"}</LocalizedCopy></LocalizedButton>
            <span className="paw-modal-mark"><LocalizedCopy>{"♡"}</LocalizedCopy></span>
            <h3><LocalizedCopy>{"Kirim ketertarikan ke "}</LocalizedCopy><LocalizedCopy>{selected.name}</LocalizedCopy></h3>
            <p><LocalizedCopy>{"Pesan akan diteruskan ke pet parent. Nomor telepon tetap tersembunyi hingga keduanya setuju."}</LocalizedCopy></p>
            <label><LocalizedCopy>{"Pesan perkenalan"}</LocalizedCopy><LocalizedTextarea
                value={message}
                minLength={20}
                maxLength={1000}
                onChange={(event) => setMessage(event.target.value)}
                required
              />
            </label>
            <div className="paw-modal-actions">
              <LocalizedButton
                className="paw-secondary"
                type="button"
                onClick={() => setInterestOpen(false)}
              ><LocalizedCopy>{"Batal"}</LocalizedCopy></LocalizedButton>
              <LocalizedButton
                className="paw-primary"
                type="submit"
                disabled={submitting}
              >
                <LocalizedCopy>{submitting ? "Mengirim..." : "Kirim dengan aman"}</LocalizedCopy>
              </LocalizedButton>
            </div>
          </form>
        </div>
      )}</LocalizedCopy>
      <LocalizedCopy>{createOpen && (
        <CreateProfileModal
          pet={pet}
          onClose={() => setCreateOpen(false)}
          onCreated={() => {
            setCreateOpen(false);
            void loadPrivateData();
            setTab("mine");
          }}
          notify={notify}
        />
      )}</LocalizedCopy>
      <LocalizedCopy>{chatInterest?.match_id && (
        <PawChatModal
          interest={chatInterest}
          close={() => setChatInterest(null)}
          notify={notify}
        />
      )}</LocalizedCopy>
      <LocalizedCopy>{reportProfile && (
        <PawReportModal
          profile={reportProfile}
          close={() => setReportProfile(null)}
          notify={notify}
        />
      )}</LocalizedCopy>
    </section>
  );
}

function ProfileCard({
  profile,
  favorite,
  onFavorite,
  onOpen,
}: {
  profile: PawDatingProfile;
  favorite: boolean;
  onFavorite: () => void;
  onOpen: () => void;
}) {
  return (
    <article
      className="paw-profile-card"
      onClick={onOpen}
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "Enter") onOpen();
      }}
    >
      <div className={`paw-profile-art ${profile.species}`}>
        <span><LocalizedCopy>{speciesEmoji(profile)}</LocalizedCopy></span>
        <div className={`paw-level ${levelTone[profile.profile_level]}`}><LocalizedCopy>{"✦ Level "}</LocalizedCopy><LocalizedCopy>{profile.profile_level}</LocalizedCopy>
        </div>
        <LocalizedButton
          type="button"
          aria-label={`${favorite ? "Hapus" : "Simpan"} ${profile.name}`}
          aria-pressed={favorite}
          onClick={(event) => {
            event.stopPropagation();
            onFavorite();
          }}
        >
          <LocalizedCopy>{favorite ? "♥" : "♡"}</LocalizedCopy>
        </LocalizedButton>
      </div>
      <div className="paw-profile-body">
        <div className="paw-profile-name">
          <div>
            <h4><LocalizedCopy>{profile.name}</LocalizedCopy></h4>
            <p>
              <LocalizedCopy>{profile.breed}</LocalizedCopy><LocalizedCopy>{" · "}</LocalizedCopy><LocalizedCopy>{profile.sex === "female" ? "Betina" : "Jantan"}</LocalizedCopy>
            </p>
          </div>
          <HealthScore value={profile.health_score} />
        </div>
        <div className="paw-profile-meta">
          <span><LocalizedCopy>{"◷ "}</LocalizedCopy><LocalizedCopy>{ageText(profile.age_months)}</LocalizedCopy></span>
          <span><LocalizedCopy>{"⌖"}</LocalizedCopy><LocalizedCopy>{" "}</LocalizedCopy>
            <LocalizedCopy>{typeof profile.distance_km === "number" &&
            Number.isFinite(profile.distance_km)
              ? `${profile.distance_km.toFixed(1)} km`
              : profile.city}</LocalizedCopy>
          </span>
          <span><LocalizedCopy>{"♙ "}</LocalizedCopy><LocalizedCopy>{titleCase(profile.pedigree_status)}</LocalizedCopy></span>
        </div>
        <div className="paw-tags">
          <LocalizedCopy>{profile.temperament.slice(0, 3).map((tag) => (
            <span key={tag}><LocalizedCopy>{titleCase(tag)}</LocalizedCopy></span>
          ))}</LocalizedCopy>
        </div>
        <div className="paw-clearance">
          <i><LocalizedCopy>{"✓"}</LocalizedCopy></i>
          <div>
            <b>
              <LocalizedCopy>{profile.eligibility_status === "eligible"
                ? "Layak berdasarkan report"
                : "Layak bersyarat"}</LocalizedCopy>
            </b>
            <small><LocalizedCopy>{"Valid s.d."}</LocalizedCopy><LocalizedCopy>{" "}</LocalizedCopy>
              <LocalizedCopy>{new Date(profile.health_valid_until).toLocaleDateString(
                petOwnerIntlLocale(),
                { day: "numeric", month: "short", year: "numeric" },
              )}</LocalizedCopy>
            </small>
          </div>
          <strong>
            <LocalizedCopy>{profile.risk_level === "low" ? "Low risk" : "Review"}</LocalizedCopy>
          </strong>
        </div>
      </div>
    </article>
  );
}

function PawDatingSwipeDeck({
  profiles,
  busy,
  favorites,
  onFavorite,
  onOpen,
  onSwipe,
}: {
  profiles: PawDatingProfile[];
  busy: boolean;
  favorites: string[];
  onFavorite: (profile: PawDatingProfile) => void;
  onOpen: (profile: PawDatingProfile) => void;
  onSwipe: (profile: PawDatingProfile, decision: "like" | "pass") => void;
}) {
  const active = profiles[0];
  const next = profiles[1];
  const startX = useRef(0);
  const skipClick = useRef(false);
  const [dragging, setDragging] = useState(false);
  const [offset, setOffset] = useState(0);

  function finishSwipe() {
    setDragging(false);
    if (Math.abs(offset) >= 85) {
      skipClick.current = true;
      onSwipe(active, offset > 0 ? "like" : "pass");
      window.setTimeout(() => {
        skipClick.current = false;
      }, 0);
    }
    setOffset(0);
  }

  return (
    <div className="paw-swipe-experience">
      <div className="paw-swipe-guide" aria-label="Petunjuk swipe">
        <span><LocalizedCopy>{"← Geser kiri untuk lewati"}</LocalizedCopy></span>
        <b><LocalizedCopy>{profiles.length}</LocalizedCopy><LocalizedCopy>{" pet tersisa"}</LocalizedCopy></b>
        <span><LocalizedCopy>{"Geser kanan untuk suka →"}</LocalizedCopy></span>
      </div>
      <div className="paw-swipe-stage">
        <LocalizedCopy>{next && (
          <div
            className="paw-swipe-card paw-swipe-card-next"
            aria-hidden="true"
          >
            <ProfileCard
              profile={next}
              favorite={favorites.includes(next.id)}
              onFavorite={() => onFavorite(next)}
              onOpen={() => undefined}
            />
          </div>
        )}</LocalizedCopy>
        <div
          className={`paw-swipe-card paw-swipe-card-active ${dragging ? "dragging" : ""} ${offset > 12 ? "swiping-right" : offset < -12 ? "swiping-left" : ""}`}
          style={
            {
              transform: `translateX(${offset}px) rotate(${offset / 18}deg)`,
              "--swipe-strength": Math.min(1, Math.abs(offset) / 100),
            } as CSSProperties
          }
          onPointerDown={(event) => {
            if (busy) return;
            startX.current = event.clientX;
            setDragging(true);
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerMove={(event) => {
            if (dragging) setOffset(event.clientX - startX.current);
          }}
          onPointerUp={finishSwipe}
          onPointerCancel={() => {
            setDragging(false);
            setOffset(0);
          }}
        >
          <span className="paw-swipe-stamp paw-swipe-like"><LocalizedCopy>{"SUKA"}</LocalizedCopy></span>
          <span className="paw-swipe-stamp paw-swipe-pass"><LocalizedCopy>{"LEWATI"}</LocalizedCopy></span>
          <ProfileCard
            profile={active}
            favorite={favorites.includes(active.id)}
            onFavorite={() => onFavorite(active)}
            onOpen={() => {
              if (!skipClick.current) onOpen(active);
            }}
          />
          <LocalizedButton
            className="paw-swipe-detail"
            type="button"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={() => onOpen(active)}
          ><LocalizedCopy>{"Lihat detail pet & owner"}</LocalizedCopy></LocalizedButton>
        </div>
      </div>
      <div className="paw-swipe-actions">
        <LocalizedButton
          className="pass"
          type="button"
          disabled={busy}
          aria-label={`Lewati ${active.name}`}
          onClick={() => onSwipe(active, "pass")}
        ><LocalizedCopy>{"×"}</LocalizedCopy></LocalizedButton>
        <LocalizedButton
          className="detail"
          type="button"
          disabled={busy}
          onClick={() => onOpen(active)}
        ><LocalizedCopy>{"Detail"}</LocalizedCopy></LocalizedButton>
        <LocalizedButton
          className="like"
          type="button"
          disabled={busy}
          aria-label={`Suka ${active.name}`}
          onClick={() => onSwipe(active, "like")}
        ><LocalizedCopy>{"♡"}</LocalizedCopy></LocalizedButton>
      </div>
    </div>
  );
}

function HealthScore({
  value,
  large = false,
}: {
  value: number;
  large?: boolean;
}) {
  const score = Number.isFinite(value)
    ? Math.max(0, Math.min(100, Math.round(value)))
    : 0;
  const label =
    score >= 85
      ? "Sangat baik"
      : score >= 70
        ? "Baik"
        : score >= 55
          ? "Perlu pantau"
          : "Perlu review";
  return (
    <div
      className={`paw-health-score ${large ? "large" : ""}`}
      style={{ "--health-score": `${score * 3.6}deg` } as CSSProperties}
      aria-label={`Health score ${score} dari 100, ${label}`}
    >
      <div>
        <strong><LocalizedCopy>{score}</LocalizedCopy></strong>
        <small><LocalizedCopy>{"/100"}</LocalizedCopy></small>
      </div>
      <span><LocalizedCopy>{label}</LocalizedCopy></span>
    </div>
  );
}

function ProfileDetail({
  profile,
  health,
  compatibility,
  sourceProfiles,
  sourceProfileId,
  setSourceProfileId,
  onClose,
  onCheck,
  onInterest,
  onReport,
  favorite,
  onFavorite,
  submitting,
}: {
  profile: PawDatingProfile;
  health?: PawDatingHealthReport;
  compatibility: PawDatingCompatibility | null;
  sourceProfiles: PawDatingProfile[];
  sourceProfileId: string;
  setSourceProfileId: (value: string) => void;
  onClose: () => void;
  onCheck: () => void;
  onInterest: () => void;
  onReport: () => void;
  favorite: boolean;
  onFavorite: () => void;
  submitting: boolean;
}) {
  const sections = health
    ? ([
        ["Pemeriksaan fisik", health.physical_exam],
        ["Vaksinasi", health.vaccination_checks],
        ["Parasit", health.parasite_checks],
        ["Penyakit menular", health.infectious_disease_tests],
        ["Reproduksi", health.reproductive_tests],
        ["Ortopedi", health.orthopedic_checks],
        ["Jantung", health.cardiac_checks],
        ["Mata", health.ophthalmic_checks],
      ] as Array<[string, Record<string, string> | undefined]>)
    : [];
  return (
    <div className="paw-drawer-backdrop" onMouseDown={onClose}>
      <aside
        className="paw-detail"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <LocalizedButton className="paw-modal-close" type="button" onClick={onClose}><LocalizedCopy>{"×"}</LocalizedCopy></LocalizedButton>
        <div className={`paw-detail-cover ${profile.species}`}>
          <span><LocalizedCopy>{speciesEmoji(profile)}</LocalizedCopy></span>
          <div className={`paw-level ${levelTone[profile.profile_level]}`}><LocalizedCopy>{"✦ Level "}</LocalizedCopy><LocalizedCopy>{profile.profile_level}</LocalizedCopy><LocalizedCopy>{" verified"}</LocalizedCopy></div>
        </div>
        <div className="paw-detail-head">
          <div>
            <h3>
              <LocalizedCopy>{profile.name}<LocalizedCopy></LocalizedCopy>{" "}</LocalizedCopy>
              <small><LocalizedCopy>{profile.sex === "female" ? "♀" : "♂"}</LocalizedCopy></small>
            </h3>
            <p>
              <LocalizedCopy>{profile.breed}</LocalizedCopy><LocalizedCopy>{" · "}</LocalizedCopy><LocalizedCopy>{ageText(profile.age_months)}</LocalizedCopy><LocalizedCopy>{" · "}</LocalizedCopy><LocalizedCopy>{profile.city}</LocalizedCopy>
            </p>
          </div>
          <HealthScore value={profile.health_score} large />
        </div>
        <p className="paw-detail-desc"><LocalizedCopy>{profile.description}</LocalizedCopy></p>
        <section className="paw-owner-detail">
          <div className="paw-owner-avatar">
            <LocalizedCopy>{(profile.owner?.name || profile.owner_display || "P")
              .slice(0, 1)
              .toUpperCase()}</LocalizedCopy>
          </div>
          <div>
            <span><LocalizedCopy>{"PET OWNER"}</LocalizedCopy></span>
            <strong>
              <LocalizedCopy>{profile.owner?.name || profile.owner_display || "Pet Owner"}</LocalizedCopy>
              <LocalizedCopy>{profile.owner?.verified ? " ✓" : ""}</LocalizedCopy>
            </strong>
            <small>
              <LocalizedCopy>{profile.owner?.member_since
                ? `Member sejak ${new Date(profile.owner.member_since).toLocaleDateString(petOwnerIntlLocale(), { month: "long", year: "numeric" })}`
                : "Identitas owner dilindungi Slivadoc"}</LocalizedCopy>
            </small>
          </div>
          <div className="paw-owner-distance">
            <span><LocalizedCopy>{"JARAK DARI ANDA"}</LocalizedCopy></span>
            <strong>
              <LocalizedCopy>{typeof profile.distance_km === "number" &&
              Number.isFinite(profile.distance_km)
                ? `${profile.distance_km.toFixed(1)} km`
                : profile.city}</LocalizedCopy>
            </strong>
          </div>
        </section>
        <div className="paw-tags">
          <LocalizedCopy>{[...profile.temperament, ...profile.traits]
            .slice(0, 5)
            .map((item) => (
              <span key={item}><LocalizedCopy>{titleCase(item)}</LocalizedCopy></span>
            ))}</LocalizedCopy>
        </div>
        <LocalizedCopy>{health ? (
          <section className="paw-report">
            <div className="paw-report-head">
              <div>
                <span><LocalizedCopy>{"🩺"}</LocalizedCopy></span>
                <div>
                  <h4><LocalizedCopy>{"Verified health report"}</LocalizedCopy></h4>
                  <p>
                    <LocalizedCopy>{health.clinic_name}</LocalizedCopy><LocalizedCopy>{" · "}</LocalizedCopy><LocalizedCopy>{health.veterinarian_name}</LocalizedCopy>
                  </p>
                </div>
              </div>
              <b><LocalizedCopy>{"✓ VERIFIED"}</LocalizedCopy></b>
            </div>
            <div className="paw-report-summary">
              <div>
                <span><LocalizedCopy>{"Status breeding"}</LocalizedCopy></span>
                <strong><LocalizedCopy>{titleCase(health.eligibility_status)}</LocalizedCopy></strong>
              </div>
              <div>
                <span><LocalizedCopy>{"Risk level"}</LocalizedCopy></span>
                <strong><LocalizedCopy>{titleCase(health.risk_level)}</LocalizedCopy></strong>
              </div>
              <div>
                <span><LocalizedCopy>{"Valid sampai"}</LocalizedCopy></span>
                <strong>
                  <LocalizedCopy>{new Date(health.valid_until).toLocaleDateString(petOwnerIntlLocale(), {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}</LocalizedCopy>
                </strong>
              </div>
            </div>
            <div className="paw-report-grid">
              <LocalizedCopy>{sections.map(([title, data]) => (
                <details key={title}>
                  <summary>
                    <span><LocalizedCopy>{"✓ "}</LocalizedCopy><LocalizedCopy>{title}</LocalizedCopy></span>
                    <b><LocalizedCopy>{"Clear"}</LocalizedCopy></b>
                  </summary>
                  <div>
                    <LocalizedCopy>{Object.entries(data ?? { status: "Terdokumentasi" }).map(
                      ([key, value]) => (
                        <p key={key}>
                          <span><LocalizedCopy>{titleCase(key)}</LocalizedCopy></span>
                          <strong><LocalizedCopy>{titleCase(String(value))}</LocalizedCopy></strong>
                        </p>
                      ),
                    )}</LocalizedCopy>
                  </div>
                </details>
              ))}</LocalizedCopy>
            </div>
            <details className="paw-genetic">
              <summary>
                <span><LocalizedCopy>{"🧬 Panel genetik spesifik ras"}</LocalizedCopy></span>
                <b><LocalizedCopy>{health.genetic_tests?.length ?? 0}</LocalizedCopy><LocalizedCopy>{" hasil"}</LocalizedCopy></b>
              </summary>
              <div>
                <LocalizedCopy>{(health.genetic_tests ?? []).map((test) => (
                  <p key={test.test}>
                    <span><LocalizedCopy>{test.test}</LocalizedCopy></span>
                    <strong><LocalizedCopy>{"✓ "}</LocalizedCopy><LocalizedCopy>{test.result}</LocalizedCopy></strong>
                  </p>
                ))}</LocalizedCopy>
              </div>
            </details>
            <div className="paw-vet-note">
              <strong><LocalizedCopy>{"Catatan dokter"}</LocalizedCopy></strong>
              <p>
                <LocalizedCopy>{health.findings}</LocalizedCopy> <LocalizedCopy>{health.recommendations}</LocalizedCopy>
              </p>
              <small><LocalizedCopy>{"STRV "}</LocalizedCopy><LocalizedCopy>{health.veterinarian_license}</LocalizedCopy><LocalizedCopy>{" · Ditandatangani secara digital"}</LocalizedCopy></small>
            </div>
          </section>
        ) : (
          <section className="paw-report">
            <div className="paw-report-head">
              <div>
                <span><LocalizedCopy>{"🩺"}</LocalizedCopy></span>
                <div>
                  <h4><LocalizedCopy>{"Laporan kesehatan belum tersedia"}</LocalizedCopy></h4>
                  <p><LocalizedCopy>{"Profil ini belum memiliki laporan dokter yang dapat ditampilkan."}</LocalizedCopy></p>
                </div>
              </div>
              <b><LocalizedCopy>{"PERLU REVIEW"}</LocalizedCopy></b>
            </div>
          </section>
        )}</LocalizedCopy>
        <LocalizedCopy>{compatibility && (
          <section className={`paw-compatibility ${compatibility.grade}`}>
            <div className="paw-compat-head">
              <div
                className="paw-compat-ring"
                style={
                  {
                    "--score": `${compatibility.score * 3.6}deg`,
                  } as CSSProperties
                }
              >
                <strong><LocalizedCopy>{compatibility.score}</LocalizedCopy></strong>
                <span><LocalizedCopy>{"/100"}</LocalizedCopy></span>
              </div>
              <div>
                <span><LocalizedCopy>{"Compatibility report"}</LocalizedCopy></span>
                <h4><LocalizedCopy>{titleCase(compatibility.grade)}</LocalizedCopy></h4>
                <p><LocalizedCopy>{"Skor membantu screening awal, bukan pengganti dokter."}</LocalizedCopy></p>
              </div>
            </div>
            <div className="paw-breakdown">
              <LocalizedCopy>{Object.entries(compatibility.breakdown).map(([key, value]) => (
                <div key={key}>
                  <span><LocalizedCopy>{titleCase(key)}</LocalizedCopy></span>
                  <i>
                    <b style={{ width: `${Math.min(100, value * 5)}%` }} />
                  </i>
                  <strong><LocalizedCopy>{value}</LocalizedCopy></strong>
                </div>
              ))}</LocalizedCopy>
            </div>
            <LocalizedCopy>{compatibility.risk_flags.length > 0 && (
              <div className="paw-risk-flags">
                <LocalizedCopy>{compatibility.risk_flags.map((flag) => (
                  <span key={flag}><LocalizedCopy>{"! "}</LocalizedCopy><LocalizedCopy>{flag}</LocalizedCopy></span>
                ))}</LocalizedCopy>
              </div>
            )}</LocalizedCopy>
          </section>
        )}</LocalizedCopy>
        <div className="paw-detail-actions">
          <LocalizedCopy>{sourceProfiles.length > 0 && (
            <label><LocalizedCopy>{"Bandingkan dengan"}</LocalizedCopy><SlivaSelect aria-label="Bandingkan dengan"
                value={sourceProfileId}
                onChange={(event) => setSourceProfileId(event.target.value)}
              >
                {sourceProfiles.map((source) => (
                  <option key={source.id} value={source.id}>
                    {source.name} · L{source.profile_level}
                  </option>
                ))}
              </SlivaSelect>
            </label>
          )}</LocalizedCopy>
          <LocalizedButton
            className="paw-secondary"
            type="button"
            disabled={submitting}
            onClick={onCheck}
          >
            <LocalizedCopy>{submitting ? "Menghitung..." : "Hitung kecocokan"}</LocalizedCopy>
          </LocalizedButton>
          <LocalizedButton className="paw-primary" type="button" onClick={onInterest}><LocalizedCopy>{"♡ Kirim ketertarikan"}</LocalizedCopy></LocalizedButton>
        </div>
        <div className="paw-safety-actions">
          <LocalizedButton
            type="button"
            onClick={onFavorite}
            aria-pressed={favorite}
          >
            <LocalizedCopy>{favorite ? "♥ Tersimpan" : "♡ Simpan"}</LocalizedCopy>
          </LocalizedButton>
          <LocalizedButton type="button" onClick={onReport}><LocalizedCopy>{"⚑ Laporkan profil"}</LocalizedCopy></LocalizedButton>
        </div>
      </aside>
    </div>
  );
}

function PawChatModal({
  interest,
  close,
  notify,
}: {
  interest: PawDatingInterest;
  close: () => void;
  notify: Notify;
}) {
  const [messages, setMessages] = useState<PawDatingMessage[]>([]);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(true);
  const load = useCallback(async () => {
    if (!interest.match_id) return;
    try {
      const result = await getPawDatingMessages(interest.match_id);
      setMessages(result.data);
    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : "Percakapan belum dapat dimuat",
      );
    } finally {
      setBusy(false);
    }
  }, [interest.match_id, notify]);
  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);
  async function send(event: FormEvent) {
    event.preventDefault();
    if (!interest.match_id || !body.trim()) return;
    setBusy(true);
    try {
      await createPawDatingMessage(interest.match_id, body.trim());
      setBody("");
      await load();
    } catch (error) {
      notify(
        error instanceof Error ? error.message : "Pesan belum dapat dikirim",
      );
      setBusy(false);
    }
  }
  return (
    <div className="paw-modal-backdrop" onMouseDown={close}>
      <section
        className="paw-small-modal paw-chat-modal"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <LocalizedButton className="paw-modal-close" type="button" onClick={close}><LocalizedCopy>{"×"}</LocalizedCopy></LocalizedButton>
        <span className="pawdating-kicker"><LocalizedCopy>{"MATCHED · PRIVATE ROOM"}</LocalizedCopy></span>
        <h3>
          <LocalizedCopy>{interest.source_name}</LocalizedCopy><LocalizedCopy>{" × "}</LocalizedCopy><LocalizedCopy>{interest.target_name}</LocalizedCopy>
        </h3>
        <p><LocalizedCopy>{"Ruang ini hanya terbuka setelah persetujuan kedua pet parent. Kontak dan tautan pribadi tetap dilindungi."}</LocalizedCopy></p>
        <div className="paw-chat-list">
          <LocalizedCopy>{busy && !messages.length ? (
            <small><LocalizedCopy>{"Memuat percakapan…"}</LocalizedCopy></small>
          ) : messages.length ? (
            messages.map((item) => (
              <article key={item.id}>
                <b><LocalizedCopy preserve>{item.sender_name}</LocalizedCopy></b>
                <p><LocalizedCopy>{item.body}</LocalizedCopy></p>
                <time><LocalizedCopy>{new Date(item.created_at).toLocaleString(petOwnerIntlLocale())}</LocalizedCopy></time>
              </article>
            ))
          ) : (
            <small><LocalizedCopy>{"Belum ada pesan. Mulai diskusi seputar kesehatan dan kecocokan pet."}</LocalizedCopy></small>
          )}</LocalizedCopy>
        </div>
        <form className="paw-chat-compose" onSubmit={send}>
          <LocalizedTextarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            minLength={1}
            maxLength={1000}
            placeholder="Tulis pesan tanpa nomor telepon, akun sosial, atau tautan…"
            required
          />
          <LocalizedButton className="paw-primary" disabled={busy || !body.trim()}><LocalizedCopy>{"Kirim"}</LocalizedCopy></LocalizedButton>
        </form>
      </section>
    </div>
  );
}

function PawReportModal({
  profile,
  close,
  notify,
}: {
  profile: PawDatingProfile;
  close: () => void;
  notify: Notify;
}) {
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    const values = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const result = await reportPawDatingProfile(
        profile.id,
        String(values.category),
        String(values.details),
      );
      notify(result.message);
      close();
    } catch (error) {
      notify(
        error instanceof Error ? error.message : "Laporan belum dapat dikirim",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="paw-modal-backdrop" onMouseDown={close}>
      <form
        className="paw-small-modal"
        onSubmit={submit}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <LocalizedButton className="paw-modal-close" type="button" onClick={close}><LocalizedCopy>{"×"}</LocalizedCopy></LocalizedButton>
        <span className="paw-modal-mark"><LocalizedCopy>{"⚑"}</LocalizedCopy></span>
        <h3><LocalizedCopy>{"Laporkan profil "}</LocalizedCopy><LocalizedCopy>{profile.name}</LocalizedCopy></h3>
        <p><LocalizedCopy>{"Tim welfare akan meninjau laporan secara privat. Gunakan untuk keselamatan, data tidak sesuai, atau perilaku mencurigakan."}</LocalizedCopy></p>
        <label><LocalizedCopy>{"Kategori"}</LocalizedCopy><SlivaSelect aria-label="Kategori" name="category" required defaultValue="">
            <option value="">Pilih kategori</option>
            <option value="fake_health_data">
              Data kesehatan tidak sesuai
            </option>
            <option value="animal_welfare">Keselamatan pet</option>
            <option value="fraud">Aktivitas mencurigakan</option>
            <option value="other">Lainnya</option>
          </SlivaSelect>
        </label>
        <label><LocalizedCopy>{"Detail"}</LocalizedCopy><LocalizedTextarea
            name="details"
            minLength={10}
            maxLength={1200}
            required
            placeholder="Jelaskan alasan laporan…"
          />
        </label>
        <div className="paw-modal-actions">
          <LocalizedButton className="paw-secondary" type="button" onClick={close}><LocalizedCopy>{"Batal"}</LocalizedCopy></LocalizedButton>
          <LocalizedButton className="paw-primary" type="submit" disabled={busy}>
            <LocalizedCopy>{busy ? "Mengirim…" : "Kirim laporan"}</LocalizedCopy>
          </LocalizedButton>
        </div>
      </form>
    </div>
  );
}

function downloadStandardsChecklist(standards: PawDatingStandards) {
  const lines = [
    "SLIVADOC PAW DATING — HEALTH SCREENING CHECKLIST",
    "",
    ...standards.levels.flatMap((level) => [
      `LEVEL ${level.level} — ${level.name}`,
      ...level.requirements.map((item) => `[ ] ${item}`),
      "",
    ]),
    "KONDISI YANG MEMBLOKIR PAIRING",
    ...standards.blocked_conditions.map((item) => `- ${item}`),
    "",
    `Laporan berlaku ${standards.report_validity_days} hari.`,
  ];
  const url = URL.createObjectURL(
    new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "slivadoc-paw-dating-health-checklist.txt";
  anchor.click();
  URL.revokeObjectURL(url);
}

function StandardsView({
  standards,
  notify,
}: {
  standards: PawDatingStandards;
  notify: Notify;
}) {
  return (
    <div className="paw-standards">
      <div className="paw-standards-intro">
        <span><LocalizedCopy>{"SLIVADOC WELFARE STANDARD"}</LocalizedCopy></span>
        <h3><LocalizedCopy>{"Empat level verifikasi,"}</LocalizedCopy><br /><LocalizedCopy>{"satu tujuan: pet yang sehat."}</LocalizedCopy></h3>
        <p><LocalizedCopy>{"Semakin tinggi level, semakin lengkap data kesehatan dan silsilah yang diverifikasi oleh dokter serta tim welfare Slivadoc."}</LocalizedCopy></p>
        <LocalizedButton
          className="paw-secondary"
          type="button"
          onClick={() => {
            downloadStandardsChecklist(standards);
            notify("Checklist health screening berhasil diunduh");
          }}
        ><LocalizedCopy>{"↓ Unduh checklist"}</LocalizedCopy></LocalizedButton>
      </div>
      <div className="paw-level-list">
        <LocalizedCopy>{standards.levels.map((item) => (
          <article key={item.level} className={levelTone[item.level]}>
            <div>
              <strong><LocalizedCopy>{"0"}</LocalizedCopy><LocalizedCopy>{item.level}</LocalizedCopy></strong>
              <span><LocalizedCopy>{"LEVEL"}</LocalizedCopy></span>
            </div>
            <section>
              <h4><LocalizedCopy>{item.name}</LocalizedCopy></h4>
              <LocalizedCopy>{item.requirements.map((requirement) => (
                <p key={requirement}><LocalizedCopy>{"✓ "}</LocalizedCopy><LocalizedCopy>{requirement}</LocalizedCopy></p>
              ))}</LocalizedCopy>
            </section>
            <LocalizedCopy>{item.level === 2 && <em><LocalizedCopy>{"Minimum publish"}</LocalizedCopy></em>}</LocalizedCopy>
          </article>
        ))}</LocalizedCopy>
      </div>
      <div className="paw-blocked">
        <div>
          <span><LocalizedCopy>{"⛔"}</LocalizedCopy></span>
          <div>
            <h4><LocalizedCopy>{"Kondisi yang otomatis memblokir pairing"}</LocalizedCopy></h4>
            <p><LocalizedCopy>{"Sistem tidak akan mengirim interest bila salah satu kondisi berikut terdeteksi."}</LocalizedCopy></p>
          </div>
        </div>
        <ul>
          <LocalizedCopy>{standards.blocked_conditions.map((condition) => (
            <li key={condition}><LocalizedCopy>{condition}</LocalizedCopy></li>
          ))}</LocalizedCopy>
        </ul>
      </div>
      <div className="paw-principles">
        <LocalizedCopy>{standards.principles.map((principle, index) => (
          <article key={principle}>
            <span><LocalizedCopy>{"0"}</LocalizedCopy><LocalizedCopy>{index + 1}</LocalizedCopy></span>
            <p><LocalizedCopy>{principle}</LocalizedCopy></p>
          </article>
        ))}</LocalizedCopy>
      </div>
    </div>
  );
}

function PrivateGate({
  title,
  text,
  requireLogin,
  children,
}: {
  title: string;
  text: string;
  requireLogin: () => boolean;
  children: ReactNode;
}) {
  if (isPetOwnerAuthenticated()) return <>{children}</>;
  return (
    <div className="paw-login-gate">
      <div><LocalizedCopy>{"🔐"}</LocalizedCopy></div>
      <span><LocalizedCopy>{"PRIVATE & SECURE"}</LocalizedCopy></span>
      <h3><LocalizedCopy>{title}</LocalizedCopy></h3>
      <p><LocalizedCopy>{text}</LocalizedCopy></p>
      <LocalizedButton className="paw-primary" type="button" onClick={requireLogin}><LocalizedCopy>{"Login untuk melanjutkan"}</LocalizedCopy></LocalizedButton>
      <small><LocalizedCopy>{"Kontak dan medical document dienkripsi serta hanya dibuka sesuai izin."}</LocalizedCopy></small>
    </div>
  );
}

function Empty({
  title,
  text,
  action,
  onAction,
}: {
  title: string;
  text: string;
  action: string;
  onAction: () => void;
}) {
  return (
    <div className="paw-empty">
      <span><LocalizedCopy>{"♡"}</LocalizedCopy></span>
      <h4><LocalizedCopy>{title}</LocalizedCopy></h4>
      <p><LocalizedCopy>{text}</LocalizedCopy></p>
      <LocalizedButton className="paw-secondary" type="button" onClick={onAction}>
        <LocalizedCopy>{action}</LocalizedCopy>
      </LocalizedButton>
    </div>
  );
}

function CreateProfileModal({
  pet,
  onClose,
  onCreated,
  notify,
}: {
  pet: Pet;
  onClose: () => void;
  onCreated: () => void;
  notify: Notify;
}) {
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [vaccineBook, setVaccineBook] = useState<File | null>(null);
  const [consentData, setConsentData] = useState(false);
  const [consentWelfare, setConsentWelfare] = useState(false);
  const [form, setForm] = useState({
    city: "",
    description: `${pet.name} adalah ${pet.breed}.`,
    pedigree: "none",
    registry: "",
    registration: "",
    temperament: "",
    preferred: pet.breed,
    maxDistance: "100",
    clinic: "",
    doctor: "",
    license: "",
    exam: new Date().toISOString().slice(0, 10),
    valid: "",
  });
  const set = (key: string, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));
  function continueStep() {
    if (
      step === 1 &&
      (!form.city.trim() || form.description.trim().length < 20)
    ) {
      notify("Kota dan deskripsi minimal 20 karakter wajib dilengkapi");
      return;
    }
    if (
      step === 2 &&
      (!form.clinic.trim() ||
        !form.doctor.trim() ||
        !form.exam ||
        !form.valid ||
        !vaccineBook)
    ) {
      notify("Data pemeriksaan dan foto buku vaksin wajib dilengkapi");
      return;
    }
    setStep((value) => value + 1);
  }
  async function save() {
    if (!vaccineBook) {
      notify("Foto buku vaksin wajib diunggah");
      setStep(2);
      return;
    }
    if (!consentData || !consentWelfare) {
      notify("Kedua persetujuan welfare wajib dicentang");
      return;
    }
    setBusy(true);
    try {
      const vaccineUpload = await uploadImage(vaccineBook, "documents");
      const profile = await createPawDatingProfile({
        pet_id: pet.id,
        city: form.city,
        pedigree_status: form.pedigree,
        registry_name: form.registry,
        registration_number: form.registration,
        description: form.description,
        temperament: form.temperament
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        traits: [],
        preferred_breeds: form.preferred
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        preferred_age_min_months: 18,
        preferred_age_max_months: 84,
        max_distance_km: Number(form.maxDistance),
        photo_urls: [],
        vaccine_book_urls: [vaccineUpload.url],
        visibility: "public",
      });
      await createPawDatingHealthReport(profile.id, {
        examination_at: `${form.exam}T00:00:00Z`,
        valid_until: `${form.valid}T00:00:00Z`,
        clinic_name: form.clinic,
        veterinarian_name: form.doctor,
        veterinarian_license: form.license,
        physical_exam: { general: "pending review" },
        vaccination_checks: { status: "pending review" },
        parasite_checks: { status: "pending review" },
        infectious_disease_tests: { status: "pending review" },
        reproductive_tests: { status: "pending review" },
        genetic_tests: [],
        orthopedic_checks: {},
        cardiac_checks: {},
        ophthalmic_checks: {},
        laboratory_results: [],
        findings: "",
        recommendations: "",
        restrictions: [],
        document_urls: [vaccineUpload.url],
      });
      await submitPawDatingProfile(profile.id);
      notify(
        "Profil masuk antrean approval Marketplace dan belum tampil ke publik",
      );
      onCreated();
    } catch (error) {
      notify(
        error instanceof Error ? error.message : "Profil belum dapat dibuat",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="paw-modal-backdrop" onMouseDown={onClose}>
      <div
        className="paw-create-modal"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <LocalizedButton className="paw-modal-close" type="button" onClick={onClose}><LocalizedCopy>{"×"}</LocalizedCopy></LocalizedButton>
        <div className="paw-create-head">
          <span><LocalizedCopy>{"PAW DATING PROFILE"}</LocalizedCopy></span>
          <h3><LocalizedCopy>{"Verifikasi "}</LocalizedCopy><LocalizedCopy preserve>{pet.name}</LocalizedCopy></h3>
          <div>
            <LocalizedCopy>{[1, 2, 3].map((item) => (
              <i key={item} className={step >= item ? "active" : ""}>
                <LocalizedCopy>{item}</LocalizedCopy>
              </i>
            ))}</LocalizedCopy>
          </div>
        </div>
        <LocalizedCopy>{step === 1 && (
          <div className="paw-form-step">
            <h4><LocalizedCopy>{"Identitas & preferensi"}</LocalizedCopy></h4>
            <div className="paw-pet-preview">
              <span><LocalizedCopy>{pet.avatar}</LocalizedCopy></span>
              <div>
                <strong><LocalizedCopy preserve>{pet.name}</LocalizedCopy></strong>
                <p>
                  <LocalizedCopy>{pet.breed}</LocalizedCopy><LocalizedCopy>{" · "}</LocalizedCopy><LocalizedCopy>{pet.gender}</LocalizedCopy><LocalizedCopy>{" · "}</LocalizedCopy><LocalizedCopy>{pet.age}</LocalizedCopy>
                </p>
              </div>
              <b><LocalizedCopy>{"✓ Pet saya"}</LocalizedCopy></b>
            </div>
            <div className="paw-form-grid">
              <label><LocalizedCopy>{"Kota"}</LocalizedCopy><LocalizedInput
                  value={form.city}
                  onChange={(event) => set("city", event.target.value)}
                  required
                />
              </label>
              <label><LocalizedCopy>{"Jarak maksimum"}</LocalizedCopy><SlivaSelect aria-label="Jarak maksimum"
                  value={form.maxDistance}
                  onChange={(event) => set("maxDistance", event.target.value)}
                >
                  <option value="25">25 km</option>
                  <option value="100">100 km</option>
                  <option value="200">200 km</option>
                </SlivaSelect>
              </label>
              <label><LocalizedCopy>{"Pedigree"}</LocalizedCopy><SlivaSelect aria-label="Pedigree"
                  value={form.pedigree}
                  onChange={(event) => set("pedigree", event.target.value)}
                >
                  <option value="none">Belum ada</option>
                  <option value="registered">Registered</option>
                  <option value="pedigree">Pedigree</option>
                  <option value="champion">Champion</option>
                </SlivaSelect>
              </label>
              <label><LocalizedCopy>{"Registry"}</LocalizedCopy><LocalizedInput
                  value={form.registry}
                  onChange={(event) => set("registry", event.target.value)}
                  placeholder="PERKIN / ICA"
                />
              </label>
              <label className="wide"><LocalizedCopy>{"Nomor registrasi"}</LocalizedCopy><LocalizedInput
                  value={form.registration}
                  onChange={(event) => set("registration", event.target.value)}
                  placeholder="Opsional"
                />
              </label>
              <label className="wide"><LocalizedCopy>{"Tentang "}</LocalizedCopy><LocalizedCopy preserve>{pet.name}</LocalizedCopy>
                <LocalizedTextarea
                  minLength={20}
                  value={form.description}
                  onChange={(event) => set("description", event.target.value)}
                  required
                />
              </label>
              <label><LocalizedCopy>{"Temperamen"}</LocalizedCopy><LocalizedInput
                  value={form.temperament}
                  onChange={(event) => set("temperament", event.target.value)}
                />
              </label>
              <label><LocalizedCopy>{"Ras preferensi"}</LocalizedCopy><LocalizedInput
                  value={form.preferred}
                  onChange={(event) => set("preferred", event.target.value)}
                />
              </label>
            </div>
          </div>
        )}</LocalizedCopy>
        <LocalizedCopy>{step === 2 && (
          <div className="paw-form-step">
            <h4><LocalizedCopy>{"Dokumen health screening"}</LocalizedCopy></h4>
            <p className="paw-form-info"><LocalizedCopy>{"Data ini akan berstatus "}</LocalizedCopy><b><LocalizedCopy>{"submitted"}</LocalizedCopy></b><LocalizedCopy>{" dan hanya naik level setelah dokter Slivadoc memverifikasi dokumen asli."}</LocalizedCopy></p>
            <div className="paw-form-grid">
              <label><LocalizedCopy>{"Klinik / rumah sakit"}</LocalizedCopy><LocalizedInput
                  value={form.clinic}
                  onChange={(event) => set("clinic", event.target.value)}
                  required
                />
              </label>
              <label><LocalizedCopy>{"Nama dokter"}</LocalizedCopy><LocalizedInput
                  value={form.doctor}
                  onChange={(event) => set("doctor", event.target.value)}
                  required
                />
              </label>
              <label><LocalizedCopy>{"Nomor STRV / SIP"}</LocalizedCopy><LocalizedInput
                  value={form.license}
                  onChange={(event) => set("license", event.target.value)}
                />
              </label>
              <label><LocalizedCopy>{"Tanggal pemeriksaan"}</LocalizedCopy><SlivaDatePicker
                  type="date"
                  value={form.exam}
                  onChange={(event) => set("exam", event.target.value)}
                  required
                />
              </label>
              <label><LocalizedCopy>{"Valid sampai"}</LocalizedCopy><SlivaDatePicker
                  type="date"
                  value={form.valid}
                  onChange={(event) => set("valid", event.target.value)}
                  required
                />
              </label>
              <label className="paw-vaccine-upload"><LocalizedCopy>{"Foto buku vaksin "}</LocalizedCopy><b><LocalizedCopy>{"* wajib"}</LocalizedCopy></b>
                <SlivaFilePicker
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  capture="environment"
                  onChange={(event) => {
                    const file = event.target.files?.[0] ?? null;
                    if (file && !file.type.startsWith("image/")) {
                      notify(
                        "Buku vaksin harus berupa foto JPG, PNG, atau WebP",
                      );
                      event.target.value = "";
                      return;
                    }
                    setVaccineBook(file);
                  }}
                  required
                />
                <span className="paw-upload">
                  <LocalizedCopy>{vaccineBook
                    ? `✓ ${vaccineBook.name}`
                    : "＋ Ambil / pilih foto buku vaksin"}</LocalizedCopy>
                </span>
                <small><LocalizedCopy>{"JPG, PNG, atau WebP. Dokumen hanya dilihat tim verifikasi."}</LocalizedCopy></small>
              </label>
            </div>
            <div className="paw-checklist">
              <LocalizedCopy>{[
                "Pemeriksaan fisik & BCS",
                "Vaksin dan antiparasit",
                "Penyakit menular",
                "Pemeriksaan reproduksi",
                "Panel genetik sesuai ras",
                "Ortopedi / jantung / mata",
              ].map((item, index) => (
                <label key={item}>
                  <LocalizedInput type="checkbox" defaultChecked={index < 4} />
                  <span><LocalizedCopy>{item}</LocalizedCopy></span>
                  <small><LocalizedCopy>{index < 4 ? "Terlampir" : "Jika tersedia"}</LocalizedCopy></small>
                </label>
              ))}</LocalizedCopy>
            </div>
          </div>
        )}</LocalizedCopy>
        <LocalizedCopy>{step === 3 && (
          <div className="paw-form-step">
            <h4><LocalizedCopy>{"Persetujuan welfare"}</LocalizedCopy></h4>
            <div className="paw-review-card">
              <span><LocalizedCopy>{pet.avatar}</LocalizedCopy></span>
              <div>
                <h4><LocalizedCopy preserve>{pet.name}</LocalizedCopy></h4>
                <p>
                  <LocalizedCopy>{form.city}</LocalizedCopy><LocalizedCopy>{" · "}</LocalizedCopy><LocalizedCopy>{titleCase(form.pedigree)}</LocalizedCopy><LocalizedCopy>{" · radius"}</LocalizedCopy><LocalizedCopy>{" "}</LocalizedCopy>
                  <LocalizedCopy>{form.maxDistance}</LocalizedCopy><LocalizedCopy>{" km"}</LocalizedCopy></p>
                <b><LocalizedCopy>{"Level awal: Identity Verified"}</LocalizedCopy></b>
                <small><LocalizedCopy>{"✓ Buku vaksin: "}</LocalizedCopy><LocalizedCopy>{vaccineBook?.name || "belum dipilih"}</LocalizedCopy>
                </small>
              </div>
            </div>
            <label className="paw-consent">
              <LocalizedInput
                type="checkbox"
                checked={consentData}
                onChange={(event) => setConsentData(event.target.checked)}
                required
              />
              <span><LocalizedCopy>{"Saya menyatakan data pet dan dokumen kesehatan benar, memiliki hak atas pet ini, dan menyetujui verifikasi dokter serta moderasi welfare Slivadoc."}</LocalizedCopy></span>
            </label>
            <label className="paw-consent">
              <LocalizedInput
                type="checkbox"
                checked={consentWelfare}
                onChange={(event) => setConsentWelfare(event.target.checked)}
                required
              />
              <span><LocalizedCopy>{"Saya memahami hasil kompatibilitas bukan izin otomatis untuk breeding dan pemeriksaan pra-breeding tetap wajib."}</LocalizedCopy></span>
            </label>
          </div>
        )}</LocalizedCopy>
        <div className="paw-form-actions">
          <LocalizedButton
            className="paw-secondary"
            type="button"
            onClick={() =>
              step === 1 ? onClose() : setStep((value) => value - 1)
            }
          >
            <LocalizedCopy>{step === 1 ? "Batal" : "Kembali"}</LocalizedCopy>
          </LocalizedButton>
          <LocalizedCopy>{step < 3 ? (
            <LocalizedButton
              className="paw-primary"
              type="button"
              onClick={continueStep}
            ><LocalizedCopy>{"Lanjutkan →"}</LocalizedCopy></LocalizedButton>
          ) : (
            <LocalizedButton
              className="paw-primary"
              type="button"
              disabled={busy || !consentData || !consentWelfare}
              onClick={() => void save()}
            >
              <LocalizedCopy>{busy ? "Mengirim..." : "Kirim untuk review"}</LocalizedCopy>
            </LocalizedButton>
          )}</LocalizedCopy>
        </div>
      </div>
    </div>
  );
}
