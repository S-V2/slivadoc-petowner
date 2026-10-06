"use client";

import NextImage from "next/image";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { Icon } from "../Icon";
import { DiscountBadge } from "../DiscountBadge";
import { PetSpotDetail } from "./PetSpotDetail";
import { PetHubComposer } from "./PetHubComposer";
import { PetHubStoryView } from "./PetHubStoryView";
import { petHubPhotos, petHubVideoPoster } from "../../lib/pethub-media";
import {
  petHubContentLink,
  PET_HUB_DOUBLE_TAP_MS,
} from "../../lib/pethub-interactions";
import { petSpotCategory } from "../../lib/petspot-booking";
import {
  createPetHubComment,
  createPaymentIntent,
  enrollAcademy,
  getAcademyProgram,
  getAcademyPrograms,
  getAcademyTrainer,
  getAcademyTrainers,
  saveAcademyProgramReview,
  trackAcademyProgramClick,
  getPetEvents,
  getPetHubFeed,
  getPetHubComments,
  getPetHubStories,
  getPetHubStreams,
  getPetSpots,
  reactPetHubPost,
  likePetHubPost,
  savePetHubPost,
  togglePetHubChannel,
  isPetOwnerAuthenticated,
  registerEvent,
  type AcademyProgram,
  type AcademyProgramDetail,
  type AcademyReview,
  type AcademyTrainer,
  type PetEvent,
  type PetHubPost,
  type PetHubComment,
  type PetHubStory,
  type PetHubStream,
  type PetSpot,
  type PaymentIntent,
  type ActivityType,
} from "../../lib/platform-api";
import { QrisPaymentPanel, PaymentMethodPicker } from "../payments/QrisPayment";
import "../../event-checkout.css";
import "../../petspot-experience.css";

export type DiscoveryMode = "academy" | "events" | "petspot" | "pethub";
type Props = {
  mode: DiscoveryMode;
  petName: string;
  pets?: Array<{
    id: string;
    name: string;
    species: string;
    breed: string;
    avatar: string;
  }>;
  ownerName?: string;
  ownerEmail?: string;
  notify: (message: string) => void;
  navigate: (mode: DiscoveryMode) => void;
};

const money = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});
const when = (value?: string) =>
  value
    ? new Intl.DateTimeFormat("id-ID", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(value))
    : "Segera diumumkan";

const academySince = (value?: string) => {
  if (!value) return "Program baru";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Program baru";
  return `Berjalan sejak ${new Intl.DateTimeFormat("id-ID", {
    month: "short",
    year: "numeric",
  }).format(date)}`;
};
const academySpecies = [
  { id: "all", label: "Semua pet", icon: "✦" },
  { id: "dog", label: "Anjing", icon: "🐕" },
  { id: "cat", label: "Kucing", icon: "🐈" },
  { id: "rabbit", label: "Kelinci", icon: "🐇" },
  { id: "bird", label: "Burung", icon: "🦜" },
  { id: "small_mammal", label: "Small pet", icon: "🐹" },
] as const;

function AcademyPrice({
  program,
  compact = false,
}: {
  program: AcademyProgram;
  compact?: boolean;
}) {
  const discounted =
    program.discount_percent > 0 && program.original_price > program.price;
  return (
    <span
      className={`academy-price ${compact ? "is-compact" : ""} ${discounted ? "is-discounted" : ""}`}
    >
      {discounted ? <s>{money.format(program.original_price)}</s> : null}
      <strong>
        {program.price > 0 ? money.format(program.price) : "Gratis"}
      </strong>
    </span>
  );
}

function WorldImageGallery({
  images,
  alt,
  fallback,
  tag,
  className = "",
  onDoubleTap,
}: {
  images: Array<string | undefined>;
  alt: string;
  fallback: string;
  tag: string;
  className?: string;
  onDoubleTap?: () => void;
}) {
  const gallery = [
    ...new Set(images.filter((url): url is string => Boolean(url?.trim()))),
  ];
  const [active, setActive] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (tapTimer.current) clearTimeout(tapTimer.current);
    },
    [],
  );
  useEffect(() => {
    if (gallery.length < 2 || expanded) return;
    const timer = window.setInterval(
      () => setActive((current) => (current + 1) % gallery.length),
      1_000,
    );
    return () => window.clearInterval(timer);
  }, [gallery.length, expanded]);
  if (!gallery.length)
    return (
      <div className={`modal-world-cover ${className}`}>
        <span>{fallback}</span>
        {className.includes("petspot") ? (
          <small className="petspot-photo-empty">
            Foto tempat belum diunggah
          </small>
        ) : null}
        <i>{tag}</i>
      </div>
    );
  const move = (direction: number) =>
    setActive(
      (current) => (current + direction + gallery.length) % gallery.length,
    );
  return (
    <>
      <div className={`modal-world-cover world-image-gallery ${className}`}>
        <button
          type="button"
          className="world-image-open"
          onClick={(event) => {
            if (!onDoubleTap) {
              setExpanded(true);
              return;
            }
            if (tapTimer.current) clearTimeout(tapTimer.current);
            if (event.detail < 2)
              tapTimer.current = setTimeout(
                () => setExpanded(true),
                PET_HUB_DOUBLE_TAP_MS,
              );
          }}
          onDoubleClick={(event) => {
            if (!onDoubleTap) return;
            event.preventDefault();
            event.stopPropagation();
            if (tapTimer.current) clearTimeout(tapTimer.current);
            onDoubleTap();
          }}
          aria-label={`Buka galeri ${alt}`}
        >
          <NextImage
            src={gallery[active % gallery.length]}
            alt={`${alt} ${(active % gallery.length) + 1}`}
            fill
            sizes="(max-width: 720px) 100vw, 680px"
            unoptimized
          />
        </button>
        <i>{tag}</i>
        {gallery.length > 1 ? (
          <div className="world-image-controls">
            <button
              type="button"
              onClick={() => move(-1)}
              aria-label="Gambar sebelumnya"
            >
              ‹
            </button>
            <span>
              {(active % gallery.length) + 1} / {gallery.length}
            </span>
            <button
              type="button"
              onClick={() => move(1)}
              aria-label="Gambar berikutnya"
            >
              ›
            </button>
          </div>
        ) : null}
      </div>
      {expanded ? (
        <div
          className="world-image-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={`Galeri ${alt}`}
          onClick={() => setExpanded(false)}
        >
          <button
            type="button"
            className="world-image-close"
            onClick={() => setExpanded(false)}
            aria-label="Tutup galeri"
          >
            ×
          </button>
          <div
            className="world-image-lightbox-frame"
            onClick={(event) => event.stopPropagation()}
          >
            <NextImage
              src={gallery[active % gallery.length]}
              alt={`${alt} ${(active % gallery.length) + 1}`}
              fill
              sizes="100vw"
              unoptimized
              priority
            />
          </div>
          {gallery.length > 1 ? (
            <>
              <button
                type="button"
                className="world-image-prev"
                onClick={(event) => {
                  event.stopPropagation();
                  move(-1);
                }}
                aria-label="Gambar sebelumnya"
              >
                ‹
              </button>
              <button
                type="button"
                className="world-image-next"
                onClick={(event) => {
                  event.stopPropagation();
                  move(1);
                }}
                aria-label="Gambar berikutnya"
              >
                ›
              </button>
              <span className="world-image-count">
                {(active % gallery.length) + 1} / {gallery.length}
              </span>
            </>
          ) : null}
        </div>
      ) : null}
    </>
  );
}

