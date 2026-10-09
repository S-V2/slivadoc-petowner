"use client";
import {
  sitterPackageRate,
  sitterDiscountPercent,
} from "../../../shared/pet-sitter";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentProps,
  type CSSProperties,
} from "react";
import Image from "next/image";
import { Icon } from "../Icon";
import { BrandMark } from "../BrandLogo";
import {
  sitterDistanceLabel,
  sitterInitials,
  sitterPalette,
  sitterPetOptions,
  sittingDateLabel,
  sittingProgressIndex,
  sittingProgressSteps,
} from "../../../shared/pet-sitter-presentation";
import {
  LocalizedButton as Button,
  LocalizedCopy,
  LocalizedInput as Input,
  LocalizedTextarea as Textarea,
} from "../LocalizedCopy";
import { SlivaSelect } from "../SlivaSelect";
import { SlivaDatePicker } from "../SlivaDatePicker";
import {
  sitterClient,
  createPaymentIntent,
  type PaymentIntent,
} from "../../lib/platform-api";
import { QrisPaymentPanel } from "../payments/QrisPayment";
import {
  sitterModes,
  sittingCancellationMessage,
  sittingStatuses,
  sittingEndDate,
  sittingToday,
  type SitterFilters,
  type PetSitter,
  type SitterDetail,
  type SittingInput,
  type SittingQuote,
  type SittingBooking,
  type SittingUpdate,
} from "../../../shared/pet-sitter";
import "../../pet-sitter.css";
const money = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
const species = sitterPetOptions;
function SitterSelect({
  options,
  ...props
}: Omit<ComponentProps<typeof SlivaSelect>, "children"> & {
  options: ReadonlyArray<{ value: string; label: string }>;
}) {
  return (
    <SlivaSelect {...props} aria-label={props["aria-label"]}>
      {options.map((o) => (
        <option value={o.value} key={o.value}>
          {o.label}
        </option>
      ))}
    </SlivaSelect>
  );
}
function Avatar({ sitter }: { sitter: PetSitter }) {
  return (
    <div className="sitter-avatar">
      {sitter.photo_url ? (
        <Image
          src={sitter.photo_url}
          width={96}
          height={96}
          alt={sitter.display_name}
          unoptimized
        />
      ) : (
        <span>{sitterInitials(sitter.display_name)}</span>
      )}
    </div>
  );
}
export default function PetSitterExperience({
  pets,
  authenticated,
  onLogin,
  initialBookingId,
}: {
  pets: Array<{ id: string; name: string; accessRole?: string }>;
  authenticated: boolean;
  initialBookingId?: string;
  onLogin: () => void;
}) {
  const startRef = useRef<HTMLElement>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const goTop = () =>
    startRef.current?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
      block: "start",
    });
  const [tab, setTab] = useState<"find" | "bookings">("find");
  const [filters, setFilters] = useState<SitterFilters>({
    city: "",
    species: "",
    mode: "",
  });
  const [locating, setLocating] = useState(false);
  const [radius, setRadius] = useState(25);
  const [sitters, setSitters] = useState<PetSitter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [detail, setDetail] = useState<SitterDetail>();
  const [bookings, setBookings] = useState<SittingBooking[]>([]);
  const [current, setCurrent] = useState<SittingBooking>();
  const [updates, setUpdates] = useState<SittingUpdate[]>([]);
  const [payment, setPayment] = useState<PaymentIntent>();
  const [feedback, setFeedback] = useState("");
  const [message, setMessage] = useState("");
  const [rating, setRating] = useState("5");
  const [review, setReview] = useState("");
  const [cancelNote, setCancelNote] = useState("");
  const [days, setDays] = useState(1);
  const [input, setInput] = useState<
    Omit<SittingInput, "request_key" | "sitter_id" | "ends_on" | "pet_count">
  >({
    pet_ids: [],
    package: "daily",
    service_mode: "home_visit",
    starts_on: sittingToday(),
    preferred_time: "09:00",
    address: "",
    emergency_phone: "",
    care_notes: "",
  });
  const [quote, setQuote] = useState<SittingQuote>();
  useEffect(() => {
    if (!authenticated || !initialBookingId) return;
    let active = true;
    Promise.all([
      sitterClient.bookings(),
      sitterClient.booking(initialBookingId),
    ])
      .then(([list, detail]) => {
        if (!active) return;
        setBookings(list.data);
        setCurrent(detail.booking);
        setUpdates(detail.updates);
        setTab("bookings");
        setDetail(undefined);
        setPayment(undefined);
      })
      .catch((e: unknown) => {
        if (active)
          setError(
            e instanceof Error ? e.message : "Pemesanan belum dapat dimuat",
          );
      });
    return () => {
      active = false;
    };
  }, [authenticated, initialBookingId]);
  const key = useRef("");
  const generation = useRef(0);
  const searchGeneration = useRef(0);
  const change = (values: Partial<typeof input>) => {
    generation.current++;
    setInput((v) => ({ ...v, ...values }));
    setQuote(undefined);
    key.current = "";
  };
  const search = useCallback(
    async (values = filters) => {
      const request = ++searchGeneration.current;
      setLoading(true);
      setError("");
      try {
        const result = await sitterClient.list(values);
        if (request === searchGeneration.current) setSitters(result.data);
      } catch (e) {
        if (request === searchGeneration.current)
          setError(e instanceof Error ? e.message : "Pencarian belum tersedia");
      } finally {
        if (request === searchGeneration.current) setLoading(false);
      }
    },
    [filters],
  );
  useEffect(() => {
    let active = true;
    const request = ++searchGeneration.current;
    sitterClient
      .list()
      .then((r) => {
        if (active && request === searchGeneration.current) setSitters(r.data);
      })
      .catch((e) => {
        if (active && request === searchGeneration.current) setError(e.message);
      })
      .finally(() => {
        if (active && request === searchGeneration.current) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);
  const locate = async () => {
    if (!navigator.geolocation) {
      setError("Lokasi tidak tersedia di browser ini. Gunakan pencarian kota.");
      return;
    }
    setLocating(true);
    setError("");
    try {
      const position = await new Promise<GeolocationPosition>(
        (resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            timeout: 15000,
            maximumAge: 60000,
          }),
      );
      const next = {
        ...filters,
        city: "",
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        max_distance_km: radius,
      };
      setFilters(next);
      await search(next);
    } catch {
      setError(
        "Lokasi belum dapat diakses. Izinkan lokasi atau cari berdasarkan kota.",
      );
    } finally {
      setLocating(false);
    }
  };
  const act = async (action: () => Promise<void>) => {
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Coba lagi sebentar");
    } finally {
      setBusy(false);
    }
  };
  const loadBookings = async () => {
    if (!authenticated) {
      onLogin();
      return;
    }
    await act(async () => {
      setBookings((await sitterClient.bookings()).data);
      setTab("bookings");
      setDetail(undefined);
      goTop();
    });
  };
  const openBooking = async (id: string) => {
    if (id !== current?.id) setPayment(undefined);
    const result = await sitterClient.booking(id);
    setCurrent(result.booking);
    setUpdates(result.updates);
    setMessage("");
  };
  const openSitter = async (id: string) =>
    act(async () => {
      const value = await sitterClient.detail(id);
      setDetail(value);
      change({ service_mode: value.sitter.service_modes[0] });
      setCurrent(undefined);
      goTop();
    });
  const payload = (): SittingInput => ({
    ...input,
    sitter_id: detail!.sitter.id,
    ends_on: sittingEndDate(input.starts_on, days),
    pet_count: input.pet_ids.length || 1,
    request_key: key.current || (key.current = crypto.randomUUID()),
  });
  const calculate = () =>
    act(async () => {
      const currentGeneration = generation.current;
      const result = await sitterClient.quote(detail!.sitter.id, payload());
      if (currentGeneration !== generation.current) return;
      if (!result.available)
        throw new Error(
          "Tanggal ini sudah terisi. Pilih tanggal lain dari kalender sitter.",
        );
      setQuote(result.quote);
    });
  const book = () => {
    if (!authenticated) {
      onLogin();
      return;
    }
    void act(async () => {
      const result = await sitterClient.book({
        ...payload(),
        expected_amount: quote?.total_amount,
      } as SittingInput);
      setFeedback(result.message);
      setQuote(undefined);
      setDetail(undefined);
      setTab("bookings");
      setBookings((await sitterClient.bookings()).data);
      await openBooking(result.id);
    });
  };
  const statusAction = (action: string) =>
    act(async () => {
      await sitterClient.change(current!.id, action, cancelNote);
      await openBooking(current!.id);
      setBookings((await sitterClient.bookings()).data);
    });
  return (
    <section ref={startRef} className="sitter-experience" aria-busy={busy}>
      <LocalizedCopy>
        <div className="sitter-page-head">
          <div className="sitter-brand">
            <span className="sitter-brand-icon">
              <BrandMark size={36} className="sitter-logo" />
            </span>
            <div>
              <h1>Pet Sitter</h1>
              <p>Sedikit bantuan, sepenuh perhatian.</p>
            </div>
          </div>
          <a
            className="sitter-partner-link"
            href="https://partners.slivadoc.com/kemitraan/pet-sitter"
            target="_blank"
            rel="noreferrer"
          >
            Jadi Pet Sitter <Icon name="arrow" size={15} />
          </a>
        </div>
        <nav className="sitter-tabs" aria-label="Pet Sitter">
          <Button
            aria-current={tab === "find" ? "page" : undefined}
            onClick={() => {
              setTab("find");
              setDetail(undefined);
              setCurrent(undefined);
            }}
          >
            <Icon name="search" size={16} />
            Cari sitter
          </Button>
          <Button
            aria-current={tab === "bookings" ? "page" : undefined}
            onClick={() => void loadBookings()}
          >
            <Icon name="calendar" size={16} />
            Perawatan saya
          </Button>
        </nav>
        {error && (
          <div role="alert" className="sitter-notice error">
            {error}
          </div>
        )}
        {feedback && (
          <div role="status" className="sitter-notice">
            {feedback}
          </div>
        )}
        {tab === "find" && !detail && (
          <>
            <header className="sitter-hero">
              <div className="sitter-hero-copy">
                <span className="sitter-eyebrow">TEMAN UNTUK SI KECIL</span>
                <h2>
                  Kamu tenang.
                  <br />
                  <em>Mereka senang.</em>
                </h2>
                <p>
                  Rutinitas kecilnya tetap penuh perhatian. Temukan sitter untuk
                  menemani, merawat, dan berbagi kabar setiap hari.
                </p>
                <div className="sitter-trust">
                  <span>
                    <Icon name="shield" size={14} />
                    Seleksi sitter
                  </span>
                  <span>
                    <Icon name="heart" size={14} />
                    Kabar setiap hari
                  </span>
                </div>
              </div>
              <div className="sitter-hero-art">
                <Image
                  src="/images/pet-sitter/companions-cutout.png"
                  alt="Anjing dan kucing bersantai bersama di bantal hijau"
                  width={440}
                  height={440}
                  priority
                />
                <div className="sitter-art-note">
                  <span>
                    <Icon name="paw" size={18} />
                  </span>
                  <div>
                    <strong>Teman baru. Rasa nyaman.</strong>
                    <small>Harian & paket mingguan</small>
                  </div>
                </div>
              </div>
            </header>
            <div className="sitter-search-layout">
              <form
                className={`sitter-search ${filtersOpen ? "is-expanded" : ""}`}
                onSubmit={(e) => {
                  e.preventDefault();
                  void search();
                }}
              >
                <label className="sitter-location-field">
                  <Icon name="map" size={20} />
                  <span>
                    <span className="sitter-field-caption">AREA PERAWATAN</span>
                    <Input
                      aria-label="Kota atau kecamatan"
                      placeholder="Cari kota atau kecamatan"
                      value={filters.city}
                      onChange={(e) =>
                        setFilters({
                          ...filters,
                          city: e.target.value,
                          latitude: undefined,
                          longitude: undefined,
                          max_distance_km: undefined,
                        })
                      }
                    />
                  </span>
                </label>
                <label className="sitter-search-option">
                  <span className="sitter-field-caption">JENIS PET</span>
                  <SitterSelect
                    aria-label="Jenis pet"
                    value={filters.species}
                    options={species}
                    onChange={(e) =>
                      setFilters({ ...filters, species: e.target.value })
                    }
                  />
                </label>
                <label className="sitter-search-option">
                  <span className="sitter-field-caption">LAYANAN</span>
                  <SitterSelect
                    aria-label="Jenis perawatan"
                    value={filters.mode}
                    options={[
                      { value: "", label: "Semua layanan" },
                      ...sitterModes,
                    ]}
                    onChange={(e) =>
                      setFilters({ ...filters, mode: e.target.value })
                    }
                  />
                </label>
                <Button
                  type="button"
                  className="sitter-filter-toggle"
                  aria-label="Filter perawatan"
                  aria-expanded={filtersOpen}
                  onClick={() => setFiltersOpen(!filtersOpen)}
                >
                  <Icon name="filter" size={20} />
                </Button>
                <Button
                  className="sitter-primary sitter-search-submit"
                  aria-label="Temukan sitter"
                  disabled={loading}
                >
                  <Icon name="search" size={17} />
                  <span>Temukan sitter</span>
                </Button>
              </form>
              <div className="sitter-nearby">
                <Button
                  type="button"
                  aria-pressed={filters.latitude != null}
                  disabled={locating || loading}
                  onClick={() => void locate()}
                >
                  <Icon name="map" size={15} />
                  {locating ? "Mencari lokasi…" : "Sitter terdekat"}
                </Button>
                <label>
                  Radius{" "}
                  <SlivaSelect
                    aria-label="Radius pencarian"
                    value={radius}
                    onChange={(e) => {
                      const value = Number(e.target.value);
                      setRadius(value);
                      if (filters.latitude != null) {
                        const next = { ...filters, max_distance_km: value };
                        setFilters(next);
                        void search(next);
                      }
                    }}
                  >
                    {[5, 10, 25, 50, 100].map((km) => (
                      <option key={km} value={km}>
                        {km} km
                      </option>
                    ))}
                  </SlivaSelect>
                </label>
                {(filters.city ||
                  filters.species ||
                  filters.mode ||
                  filters.latitude != null) && (
                  <Button
                    type="button"
                    onClick={() => {
                      const next = { city: "", species: "", mode: "" };
                      setFilters(next);
                      void search(next);
                    }}
                  >
                    Reset filter
                  </Button>
                )}
                {filters.latitude != null && (
                  <span>Diurutkan dari terdekat · sesuai jangkauan sitter</span>
                )}
              </div>
            </div>
            <div className="sitter-discovery-bar">
              <div className="sitter-pet-chips" aria-label="Pilihan jenis pet">
                {species.map((option) => (
                  <Button
                    key={option.value}
                    aria-pressed={filters.species === option.value}
                    onClick={() => {
                      const next = { ...filters, species: option.value };
                      setFilters(next);
                      void search(next);
                    }}
                  >
                    {!option.value && <Icon name="paw" size={13} />}
                    {option.label}
                  </Button>
                ))}
              </div>
              <span>
                <Icon name="shield" size={13} />
                Profil & keselamatan ditinjau
              </span>
            </div>
            <div className="sitter-section-head">
              <div>
                <h2>Kenalan dengan sitter</h2>
                <p>Temukan teman yang cocok untuk pet-mu.</p>
              </div>
              <span className="sitter-result-count">
                {sitters.length} sitter ditemukan
              </span>
            </div>
            {loading ? (
              <div
                className="sitter-grid"
                role="status"
                aria-label="Mencari teman perawatan"
              >
                {[1, 2, 3].map((i) => (
                  <div key={i} className="sitter-skeleton">
                    <div />
                    <span />
                    <span />
                    <span />
                  </div>
                ))}
              </div>
            ) : sitters.length === 0 ? (
              <div className="sitter-empty">
                <span>♡</span>
                <h3>Teman yang tepat sedang kami siapkan</h3>
                <p>
                  Belum ada sitter terverifikasi untuk filter ini. Coba kota
                  lain atau hapus filter jenis pet.
                </p>
              </div>
            ) : (
              <div className="sitter-grid">
                {sitters.map((s) => {
                  const palette = sitterPalette(s.display_name);
                  const savings = s.daily_rate * 7 - sitterPackageRate(s, true);
                  return (
                    <article
                      key={s.id}
                      className="sitter-card"
                      style={
                        {
                          "--card-tone": palette.background,
                          "--card-soft": palette.soft,
                          "--card-ink": palette.foreground,
                        } as CSSProperties
                      }
                    >
                      <div className="sitter-card-top">
                        <Avatar sitter={s} />
                        <div className="sitter-card-identity">
                          <h3>{s.display_name}</h3>
                          <p className="sitter-place">
                            <Icon name="map" size={12} />
                            {s.city}
                          </p>
                          <span className="sitter-verified">
                            <Icon name="shield" size={12} />
                            {s.is_local_profile
                              ? "Akun lokal"
                              : "Terverifikasi"}
                          </span>
                        </div>
                        <Icon
                          name="paw"
                          className="sitter-card-paw"
                          size={32}
                        />
                      </div>
                      <div className="sitter-card-body">
                        {s.distance_km != null && (
                          <span className="sitter-distance">
                            {sitterDistanceLabel(s.distance_km)} dari lokasimu
                          </span>
                        )}
                        <div className="sitter-card-meta">
                          <span className="sitter-rating">
                            <Icon name="star" size={12} />
                            {s.review_count
                              ? `${s.rating} (${s.review_count} ulasan)`
                              : "Baru bergabung"}
                          </span>
                          <span>{s.experience_years} th pengalaman</span>
                        </div>
                        <p className="sitter-bio">{s.bio}</p>
                        <div className="sitter-tags">
                          {s.service_modes.map((m) => (
                            <span key={m}>
                              {sitterModes.find((v) => v.value === m)?.label}
                            </span>
                          ))}
                        </div>
                        <p className="sitter-session">
                          <Icon name="clock" size={12} />
                          {s.visit_minutes} menit per hari · maks. {s.max_pets}{" "}
                          pet
                        </p>
                        <div className="sitter-prices">
                          <div>
                            <small>Mulai dari</small>
                            <strong>
                              {money(sitterPackageRate(s))}
                              <small> / hari</small>
                            </strong>
                          </div>
                          <div className="sitter-weekly">
                            <small>Paket 7 hari</small>
                            <b>{money(sitterPackageRate(s, true))}</b>
                            {sitterDiscountPercent(s) > 0 && (
                              <span className="sitter-discount">
                                Diskon {sitterDiscountPercent(s)}% ·{" "}
                                <del>{money(s.weekly_rate)}</del>
                              </span>
                            )}
                            {savings > 0 && <span>Hemat {money(savings)}</span>}
                          </div>
                        </div>
                        <Button
                          className="sitter-card-cta"
                          aria-label={`Kenalan & cek jadwal ${s.display_name}`}
                          onClick={() => void openSitter(s.id)}
                          disabled={busy}
                        >
                          Lihat & pesan
                          <Icon name="arrow" size={17} />
                        </Button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
            <div className="sitter-how">
              <div className="sitter-how-intro">
                <span className="sitter-eyebrow">SESEDERHANA INI</span>
                <h2>Perawatan yang terasa dekat.</h2>
              </div>
              {[
                {
                  title: "Kenalan dulu",
                  copy: "Pilih profil, layanan, dan jadwal.",
                  icon: "users" as const,
                },
                {
                  title: "Susun rutinitas",
                  copy: "Ceritakan kebiasaan si kecil.",
                  icon: "calendar" as const,
                },
                {
                  title: "Ikuti kabarnya",
                  copy: "Bayar setelah diterima, pantau jurnalnya.",
                  icon: "heart" as const,
                },
              ].map((step, i) => (
                <div className="sitter-how-step" key={step.title}>
                  <span>
                    <Icon name={step.icon} size={20} />
                  </span>
                  <small>0{i + 1}</small>
                  <h3>{step.title}</h3>
                  <p>{step.copy}</p>
                </div>
              ))}
            </div>
          </>
        )}
        {tab === "find" && detail && (
          <>
            <Button
              className="sitter-back"
              onClick={() => {
                setDetail(undefined);
                goTop();
              }}
            >
              ← Semua sitter
            </Button>
            <div className="sitter-detail">
              <article className="sitter-panel sitter-profile-panel">
                <div className="sitter-profile-cover">
                  <Avatar sitter={detail.sitter} />
                  <Icon name="paw" size={54} />
                </div>
                <span className="sitter-badge">
                  {detail.sitter.is_local_profile
                    ? "Akun lokal · belum verifikasi identitas"
                    : "Identitas, wawancara & prosedur keselamatan ditinjau"}
                </span>
                <h2>{detail.sitter.display_name}</h2>
                <p>
                  {detail.sitter.city} · {detail.sitter.experience_years} tahun
                  pengalaman
                </p>
                <p className="sitter-preserve">{detail.sitter.bio}</p>
                <h3>Yang termasuk dalam perawatan</h3>
                <p>{detail.sitter.inclusions}</p>
                <p>
                  <strong>{detail.sitter.visit_minutes} menit per hari</strong>{" "}
                  · maksimal {detail.sitter.max_pets} pet dalam satu rumah
                  tangga. Jam menggunakan WIB.
                </p>
                <details className="sitter-profile-disclosure">
                  <summary>Ketersediaan & kebijakan pembatalan</summary>
                  <h3>Kalender tidak tersedia</h3>
                  <div className="sitter-tags">
                    {detail.unavailable_dates.length ? (
                      detail.unavailable_dates
                        .slice(0, 40)
                        .map((d) => (
                          <span key={d.day}>{sittingDateLabel(d.day)}</span>
                        ))
                    ) : (
                      <span>Belum ada tanggal yang diblokir</span>
                    )}
                  </div>
                  <h3>Pembatalan</h3>
                  <p>{detail.sitter.cancellation_policy}</p>
                </details>
                <h3>Cerita pet parent</h3>
                {detail.reviews.length ? (
                  detail.reviews.map((r, i) => (
                    <blockquote key={i}>
                      <b>
                        ★ {r.rating} · {r.owner_name}
                      </b>
                      <p>{r.body}</p>
                    </blockquote>
                  ))
                ) : (
                  <p>
                    Belum ada ulasan. Ulasan hanya berasal dari layanan yang
                    selesai.
                  </p>
                )}
              </article>
              <form
                className="sitter-panel sitter-book-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  void calculate();
                }}
              >
                <span className="sitter-eyebrow">SUSUN RENCANA PERAWATAN</span>
                <h2>Sesuai ritme si kecil.</h2>
                <p className="sitter-form-intro">
                  Pilih paket dan jadwal. Kamu baru membayar setelah sitter
                  menerima.
                </p>
                <h3 className="sitter-form-step">
                  <span>1</span>Paket & jadwal
                </h3>
                <div className="sitter-package">
                  {(["daily", "weekly"] as const).map((p) => (
                    <Button
                      type="button"
                      key={p}
                      aria-pressed={input.package === p}
                      onClick={() => {
                        change({ package: p });
                        setDays(p === "weekly" ? 7 : 1);
                      }}
                    >
                      <b>{p === "daily" ? "Harian" : "Mingguan"}</b>
                      <span>
                        {money(
                          p === "daily"
                            ? sitterPackageRate(detail.sitter)
                            : sitterPackageRate(detail.sitter, true),
                        )}{" "}
                        / {p === "daily" ? "hari" : "7 hari"}
                      </span>
                    </Button>
                  ))}
                </div>
                <label>
                  Layanan
                  <SitterSelect
                    aria-label="Layanan"
                    value={input.service_mode}
                    options={sitterModes.filter((m) =>
                      detail.sitter.service_modes.includes(m.value),
                    )}
                    onChange={(e) =>
                      change({
                        service_mode: e.target
                          .value as SittingInput["service_mode"],
                      })
                    }
                  />
                </label>
                <div className="sitter-two">
                  <label>
                    Mulai
                    <SlivaDatePicker
                      min={sittingToday()}
                      value={input.starts_on}
                      onChange={(e) => change({ starts_on: e.target.value })}
                    />
                  </label>
                  <label>
                    Durasi
                    <SitterSelect
                      aria-label="Durasi"
                      value={String(days)}
                      options={(input.package === "weekly"
                        ? [7, 14, 21, 28]
                        : Array.from({ length: 28 }, (_, i) => i + 1)
                      ).map((d) => ({ value: String(d), label: `${d} hari` }))}
                      onChange={(e) => {
                        setDays(Number(e.target.value));
                        change({});
                      }}
                    />
                  </label>
                </div>
                <p>
                  Sampai {sittingEndDate(input.starts_on, days)} · satu sesi
                  setiap hari
                </p>
                <label>
                  Jam mulai (WIB)
                  <SlivaDatePicker
                    type="time"
                    value={input.preferred_time}
                    onChange={(e) => change({ preferred_time: e.target.value })}
                  />
                </label>
                <h3 className="sitter-form-step">
                  <span>2</span>Pet & kebutuhan perawatan
                </h3>
                <fieldset>
                  <legend>Siapa yang akan ditemani?</legend>
                  {pets
                    .filter((p) => !p.accessRole || p.accessRole === "owner")
                    .map((p) => (
                      <label className="sitter-check" key={p.id}>
                        <input
                          type="checkbox"
                          checked={input.pet_ids.includes(p.id)}
                          onChange={(e) =>
                            change({
                              pet_ids: e.target.checked
                                ? [...input.pet_ids, p.id]
                                : input.pet_ids.filter((id) => id !== p.id),
                            })
                          }
                        />
                        {p.name}
                      </label>
                    ))}
                  {!pets.length && (
                    <p>Masuk dan tambahkan profil pet sebelum memesan.</p>
                  )}
                </fieldset>
                <label>
                  Alamat lengkap
                  <Textarea
                    required
                    minLength={10}
                    maxLength={1500}
                    value={input.address}
                    onChange={(e) => change({ address: e.target.value })}
                    placeholder="Alamat kunjungan, patokan, dan petunjuk akses"
                  />
                </label>
                <label>
                  Kontak darurat
                  <Input
                    type="tel"
                    required
                    value={input.emergency_phone}
                    onChange={(e) =>
                      change({ emergency_phone: e.target.value })
                    }
                    placeholder="08…"
                  />
                </label>
                <label>
                  Rutinitas & kebutuhan khusus
                  <Textarea
                    required
                    minLength={10}
                    maxLength={3000}
                    value={input.care_notes}
                    onChange={(e) => change({ care_notes: e.target.value })}
                    placeholder="Jadwal makan, alergi, kebiasaan, dokter hewan, dan hal yang membuat pet nyaman"
                  />
                </label>
                <Button
                  className="sitter-secondary"
                  disabled={busy || !input.pet_ids.length}
                >
                  {busy ? "Memeriksa…" : "Cek jadwal & biaya"}
                </Button>
                {quote && (
                  <div className="sitter-quote">
                    <p>
                      Perawatan {quote.days} hari{" "}
                      <b>{money(quote.base_amount)}</b>
                    </p>
                    <p>
                      Pet tambahan <b>{money(quote.extra_pet_amount)}</b>
                    </p>
                    {(quote.discount_amount ?? 0) > 0 && (
                      <div>
                        Diskon sitter ({quote.discount_percent}%){" "}
                        <b>−{money(quote.discount_amount!)}</b>
                      </div>
                    )}
                    {quote.savings > 0 && (
                      <p>
                        Total hemat <b>{money(quote.savings)}</b>
                      </p>
                    )}
                    <p className="total">
                      Total <strong>{money(quote.total_amount)}</strong>
                    </p>
                    <small>
                      Belum ditagih. Sitter merespons maksimal 24 jam; setelah
                      diterima, pembayaran QRIS tersedia selama 30 menit.
                    </small>
                    <Button
                      type="button"
                      className="sitter-primary"
                      disabled={busy}
                      onClick={book}
                    >
                      Kirim permintaan perawatan
                    </Button>
                  </div>
                )}
                {!authenticated && (
                  <Button type="button" onClick={onLogin}>
                    Masuk untuk memilih pet & memesan
                  </Button>
                )}
              </form>
            </div>
          </>
        )}
        {tab === "bookings" && (
          <>
            <div className="sitter-section-head">
              <h2>Perawatan saya</h2>
              <Button disabled={busy} onClick={() => void loadBookings()}>
                ↻ Perbarui
              </Button>
            </div>
            <div className="sitter-bookings">
              <aside>
                {bookings.length ? (
                  bookings.map((b) => (
                    <Button
                      key={b.id}
                      className="sitter-booking-tile"
                      aria-current={current?.id === b.id ? "true" : undefined}
                      onClick={() => void act(() => openBooking(b.id))}
                    >
                      <span className="sitter-badge">
                        {sittingStatuses[b.display_status] || b.display_status}
                      </span>
                      <strong>{b.sitter_name}</strong>
                      <span>
                        {sittingDateLabel(b.starts_on)} →{" "}
                        {sittingDateLabel(b.ends_on)}
                      </span>
                      <b>{money(b.amount)}</b>
                    </Button>
                  ))
                ) : (
                  <div className="sitter-empty">
                    <h3>Jadwal penuh sayang dimulai di sini</h3>
                    <p>
                      Permintaan dan laporan perawatanmu akan muncul setelah
                      pemesanan pertama.
                    </p>
                    <Button onClick={() => setTab("find")}>Cari sitter</Button>
                  </div>
                )}
              </aside>
              {current && (
                <article className="sitter-panel">
                  <span className="sitter-eyebrow">
                    {current.booking_number}
                  </span>
                  <h2>{current.sitter_name}</h2>
                  <p>
                    {sittingStatuses[current.display_status]} ·{" "}
                    {current.pets.map((p) => p.name).join(", ")}
                  </p>
                  <p>
                    {sittingDateLabel(current.starts_on)} —{" "}
                    {sittingDateLabel(current.ends_on)} ·{" "}
                    {current.preferred_time} WIB
                  </p>
                  <p>{current.address}</p>
                  <strong>Total {money(current.amount)}</strong>
                  {sittingProgressIndex(current.display_status) >= 0 && (
                    <ol
                      className="sitter-progress"
                      aria-label="Tahap perawatan"
                    >
                      {sittingProgressSteps.map((label, i) => (
                        <li
                          key={label}
                          data-reached={
                            i <= sittingProgressIndex(current.display_status)
                          }
                          aria-current={
                            i === sittingProgressIndex(current.display_status)
                              ? "step"
                              : undefined
                          }
                        >
                          <span>
                            {i <
                            sittingProgressIndex(current.display_status) ? (
                              <Icon name="check" size={13} />
                            ) : (
                              i + 1
                            )}
                          </span>
                          {label}
                        </li>
                      ))}
                    </ol>
                  )}
                  {sittingCancellationMessage(current) && (
                    <div className="sitter-notice">
                      {sittingCancellationMessage(current)}
                    </div>
                  )}
                  {current.display_status === "awaiting_payment" && (
                    <Button
                      className="sitter-primary"
                      disabled={busy}
                      onClick={() =>
                        void act(async () =>
                          setPayment(
                            await createPaymentIntent(
                              "pet_sitter_booking",
                              current.id,
                              "qris",
                            ),
                          ),
                        )
                      }
                    >
                      Bayar dengan QRIS
                    </Button>
                  )}
                  {payment && (
                    <QrisPaymentPanel
                      payment={payment}
                      onClose={() => setPayment(undefined)}
                      onPaid={() => {
                        setPayment(undefined);
                        void act(() => openBooking(current.id));
                      }}
                    />
                  )}
                  <h3>Care journal & percakapan</h3>
                  <p>
                    Kabar makan, minum, aktivitas, dan kondisi pet tersimpan di
                    sini. Muat ulang untuk melihat kabar terbaru.
                  </p>
                  <div className="sitter-journal">
                    {updates.map((u) => (
                      <div key={u.id}>
                        <span>{u.kind === "message" ? "♡" : "✦"}</span>
                        <div>
                          <small>
                            {u.author_name} ·{" "}
                            {new Date(u.created_at).toLocaleString("id-ID")}
                          </small>
                          <p>{u.body}</p>
                          {u.photo_url && (
                            <Image
                              src={u.photo_url}
                              width={360}
                              height={240}
                              alt="Foto laporan perawatan"
                              unoptimized
                            />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  {!["cancelled", "expired", "declined"].includes(
                    current.display_status,
                  ) && (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        void act(async () => {
                          await sitterClient.message(current.id, message);
                          await openBooking(current.id);
                        });
                      }}
                    >
                      <label>
                        Kirim pesan
                        <Textarea
                          value={message}
                          onChange={(e) => setMessage(e.target.value)}
                          required
                          maxLength={2000}
                          placeholder="Titip pesan untuk sitter…"
                        />
                      </label>
                      <Button disabled={busy || !message.trim()}>
                        Kirim pesan
                      </Button>
                    </form>
                  )}
                  {current.display_status === "completed" &&
                    !current.review_rating && (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          void act(async () => {
                            await sitterClient.review(
                              current.id,
                              Number(rating),
                              review,
                            );
                            await openBooking(current.id);
                            setReview("");
                          });
                        }}
                      >
                        <h3>Bagaimana pengalamannya?</h3>
                        <SitterSelect
                          aria-label="Rating sitter"
                          value={rating}
                          options={[5, 4, 3, 2, 1].map((n) => ({
                            value: String(n),
                            label: `${n} bintang`,
                          }))}
                          onChange={(e) => setRating(e.target.value)}
                        />
                        <Textarea
                          required
                          minLength={10}
                          maxLength={1000}
                          aria-label="Ulasan sitter"
                          value={review}
                          onChange={(e) => setReview(e.target.value)}
                        />
                        <Button disabled={busy}>Kirim ulasan</Button>
                      </form>
                    )}
                  {[
                    "requested",
                    "awaiting_payment",
                    "confirmed",
                    "in_progress",
                  ].includes(current.display_status) &&
                    !current.cancellation_requested && (
                      <details>
                        <summary>Perlu membatalkan?</summary>
                        <label>
                          Alasan pembatalan
                          <Textarea
                            minLength={10}
                            maxLength={2000}
                            value={cancelNote}
                            onChange={(e) => setCancelNote(e.target.value)}
                          />
                        </label>
                        <Button
                          disabled={busy || cancelNote.trim().length < 10}
                          onClick={() => void statusAction("cancel")}
                        >
                          {current.payment_status === "paid"
                            ? "Ajukan pembatalan"
                            : "Batalkan permintaan"}
                        </Button>
                      </details>
                    )}
                </article>
              )}
            </div>
          </>
        )}
      </LocalizedCopy>
    </section>
  );
}