export default function PlatformDiscovery({
  mode,
  petName,
  pets = [],
  ownerName = "Pet Parent",
  ownerEmail = "",
  notify,
  navigate,
}: Props) {
  const [programs, setPrograms] = useState<AcademyProgram[]>([]);
  const [academyTrainers, setAcademyTrainers] = useState<AcademyTrainer[]>([]);
  const [selectedTrainer, setSelectedTrainer] = useState<AcademyTrainer | null>(
    null,
  );
  const [trainerSpecies, setTrainerSpecies] = useState(
    pets[0]?.species?.toLowerCase() || "all",
  );
  const [events, setEvents] = useState<PetEvent[]>([]);
  const [spots, setSpots] = useState<PetSpot[]>([]);
  const [streams, setStreams] = useState<PetHubStream[]>([]);
  const [posts, setPosts] = useState<PetHubPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProgram, setSelectedProgram] = useState<AcademyProgram | null>(
    null,
  );
  const [selectedEvent, setSelectedEvent] = useState<PetEvent | null>(null);
  const [selectedSpot, setSelectedSpot] = useState<PetSpot | null>(null);
  const [selectedStream, setSelectedStream] = useState<PetHubStream | null>(
    null,
  );
  const [composer, setComposer] = useState(false);
  const [storyComposer, setStoryComposer] = useState(false);
  const [stories, setStories] = useState<PetHubStory[]>([]);
  const [viewStory, setViewStory] = useState<PetHubStory | null>(null);
  const [commentPost, setCommentPost] = useState<PetHubPost | null>(null);
  const [filter, setFilter] = useState("all");
  const [renderedAt] = useState(() => Date.now());
  const [spotSearch, setSpotSearch] = useState("");
  const [maxDistance, setMaxDistance] = useState(25);
  const [hubTab, setHubTab] = useState("Untuk Kamu");
  const [sharedPostID, setSharedPostID] = useState(() =>
    typeof window === "undefined"
      ? ""
      : new URL(window.location.href).searchParams.get("post") || "",
  );
  const [heartBurst, setHeartBurst] = useState("");
  const heartTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (heartTimer.current) clearTimeout(heartTimer.current);
    },
    [],
  );
  const pendingLikes = useRef(new Set<string>());
  const pendingSaves = useRef(new Set<string>());
  const speciesRailRef = useRef<HTMLDivElement>(null);
  const trainerRailRef = useRef<HTMLDivElement>(null);
  const advanceRail = (node: HTMLDivElement | null) => {
    if (!node) return;
    const nextLeft = node.scrollLeft + Math.max(240, node.clientWidth * 0.82);
    const reachedEnd = nextLeft >= node.scrollWidth - 8;
    node.scrollTo({ left: reachedEnd ? 0 : nextLeft, behavior: "smooth" });
  };
  useEffect(() => {
    void Promise.resolve().then(() => setLoading(true));
    const failed = (label: string) => (error: unknown) => {
      notify(
        error instanceof Error ? error.message : `${label} belum dapat dimuat`,
      );
    };
    if (mode === "academy") {
      void Promise.all([
        getAcademyPrograms(),
        getAcademyTrainers(
          trainerSpecies === "all" ? undefined : { species: trainerSpecies },
        ),
      ])
        .then(([programValue, trainerValue]) => {
          setPrograms(programValue.data);
          setAcademyTrainers(trainerValue.data);
        })
        .catch(failed("Program academy"))
        .finally(() => setLoading(false));
      return;
    }
    if (mode === "events") {
      void getPetEvents()
        .then((value) => setEvents(value.data))
        .catch(failed("Pet event"))
        .finally(() => setLoading(false));
      return;
    }
    if (mode === "petspot") {
      void getPetSpots()
        .then((value) => setSpots(value.data))
        .catch(failed("PetSpot"))
        .finally(() => setLoading(false));
      return;
    }
    void Promise.all([getPetHubStreams(), getPetHubStories()])
      .then(([stream, story]) => {
        setStreams(stream.data);
        setStories(story.data);
      })
      .catch(failed("PetHub"))
      .finally(() => setLoading(false));
  }, [mode, notify, trainerSpecies]);

  async function openTrainer(trainer: AcademyTrainer) {
    setSelectedTrainer(trainer);
    try {
      setSelectedTrainer(await getAcademyTrainer(trainer.id));
    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : "Detail pet trainer belum dapat dimuat",
      );
    }
  }
  useEffect(() => {
    if (selectedProgram)
      void trackAcademyProgramClick(selectedProgram.id).catch(() => undefined);
  }, [selectedProgram]);
  useEffect(() => {
    if (mode !== "pethub") return;
    let active = true;
    const type =
      hubTab === "Reels" ? "video" : hubTab === "Thread" ? "thread" : "";
    const tab = hubTab === "Mengikuti" ? "following" : "for_you";
    void Promise.resolve().then(() => setLoading(true));
    void getPetHubFeed(sharedPostID ? { post_id: sharedPostID } : { tab, type })
      .then((response) => {
        if (active) setPosts(response.data);
      })
      .catch((error) =>
        notify(
          error instanceof Error
            ? error.message
            : "Feed PetHub belum dapat dimuat",
        ),
      )
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [hubTab, mode, notify, ownerEmail, sharedPostID]);
  const categorySpots = useMemo(
    () =>
      spots.filter(
        (item) =>
          (filter === "all" || item.category === filter) &&
          item.name.toLowerCase().includes(spotSearch.toLowerCase()) &&
          (!Number.isFinite(item.distance_km) ||
            Number(item.distance_km) <= maxDistance),
      ),
    [spots, filter, spotSearch, maxDistance],
  );
  const relative = (value: string) => {
    const minutes = Math.max(
      1,
      Math.floor((renderedAt - new Date(value).getTime()) / 60000),
    );
    return minutes < 60
      ? `${minutes}m`
      : minutes < 1440
        ? `${Math.floor(minutes / 60)}j`
        : `${Math.floor(minutes / 1440)}h`;
  };

  async function locate() {
    if (!navigator.geolocation) return notify("GPS tidak tersedia");
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const response = await getPetSpots({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            search: spotSearch,
            category: filter === "all" ? undefined : filter,
            max_distance_km: maxDistance,
          });
          setSpots(response.data);
          notify("PetSpot diurutkan berdasarkan koordinat perangkat");
        } catch (error) {
          notify(
            error instanceof Error
              ? error.message
              : "PetSpot belum dapat dimuat",
          );
        }
      },
      () => notify("Izinkan lokasi untuk menghitung jarak PetSpot"),
      { enableHighAccuracy: true, timeout: 12000 },
    );
  }
  async function like(post: PetHubPost, ensureLiked = false) {
    if (!isPetOwnerAuthenticated()) {
      loginRequired();
      return;
    }
    const burst = () => {
      setHeartBurst(post.id);
      if (heartTimer.current) clearTimeout(heartTimer.current);
      heartTimer.current = setTimeout(() => setHeartBurst(""), 900);
    };
    if (ensureLiked && post.liked) {
      burst();
      return;
    }
    if (pendingLikes.current.has(post.id)) return;
    pendingLikes.current.add(post.id);
    try {
      const result = await (ensureLiked
        ? likePetHubPost(post.id)
        : reactPetHubPost(post.id));
      if (ensureLiked) burst();
      setPosts((current) =>
        current.map((item) =>
          item.id === post.id
            ? { ...item, liked: result.liked, like_count: result.like_count }
            : item,
        ),
      );
    } catch (error) {
      notify(
        error instanceof Error ? error.message : "Reaksi belum dapat disimpan",
      );
    } finally {
      pendingLikes.current.delete(post.id);
    }
  }
  async function sharePost(post: PetHubPost) {
    try {
      if (navigator.share)
        await navigator.share({
          title: "PetHub · Slivadoc",
          text: post.content,
          url: petHubContentLink(post.id),
        });
      else {
        await navigator.clipboard.writeText(petHubContentLink(post.id));
        notify("Tautan konten Slivadoc disalin");
      }
    } catch (cause) {
      if (!(cause instanceof Error && cause.name === "AbortError"))
        notify("Konten belum dapat dibagikan");
    }
  }
  async function followChannel(channelID?: string) {
    if (!channelID || !isPetOwnerAuthenticated()) {
      loginRequired();
      return;
    }
    try {
      const result = await togglePetHubChannel(channelID);
      setPosts((current) =>
        current.map((item) =>
          item.channel_id === channelID
            ? { ...item, following: result.following }
            : item,
        ),
      );
      notify(
        result.following
          ? "Channel sekarang diikuti"
          : "Berhenti mengikuti channel",
      );
    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : "Channel belum dapat diperbarui",
      );
    }
  }
  function loginRequired() {
    notify("Silakan login terlebih dahulu untuk melanjutkan.");
    window.dispatchEvent(new CustomEvent("slivadoc:login-required"));
  }
  async function savePost(post: PetHubPost) {
    if (!isPetOwnerAuthenticated()) {
      loginRequired();
      return;
    }
    if (pendingSaves.current.has(post.id)) return;
    pendingSaves.current.add(post.id);
    try {
      const result = await savePetHubPost(post.id);
      setPosts((current) =>
        current.map((item) =>
          item.id === post.id ? { ...item, saved: result.saved } : item,
        ),
      );
      notify(
        result.saved ? "Posting disimpan" : "Posting dihapus dari koleksi",
      );
    } catch (cause) {
      notify(
        cause instanceof Error ? cause.message : "Posting belum dapat disimpan",
      );
    } finally {
      pendingSaves.current.delete(post.id);
    }
  }

  if (mode === "academy")
    return (
      <>
        <UniverseNav active={mode} navigate={navigate} />
        <section className="world-hero academy-hero">
          <div>
            <span>SLIVADOC PET ACADEMY</span>
            <h2>Belajar bersama. Bertumbuh bersama.</h2>
            <p>
              Program training terverifikasi dengan kurikulum terukur, positive
              reinforcement, dan progres digital untuk {petName}.
            </p>
            <button
              type="button"
              onClick={() =>
                document
                  .querySelector("#academy-catalog")
                  ?.scrollIntoView({ behavior: "smooth" })
              }
            >
              Jelajahi program <Icon name="arrow" size={16} />
            </button>
          </div>
          <div className="hero-stat">
            <b>4,9</b>
            <small>rating academy partner</small>
          </div>
        </section>
        <section className="academy-trainer-section">
          <div className="academy-trainer-heading">
            <div>
              <small>PET TRAINER TERVERIFIKASI</small>
              <h2>Trainer sesuai jenis pet</h2>
              <p>Pilih spesialis yang paling cocok sebelum menentukan kelas.</p>
            </div>
            <div className="academy-carousel academy-species-carousel">
              <div
                ref={speciesRailRef}
                className="academy-species-filter"
                aria-label="Filter jenis pet"
              >
                {academySpecies.map((species) => (
                  <button
                    type="button"
                    key={species.id}
                    className={trainerSpecies === species.id ? "active" : ""}
                    onClick={() => setTrainerSpecies(species.id)}
                  >
                    <span>{species.icon}</span>
                    <b>{species.label}</b>
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="academy-carousel-next"
                onClick={() => advanceRail(speciesRailRef.current)}
                aria-label="Lihat jenis pet berikutnya"
              >
                <Icon name="arrow" size={17} />
              </button>
            </div>
          </div>
          <div className="academy-carousel academy-trainer-carousel">
            <div ref={trainerRailRef} className="academy-trainer-list">
              {academyTrainers.map((trainer) => (
                <button
                  type="button"
                  className="academy-trainer-card"
                  key={trainer.id}
                  onClick={() => void openTrainer(trainer)}
                >
                  <span className="academy-trainer-avatar">
                    {trainer.photo_url ? (
                      <NextImage
                        src={trainer.photo_url}
                        alt=""
                        width={72}
                        height={72}
                        unoptimized
                      />
                    ) : (
                      trainer.full_name.slice(0, 1)
                    )}
                  </span>
                  <span>
                    <small>{trainer.academy_name}</small>
                    <b>{trainer.full_name}</b>
                    <em>
                      ★ {trainer.rating.toFixed(1)} · {trainer.experience_years}{" "}
                      tahun
                    </em>
                    <i>{trainer.specialties.slice(0, 3).join(" · ")}</i>
                  </span>
                  <strong>Lihat profil</strong>
                </button>
              ))}
            </div>
            {academyTrainers.length > 3 ? (
              <button
                type="button"
                className="academy-carousel-next academy-trainer-next"
                onClick={() => advanceRail(trainerRailRef.current)}
                aria-label="Lihat pet trainer berikutnya"
              >
                <Icon name="arrow" size={18} />
              </button>
            ) : null}
          </div>
        </section>
        <div className="world-toolbar">
          <div>
            <button
              className={filter === "all" ? "active" : ""}
              onClick={() => setFilter("all")}
            >
              Semua
            </button>
            {["obedience", "behavior", "agility", "handler"].map((item) => (
              <button
                className={filter === item ? "active" : ""}
                key={item}
                onClick={() => setFilter(item)}
              >
                {item.replace("-", " ")}
              </button>
            ))}
          </div>
          <span>
            {loading
              ? "Memuat program…"
              : `${programs.length} program tersedia`}
          </span>
        </div>
        <div id="academy-catalog" className="academy-grid">
          {programs
            .filter((item) => filter === "all" || item.category === filter)
            .map((item, index) => {
              const participantCount = item.participant_count ?? 0;
              const reviewCount = item.review_count ?? 0;
              const occupancy = Math.min(
                100,
                Math.round(
                  (participantCount / Math.max(1, item.capacity)) * 100,
                ),
              );
              const galleryCount = new Set(
                [item.cover_url, ...(item.image_urls ?? [])].filter(Boolean),
              ).size;
              return (
                <article
                  className="academy-card academy-card--experience"
                  key={item.id}
                >
                  <button
                    type="button"
                    className={`academy-visual tone-${index % 3}`}
                    onClick={() => setSelectedProgram(item)}
                    aria-label={`Lihat detail ${item.title}`}
                  >
                    {item.cover_url ? (
                      <NextImage
                        src={item.cover_url}
                        alt={`Kelas ${item.title}`}
                        fill
                        sizes="(max-width: 720px) 100vw, 33vw"
                        unoptimized
                      />
                    ) : (
                      <span aria-hidden="true">
                        {index % 3 === 0 ? "🐕‍🦺" : index % 3 === 1 ? "🐶" : "🏅"}
                      </span>
                    )}
                    <span className="academy-media-shade" />
                    <span className="academy-media-topline">
                      {item.featured ? (
                        <b>✦ PILIHAN SLIVADOC</b>
                      ) : (
                        <b>{item.level}</b>
                      )}
                      {item.discount_percent > 0 ? (
                        <DiscountBadge percent={item.discount_percent} />
                      ) : null}
                    </span>
                    <span className="academy-media-bottomline">
                      <small>{item.academy_name}</small>
                      {galleryCount > 1 ? <i>▧ {galleryCount} foto</i> : null}
                    </span>
                  </button>
                  <div className="academy-card-body">
                    <div className="academy-card-proof">
                      <span>
                        {reviewCount > 0
                          ? `★ ${(item.rating ?? 0).toFixed(1)}`
                          : "☆ Belum dinilai"}
                      </span>
                      <span>{reviewCount} ulasan</span>
                      <span>{academySince(item.running_since)}</span>
                    </div>
                    <h3>{item.title}</h3>
                    <p>{item.description}</p>
                    <div className="academy-cohort-progress">
                      <div>
                        <span>Alumni & peserta</span>
                        <b>{participantCount} pet</b>
                      </div>
                      <i>
                        <span style={{ width: `${occupancy}%` }} />
                      </i>
                    </div>
                    <div className="trainer-line">
                      <span>{item.trainer_name.slice(0, 1)}</span>
                      <p>
                        <b>{item.trainer_name}</b>
                        <small>
                          {item.duration_weeks} minggu · {item.session_count}{" "}
                          sesi
                        </small>
                      </p>
                      <em>{when(item.next_schedule)}</em>
                    </div>
                    <div className="academy-card-checkout">
                      <AcademyPrice program={item} compact />
                      <button
                        type="button"
                        onClick={() => setSelectedProgram(item)}
                      >
                        Lihat kelas <Icon name="arrow" size={14} />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
        </div>
        {selectedProgram && (
          <ProgramModal
            item={selectedProgram}
            petName={petName}
            pets={pets}
            ownerName={ownerName}
            close={() => setSelectedProgram(null)}
            notify={notify}
            openTrainer={(trainer) => void openTrainer(trainer)}
          />
        )}
        {selectedTrainer && (
          <AcademyTrainerModal
            trainer={selectedTrainer}
            close={() => setSelectedTrainer(null)}
          />
        )}
      </>
    );

  if (mode === "events") {
    const featured = events.find((item) => item.featured) || events[0];
    return (
      <>
        <UniverseNav active={mode} navigate={navigate} />
        {featured && (
          <section
            className={`event-banner ${featured.banner_url ? "has-media" : ""}`}
          >
            {featured.banner_url ? (
              <NextImage
                className="event-banner-media"
                src={featured.banner_url}
                alt=""
                fill
                sizes="100vw"
                unoptimized
                priority
              />
            ) : null}
            <span className="event-banner-shade" />
            <div className="event-banner-date">
              <b>{new Date(featured.starts_at).getDate()}</b>
              <small>
                {new Intl.DateTimeFormat("id-ID", { month: "short" }).format(
                  new Date(featured.starts_at),
                )}
              </small>
            </div>
            <div>
              <span className="event-featured-label">✦ FEATURED PET EVENT</span>
              <h2>{featured.title}</h2>
              <p>{featured.description}</p>
              <div className="event-meta">
                <span>
                  ⌖ {featured.venue}, {featured.city}
                </span>
                <span>◷ {when(featured.starts_at)}</span>
              </div>
              <div className="event-banner-chips">
                <span>✓ Pet friendly</span>
                <span>
                  {featured.price ? money.format(featured.price) : "Gratis"}
                </span>
                <span>
                  {Math.max(0, featured.capacity - featured.registered_count)}{" "}
                  slot tersisa
                </span>
              </div>
              <button type="button" onClick={() => setSelectedEvent(featured)}>
                Lihat detail event <Icon name="arrow" size={16} />
              </button>
            </div>
            <div className="event-capacity">
              <b>{featured.registered_count.toLocaleString("id-ID")}</b>
              <small>pet parent terdaftar</small>
              <i>
                <span
                  style={{
                    width: `${Math.min(100, (featured.registered_count / featured.capacity) * 100)}%`,
                  }}
                />
              </i>
            </div>
          </section>
        )}
        <div className="section-title-world">
          <div>
            <span>EVENT MENDATANG</span>
            <h2>Isi kalender pet-mu</h2>
          </div>
        </div>
        <div className="event-grid">
          {events.map((item, index) => {
            const eventImages = [
              ...new Set(
                [item.banner_url, ...(item.image_urls ?? [])].filter(Boolean),
              ),
            ];
            const remaining = Math.max(
              0,
              item.capacity - item.registered_count,
            );
            const occupancy = Math.min(
              100,
              Math.round(
                (item.registered_count / Math.max(1, item.capacity)) * 100,
              ),
            );
            return (
              <button
                type="button"
                className="event-card event-card--experience"
                key={item.id}
                onClick={() => setSelectedEvent(item)}
              >
                <div className={`event-art event-art-${index % 3}`}>
                  {item.banner_url ? (
                    <NextImage
                      src={item.banner_url}
                      alt={`Event ${item.title}`}
                      fill
                      sizes="(max-width: 720px) 100vw, 33vw"
                      unoptimized
                    />
                  ) : (
                    <span>
                      {item.category === "sport"
                        ? "🏃‍♀️🐕"
                        : item.category === "community"
                          ? "☕🐾"
                          : "🎪"}
                    </span>
                  )}
                  <span className="event-art-shade" />
                  <span className="event-art-topline">
                    <i>{item.category}</i>
                    {item.featured ? <b>✦ Pilihan</b> : null}
                  </span>
                  <span className="event-date-chip">
                    <b>{new Date(item.starts_at).getDate()}</b>
                    <small>
                      {new Intl.DateTimeFormat("id-ID", {
                        month: "short",
                      }).format(new Date(item.starts_at))}
                    </small>
                  </span>
                  {eventImages.length > 1 ? (
                    <em>▧ {eventImages.length} foto</em>
                  ) : null}
                </div>
                <div>
                  <small>{when(item.starts_at)}</small>
                  <h3>{item.title}</h3>
                  <p>
                    ⌖ {item.venue} · {item.city}
                  </p>
                  <div className="event-card-stats">
                    <span>
                      <b>{item.registered_count}</b>
                      <small>terdaftar</small>
                    </span>
                    <span>
                      <b>{remaining}</b>
                      <small>slot tersisa</small>
                    </span>
                    <span>
                      <b>{item.allowed_pet_species?.length || "Semua"}</b>
                      <small>jenis pet</small>
                    </span>
                  </div>
                  <div
                    className="event-seat-progress"
                    aria-label={`${occupancy}% kapasitas terisi`}
                  >
                    <i>
                      <span style={{ width: `${occupancy}%` }} />
                    </i>
                    <small>{occupancy}% kapasitas terisi</small>
                  </div>
                  <footer>
                    <span>
                      <small>Mulai dari</small>
                      <b>{item.price ? money.format(item.price) : "Gratis"}</b>
                    </span>
                    <strong>
                      Lihat event <Icon name="arrow" size={14} />
                    </strong>
                  </footer>
                </div>
              </button>
            );
          })}
        </div>
        {selectedEvent && (
          <EventModal
            item={selectedEvent}
            ownerName={ownerName}
            ownerEmail={ownerEmail}
            pets={pets}
            close={() => setSelectedEvent(null)}
            notify={notify}
          />
        )}
      </>
    );
  }

  if (mode === "petspot")
    return (
      <>
        <UniverseNav active={mode} navigate={navigate} />
        <section className="petspot-head">
          <div>
            <span>PET FRIENDLY DISCOVERY</span>
            <h2>Ke mana hari ini bersama {petName}?</h2>
            <p>
              Temukan pilihan ramah pet dari berbagai kota dan hitung jaraknya
              dari posisimu.
            </p>
          </div>
          <button type="button" onClick={() => void locate()}>
            <Icon name="map" size={18} /> Gunakan lokasi saya
          </button>
        </section>
        <div className="petspot-search">
          <label className="petspot-query">
            <Icon name="search" />
            <input
              value={spotSearch}
              onChange={(event) => setSpotSearch(event.target.value)}
              placeholder="Cari cafe, kosan, apartemen, mall…"
            />
          </label>
          <label className="petspot-radius">
            <span>Radius pencarian</span>
            <select
              value={maxDistance}
              onChange={(event) => setMaxDistance(Number(event.target.value))}
            >
              <option value="3">3 km</option>
              <option value="5">5 km</option>
              <option value="10">10 km</option>
              <option value="25">25 km</option>
              <option value="100">100 km</option>
            </select>
          </label>
          <button onClick={() => void locate()}>
            <Icon name="map" size={16} /> Cari dari posisi saya
          </button>
        </div>
        <div className="world-toolbar spot-filter">
          <div>
            {[
              { id: "all", label: "Semua", emoji: "⌖" },
              { id: "cafe", label: "Cafe", emoji: "☕" },
              { id: "restaurant", label: "Restoran", emoji: "🍽" },
              { id: "hotel", label: "Hotel", emoji: "🏨" },
              { id: "boarding_house", label: "Kosan / Coliving", emoji: "🏡" },
              { id: "apartment", label: "Apartemen", emoji: "🏢" },
              { id: "mall", label: "Mall", emoji: "🏬" },
              { id: "park", label: "Taman", emoji: "🌳" },
              { id: "other", label: "Lainnya", emoji: "🎾" },
            ].map((item) => (
              <button
                className={filter === item.id ? "active" : ""}
                key={item.id}
                onClick={() => setFilter(item.id)}
              >
                {item.emoji} {item.label}
              </button>
            ))}
          </div>
          <span>{categorySpots.length} tempat ditemukan</span>
        </div>
        <div className="petspot-grid" aria-label="Daftar tempat ramah pet">
          {loading ? (
            <div role="status" className="petspot-loading">
              Memuat tempat dari API…
            </div>
          ) : (
            categorySpots.map((item) => (
              <article className="petspot-card" key={item.id}>
                <WorldImageGallery
                  images={[item.cover_url, ...(item.image_urls ?? [])]}
                  alt={item.name}
                  fallback="⌖"
                  tag={
                    item.id.startsWith("92000000-")
                      ? "Demo · Foto ilustrasi"
                      : item.verified
                        ? "✓ Verified"
                        : petSpotCategory(item.category)
                  }
                  className="petspot-card-gallery"
                />
                <button
                  type="button"
                  className="petspot-card-content"
                  aria-label={`Lihat detail ${item.name}`}
                  onClick={() => setSelectedSpot(item)}
                >
                  <small className="petspot-card-category">
                    {petSpotCategory(item.category)}
                  </small>
                  <h3>{item.name}</h3>
                  <p className="petspot-card-rating">
                    ★{" "}
                    {item.review_count
                      ? `${Number(item.rating).toFixed(1)} (${item.review_count})`
                      : "Belum dinilai"}
                  </p>
                  <p className="petspot-card-location">
                    <Icon name="map" size={13} />
                    {item.city}
                    {typeof item.distance_km === "number"
                      ? ` · ${item.distance_km.toFixed(1)} km`
                      : ""}
                  </p>
                  <div className="petspot-card-facilities">
                    {(item.pet_facilities ?? []).slice(0, 2).map((facility) => (
                      <span key={facility}>{facility}</span>
                    ))}
                  </div>
                  <footer>
                    <b>
                      {item.reservable ? "Reservasi tersedia" : "Lihat tempat"}
                    </b>
                    <Icon name="arrow" size={17} />
                  </footer>
                </button>
              </article>
            ))
          )}
          {!loading && !categorySpots.length ? (
            <div className="empty-state">
              <span>⌖</span>
              <h3>Tempat belum ditemukan</h3>
              <p>Ubah kata kunci, kategori, atau radius.</p>
            </div>
          ) : null}
        </div>
        {selectedSpot && (
          <SpotModal
            item={selectedSpot}
            close={() => setSelectedSpot(null)}
            notify={notify}
            ownerName={ownerName}
          />
        )}
      </>
    );

  return (
    <>
      <UniverseNav active={mode} navigate={navigate} />
      <section className="pethub-head">
        <div>
          <span>
            <i /> PETHUB LIVE
          </span>
          <h2>Satu layar untuk seluruh dunia pet.</h2>
          <p>
            Live streaming, video, story foto, channel, komentar, dan pet thread
            dalam satu ruang.
          </p>
        </div>
        <button
          className="primary-button"
          onClick={() =>
            isPetOwnerAuthenticated() ? setComposer(true) : loginRequired()
          }
        >
          ＋ Buat posting
        </button>
      </section>
      <div className="story-strip">
        <button
          className="story-add"
          onClick={() =>
            isPetOwnerAuthenticated() ? setStoryComposer(true) : loginRequired()
          }
        >
          <span>＋</span>
          <b>Story kamu</b>
        </button>
        {stories.map((story) => (
          <button key={story.id} onClick={() => setViewStory(story)}>
            <span>
              {story.photo_url &&
              (story.media_type !== "video" ||
                petHubVideoPoster(story.media_url || story.photo_url)) ? (
                <NextImage
                  src={
                    story.media_type === "video"
                      ? petHubVideoPoster(story.media_url || story.photo_url)
                      : story.photo_url
                  }
                  alt=""
                  width={128}
                  height={128}
                  unoptimized
                />
              ) : story.media_type === "video" ? (
                "▶"
              ) : (
                story.author_name.slice(0, 1)
              )}
            </span>
            <b>{story.author_name.split(" ")[0]}</b>
          </button>
        ))}
      </div>
      <div className="stream-strip">
        {streams.map((item, index) => (
          <button
            key={item.id}
            className={item.status === "live" ? "live" : ""}
            onClick={() => setSelectedStream(item)}
          >
            <div className={`stream-art stream-${index % 3}`}>
              <span>{index % 2 ? "👩🏻‍⚕️" : "🐕‍🦺"}</span>
              {item.status === "live" ? <i>● LIVE</i> : <i>◷ TERJADWAL</i>}
              <b>▶</b>
            </div>
            <div>
              <span className="channel-avatar">
                {item.channel_name.slice(0, 1)}
              </span>
              <p>
                <strong>{item.title}</strong>
                <small>
                  {item.channel_name} {item.verified && "✓"}
                </small>
                <em>
                  {item.status === "live"
                    ? `${item.viewer_count.toLocaleString("id-ID")} menonton`
                    : when(item.scheduled_at)}
                </em>
              </p>
            </div>
          </button>
        ))}
      </div>
      <div className="pethub-layout">
        <section className="hub-feed">
          {sharedPostID ? (
            <div className="hub-shared-post">
              <b>Posting yang dibagikan</b>
              <button
                onClick={() => {
                  const url = new URL(window.location.href);
                  url.searchParams.delete("post");
                  window.history.replaceState({}, "", url);
                  setSharedPostID("");
                }}
              >
                Lihat semua posting
              </button>
            </div>
          ) : null}
          <div className="hub-tabs">
            {["Untuk Kamu", "Mengikuti", "Reels", "Thread"].map((item) => (
              <button
                key={item}
                className={hubTab === item ? "active" : ""}
                onClick={() => {
                  if (item === "Mengikuti" && !isPetOwnerAuthenticated()) {
                    loginRequired();
                    return;
                  }
                  setHubTab(item);
                }}
              >
                {item}
              </button>
            ))}
          </div>
          {loading ? (
            <div className="empty-state compact">Memuat feed PetHub…</div>
          ) : posts.length ? (
            posts.map((post) => (
              <article
                className={`hub-post ${hubTab === "Reels" ? "hub-post--reel" : ""}`}
                key={post.id}
              >
                <header>
                  <span>
                    {post.channel_name?.slice(0, 1) ||
                      post.author_name.slice(0, 1)}
                  </span>
                  <p>
                    <b>
                      {post.author_name} {post.verified && <i>✓</i>}
                    </b>
                    <small>
                      {post.channel_handle || post.channel_name} ·{" "}
                      {relative(post.created_at)}
                    </small>
                  </p>
                  <button
                    aria-label="Simpan posting"
                    aria-pressed={Boolean(post.saved)}
                    onClick={() => void savePost(post)}
                  >
                    {post.saved ? "✓" : "＋"}
                  </button>
                </header>
                <div
                  className="hub-like-surface"
                  onDoubleClick={(event) => {
                    if ((event.target as HTMLElement).closest("button")) return;
                    void like(post, true);
                  }}
                >
                  {post.media_url &&
                    (post.post_type === "video" ||
                    /\.(mp4|mov|webm)(\?|$)/i.test(post.media_url) ? (
                      <video
                        className="hub-media"
                        src={post.media_url}
                        controls
                        playsInline
                        preload="metadata"
                        aria-label={`Video ${post.author_name}`}
                      />
                    ) : (
                      <WorldImageGallery
                        images={petHubPhotos(post)}
                        alt={`Album ${post.author_name}`}
                        fallback="🐾"
                        tag=""
                        className="hub-photo-gallery"
                        onDoubleTap={() => void like(post, true)}
                      />
                    ))}
                  {heartBurst === post.id ? (
                    <span className="hub-like-burst" aria-hidden="true">
                      ♥
                    </span>
                  ) : null}
                </div>
                <p className="hub-caption">{post.content}</p>
                <footer>
                  <button
                    aria-label="Sukai konten"
                    className={post.liked ? "liked" : ""}
                    aria-pressed={Boolean(post.liked)}
                    onClick={() =>
                      isPetOwnerAuthenticated()
                        ? void like(post)
                        : loginRequired()
                    }
                  >
                    <Icon name="heart" size={18} />{" "}
                    {post.like_count.toLocaleString("id-ID")}
                  </button>
                  <button
                    aria-label="Buka komentar"
                    onClick={() => setCommentPost(post)}
                  >
                    <Icon name="chat" size={18} /> {post.comment_count}
                  </button>
                  <button
                    aria-label="Bagikan konten"
                    onClick={() => void sharePost(post)}
                  >
                    <Icon name="download" size={18} /> <span>Bagikan</span>
                  </button>
                </footer>
              </article>
            ))
          ) : (
            <div className="empty-state">
              <span>▶</span>
              <h3>
                {sharedPostID
                  ? "Posting tidak tersedia"
                  : "Feed ini masih kosong"}
              </h3>
              <p>Ikuti channel atau terbitkan thread pertama.</p>
            </div>
          )}
        </section>
        <aside className="hub-side">
          <section>
            <span>TRENDING PET THREAD</span>
            {posts
              .filter((item) => item.post_type === "thread")
              .slice(0, 4)
              .map((item, index) => (
                <button key={item.id} onClick={() => setCommentPost(item)}>
                  <small>{index + 1} · Thread terbaru</small>
                  <b>{item.channel_name || item.author_name}</b>
                  <em>{item.content.slice(0, 48)}…</em>
                </button>
              ))}
          </section>
          <section>
            <span>CHANNEL PILIHAN</span>
            {Array.from(
              new Map(
                posts
                  .filter((item) => item.channel_id)
                  .map((item) => [item.channel_id, item]),
              ).values(),
            )
              .slice(0, 4)
              .map((item) => (
                <button
                  key={item.channel_id}
                  onClick={() => void followChannel(item.channel_id)}
                >
                  <i>{item.channel_name.slice(0, 1)}</i>
                  <p>
                    <b>
                      {item.channel_name} {item.verified && "✓"}
                    </b>
                    <small>{item.channel_handle}</small>
                  </p>
                  <strong>{item.following ? "Mengikuti" : "Ikuti"}</strong>
                </button>
              ))}
          </section>
        </aside>
      </div>
      {selectedStream && (
        <StreamModal
          item={selectedStream}
          close={() => setSelectedStream(null)}
          follow={() => void followChannel(selectedStream.channel_id)}
        />
      )}{" "}
      {composer && (
        <Modal close={() => setComposer(false)} className="world-modal">
          <PetHubComposer
            mode={hubTab === "Reels" ? "reel" : "feed"}
            close={() => setComposer(false)}
            notify={notify}
            onCreated={async () => {
              const result = await getPetHubFeed({
                type:
                  hubTab === "Reels"
                    ? "video"
                    : hubTab === "Thread"
                      ? "thread"
                      : "",
              });
              setPosts(result.data);
            }}
          />
        </Modal>
      )}{" "}
      {commentPost && (
        <CommentsModal
          post={commentPost}
          close={() => setCommentPost(null)}
          notify={notify}
          onCount={(count) =>
            setPosts((current) =>
              current.map((item) =>
                item.id === commentPost.id
                  ? { ...item, comment_count: count }
                  : item,
              ),
            )
          }
        />
      )}{" "}
      {storyComposer && (
        <Modal close={() => setStoryComposer(false)} className="world-modal">
          <PetHubComposer
            mode="story"
            close={() => setStoryComposer(false)}
            notify={notify}
            onCreated={async () => setStories((await getPetHubStories()).data)}
          />
        </Modal>
      )}
      {viewStory ? (
        <Modal close={() => setViewStory(null)} className="story-modal">
          <PetHubStoryView
            key={viewStory.id}
            story={viewStory}
            notify={notify}
            next={() => {
              const index = stories.findIndex(
                (item) => item.id === viewStory.id,
              );
              setViewStory(stories[index + 1] || null);
            }}
            previous={
              stories.findIndex((item) => item.id === viewStory.id) > 0
                ? () => {
                    const index = stories.findIndex(
                      (item) => item.id === viewStory.id,
                    );
                    setViewStory(stories[index - 1]);
                  }
                : undefined
            }
          />
        </Modal>
      ) : null}
    </>
  );
}

function UniverseNav({
  active,
  navigate,
}: {
  active: DiscoveryMode;
  navigate: (mode: DiscoveryMode) => void;
}) {
  return (
    <nav className="universe-nav">
      <span>SLIVA WORLD</span>
      {(
        [
          { id: "academy", label: "Pet Academy", icon: "🎓" },
          { id: "events", label: "Pet Event", icon: "🎟️" },
          { id: "petspot", label: "PetSpot", icon: "⌖" },
          { id: "pethub", label: "PetHub", icon: "▶" },
        ] as const
      ).map((item) => (
        <button
          key={item.id}
          className={active === item.id ? "active" : ""}
          onClick={() => navigate(item.id)}
        >
          <i>{item.icon}</i>
          {item.label}
        </button>
      ))}
    </nav>
  );
}

function ProgramModal({
  item,
  petName,
  pets,
  ownerName,
  close,
  notify,
  openTrainer,
}: {
  item: AcademyProgram;
  petName: string;
  pets: Array<{
    id: string;
    name: string;
    species: string;
    breed: string;
    avatar: string;
  }>;
  ownerName: string;
  close: () => void;
  notify: (message: string) => void;
  openTrainer: (trainer: AcademyTrainer) => void;
}) {
  const [detail, setDetail] = useState<AcademyProgramDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(true);
  const [enroll, setEnroll] = useState(false);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("");
  const [payment, setPayment] = useState<PaymentIntent | null>(null);
  const [enrollmentId, setEnrollmentId] = useState("");
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewBusy, setReviewBusy] = useState(false);
  const [reviewMessage, setReviewMessage] = useState("");
  const program = detail ?? item;
  const eligiblePets = pets.filter(
    (candidate) =>
      !detail?.supported_species?.length ||
      detail.supported_species.includes(candidate.species.toLowerCase()),
  );
  const [selectedPetID, setSelectedPetID] = useState(pets[0]?.id ?? "");
  const [selectedScheduleID, setSelectedScheduleID] = useState("");
  const selectedPet = eligiblePets.find(
    (candidate) => candidate.id === selectedPetID,
  );
  useEffect(() => {
    let current = true;
    void getAcademyProgram(item.id)
      .then((value) => {
        if (!current) return;
        setDetail(value);
        setSelectedScheduleID(
          value.schedules.find((schedule) => schedule.remaining_capacity > 0)
            ?.id ?? "",
        );
      })
      .catch((error) =>
        notify(
          error instanceof Error
            ? error.message
            : "Detail kelas belum dapat dimuat",
        ),
      )
      .finally(() => current && setDetailLoading(false));
    return () => {
      current = false;
    };
  }, [item.id, notify]);
  function startEnrollment() {
    if (!isPetOwnerAuthenticated()) {
      notify("Login diperlukan untuk mendaftar academy");
      window.dispatchEvent(new CustomEvent("slivadoc:login-required"));
      return;
    }
    const firstEligible = eligiblePets[0];
    if (!firstEligible) {
      notify("Belum ada pet yang sesuai dengan jenis pet kelas ini");
      return;
    }
    if (!eligiblePets.some((candidate) => candidate.id === selectedPetID))
      setSelectedPetID(firstEligible.id);
    setEnroll(true);
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isPetOwnerAuthenticated()) {
      notify("Login diperlukan untuk mendaftar academy");
      window.dispatchEvent(new CustomEvent("slivadoc:login-required"));
      return;
    }
    const values = Object.fromEntries(new FormData(event.currentTarget));
    if (!selectedPet || !selectedScheduleID) {
      notify("Pilih pet dan jadwal mulai kelas terlebih dahulu");
      return;
    }
    if (program.price > 0 && !paymentMethod) return;
    setBusy(true);
    try {
      const enrollment = await enrollAcademy({
        program_id: item.id,
        participant_name: String(values.participant_name),
        pet_name: selectedPet.name,
        pet_id: selectedPet.id,
        schedule_id: selectedScheduleID,
      });
      setEnrollmentId(enrollment.id);
      if (enrollment.amount > 0)
        setPayment(
          await createPaymentIntent(
            "academy_enrollment",
            enrollment.id,
            paymentMethod,
          ),
        );
      else setDone(true);
      notify(
        enrollment.amount > 0
          ? "Pendaftaran dibuat, selesaikan pembayaran"
          : "Pendaftaran academy berhasil dibuat",
      );
    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : "Pendaftaran academy belum dapat disimpan",
      );
    } finally {
      setBusy(false);
    }
  }
  async function submitReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isPetOwnerAuthenticated()) {
      notify("Login diperlukan untuk menulis ulasan kelas");
      window.dispatchEvent(new CustomEvent("slivadoc:login-required"));
      return;
    }
    if (reviewComment.trim().length < 10) {
      setReviewMessage("Ceritakan pengalaman minimal 10 karakter.");
      return;
    }
    setReviewBusy(true);
    setReviewMessage("");
    try {
      await saveAcademyProgramReview(item.id, {
        rating: reviewRating,
        comment: reviewComment.trim(),
      });
      const refreshed = await getAcademyProgram(item.id);
      setDetail(refreshed);
      setReviewComment("");
      setReviewMessage("Ulasan terverifikasi berhasil diterbitkan.");
    } catch (error) {
      setReviewMessage(
        error instanceof Error
          ? error.message
          : "Ulasan kelas belum dapat disimpan.",
      );
    } finally {
      setReviewBusy(false);
    }
  }
  return (
    <Modal close={close} className="world-modal">
      <div className="promo-media">
        <WorldImageGallery
          images={[program.cover_url, ...(program.image_urls ?? [])]}
          alt={program.title}
          fallback="🎓"
          tag={program.academy_name}
          className="academy-modal-cover"
        />
        <DiscountBadge percent={program.discount_percent} />
      </div>
      <div className="modal-world-body">
        {done ? (
          <Success
            title="Pendaftaran berhasil!"
            note={`${selectedPet?.name || petName} terdaftar di ${program.title}. Detail tersedia di Aktivitas.`}
            close={close}
            activity={{ type: "academy", id: enrollmentId }}
          />
        ) : payment ? (
          <QrisPaymentPanel payment={payment} onPaid={() => setDone(true)} />
        ) : !enroll ? (
          <>
            <small className="world-kicker">
              {program.category} · {program.level}
            </small>
            <div className="academy-detail-heading-row">
              <h2>{program.title}</h2>
            </div>
            <p>{program.description}</p>
            <div className="academy-social-summary">
              <span>
                <b>
                  {(program.review_count ?? 0) > 0
                    ? `★ ${(program.rating ?? 0).toFixed(1)}`
                    : "☆ Belum dinilai"}
                </b>
                <small>{program.review_count ?? 0} ulasan peserta</small>
              </span>
              <span>
                <b>{program.participant_count ?? 0} pet</b>
                <small>sudah bergabung</small>
              </span>
              <span>
                <b>{program.capacity} kursi</b>
                <small>kapasitas per cohort</small>
              </span>
              <span>
                <b>{academySince(program.running_since)}</b>
                <small>rekam jejak program</small>
              </span>
            </div>
            <div className="world-detail-grid">
              <span>
                <small>Pet trainer</small>
                <b>
                  {detail?.trainers
                    ?.map((trainer) => trainer.full_name)
                    .join(", ") || item.trainer_name}
                </b>
              </span>
              <span>
                <small>Mulai</small>
                <b>
                  {when(
                    detail?.schedules?.[0]?.starts_at || item.next_schedule,
                  )}
                </b>
              </span>
              <span>
                <small>Durasi</small>
                <b>
                  {program.duration_weeks} minggu · {program.session_count} sesi
                </b>
              </span>
              <span>
                <small>Investasi</small>
                <AcademyPrice program={program} compact />
              </span>
            </div>
            {detailLoading ? (
              <div className="academy-detail-loading">
                Memuat trainer dan jadwal kelas…
              </div>
            ) : (
              <>
                <div className="academy-detail-block">
                  <div className="academy-detail-title">
                    <b>Trainer kelas</b>
                    <small>Klik untuk melihat profil lengkap</small>
                  </div>
                  <div className="academy-program-trainers">
                    {detail?.trainers.map((trainer) => (
                      <button
                        type="button"
                        key={trainer.id}
                        onClick={() => openTrainer(trainer)}
                      >
                        <span>{trainer.full_name.slice(0, 1)}</span>
                        <b>{trainer.full_name}</b>
                        <small>
                          ★ {trainer.rating.toFixed(1)} ·{" "}
                          {trainer.certification}
                        </small>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="academy-species-note">
                  <b>Jenis pet:</b>{" "}
                  {(detail?.supported_species ?? [])
                    .map((speciesName) =>
                      speciesName === "dog"
                        ? "🐕 Anjing"
                        : speciesName === "cat"
                          ? "🐈 Kucing"
                          : speciesName,
                    )
                    .join(" · ") || "Semua pet"}
                </div>
                <section className="academy-review-section">
                  <div className="academy-review-heading">
                    <div>
                      <small>CERITA ALUMNI</small>
                      <h3>Review & komentar pet parent</h3>
                    </div>
                    <b>
                      {(program.review_count ?? 0) > 0
                        ? `★ ${(program.rating ?? 0).toFixed(1)}`
                        : "Belum dinilai"}
                    </b>
                  </div>
                  <div className="academy-review-list">
                    {(detail?.reviews ?? []).length ? (
                      detail?.reviews.map((review: AcademyReview) => (
                        <article key={review.id}>
                          <span>
                            {review.reviewer_name.slice(0, 1).toUpperCase()}
                          </span>
                          <div>
                            <header>
                              <b>{review.reviewer_name}</b>
                              <em>{"★".repeat(review.rating)}</em>
                            </header>
                            <small>
                              ✓ Peserta terverifikasi · bersama{" "}
                              {review.pet_name || "pet-nya"}
                            </small>
                            <p>{review.comment}</p>
                            <time>
                              {new Intl.DateTimeFormat("id-ID", {
                                dateStyle: "medium",
                              }).format(new Date(review.created_at))}
                            </time>
                          </div>
                        </article>
                      ))
                    ) : (
                      <p className="academy-review-empty">
                        Belum ada ulasan. Peserta terverifikasi dapat menjadi
                        yang pertama.
                      </p>
                    )}
                  </div>
                  <form className="academy-review-form" onSubmit={submitReview}>
                    <div>
                      <span>Bagikan pengalaman kelas</span>
                      <div aria-label="Pilih rating">
                        {[1, 2, 3, 4, 5].map((rating) => (
                          <button
                            type="button"
                            key={rating}
                            className={rating <= reviewRating ? "active" : ""}
                            onClick={() => setReviewRating(rating)}
                            aria-label={`${rating} bintang`}
                          >
                            ★
                          </button>
                        ))}
                      </div>
                    </div>
                    <textarea
                      value={reviewComment}
                      onChange={(event) => setReviewComment(event.target.value)}
                      placeholder="Apa perubahan yang paling terasa pada pet-mu?"
                      maxLength={1500}
                    />
                    {reviewMessage ? <p>{reviewMessage}</p> : null}
                    <button type="submit" disabled={reviewBusy}>
                      {reviewBusy
                        ? "Menerbitkan…"
                        : "Kirim review terverifikasi"}
                    </button>
                  </form>
                </section>
              </>
            )}
            <button
              className="primary-button full"
              disabled={
                detailLoading ||
                !detail?.schedules?.some(
                  (schedule) => schedule.remaining_capacity > 0,
                ) ||
                eligiblePets.length === 0
              }
              onClick={startEnrollment}
            >
              {eligiblePets.length === 0
                ? "Tidak ada pet yang sesuai"
                : !detailLoading &&
                    !detail?.schedules?.some(
                      (schedule) => schedule.remaining_capacity > 0,
                    )
                  ? "Jadwal belum tersedia"
                  : `Pilih pet & jadwal`}
            </button>
          </>
        ) : (
          <form className="world-form" onSubmit={submit}>
            <h2>Data peserta academy</h2>
            <label>
              <span>Nama pet parent</span>
              <input
                name="participant_name"
                defaultValue={ownerName}
                required
              />
            </label>
            <label>
              <span>Pet yang akan mengikuti kelas</span>
              <select
                value={selectedPetID}
                onChange={(event) => setSelectedPetID(event.target.value)}
                required
              >
                {eligiblePets.map((candidate) => (
                  <option key={candidate.id} value={candidate.id}>
                    {candidate.name} · {candidate.breed}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Mulai ikut kelas</span>
              <select
                value={selectedScheduleID}
                onChange={(event) => setSelectedScheduleID(event.target.value)}
                required
              >
                {(detail?.schedules ?? []).map((schedule) => (
                  <option
                    key={schedule.id}
                    value={schedule.id}
                    disabled={schedule.remaining_capacity < 1}
                  >
                    {when(schedule.starts_at)} · {schedule.trainer_name} ·{" "}
                    {schedule.remaining_capacity} kursi
                  </option>
                ))}
              </select>
            </label>
            <div className="checkout-line">
              <span>Total program</span>
              <AcademyPrice program={program} compact />
            </div>
            {program.price > 0 && (
              <PaymentMethodPicker
                value={paymentMethod}
                onChange={setPaymentMethod}
                disabled={busy}
              />
            )}
            <button
              className="primary-button full"
              disabled={busy || (program.price > 0 && !paymentMethod)}
            >
              {busy
                ? "Membuat pembayaran…"
                : program.price > 0
                  ? "Lanjut ke pembayaran"
                  : "Konfirmasi pendaftaran"}
            </button>
          </form>
        )}
      </div>
    </Modal>
  );
}

function AcademyTrainerModal({
  trainer,
  close,
}: {
  trainer: AcademyTrainer;
  close: () => void;
}) {
  return (
    <Modal close={close} className="academy-trainer-modal">
      <div className="academy-trainer-profile">
        <span className="academy-trainer-profile-photo">
          {trainer.photo_url ? (
            <NextImage
              src={trainer.photo_url}
              alt={trainer.full_name}
              width={112}
              height={112}
              unoptimized
            />
          ) : (
            trainer.full_name.slice(0, 1)
          )}
        </span>
        <div>
          <small>PET TRAINER · {trainer.academy_name}</small>
          <h2>{trainer.full_name}</h2>
          <p>
            ★ {trainer.rating.toFixed(1)} · {trainer.experience_years} tahun
            pengalaman
          </p>
        </div>
      </div>
      <div
        className="academy-trainer-profile-body"
        role="region"
        aria-label={`Detail ${trainer.full_name}`}
        tabIndex={0}
      >
        <p>{trainer.bio || "Profil trainer terverifikasi Slivadoc."}</p>
        <div className="academy-trainer-metrics">
          <span>
            <small>Sertifikasi</small>
            <b>{trainer.certification || "Slivadoc verified"}</b>
          </span>
          <span>
            <small>Jenis pet</small>
            <b>{trainer.pet_types?.join(" · ") || "dog · cat"}</b>
          </span>
          <span>
            <small>Spesialisasi</small>
            <b>{trainer.specialties?.join(" · ") || "behavior"}</b>
          </span>
        </div>
        {trainer.programs?.length ? (
          <div className="academy-trainer-programs">
            <h3>Kelas bersama {trainer.full_name.split(" ")[0]}</h3>
            {trainer.programs.map((program) => (
              <div key={program.id}>
                <span>
                  <b>{program.title}</b>
                  <small>
                    {program.level} · {program.session_count} sesi
                  </small>
                </span>
                <strong>{money.format(program.price)}</strong>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </Modal>
  );
}

function EventModal({
  item,
  ownerName,
  ownerEmail,
  pets,
  close,
  notify,
}: {
  item: PetEvent;
  ownerName: string;
  ownerEmail: string;
  pets: Array<{
    id: string;
    name: string;
    species: string;
    breed: string;
    avatar: string;
  }>;
  close: () => void;
  notify: (message: string) => void;
}) {
  const [register, setRegister] = useState(false);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("");
  const [payment, setPayment] = useState<PaymentIntent | null>(null);
  const [registrationId, setRegistrationId] = useState("");
  const allowedPets =
    item.ticket_unit === "owner_pet"
      ? pets.filter(
          (pet) =>
            !item.allowed_pet_species.length ||
            item.allowed_pet_species.includes(pet.species),
        )
      : pets;
  const [selectedPetID, setSelectedPetID] = useState(
    () => allowedPets[0]?.id ?? "",
  );
  function start() {
    if (!isPetOwnerAuthenticated()) {
      notify("Login diperlukan untuk mengambil tiket event");
      window.dispatchEvent(new CustomEvent("slivadoc:login-required"));
      return;
    }
    setRegister(true);
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isPetOwnerAuthenticated()) return;
    if (item.price > 0 && !paymentMethod) return;
    const values = Object.fromEntries(new FormData(event.currentTarget));
    setBusy(true);
    try {
      const registration = await registerEvent(item.id, {
        participant_name: String(values.participant_name),
        participant_email: String(values.participant_email),
        ticket_quantity:
          item.ticket_unit === "owner_pet" ? 1 : Number(values.ticket_quantity),
        ...(item.ticket_unit === "owner_pet" ? { pet_id: selectedPetID } : {}),
      });
      setRegistrationId(registration.id);
      if (registration.amount > 0 && registration.payment_status !== "paid")
        setPayment(
          await createPaymentIntent(
            "event_registration",
            registration.id,
            paymentMethod,
          ),
        );
      else setDone(true);
      notify(
        registration.amount > 0 && registration.payment_status !== "paid"
          ? "Tiket dibuat, selesaikan pembayaran"
          : "Tiket event tersimpan di Aktivitas",
      );
    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : "Tiket event belum dapat disimpan",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal close={close} className="world-modal">
      <WorldImageGallery
        images={[item.banner_url, ...(item.image_urls ?? [])]}
        alt={item.title}
        fallback="🎪"
        tag={item.category}
        className="event-modal-cover"
      />
      <div className="modal-world-body">
        {done ? (
          <Success
            title="Tiket berhasil diamankan!"
            note={`QR ticket ${item.title} tersedia di Aktivitas.`}
            close={close}
            activity={{ type: "event", id: registrationId }}
          />
        ) : payment ? (
          <QrisPaymentPanel payment={payment} onPaid={() => setDone(true)} />
        ) : register ? (
          <form className="world-form" onSubmit={submit}>
            <h2>Pesan tiket event</h2>
            <label>
              <span>Nama peserta</span>
              <input
                name="participant_name"
                defaultValue={ownerName}
                required
              />
            </label>
            <label>
              <span>Email</span>
              <input
                name="participant_email"
                type="email"
                defaultValue={ownerEmail}
                required
              />
            </label>
            {item.ticket_unit === "owner_pet" ? (
              <fieldset className="event-pet-picker">
                <legend>Pet yang ikut</legend>
                {allowedPets.length ? (
                  <div>
                    {allowedPets.map((pet) => (
                      <button
                        type="button"
                        className={selectedPetID === pet.id ? "active" : ""}
                        key={pet.id}
                        onClick={() => setSelectedPetID(pet.id)}
                      >
                        <span>{pet.avatar}</span>
                        <b>{pet.name}</b>
                        <small>{pet.breed || speciesLabel(pet.species)}</small>
                        <i>{selectedPetID === pet.id ? "✓" : "+"}</i>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p>
                    Belum ada profil pet yang sesuai dengan jenis pet untuk
                    event ini.
                  </p>
                )}
              </fieldset>
            ) : (
              <label>
                <span>Jumlah tiket</span>
                <select name="ticket_quantity" defaultValue="1">
                  <option>1</option>
                  <option>2</option>
                  <option>3</option>
                  <option>4</option>
                </select>
              </label>
            )}
            <div className="checkout-line">
              <span>
                {item.ticket_unit === "owner_pet"
                  ? "1 owner + 1 pet"
                  : "Harga per tiket"}
              </span>
              <b>{item.price ? money.format(item.price) : "Gratis"}</b>
            </div>
            {item.price > 0 ? (
              <PaymentMethodPicker
                value={paymentMethod}
                onChange={setPaymentMethod}
                disabled={busy}
              />
            ) : null}
            <button
              className="primary-button full"
              disabled={
                busy ||
                (item.price > 0 && !paymentMethod) ||
                (item.ticket_unit === "owner_pet" && !selectedPetID)
              }
            >
              {busy
                ? "Membuat pembayaran…"
                : item.price > 0
                  ? "Lanjut ke pembayaran"
                  : "Konfirmasi tiket"}
            </button>
          </form>
        ) : (
          <>
            <small className="world-kicker">{when(item.starts_at)}</small>
            <div className="event-detail-heading">
              <div>
                <span>{item.featured ? "✦ EVENT PILIHAN" : item.category}</span>
                <h2>{item.title}</h2>
              </div>
              <b>{item.price ? money.format(item.price) : "Gratis"}</b>
            </div>
            <p>{item.description}</p>
            <div className="event-social-summary">
              <span>
                <b>{item.registered_count.toLocaleString("id-ID")}</b>
                <small>pet parent terdaftar</small>
              </span>
              <span>
                <b>{Math.max(0, item.capacity - item.registered_count)}</b>
                <small>slot masih tersedia</small>
              </span>
              <span>
                <b>
                  {new Intl.DateTimeFormat("id-ID", {
                    day: "numeric",
                    month: "short",
                  }).format(new Date(item.starts_at))}
                </b>
                <small>tanggal event</small>
              </span>
              <span>
                <b>{item.allowed_pet_species?.length || "Semua"}</b>
                <small>jenis pet diterima</small>
              </span>
            </div>
            {item.pet_spot_name ? (
              <div className="event-host">
                <span>✦</span>
                <div>
                  <small>Diselenggarakan oleh</small>
                  <b>{item.pet_spot_name}</b>
                </div>
              </div>
            ) : null}
            <div className="world-detail-grid">
              <span>
                <small>Lokasi</small>
                <b>
                  {item.venue}, {item.city}
                </b>
              </span>
              <span>
                <small>Tiket</small>
                <b>
                  {item.price
                    ? `${money.format(item.price)} / owner + pet`
                    : "Gratis"}
                </b>
              </span>
              <span>
                <small>Kapasitas</small>
                <b>
                  {item.registered_count}/{item.capacity} terdaftar
                </b>
              </span>
              <span>
                <small>Status</small>
                <b>{item.status}</b>
              </span>
            </div>
            {item.ticket_unit === "owner_pet" ? (
              <>
                <div className="event-species">
                  <small>Pet yang dapat hadir</small>
                  <div>
                    {item.allowed_pet_species.map((species) => (
                      <span key={species}>
                        {speciesIcon(species)} {speciesLabel(species)}
                      </span>
                    ))}
                  </div>
                </div>
                {item.pet_requirements.length ? (
                  <div className="event-requirements">
                    <small>Checklist sebelum datang</small>
                    <ul>
                      {item.pet_requirements.map((requirement) => (
                        <li key={requirement}>✓ {requirement}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </>
            ) : null}
            <div className="event-experience-note">
              <span>🎟️</span>
              <div>
                <b>Ticket tersimpan otomatis</b>
                <small>
                  Sesudah registrasi, QR ticket dan detail event dapat dibuka
                  kembali dari Aktivitas.
                </small>
              </div>
            </div>
            <button className="primary-button full" onClick={start}>
              {item.price ? "Pilih pet & ambil tiket" : "Amankan tiket gratis"}
            </button>
          </>
        )}
      </div>
    </Modal>
  );
}

const eventSpecies = {
  dog: ["🐕", "Anjing"],
  cat: ["🐈", "Kucing"],
  rabbit: ["🐇", "Kelinci"],
  bird: ["🦜", "Burung"],
  reptile: ["🦎", "Reptil"],
  small_mammal: ["🐹", "Mamalia kecil"],
  other: ["🐾", "Lainnya"],
} as const;
function speciesIcon(species: string) {
  return eventSpecies[species as keyof typeof eventSpecies]?.[0] ?? "🐾";
}
function speciesLabel(species: string) {
  return eventSpecies[species as keyof typeof eventSpecies]?.[1] ?? species;
}
function SpotModal({
  item,
  close,
  notify,
  ownerName,
}: {
  item: PetSpot;
  close: () => void;
  notify: (message: string) => void;
  ownerName: string;
}) {
  return (
    <Modal
      close={close}
      className="world-modal spot-modal petspot-experience-modal"
    >
      <PetSpotDetail
        item={item}
        ownerName={ownerName}
        close={close}
        notify={notify}
        gallery={(spot) => (
          <WorldImageGallery
            images={[spot.cover_url, ...(spot.image_urls ?? [])]}
            alt={spot.name}
            fallback="⌖"
            tag={
              spot.verified ? "✓ Partner terverifikasi" : "Pet-friendly venue"
            }
            className="petspot-detail-gallery"
          />
        )}
      />
    </Modal>
  );
}
function StreamModal({
  item,
  close,
  follow,
}: {
  item: PetHubStream;
  close: () => void;
  follow: () => void;
}) {
  const [message, setMessage] = useState("");
  return (
    <Modal close={close} className="stream-modal">
      <div className="player">
        {item.playback_url ? (
          <video src={item.playback_url} controls autoPlay />
        ) : (
          <>
            <span>🐕‍🦺</span>
            <small>
              {item.status === "live"
                ? "● LIVE · playback sedang dipersiapkan"
                : when(item.scheduled_at)}
            </small>
          </>
        )}
      </div>
      <div className="stream-body">
        <small>
          {item.status === "live"
            ? `${item.viewer_count.toLocaleString("id-ID")} sedang menonton`
            : "Live terjadwal"}
        </small>
        <h2>{item.title}</h2>
        <p>{item.description}</p>
        <div className="stream-channel">
          <span>{item.channel_name.slice(0, 1)}</span>
          <p>
            <b>
              {item.channel_name} {item.verified && "✓"}
            </b>
            <small>{item.channel_handle}</small>
          </p>
          <button onClick={follow}>Ikuti</button>
        </div>
        <div className="live-chat">
          <b>Live chat</b>
          <div className="empty-state compact">
            Pesan live akan tampil ketika provider streaming mengaktifkan room
            chat.
          </div>
          <label>
            <input
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Tulis pesan yang suportif…"
              disabled
            />
            <button disabled>Kirim</button>
          </label>
        </div>
      </div>
    </Modal>
  );
}
function CommentsModal({
  post,
  close,
  notify,
  onCount,
}: {
  post: PetHubPost;
  close: () => void;
  notify: (message: string) => void;
  onCount: (count: number) => void;
}) {
  const [comments, setComments] = useState<PetHubComment[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const pending = useRef(false);
  useEffect(() => {
    let active = true;
    void getPetHubComments(post.id)
      .then((result) => {
        if (active) setComments(result.data);
      })
      .catch((cause) => {
        if (active)
          setError(
            cause instanceof Error
              ? cause.message
              : "Komentar belum dapat dimuat",
          );
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
    };
  }, [post.id]);
  async function send() {
    if (pending.current || !text.trim()) return;
    if (!isPetOwnerAuthenticated()) {
      notify("Login diperlukan untuk berkomentar");
      window.dispatchEvent(new CustomEvent("slivadoc:login-required"));
      return;
    }
    pending.current = true;
    setSending(true);
    try {
      await createPetHubComment(post.id, text.trim());
      setText("");
      const result = await getPetHubComments(post.id);
      setComments(result.data);
      setError("");
      onCount(result.count);
    } catch (cause) {
      notify(
        cause instanceof Error ? cause.message : "Komentar belum dapat dikirim",
      );
    } finally {
      pending.current = false;
      setSending(false);
    }
  }
  return (
    <Modal close={close} className="comments-modal">
      <div className="comments-head">
        <small>PETHUB DISCUSSION</small>
        <h2>Komentar ({comments.length})</h2>
        <p>{post.content}</p>
      </div>
      <div className="comments-list">
        {busy ? (
          <span role="status">Memuat komentar…</span>
        ) : error ? (
          <span role="alert">{error}</span>
        ) : comments.length ? (
          comments.map((item) => (
            <div key={item.id}>
              <i>{item.author_name.slice(0, 1)}</i>
              <p>
                <b>{item.author_name}</b>
                <span>{item.content}</span>
                <small>{when(item.created_at)}</small>
              </p>
            </div>
          ))
        ) : (
          <span>Belum ada komentar. Jadilah yang pertama.</span>
        )}
      </div>
      <footer>
        <input
          aria-label="Komentar PetHub"
          value={text}
          maxLength={2000}
          disabled={sending}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.nativeEvent.isComposing) void send();
          }}
          placeholder="Tulis komentar yang suportif…"
        />
        <button onClick={() => void send()} disabled={sending || !text.trim()}>
          {sending ? "Mengirim…" : "Kirim"}
        </button>
      </footer>
    </Modal>
  );
}
function Modal({
  children,
  close,
  className,
}: {
  children: ReactNode;
  close: () => void;
  className: string;
}) {
  return (
    <div className="modal-overlay" onMouseDown={close}>
      <section
        className={`modal ${className}`}
        role="dialog"
        aria-modal="true"
        aria-label="Detail Slivadoc"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="modal-close"
          aria-label="Tutup detail"
          onClick={close}
        >
          <Icon name="close" />
        </button>
        {children}
      </section>
    </div>
  );
}
function Success({
  title,
  note,
  close,
  activity,
}: {
  title: string;
  note: string;
  close: () => void;
  activity?: { type: ActivityType; id: string };
}) {
  return (
    <div className="world-success">
      <span>
        <Icon name="check" size={28} />
      </span>
      <h2>{title}</h2>
      <p>{note}</p>
      <button
        className="primary-button full"
        onClick={() => {
          close();
          if (activity)
            window.dispatchEvent(
              new CustomEvent("slivadoc:open-activity", { detail: activity }),
            );
        }}
      >
        Lihat di Aktivitas
      </button>
    </div>
  );
}
