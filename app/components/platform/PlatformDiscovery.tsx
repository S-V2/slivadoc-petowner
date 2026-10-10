"use client";
import { RailArrows } from "../RailArrows";
import { SlivaVideo } from "../SlivaVideo";
import { petOwnerIntlLocale } from "../../lib/petowner-locale";
import { LocalizedCopy, LocalizedButton, LocalizedInput, LocalizedTextarea } from "../LocalizedCopy";

import { usePetOwnerFlow } from "../PetOwnerFlow";
import { SlivaSelect } from "../SlivaSelect";
import { useDialogFocus } from "../useDialogFocus";
import NextImage from "next/image";
import {
  useCallback,
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
import { CatalogStatus } from "../WorldCatalogStatus";
import { WorldPhoto } from "../WorldPhoto";
import { matchesWorldEvent } from "../../../shared/world-discovery";
import { WorldCollectionHeader } from "../WorldCollectionHeader";
import { WorldExplorer } from "../WorldExplorer";
import { worldLabel } from "../../../shared/world-presentation";
import { FacilityTicker } from "../FacilityTicker";
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
  getPetSpot,
  getPetshipPlaces,
  getPublicLostPets,
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
  type PetshipPlace,
  type PublicLostPet,
  type PaymentIntent,
  type ActivityType,
} from "../../lib/platform-api";
import { QrisPaymentPanel, PaymentMethodPicker } from "../payments/QrisPayment";
import GeoMap, { type GeoCircle, type GeoMarker, type GeoPoint } from "./GeoMap";
import "../../event-checkout.css";
import "../../petspot-experience.css";

export type DiscoveryMode = "academy" | "events" | "petspot" | "pethub";
type Props = {
  mode: DiscoveryMode;
  initialItemId?: string;
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
  navigation?: ReactNode;
};

const money = new Intl.NumberFormat(petOwnerIntlLocale(), {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});
const when = (value?: string) =>
  value
    ? new Intl.DateTimeFormat(petOwnerIntlLocale(), {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(value))
    : "Segera diumumkan";

const academySince = (value?: string) => {
  if (!value) return "Program baru";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Program baru";
  return `Berjalan sejak ${new Intl.DateTimeFormat(petOwnerIntlLocale(), {
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
      <LocalizedCopy>{discounted ? <s><LocalizedCopy>{money.format(program.original_price)}</LocalizedCopy></s> : null}</LocalizedCopy>
      <strong>
        <LocalizedCopy>{program.price > 0 ? money.format(program.price) : "Gratis"}</LocalizedCopy>
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
  detail = false,
  onOpen,
}: {
  images: Array<string | undefined>;
  alt: string;
  fallback: string;
  tag: string;
  className?: string;
  onDoubleTap?: () => void;
  detail?: boolean;
  onOpen?: () => void;
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
    if (!detail || gallery.length < 2 || expanded) return;
    const timer = window.setInterval(
      () => setActive((current) => (current + 1) % gallery.length),
      1_000,
    );
    return () => window.clearInterval(timer);
  }, [gallery.length, expanded, detail]);
  if (!gallery.length)
    return (
      <div className={`modal-world-cover ${className}`}>
        <span><LocalizedCopy>{fallback}</LocalizedCopy></span>
        <LocalizedCopy>{className.includes("petspot") ? (
          <small className="petspot-photo-empty"><LocalizedCopy>{"Foto tempat belum diunggah"}</LocalizedCopy></small>
        ) : null}</LocalizedCopy>
        <i><LocalizedCopy>{tag}</LocalizedCopy></i>
      </div>
    );
  const move = (direction: number) =>
    setActive(
      (current) => (current + direction + gallery.length) % gallery.length,
    );
  return (
    <>
      <div className={`modal-world-cover world-image-gallery ${className}`}>
        <LocalizedButton
          type="button"
          className="world-image-open"
          onClick={(event) => {
            if (onOpen) { onOpen(); return; }
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
          aria-label={onOpen ? `Buka detail ${alt}` : `Buka galeri ${alt}`}
        >
          <NextImage
            src={gallery[detail ? active % gallery.length : 0]}
            alt={alt}
            fill
            sizes="(max-width: 720px) 100vw, 680px"
            unoptimized
          />
        </LocalizedButton>
        <i><LocalizedCopy>{tag}</LocalizedCopy></i>
        <LocalizedCopy>{detail && gallery.length > 1 ? (
          <div className="world-image-controls">
            <LocalizedButton
              type="button"
              onClick={() => move(-1)}
              aria-label="Gambar sebelumnya"
            ><LocalizedCopy>{"‹"}</LocalizedCopy></LocalizedButton>
            <span>
              <LocalizedCopy>{(active % gallery.length) + 1}</LocalizedCopy><LocalizedCopy>{" / "}</LocalizedCopy><LocalizedCopy>{gallery.length}</LocalizedCopy>
            </span>
            <LocalizedButton
              type="button"
              onClick={() => move(1)}
              aria-label="Gambar berikutnya"
            ><LocalizedCopy>{"›"}</LocalizedCopy></LocalizedButton>
          </div>
        ) : null}</LocalizedCopy>
      </div>
      {expanded ? (
        <div
          className="world-image-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={`Galeri ${alt}`}
          onClick={() => setExpanded(false)}
        >
          <LocalizedButton
            type="button"
            className="world-image-close"
            onClick={() => setExpanded(false)}
            aria-label="Tutup galeri"
          ><LocalizedCopy>{"×"}</LocalizedCopy></LocalizedButton>
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
          <LocalizedCopy>{gallery.length > 1 ? (
            <>
              <LocalizedButton
                type="button"
                className="world-image-prev"
                onClick={(event) => {
                  event.stopPropagation();
                  move(-1);
                }}
                aria-label="Gambar sebelumnya"
              ><LocalizedCopy>{"‹"}</LocalizedCopy></LocalizedButton>
              <LocalizedButton
                type="button"
                className="world-image-next"
                onClick={(event) => {
                  event.stopPropagation();
                  move(1);
                }}
                aria-label="Gambar berikutnya"
              ><LocalizedCopy>{"›"}</LocalizedCopy></LocalizedButton>
              <span className="world-image-count">
                <LocalizedCopy>{(active % gallery.length) + 1}</LocalizedCopy><LocalizedCopy>{" / "}</LocalizedCopy><LocalizedCopy>{gallery.length}</LocalizedCopy>
              </span>
            </>
          ) : null}</LocalizedCopy>
        </div>
      ) : null}
    </>
  );
}

export default function PlatformDiscovery({
  mode,
  initialItemId,
  petName,
  pets = [],
  ownerName = "Pet Parent",
  ownerEmail = "",
  notify,
  navigation,
}: Props) {
  const { requirePet } = usePetOwnerFlow();
  const [programs, setPrograms] = useState<AcademyProgram[]>([]);
  const [academyTrainers, setAcademyTrainers] = useState<AcademyTrainer[]>([]);
  const [selectedTrainer, setSelectedTrainer] = useState<AcademyTrainer | null>(
    null,
  );
  const [trainerSpecies, setTrainerSpecies] = useState(
    pets[0]?.species?.toLowerCase() || "all",
  );
  const [eventQuery, setEventQuery] = useState("");
  const [eventCategory, setEventCategory] = useState("all");
  const [events, setEvents] = useState<PetEvent[]>([]);
  const [spots, setSpots] = useState<PetSpot[]>([]);
  const [streams, setStreams] = useState<PetHubStream[]>([]);
  const [posts, setPosts] = useState<PetHubPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [feedLoading, setFeedLoading] = useState(true);
  const [feedError, setFeedError] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const retryCatalog = () => setLoadAttempt((attempt) => attempt + 1);
  const [selectedProgram, setSelectedProgram] = useState<AcademyProgram | null>(
    null,
  );
  const [selectedEvent, setSelectedEvent] = useState<PetEvent | null>(null);
  const [selectedSpot, setSelectedSpot] = useState<PetSpot | null>(null);
  const [selectedStream, setSelectedStream] = useState<PetHubStream | null>(
    null,
  );
  const handledItem = useRef("");
  useEffect(() => {
    if (mode !== "petspot" || loading) return;
    let active = true;
    const item = spots.find((spot) => spot.id === initialItemId);
    if (!initialItemId || item) {
      queueMicrotask(() => { if (active) setSelectedSpot(item ?? null); });
    } else {
      void getPetSpot(initialItemId).then((spot) => {
        if (active) setSelectedSpot(spot);
      }).catch(() => {
        if (active) notify("Tempat ini belum tersedia. Pilih tempat lain dari katalog.");
      });
    }
    return () => { active = false; };
  }, [initialItemId, loading, mode, notify, spots]);
  useEffect(() => {
    if (!initialItemId || loading || mode === "petspot") return;
    const key = `${mode}:${initialItemId}`;
    if (handledItem.current === key) return;
    const program = mode === "academy" ? programs.find((item) => item.id === initialItemId) : undefined;
    const event = mode === "events" ? events.find((item) => item.id === initialItemId) : undefined;
    handledItem.current = key;
    queueMicrotask(() => {
      if (program) setSelectedProgram(program);
      else if (event) setSelectedEvent(event);
      else notify("Item ini belum tersedia. Pilih item lain dari katalog.");
    });
  }, [initialItemId, loading, mode, programs, events, spots, notify]);
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
  const [nearMe, setNearMe] = useState<GeoPoint | null>(null);
  const [petshipPlaces, setPetshipPlaces] = useState<PetshipPlace[]>([]);
  const [lostPets, setLostPets] = useState<PublicLostPet[]>([]);
  const [showPetship, setShowPetship] = useState(false);
  const [showLostPets, setShowLostPets] = useState(false);
  const [activeSpot, setActiveSpot] = useState<string | null>(null);
  const [mapFocus, setMapFocus] = useState<GeoPoint | null>(null);
  const [mobilePane, setMobilePane] = useState<"daftar" | "peta">("daftar");
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
  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => {
      if (active) { setLoading(true); setLoadError(false); }
    });
    const failed = (label: string) => (error: unknown) => {
      if (!active) return;
      setLoadError(true);
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
          if (!active) return;
          setPrograms(programValue.data);
          setAcademyTrainers(trainerValue.data);
        })
        .catch(failed("Program academy"))
        .finally(() => { if (active) setLoading(false); });
      return () => { active = false; };
    }
    if (mode === "events") {
      void getPetEvents()
        .then((value) => { if (active) setEvents(value.data); })
        .catch(failed("Pet event"))
        .finally(() => { if (active) setLoading(false); });
      return () => { active = false; };
    }
    if (mode === "petspot") {
      void getPetSpots()
        .then((value) => { if (active) setSpots(value.data); })
        .catch(failed("PetSpot"))
        .finally(() => { if (active) setLoading(false); });
      return () => { active = false; };
    }
    void Promise.all([getPetHubStreams(), getPetHubStories()])
      .then(([stream, story]) => {
        if (!active) return;
        setStreams(stream.data);
        setStories(story.data);
      })
      .catch(failed("PetHub"))
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [mode, notify, trainerSpecies, loadAttempt]);

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
    if (mode !== "petspot") return;
    const failed = (label: string) => (error: unknown) =>
      notify(error instanceof Error ? error.message : `${label} belum dapat dimuat`);
    void getPetshipPlaces().then((value) => setPetshipPlaces(value.data)).catch(failed("Lokasi Petship"));
    void getPublicLostPets().then((value) => setLostPets(value.data)).catch(failed("Laporan hewan hilang"));
  }, [mode, notify]);
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
    void Promise.resolve().then(() => { if (active) { setFeedLoading(true); setFeedError(false); } });
    void getPetHubFeed(sharedPostID ? { post_id: sharedPostID } : { tab, type })
      .then((response) => {
        if (active) setPosts(response.data);
      })
      .catch((error) => {
        if (!active) return;
        setFeedError(true);
        notify(
          error instanceof Error
            ? error.message
            : "Feed PetHub belum dapat dimuat",
        );
      })
      .finally(() => {
        if (active) setFeedLoading(false);
      });
    return () => {
      active = false;
    };
  }, [hubTab, mode, notify, ownerEmail, sharedPostID, loadAttempt]);
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
  const openSpot = useCallback((item: PetSpot) => {
    setSelectedSpot(item);
    const url = new URL(window.location.href);
    url.searchParams.set("world_item", item.id);
    window.history.pushState({ view: url.searchParams.get("view"), spot: item.id }, "", `${url.pathname}${url.search}`);
    window.dispatchEvent(new PopStateEvent("popstate"));
    window.scrollTo({ top: 0, behavior: "instant" });
  }, []);
  function closeSpot() {
    setSelectedSpot(null);
    const url = new URL(window.location.href);
    url.searchParams.delete("world_item");
    window.history.pushState({ view: url.searchParams.get("view") }, "", `${url.pathname}${url.search}`);
    window.dispatchEvent(new PopStateEvent("popstate"));
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  const geoMarkers = useMemo<GeoMarker[]>(
    () => [
      ...categorySpots.map((item) => ({
        id: `spot-${item.id}`,
        latitude: item.latitude,
        longitude: item.longitude,
        label: item.name,
        onClick: () => {
          openSpot(item);
          setMapFocus({ latitude: item.latitude, longitude: item.longitude });
        },
      })),
      ...(nearMe ? [{ id: "near-me", ...nearMe, label: "Posisimu", color: "#1d4ed8" }] : []),
      ...(showPetship
        ? petshipPlaces.map((item) => ({
            id: `petship-${item.id}`,
            latitude: item.latitude,
            longitude: item.longitude,
            label: `${item.name} · Petship`,
            color: "#8b5cf6",
          }))
        : []),
      ...(showLostPets
        ? lostPets.map((item) => ({
            id: `lost-${item.id}`,
            latitude: item.latitude,
            longitude: item.longitude,
            label: `${item.name} (${item.species}) hilang di ${item.last_seen_location}`,
            color: "#e8504a",
          }))
        : []),
    ],
    [categorySpots, nearMe, showPetship, petshipPlaces, showLostPets, lostPets, openSpot],
  );
  const geoCircles = useMemo<GeoCircle[]>(
    () => [
      ...(showPetship
        ? petshipPlaces.map((item) => ({
            id: `petship-${item.id}`,
            latitude: item.latitude,
            longitude: item.longitude,
            radiusM: item.geofence_radius_m,
            color: "#8b5cf6",
          }))
        : []),
      ...(showLostPets
        ? lostPets.map((item) => ({
            id: `lost-${item.id}`,
            latitude: item.latitude,
            longitude: item.longitude,
            radiusM: item.radius_km * 1000,
          }))
        : []),
    ],
    [showPetship, petshipPlaces, showLostPets, lostPets],
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
          setNearMe({ latitude: position.coords.latitude, longitude: position.coords.longitude });
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
    if (!requirePet()) return;
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
  const [sharingPost, setSharingPost] = useState<PetHubPost | null>(null);
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
    if (!channelID || !requirePet()) return;
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
    if (!requirePet()) return;
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

  if (mode === "petspot" && selectedSpot)
    return <SpotPage key={selectedSpot.id} item={selectedSpot} close={closeSpot} notify={notify} ownerName={ownerName} />;

  if (mode === "academy")
    return (
      <div className="world-collection world-collection--academy" data-collection="academy">
        <WorldCollectionHeader mode="academy"/>
        <section className="academy-trainer-section">
          <div className="academy-trainer-heading">
            <div>
              <small><LocalizedCopy>{"PET TRAINER TERVERIFIKASI"}</LocalizedCopy></small>
              <h2><LocalizedCopy>{"Trainer sesuai jenis pet"}</LocalizedCopy></h2>
              <p><LocalizedCopy>{"Pilih spesialis yang paling cocok sebelum menentukan kelas."}</LocalizedCopy></p>
            </div>
            <div className="academy-carousel academy-species-carousel">
              <div
                ref={speciesRailRef}
                className="academy-species-filter"
                aria-label="Filter jenis pet"
              >
                <LocalizedCopy>{academySpecies.map((species) => (
                  <LocalizedButton
                    type="button"
                    key={species.id}
                    className={trainerSpecies === species.id ? "active" : ""}
                    onClick={() => setTrainerSpecies(species.id)}
                  >
                    <span><LocalizedCopy>{species.icon}</LocalizedCopy></span>
                    <b><LocalizedCopy>{species.label}</LocalizedCopy></b>
                  </LocalizedButton>
                ))}</LocalizedCopy>
              </div>
              <RailArrows rail={speciesRailRef} label="jenis pet" />
            </div>
          </div>
          <div className="academy-carousel academy-trainer-carousel">
            <div ref={trainerRailRef} className="academy-trainer-list">
              <LocalizedCopy>{academyTrainers.map((trainer) => (
                <LocalizedButton
                  type="button"
                  className="academy-trainer-card"
                  key={trainer.id}
                  onClick={() => void openTrainer(trainer)}
                >
                  <span className="academy-trainer-avatar">
                    <LocalizedCopy>{trainer.photo_url ? (
                      <NextImage
                        src={trainer.photo_url}
                        alt=""
                        width={72}
                        height={72}
                        unoptimized
                      />
                    ) : (
                      trainer.full_name.slice(0, 1)
                    )}</LocalizedCopy>
                  </span>
                  <span>
                    <small><LocalizedCopy>{trainer.academy_name}</LocalizedCopy></small>
                    <b><LocalizedCopy preserve>{trainer.full_name}</LocalizedCopy></b>
                    <em><LocalizedCopy>{"★ "}</LocalizedCopy><LocalizedCopy>{trainer.rating.toFixed(1)}</LocalizedCopy><LocalizedCopy>{" · "}</LocalizedCopy><LocalizedCopy>{trainer.experience_years}<LocalizedCopy></LocalizedCopy>{" "}</LocalizedCopy><LocalizedCopy>{"tahun"}</LocalizedCopy></em>
                    <i><LocalizedCopy>{trainer.specialties.slice(0, 3).join(" · ")}</LocalizedCopy></i>
                  </span>
                  <strong><LocalizedCopy>{"Lihat profil"}</LocalizedCopy></strong>
                </LocalizedButton>
              ))}</LocalizedCopy>
            </div>
            <RailArrows rail={trainerRailRef} label="pet trainer" />
          </div>
        </section>
        <div className="world-toolbar">
          <div>
            <LocalizedButton
              className={filter === "all" ? "active" : ""}
              onClick={() => setFilter("all")}
            ><LocalizedCopy>{"Semua"}</LocalizedCopy></LocalizedButton>
            <LocalizedCopy>{["obedience", "behavior", "agility", "handler"].map((item) => (
              <LocalizedButton
                className={filter === item ? "active" : ""}
                key={item}
                onClick={() => setFilter(item)}
              >
                <LocalizedCopy>{item.replace("-", " ")}</LocalizedCopy>
              </LocalizedButton>
            ))}</LocalizedCopy>
          </div>
          <span>
            <LocalizedCopy>{loading
              ? "Memuat program…"
              : `${programs.length} program tersedia`}</LocalizedCopy>
          </span>
        </div>
        <div id="academy-catalog" className="academy-grid">
          <CatalogStatus loading={loading} error={loadError} empty={!programs.some((item) => filter === "all" || item.category === filter)} title="Belum ada program pada kategori ini" note="Pilih kategori lain atau kembali lagi untuk melihat program terbaru." onRetry={retryCatalog} />
          <LocalizedCopy>{(loading || loadError ? [] : programs)
            .filter((item) => filter === "all" || item.category === filter)
            .map((item, index) => {
              const reviewCount = item.review_count ?? 0;
              return (
                <article
                  className="academy-card academy-card--experience"
                  key={item.id}
                >
                  <LocalizedButton
                    type="button"
                    className={`academy-visual tone-${index % 3}`}
                    onClick={() => setSelectedProgram(item)}
                    aria-label={`Lihat detail ${item.title}`}
                  >
                    <WorldPhoto src={item.cover_url || item.image_urls?.[0]} alt={`Kelas ${item.title}`} icon="sparkle"/>
                    <span className="academy-media-shade" />
                    <span className="academy-media-topline">
                      <LocalizedCopy>{item.featured ? (
                        <b><LocalizedCopy>{"✦ PILIHAN SLIVADOC"}</LocalizedCopy></b>
                      ) : (
                        <b><LocalizedCopy>{worldLabel(item.level)}</LocalizedCopy></b>
                      )}</LocalizedCopy>
                      <LocalizedCopy>{item.discount_percent > 0 ? (
                        <DiscountBadge percent={item.discount_percent} />
                      ) : null}</LocalizedCopy>
                    </span>
                    <span className="academy-media-bottomline">
                      <small><LocalizedCopy>{item.academy_name}</LocalizedCopy></small>
                    </span>
                  </LocalizedButton>
                  <div className="academy-card-body">
                    <div className="academy-card-proof">
                      <span>
                        <LocalizedCopy>{reviewCount > 0
                          ? `★ ${(item.rating ?? 0).toFixed(1)}`
                          : "☆ Belum dinilai"}</LocalizedCopy>
                      </span>
                      <span><LocalizedCopy>{reviewCount}</LocalizedCopy><LocalizedCopy>{" ulasan"}</LocalizedCopy></span>
                      <span><LocalizedCopy>{academySince(item.running_since)}</LocalizedCopy></span>
                    </div>
                    <h3><LocalizedCopy>{item.title}</LocalizedCopy></h3>
                    <div className="trainer-line">
                      <span><LocalizedCopy>{item.trainer_name.slice(0, 1)}</LocalizedCopy></span>
                      <p>
                        <b><LocalizedCopy>{item.trainer_name}</LocalizedCopy></b>
                        <small>
                          <LocalizedCopy>{item.duration_weeks}</LocalizedCopy><LocalizedCopy>{" minggu · "}</LocalizedCopy><LocalizedCopy>{item.session_count}<LocalizedCopy></LocalizedCopy>{" "}</LocalizedCopy><LocalizedCopy>{"sesi"}</LocalizedCopy></small>
                      </p>
                    </div>
                    <div className="academy-card-checkout">
                      <AcademyPrice program={item} compact />
                      <LocalizedButton
                        type="button"
                        onClick={() => setSelectedProgram(item)}
                      ><LocalizedCopy>{"Lihat kelas "}</LocalizedCopy><Icon name="arrow" size={14} />
                      </LocalizedButton>
                    </div>
                  </div>
                </article>
              );
            })}</LocalizedCopy>
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
      </div>
    );

  if (mode === "events") {
    const visibleEvents = events.filter(item => matchesWorldEvent(item, eventQuery, eventCategory));
    const eventCategories = [...new Set(events.map(item => item.category))];
    return (
      <div className="world-collection world-collection--events" data-collection="events">
        <WorldCollectionHeader mode="events"/>
        <label className="world-event-search"><Icon name="search" size={18}/><LocalizedInput type="search" aria-label="Cari event atau kota" placeholder="Cari event atau kota…" value={eventQuery} onChange={event => setEventQuery(event.target.value)}/>{eventQuery && <LocalizedButton type="button" aria-label="Hapus pencarian event" onClick={() => setEventQuery("")}><Icon name="close" size={17}/></LocalizedButton>}</label>
        <div className="world-event-categories" role="tablist" aria-label="Kategori event">{["all", ...eventCategories].map(category => <LocalizedButton key={category} role="tab" aria-selected={category === eventCategory} onClick={() => setEventCategory(category)}><LocalizedCopy>{category === "all" ? "Semua" : worldLabel(category)}</LocalizedCopy></LocalizedButton>)}</div>
        <div className="section-title-world">
          <div>
            <span><LocalizedCopy>{"EVENT MENDATANG"}</LocalizedCopy></span>
            <h2><LocalizedCopy>{"Event mendatang"}</LocalizedCopy></h2>
          </div>
        </div>
        <div className="event-grid">
          <CatalogStatus loading={loading} error={loadError} empty={!visibleEvents.length} title={eventQuery || eventCategory !== "all" ? "Belum ada event yang cocok" : "Belum ada event mendatang"} note="Event yang tersedia akan muncul di sini. Cek kembali untuk kegiatan bersama pet-mu." onRetry={retryCatalog} />
          <LocalizedCopy>{(loading || loadError ? [] : visibleEvents).map((item, index) => {
            const remaining = Math.max(
              0,
              item.capacity - item.registered_count,
            );
            return (
              <LocalizedButton
                type="button"
                className="event-card event-card--experience"
                key={item.id}
                onClick={() => setSelectedEvent(item)}
              >
                <div className={`event-art event-art-${index % 3}`}>
                  <WorldPhoto src={item.banner_url || item.image_urls?.[0]} alt={`Event ${item.title}`} icon="calendar"/>
                  <span className="event-art-shade" />
                  <span className="event-art-topline">
                    <i><LocalizedCopy>{worldLabel(item.category)}</LocalizedCopy></i>
                    <LocalizedCopy>{item.featured ? <b><LocalizedCopy>{"✦ Pilihan"}</LocalizedCopy></b> : null}</LocalizedCopy>
                  </span>
                  <span className="event-date-chip">
                    <b><LocalizedCopy>{new Date(item.starts_at).getDate()}</LocalizedCopy></b>
                    <small>
                      <LocalizedCopy>{new Intl.DateTimeFormat(petOwnerIntlLocale(), {
                        month: "short",
                      }).format(new Date(item.starts_at))}</LocalizedCopy>
                    </small>
                  </span>

                </div>
                <div>
                  <small><LocalizedCopy>{when(item.starts_at)}</LocalizedCopy></small>
                  <h3><LocalizedCopy>{item.title}</LocalizedCopy></h3>
                  <p className="event-location"><Icon name="map" size={17}/><LocalizedCopy>{item.venue}</LocalizedCopy><LocalizedCopy>{" · "}</LocalizedCopy><LocalizedCopy>{item.city}</LocalizedCopy>
                  </p>
                  <span className="world-event-availability"><Icon name="users" size={12}/><LocalizedCopy>{remaining}</LocalizedCopy> <LocalizedCopy>{"slot tersisa"}</LocalizedCopy></span>
                  <footer>
                    <span>
                      <small><LocalizedCopy>{"Mulai dari"}</LocalizedCopy></small>
                      <b><LocalizedCopy>{item.price ? money.format(item.price) : "Gratis"}</LocalizedCopy></b>
                    </span>
                    <strong><LocalizedCopy>{"Lihat event "}</LocalizedCopy><Icon name="arrow" size={14} />
                    </strong>
                  </footer>
                </div>
              </LocalizedButton>
            );
          })}</LocalizedCopy>
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
      </div>
    );
  }

  if (mode === "petspot")
    return (
      <div className="world-collection world-collection--petspot" data-collection="petspot">
        <WorldExplorer>
        {navigation}
        <div className="world-spot-intro"><small><LocalizedCopy>{"PETSPOT DISCOVERY"}</LocalizedCopy></small><h2><LocalizedCopy>{"Ke mana bersama pet-mu?"}</LocalizedCopy></h2></div>
        <div className="petspot-search">
          <label className="petspot-query">
            <Icon name="search" />
            <LocalizedInput
              value={spotSearch}
              onChange={(event) => setSpotSearch(event.target.value)}
              placeholder="Cari cafe, kosan, apartemen, mall…"
            />
          </label>
          <label className="petspot-radius">
            <span><LocalizedCopy>{"Radius pencarian"}</LocalizedCopy></span>
            <SlivaSelect aria-label="Radius pencarian"
              value={maxDistance}
              onChange={(event) => setMaxDistance(Number(event.target.value))}
            >
              <option value="3">3 km</option>
              <option value="5">5 km</option>
              <option value="10">10 km</option>
              <option value="25">25 km</option>
              <option value="100">100 km</option>
            </SlivaSelect>
          </label>
          <LocalizedButton onClick={() => void locate()}>
            <Icon name="map" size={16} /><LocalizedCopy>{" Cari dari posisi saya"}</LocalizedCopy></LocalizedButton>
        </div>
        </WorldExplorer>
        <div className="world-toolbar spot-filter">
          <div>
            <LocalizedCopy>{[
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
              <LocalizedButton
                className={filter === item.id ? "active" : ""}
                key={item.id}
                onClick={() => setFilter(item.id)}
              >
                <LocalizedCopy>{item.emoji}</LocalizedCopy> <LocalizedCopy>{item.label}</LocalizedCopy>
              </LocalizedButton>
            ))}</LocalizedCopy>
          </div>
          <span><LocalizedCopy>{categorySpots.length}</LocalizedCopy><LocalizedCopy>{" tempat ditemukan"}</LocalizedCopy></span>
        </div>
        <div className="petspot-view-tabs" role="group" aria-label="Tampilan PetSpot">
          <LocalizedButton type="button" aria-pressed={mobilePane === "daftar"} className={mobilePane === "daftar" ? "active" : ""} onClick={() => setMobilePane("daftar")}><LocalizedCopy>{"Daftar"}</LocalizedCopy></LocalizedButton>
          <LocalizedButton type="button" aria-pressed={mobilePane === "peta"} className={mobilePane === "peta" ? "active" : ""} onClick={() => setMobilePane("peta")}><LocalizedCopy>{"Peta"}</LocalizedCopy></LocalizedButton>
        </div>
        <div className="world-split" data-mobile-view={mobilePane}>
        <div className="world-split-list">
        <div className="petspot-grid" aria-label="Daftar tempat ramah pet">
          <CatalogStatus loading={loading} error={loadError} empty={!categorySpots.length} title="Tempat belum ditemukan" note="Ubah kata kunci, kategori, atau radius." onRetry={retryCatalog} />
          <LocalizedCopy>{loading || loadError ? null : (
            categorySpots.map((item) => (
              <article className="petspot-card" key={item.id} data-spot-card={item.id}
                onMouseEnter={() => setActiveSpot(item.id)}
                onMouseLeave={() => setActiveSpot((current) => (current === item.id ? null : current))}
              >
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
                  onOpen={() => openSpot(item)}
                />
                <LocalizedButton
                  type="button"
                  className="petspot-card-content"
                  aria-label={`Lihat detail ${item.name}`}
                  onClick={() => {
                    openSpot(item);
                  }}
                >
                  <small className="petspot-card-category">
                    <LocalizedCopy>{petSpotCategory(item.category)}</LocalizedCopy>
                  </small>
                  <h3><LocalizedCopy>{item.name}</LocalizedCopy></h3>
                  <p className="petspot-card-rating"><LocalizedCopy>{"★"}</LocalizedCopy><LocalizedCopy>{" "}</LocalizedCopy>
                    <LocalizedCopy>{item.review_count
                      ? `${Number(item.rating).toFixed(1)} (${item.review_count})`
                      : "Belum dinilai"}</LocalizedCopy>
                  </p>
                  <p className="petspot-card-location">
                    <Icon name="map" size={13} />
                    <span><LocalizedCopy>{item.city}</LocalizedCopy>
                    <LocalizedCopy>{typeof item.distance_km === "number"
                      ? ` · ${item.distance_km.toFixed(1)} km`
                      : ""}</LocalizedCopy></span>
                  </p>
                  <FacilityTicker facilities={item.facility_details?.length ? item.facility_details : item.pet_facilities ?? []}/>
                  <footer>
                    <b>
                      <LocalizedCopy>{item.reservable ? "Reservasi tersedia" : "Lihat tempat"}</LocalizedCopy>
                    </b>
                    <Icon name="arrow" size={17} />
                  </footer>
                </LocalizedButton>
              </article>
            ))
          )}</LocalizedCopy>
        </div>
        </div>
        <div className="world-split-map">
          <div className="spot-map-layers">
            <label>
              <input type="checkbox" checked={showPetship} onChange={(event) => setShowPetship(event.target.checked)} />
              <LocalizedCopy>{`Lokasi Petship (${petshipPlaces.length})`}</LocalizedCopy>
            </label>
            <label>
              <input type="checkbox" checked={showLostPets} onChange={(event) => setShowLostPets(event.target.checked)} />
              <LocalizedCopy>{`Hewan hilang (${lostPets.length})`}</LocalizedCopy>
            </label>
          </div>
          <GeoMap className="spot-map" markers={geoMarkers} circles={geoCircles} activeId={activeSpot ? `spot-${activeSpot}` : null} focus={mapFocus} />
        </div>
        </div>
      </div>
    );

  return (
    <>
      <section className="pethub-head">
        <div>
          <span>
            <i /><LocalizedCopy>{" PETHUB LIVE"}</LocalizedCopy></span>
          <h2><LocalizedCopy>{"Satu layar untuk seluruh dunia pet."}</LocalizedCopy></h2>
          <p><LocalizedCopy>{"Live streaming, video, story foto, channel, komentar, dan pet thread dalam satu ruang."}</LocalizedCopy></p>
        </div>
        <LocalizedButton
          className="primary-button"
          onClick={() =>
            requirePet() && setComposer(true)
          }
        ><LocalizedCopy>{"＋ Buat posting"}</LocalizedCopy></LocalizedButton>
      </section>
      <div className="story-strip">
        <LocalizedButton
          className="story-add"
          onClick={() =>
            requirePet() && setStoryComposer(true)
          }
        >
          <span><LocalizedCopy>{"＋"}</LocalizedCopy></span>
          <b><LocalizedCopy>{"Story kamu"}</LocalizedCopy></b>
        </LocalizedButton>
        <LocalizedCopy>{stories.map((story) => (
          <LocalizedButton key={story.id} onClick={() => setViewStory(story)}>
            <span>
              <LocalizedCopy>{story.photo_url &&
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
              )}</LocalizedCopy>
            </span>
            <b><LocalizedCopy>{story.author_name.split(" ")[0]}</LocalizedCopy></b>
          </LocalizedButton>
        ))}</LocalizedCopy>
      </div>
      <div className="stream-strip">
        <LocalizedCopy>{streams.map((item, index) => (
          <LocalizedButton
            key={item.id}
            className={item.status === "live" ? "live" : ""}
            onClick={() => setSelectedStream(item)}
          >
            <div className={`stream-art stream-${index % 3}`}>
              <span><LocalizedCopy>{index % 2 ? "👩🏻‍⚕️" : "🐕‍🦺"}</LocalizedCopy></span>
              <LocalizedCopy>{item.status === "live" ? <i><LocalizedCopy>{"● LIVE"}</LocalizedCopy></i> : <i><LocalizedCopy>{"◷ TERJADWAL"}</LocalizedCopy></i>}</LocalizedCopy>
              <b><LocalizedCopy>{"▶"}</LocalizedCopy></b>
            </div>
            <div>
              <span className="channel-avatar">
                <LocalizedCopy>{item.channel_name.slice(0, 1)}</LocalizedCopy>
              </span>
              <p>
                <strong><LocalizedCopy>{item.title}</LocalizedCopy></strong>
                <small>
                  <LocalizedCopy>{item.channel_name}</LocalizedCopy> <LocalizedCopy>{item.verified && "✓"}</LocalizedCopy>
                </small>
                <em>
                  <LocalizedCopy>{item.status === "live"
                    ? `${item.viewer_count.toLocaleString(petOwnerIntlLocale())} menonton`
                    : when(item.scheduled_at)}</LocalizedCopy>
                </em>
              </p>
            </div>
          </LocalizedButton>
        ))}</LocalizedCopy>
      </div>
      <div className="pethub-layout">
        <section className="hub-feed">
          <LocalizedCopy>{sharedPostID ? (
            <div className="hub-shared-post">
              <b><LocalizedCopy>{"Posting yang dibagikan"}</LocalizedCopy></b>
              <LocalizedButton
                onClick={() => {
                  const url = new URL(window.location.href);
                  url.searchParams.delete("post");
                  window.history.replaceState({}, "", url);
                  setSharedPostID("");
                }}
              ><LocalizedCopy>{"Lihat semua posting"}</LocalizedCopy></LocalizedButton>
            </div>
          ) : null}</LocalizedCopy>
          <div className="hub-tabs">
            <LocalizedCopy>{["Untuk Kamu", "Mengikuti", "Reels", "Thread"].map((item) => (
              <LocalizedButton
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
                <LocalizedCopy>{item}</LocalizedCopy>
              </LocalizedButton>
            ))}</LocalizedCopy>
          </div>
          <LocalizedCopy>{feedLoading || feedError ? (
            <CatalogStatus loading={feedLoading} error={feedError} empty={false} title="Feed ini masih kosong" note="Ikuti channel atau terbitkan thread pertama." onRetry={retryCatalog} />
          ) : posts.length ? (
            posts.map((post) => (
              <article
                className={`hub-post ${hubTab === "Reels" ? "hub-post--reel" : ""}`}
                key={post.id}
              >
                <header>
                  <span>
                    <LocalizedCopy>{post.channel_name?.slice(0, 1) ||
                      post.author_name.slice(0, 1)}</LocalizedCopy>
                  </span>
                  <p>
                    <b>
                      <LocalizedCopy preserve>{post.author_name}</LocalizedCopy> <LocalizedCopy>{post.verified && <i><LocalizedCopy>{"✓"}</LocalizedCopy></i>}</LocalizedCopy>
                    </b>
                    <small>
                      <LocalizedCopy>{post.channel_handle || post.channel_name}</LocalizedCopy><LocalizedCopy>{" ·"}</LocalizedCopy><LocalizedCopy>{" "}</LocalizedCopy>
                      <LocalizedCopy>{relative(post.created_at)}</LocalizedCopy>
                    </small>
                  </p>
                  <LocalizedButton
                    aria-label="Simpan posting"
                    aria-pressed={Boolean(post.saved)}
                    onClick={() => void savePost(post)}
                  >
                    <LocalizedCopy>{post.saved ? "✓" : "＋"}</LocalizedCopy>
                  </LocalizedButton>
                </header>
                <div
                  className="hub-like-surface"
                  onDoubleClick={(event) => {
                    if ((event.target as HTMLElement).closest("button")) return;
                    void like(post, true);
                  }}
                >
                  <LocalizedCopy>{post.media_url &&
                    (post.post_type === "video" ||
                    /\.(mp4|mov|webm)(\?|$)/i.test(post.media_url) ? (
                      <SlivaVideo
                        className="hub-media"
                        src={post.media_url}
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
                    ))}</LocalizedCopy>
                  <LocalizedCopy>{heartBurst === post.id ? (
                    <span className="hub-like-burst" aria-hidden="true"><LocalizedCopy>{"♥"}</LocalizedCopy></span>
                  ) : null}</LocalizedCopy>
                </div>
                <p className="hub-caption"><LocalizedCopy>{post.content}</LocalizedCopy></p>
                <footer>
                  <LocalizedButton
                    aria-label="Sukai konten"
                    className={post.liked ? "liked" : ""}
                    aria-pressed={Boolean(post.liked)}
                    onClick={() =>
                      isPetOwnerAuthenticated()
                        ? void like(post)
                        : loginRequired()
                    }
                  >
                    <Icon name="heart" size={18} /><LocalizedCopy>{" "}</LocalizedCopy>
                    <LocalizedCopy>{post.like_count.toLocaleString(petOwnerIntlLocale())}</LocalizedCopy>
                  </LocalizedButton>
                  <LocalizedButton
                    aria-label="Buka komentar"
                    onClick={() => setCommentPost(post)}
                  >
                    <Icon name="chat" size={18} /> <LocalizedCopy>{post.comment_count}</LocalizedCopy>
                  </LocalizedButton>
                  <LocalizedButton
                    aria-label="Bagikan konten"
                    onClick={() => setSharingPost(post)}
                  >
                    <Icon name="send" size={18} /> <span><LocalizedCopy>{"Bagikan"}</LocalizedCopy></span>
                  </LocalizedButton>
                </footer>
              </article>
            ))
          ) : (
            <div className="empty-state">
              <span><LocalizedCopy>{"▶"}</LocalizedCopy></span>
              <h3>
                <LocalizedCopy>{sharedPostID
                  ? "Posting tidak tersedia"
                  : "Feed ini masih kosong"}</LocalizedCopy>
              </h3>
              <p><LocalizedCopy>{"Ikuti channel atau terbitkan thread pertama."}</LocalizedCopy></p>
            </div>
          )}</LocalizedCopy>
        </section>
        <aside className="hub-side">
          <section>
            <span><LocalizedCopy>{"TRENDING PET THREAD"}</LocalizedCopy></span>
            <LocalizedCopy>{posts
              .filter((item) => item.post_type === "thread")
              .slice(0, 4)
              .map((item, index) => (
                <LocalizedButton key={item.id} onClick={() => setCommentPost(item)}>
                  <small><LocalizedCopy>{index + 1}</LocalizedCopy><LocalizedCopy>{" · Thread terbaru"}</LocalizedCopy></small>
                  <b><LocalizedCopy>{item.channel_name || item.author_name}</LocalizedCopy></b>
                  <em><LocalizedCopy>{item.content.slice(0, 48)}</LocalizedCopy><LocalizedCopy>{"…"}</LocalizedCopy></em>
                </LocalizedButton>
              ))}</LocalizedCopy>
          </section>
          <section>
            <span><LocalizedCopy>{"CHANNEL PILIHAN"}</LocalizedCopy></span>
            <LocalizedCopy>{Array.from(
              new Map(
                posts
                  .filter((item) => item.channel_id)
                  .map((item) => [item.channel_id, item]),
              ).values(),
            )
              .slice(0, 4)
              .map((item) => (
                <LocalizedButton
                  key={item.channel_id}
                  onClick={() => void followChannel(item.channel_id)}
                >
                  <i><LocalizedCopy>{item.channel_name.slice(0, 1)}</LocalizedCopy></i>
                  <p>
                    <b>
                      <LocalizedCopy>{item.channel_name}</LocalizedCopy> <LocalizedCopy>{item.verified && "✓"}</LocalizedCopy>
                    </b>
                    <small><LocalizedCopy>{item.channel_handle}</LocalizedCopy></small>
                  </p>
                  <strong><LocalizedCopy>{item.following ? "Mengikuti" : "Ikuti"}</LocalizedCopy></strong>
                </LocalizedButton>
              ))}</LocalizedCopy>
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
      {sharingPost && (
        <Modal close={() => setSharingPost(null)} className="hub-share-modal">
          <span className="share-hero-icon"><Icon name="send" size={28}/></span>
          <h2><LocalizedCopy>{"Bagikan momen ini"}</LocalizedCopy></h2>
          <p><LocalizedCopy>{"Kirim tautan ini ke temanmu untuk membuka postingan yang sama di PetHub."}</LocalizedCopy></p>
          <div className="share-post-preview"><Icon name="paw"/><span>{sharingPost.content}</span></div>
          <label><LocalizedCopy>{"Tautan postingan"}</LocalizedCopy><input aria-label="Tautan postingan" readOnly value={petHubContentLink(sharingPost.id)} onFocus={event => event.target.select()}/></label>
          <div className="share-actions"><LocalizedButton className="primary-button" onClick={async () => {
            try { await navigator.clipboard.writeText(petHubContentLink(sharingPost.id)); notify("Tautan konten Slivadoc disalin"); }
            catch { notify("Pilih dan salin tautan postingan di atas."); }
          }}><Icon name="check" size={17}/><LocalizedCopy>{"Salin tautan"}</LocalizedCopy></LocalizedButton>
          {typeof navigator !== "undefined" && typeof navigator.share === "function" && <LocalizedButton className="secondary-button" onClick={() => void sharePost(sharingPost)}><Icon name="send" size={17}/><LocalizedCopy>{"Bagikan ke…"}</LocalizedCopy></LocalizedButton>}</div>
        </Modal>
      )}
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
  const { requirePet } = usePetOwnerFlow();
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
    if (!requirePet()) return;
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
    if (!requirePet()) return;
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
      else close();
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
    if (!requirePet()) return;
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
          detail
          images={[program.cover_url, ...(program.image_urls ?? [])]}
          alt={program.title}
          fallback="🎓"
          tag={program.academy_name}
          className="academy-modal-cover"
        />
        <DiscountBadge percent={program.discount_percent} />
      </div>
      <div className="modal-world-body">
        <LocalizedCopy>{done ? (
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
              <LocalizedCopy>{program.category}</LocalizedCopy><LocalizedCopy>{" · "}</LocalizedCopy><LocalizedCopy>{worldLabel(program.level)}</LocalizedCopy>
            </small>
            <div className="academy-detail-heading-row">
              <h2><LocalizedCopy>{program.title}</LocalizedCopy></h2>
            </div>
            <p><LocalizedCopy>{program.description}</LocalizedCopy></p>
            <div className="academy-social-summary">
              <span>
                <b>
                  <LocalizedCopy>{(program.review_count ?? 0) > 0
                    ? `★ ${(program.rating ?? 0).toFixed(1)}`
                    : "☆ Belum dinilai"}</LocalizedCopy>
                </b>
                <small><LocalizedCopy>{program.review_count ?? 0}</LocalizedCopy><LocalizedCopy>{" ulasan peserta"}</LocalizedCopy></small>
              </span>
              <span>
                <b><LocalizedCopy>{program.participant_count ?? 0}</LocalizedCopy><LocalizedCopy>{" pet"}</LocalizedCopy></b>
                <small><LocalizedCopy>{"sudah bergabung"}</LocalizedCopy></small>
              </span>
              <span>
                <b><LocalizedCopy>{program.capacity}</LocalizedCopy><LocalizedCopy>{" kursi"}</LocalizedCopy></b>
                <small><LocalizedCopy>{"kapasitas per cohort"}</LocalizedCopy></small>
              </span>
              <span>
                <b><LocalizedCopy>{academySince(program.running_since)}</LocalizedCopy></b>
                <small><LocalizedCopy>{"rekam jejak program"}</LocalizedCopy></small>
              </span>
            </div>
            <div className="world-detail-grid">
              <span>
                <small><LocalizedCopy>{"Pet trainer"}</LocalizedCopy></small>
                <b>
                  <LocalizedCopy>{detail?.trainers
                    ?.map((trainer) => trainer.full_name)
                    .join(", ") || item.trainer_name}</LocalizedCopy>
                </b>
              </span>
              <span>
                <small><LocalizedCopy>{"Mulai"}</LocalizedCopy></small>
                <b>
                  <LocalizedCopy>{when(
                    detail?.schedules?.[0]?.starts_at || item.next_schedule,
                  )}</LocalizedCopy>
                </b>
              </span>
              <span>
                <small><LocalizedCopy>{"Durasi"}</LocalizedCopy></small>
                <b>
                  <LocalizedCopy>{program.duration_weeks}</LocalizedCopy><LocalizedCopy>{" minggu · "}</LocalizedCopy><LocalizedCopy>{program.session_count}</LocalizedCopy><LocalizedCopy>{" sesi"}</LocalizedCopy></b>
              </span>
              <span>
                <small><LocalizedCopy>{"Investasi"}</LocalizedCopy></small>
                <AcademyPrice program={program} compact />
              </span>
            </div>
            {detailLoading ? (
              <div className="academy-detail-loading"><LocalizedCopy>{"Memuat trainer dan jadwal kelas…"}</LocalizedCopy></div>
            ) : (
              <>
                <div className="academy-detail-block">
                  <div className="academy-detail-title">
                    <b><LocalizedCopy>{"Trainer kelas"}</LocalizedCopy></b>
                    <small><LocalizedCopy>{"Klik untuk melihat profil lengkap"}</LocalizedCopy></small>
                  </div>
                  <div className="academy-program-trainers">
                    <LocalizedCopy>{detail?.trainers.map((trainer) => (
                      <LocalizedButton
                        type="button"
                        key={trainer.id}
                        onClick={() => openTrainer(trainer)}
                      >
                        <span><LocalizedCopy>{trainer.full_name.slice(0, 1)}</LocalizedCopy></span>
                        <b><LocalizedCopy preserve>{trainer.full_name}</LocalizedCopy></b>
                        <small><LocalizedCopy>{"★ "}</LocalizedCopy><LocalizedCopy>{trainer.rating.toFixed(1)}</LocalizedCopy><LocalizedCopy>{" ·"}</LocalizedCopy><LocalizedCopy>{" "}</LocalizedCopy>
                          <LocalizedCopy>{trainer.certification}</LocalizedCopy>
                        </small>
                      </LocalizedButton>
                    ))}</LocalizedCopy>
                  </div>
                </div>
                <div className="academy-species-note">
                  <b><LocalizedCopy>{"Jenis pet:"}</LocalizedCopy></b><LocalizedCopy>{" "}</LocalizedCopy>
                  <LocalizedCopy>{(detail?.supported_species ?? [])
                    .map((speciesName) =>
                      speciesName === "dog"
                        ? "🐕 Anjing"
                        : speciesName === "cat"
                          ? "🐈 Kucing"
                          : speciesName,
                    )
                    .join(" · ") || "Semua pet"}</LocalizedCopy>
                </div>
                <section className="academy-review-section">
                  <div className="academy-review-heading">
                    <div>
                      <small><LocalizedCopy>{"CERITA ALUMNI"}</LocalizedCopy></small>
                      <h3><LocalizedCopy>{"Review & komentar pet parent"}</LocalizedCopy></h3>
                    </div>
                    <b>
                      <LocalizedCopy>{(program.review_count ?? 0) > 0
                        ? `★ ${(program.rating ?? 0).toFixed(1)}`
                        : "Belum dinilai"}</LocalizedCopy>
                    </b>
                  </div>
                  <div className="academy-review-list">
                    <LocalizedCopy>{(detail?.reviews ?? []).length ? (
                      detail?.reviews.map((review: AcademyReview) => (
                        <article key={review.id}>
                          <span>
                            <LocalizedCopy>{review.reviewer_name.slice(0, 1).toUpperCase()}</LocalizedCopy>
                          </span>
                          <div>
                            <header>
                              <b><LocalizedCopy preserve>{review.reviewer_name}</LocalizedCopy></b>
                              <em><LocalizedCopy>{"★".repeat(review.rating)}</LocalizedCopy></em>
                            </header>
                            <small><LocalizedCopy>{"✓ Peserta terverifikasi · bersama"}</LocalizedCopy><LocalizedCopy>{" "}</LocalizedCopy>
                              <LocalizedCopy>{review.pet_name || "pet-nya"}</LocalizedCopy>
                            </small>
                            <p><LocalizedCopy>{review.comment}</LocalizedCopy></p>
                            <time>
                              <LocalizedCopy>{new Intl.DateTimeFormat(petOwnerIntlLocale(), {
                                dateStyle: "medium",
                              }).format(new Date(review.created_at))}</LocalizedCopy>
                            </time>
                          </div>
                        </article>
                      ))
                    ) : (
                      <p className="academy-review-empty"><LocalizedCopy>{"Belum ada ulasan. Peserta terverifikasi dapat menjadi yang pertama."}</LocalizedCopy></p>
                    )}</LocalizedCopy>
                  </div>
                  <form className="academy-review-form" onSubmit={submitReview}>
                    <div>
                      <span><LocalizedCopy>{"Bagikan pengalaman kelas"}</LocalizedCopy></span>
                      <div aria-label="Pilih rating">
                        <LocalizedCopy>{[1, 2, 3, 4, 5].map((rating) => (
                          <LocalizedButton
                            type="button"
                            key={rating}
                            className={rating <= reviewRating ? "active" : ""}
                            onClick={() => setReviewRating(rating)}
                            aria-label={`${rating} bintang`}
                          ><LocalizedCopy>{"★"}</LocalizedCopy></LocalizedButton>
                        ))}</LocalizedCopy>
                      </div>
                    </div>
                    <LocalizedTextarea
                      value={reviewComment}
                      onChange={(event) => setReviewComment(event.target.value)}
                      placeholder="Apa perubahan yang paling terasa pada pet-mu?"
                      maxLength={1500}
                    />
                    <LocalizedCopy>{reviewMessage ? <p><LocalizedCopy>{reviewMessage}</LocalizedCopy></p> : null}</LocalizedCopy>
                    <LocalizedButton type="submit" disabled={reviewBusy}>
                      <LocalizedCopy>{reviewBusy
                        ? "Menerbitkan…"
                        : "Kirim review terverifikasi"}</LocalizedCopy>
                    </LocalizedButton>
                  </form>
                </section>
              </>
            )}
            <LocalizedButton
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
              <LocalizedCopy>{eligiblePets.length === 0
                ? "Tidak ada pet yang sesuai"
                : !detailLoading &&
                    !detail?.schedules?.some(
                      (schedule) => schedule.remaining_capacity > 0,
                    )
                  ? "Jadwal belum tersedia"
                  : `Pilih pet & jadwal`}</LocalizedCopy>
            </LocalizedButton>
          </>
        ) : (
          <form className="world-form" onSubmit={submit}>
            <h2><LocalizedCopy>{"Data peserta academy"}</LocalizedCopy></h2>
            <label>
              <span><LocalizedCopy>{"Nama pet parent"}</LocalizedCopy></span>
              <LocalizedInput
                name="participant_name"
                defaultValue={ownerName}
                required
              />
            </label>
            <label>
              <span><LocalizedCopy>{"Pet yang akan mengikuti kelas"}</LocalizedCopy></span>
              <SlivaSelect aria-label="Pet yang akan mengikuti kelas"
                value={selectedPetID}
                onChange={(event) => setSelectedPetID(event.target.value)}
                required
              >
                {eligiblePets.map((candidate) => (
                  <option key={candidate.id} value={candidate.id}>
                    {candidate.name} · {candidate.breed}
                  </option>
                ))}
              </SlivaSelect>
            </label>
            <label>
              <span><LocalizedCopy>{"Mulai ikut kelas"}</LocalizedCopy></span>
              <SlivaSelect aria-label="Mulai ikut kelas"
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
              </SlivaSelect>
            </label>
            <div className="checkout-line">
              <span><LocalizedCopy>{"Total program"}</LocalizedCopy></span>
              <AcademyPrice program={program} compact />
            </div>
            <LocalizedCopy>{program.price > 0 && (
              <PaymentMethodPicker
                value={paymentMethod}
                onChange={setPaymentMethod}
                disabled={busy}
              />
            )}</LocalizedCopy>
            <LocalizedButton
              className="primary-button full"
              disabled={busy || (program.price > 0 && !paymentMethod)}
            >
              <LocalizedCopy>{busy
                ? "Membuat pembayaran…"
                : program.price > 0
                  ? "Lanjut ke pembayaran"
                  : "Konfirmasi pendaftaran"}</LocalizedCopy>
            </LocalizedButton>
          </form>
        )}</LocalizedCopy>
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
          <LocalizedCopy>{trainer.photo_url ? (
            <NextImage
              src={trainer.photo_url}
              alt={trainer.full_name}
              width={112}
              height={112}
              unoptimized
            />
          ) : (
            trainer.full_name.slice(0, 1)
          )}</LocalizedCopy>
        </span>
        <div>
          <small><LocalizedCopy>{"PET TRAINER · "}</LocalizedCopy><LocalizedCopy>{trainer.academy_name}</LocalizedCopy></small>
          <h2><LocalizedCopy preserve>{trainer.full_name}</LocalizedCopy></h2>
          <p><LocalizedCopy>{"★ "}</LocalizedCopy><LocalizedCopy>{trainer.rating.toFixed(1)}</LocalizedCopy><LocalizedCopy>{" · "}</LocalizedCopy><LocalizedCopy>{trainer.experience_years}</LocalizedCopy><LocalizedCopy>{" tahun pengalaman"}</LocalizedCopy></p>
        </div>
      </div>
      <div
        className="academy-trainer-profile-body"
        role="region"
        aria-label={`Detail ${trainer.full_name}`}
        tabIndex={0}
      >
        <p><LocalizedCopy>{trainer.bio || "Profil trainer terverifikasi Slivadoc."}</LocalizedCopy></p>
        <div className="academy-trainer-metrics">
          <span>
            <small><LocalizedCopy>{"Sertifikasi"}</LocalizedCopy></small>
            <b><LocalizedCopy>{trainer.certification || "Slivadoc verified"}</LocalizedCopy></b>
          </span>
          <span>
            <small><LocalizedCopy>{"Jenis pet"}</LocalizedCopy></small>
            <b><LocalizedCopy>{trainer.pet_types?.join(" · ") || "dog · cat"}</LocalizedCopy></b>
          </span>
          <span>
            <small><LocalizedCopy>{"Spesialisasi"}</LocalizedCopy></small>
            <b><LocalizedCopy>{trainer.specialties?.join(" · ") || "behavior"}</LocalizedCopy></b>
          </span>
        </div>
        <LocalizedCopy>{trainer.programs?.length ? (
          <div className="academy-trainer-programs">
            <h3><LocalizedCopy>{"Kelas bersama "}</LocalizedCopy><LocalizedCopy>{trainer.full_name.split(" ")[0]}</LocalizedCopy></h3>
            <LocalizedCopy>{trainer.programs.map((program) => (
              <div key={program.id}>
                <span>
                  <b><LocalizedCopy>{program.title}</LocalizedCopy></b>
                  <small>
                    <LocalizedCopy>{worldLabel(program.level)}</LocalizedCopy><LocalizedCopy>{" · "}</LocalizedCopy><LocalizedCopy>{program.session_count}</LocalizedCopy><LocalizedCopy>{" sesi"}</LocalizedCopy></small>
                </span>
                <strong><LocalizedCopy>{money.format(program.price)}</LocalizedCopy></strong>
              </div>
            ))}</LocalizedCopy>
          </div>
        ) : null}</LocalizedCopy>
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
  const { requirePet } = usePetOwnerFlow();
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
    if (!requirePet()) return;
    setRegister(true);
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!requirePet()) return;
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
      else close();
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
        detail
        images={[item.banner_url, ...(item.image_urls ?? [])]}
        alt={item.title}
        fallback="🎪"
        tag={item.category}
        className="event-modal-cover"
      />
      <div className="modal-world-body">
        <LocalizedCopy>{done ? (
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
            <h2><LocalizedCopy>{"Pesan tiket event"}</LocalizedCopy></h2>
            <label>
              <span><LocalizedCopy>{"Nama peserta"}</LocalizedCopy></span>
              <LocalizedInput
                name="participant_name"
                defaultValue={ownerName}
                required
              />
            </label>
            <label>
              <span><LocalizedCopy>{"Email"}</LocalizedCopy></span>
              <LocalizedInput
                name="participant_email"
                type="email"
                defaultValue={ownerEmail}
                required
              />
            </label>
            <LocalizedCopy>{item.ticket_unit === "owner_pet" ? (
              <fieldset className="event-pet-picker">
                <legend><LocalizedCopy>{"Pet yang ikut"}</LocalizedCopy></legend>
                <LocalizedCopy>{allowedPets.length ? (
                  <div>
                    <LocalizedCopy>{allowedPets.map((pet) => (
                      <LocalizedButton
                        type="button"
                        className={selectedPetID === pet.id ? "active" : ""}
                        key={pet.id}
                        onClick={() => setSelectedPetID(pet.id)}
                      >
                        <span><LocalizedCopy>{pet.avatar}</LocalizedCopy></span>
                        <b><LocalizedCopy preserve>{pet.name}</LocalizedCopy></b>
                        <small><LocalizedCopy>{pet.breed || speciesLabel(pet.species)}</LocalizedCopy></small>
                        <i><LocalizedCopy>{selectedPetID === pet.id ? "✓" : "+"}</LocalizedCopy></i>
                      </LocalizedButton>
                    ))}</LocalizedCopy>
                  </div>
                ) : (
                  <p><LocalizedCopy>{"Belum ada profil pet yang sesuai dengan jenis pet untuk event ini."}</LocalizedCopy></p>
                )}</LocalizedCopy>
              </fieldset>
            ) : (
              <label>
                <span><LocalizedCopy>{"Jumlah tiket"}</LocalizedCopy></span>
                <SlivaSelect aria-label="Jumlah tiket" name="ticket_quantity" defaultValue="1">
                  <option>1</option>
                  <option>2</option>
                  <option>3</option>
                  <option>4</option>
                </SlivaSelect>
              </label>
            )}</LocalizedCopy>
            <div className="checkout-line">
              <span>
                <LocalizedCopy>{item.ticket_unit === "owner_pet"
                  ? "1 owner + 1 pet"
                  : "Harga per tiket"}</LocalizedCopy>
              </span>
              <b><LocalizedCopy>{item.price ? money.format(item.price) : "Gratis"}</LocalizedCopy></b>
            </div>
            <LocalizedCopy>{item.price > 0 ? (
              <PaymentMethodPicker
                value={paymentMethod}
                onChange={setPaymentMethod}
                disabled={busy}
              />
            ) : null}</LocalizedCopy>
            <LocalizedButton
              className="primary-button full"
              disabled={
                busy ||
                (item.price > 0 && !paymentMethod) ||
                (item.ticket_unit === "owner_pet" && !selectedPetID)
              }
            >
              <LocalizedCopy>{busy
                ? "Membuat pembayaran…"
                : item.price > 0
                  ? "Lanjut ke pembayaran"
                  : "Konfirmasi tiket"}</LocalizedCopy>
            </LocalizedButton>
          </form>
        ) : (
          <>
            <small className="world-kicker"><LocalizedCopy>{when(item.starts_at)}</LocalizedCopy></small>
            <div className="event-detail-heading">
              <div>
                <span><LocalizedCopy>{item.featured ? "✦ EVENT PILIHAN" : item.category}</LocalizedCopy></span>
                <h2><LocalizedCopy>{item.title}</LocalizedCopy></h2>
              </div>
              <b><LocalizedCopy>{item.price ? money.format(item.price) : "Gratis"}</LocalizedCopy></b>
            </div>
            <p><LocalizedCopy>{item.description}</LocalizedCopy></p>
            <div className="event-social-summary">
              <span>
                <b><LocalizedCopy>{item.registered_count.toLocaleString(petOwnerIntlLocale())}</LocalizedCopy></b>
                <small><LocalizedCopy>{"pet parent terdaftar"}</LocalizedCopy></small>
              </span>
              <span>
                <b><LocalizedCopy>{Math.max(0, item.capacity - item.registered_count)}</LocalizedCopy></b>
                <small><LocalizedCopy>{"slot masih tersedia"}</LocalizedCopy></small>
              </span>
              <span>
                <b>
                  <LocalizedCopy>{new Intl.DateTimeFormat(petOwnerIntlLocale(), {
                    day: "numeric",
                    month: "short",
                  }).format(new Date(item.starts_at))}</LocalizedCopy>
                </b>
                <small><LocalizedCopy>{"tanggal event"}</LocalizedCopy></small>
              </span>
              <span>
                <b><LocalizedCopy>{item.allowed_pet_species?.length || "Semua"}</LocalizedCopy></b>
                <small><LocalizedCopy>{"jenis pet diterima"}</LocalizedCopy></small>
              </span>
            </div>
            {item.pet_spot_name ? (
              <div className="event-host">
                <span><LocalizedCopy>{"✦"}</LocalizedCopy></span>
                <div>
                  <small><LocalizedCopy>{"Diselenggarakan oleh"}</LocalizedCopy></small>
                  <b><LocalizedCopy>{item.pet_spot_name}</LocalizedCopy></b>
                </div>
              </div>
            ) : null}
            <div className="world-detail-grid">
              <span>
                <small><LocalizedCopy>{"Lokasi"}</LocalizedCopy></small>
                <b>
                  <LocalizedCopy>{item.venue}</LocalizedCopy><LocalizedCopy>{", "}</LocalizedCopy><LocalizedCopy>{item.city}</LocalizedCopy>
                </b>
              </span>
              <span>
                <small><LocalizedCopy>{"Tiket"}</LocalizedCopy></small>
                <b>
                  <LocalizedCopy>{item.price
                    ? `${money.format(item.price)} / owner + pet`
                    : "Gratis"}</LocalizedCopy>
                </b>
              </span>
              <span>
                <small><LocalizedCopy>{"Kapasitas"}</LocalizedCopy></small>
                <b>
                  <LocalizedCopy>{item.registered_count}</LocalizedCopy><LocalizedCopy>{"/"}</LocalizedCopy><LocalizedCopy>{item.capacity}</LocalizedCopy><LocalizedCopy>{" terdaftar"}</LocalizedCopy></b>
              </span>
              <span>
                <small><LocalizedCopy>{"Status"}</LocalizedCopy></small>
                <b><LocalizedCopy>{item.status}</LocalizedCopy></b>
              </span>
            </div>
            {item.ticket_unit === "owner_pet" ? (
              <>
                <div className="event-species">
                  <small><LocalizedCopy>{"Pet yang dapat hadir"}</LocalizedCopy></small>
                  <div>
                    <LocalizedCopy>{item.allowed_pet_species.map((species) => (
                      <span key={species}>
                        <LocalizedCopy>{speciesIcon(species)}</LocalizedCopy> <LocalizedCopy>{speciesLabel(species)}</LocalizedCopy>
                      </span>
                    ))}</LocalizedCopy>
                  </div>
                </div>
                {item.pet_requirements.length ? (
                  <div className="event-requirements">
                    <small><LocalizedCopy>{"Checklist sebelum datang"}</LocalizedCopy></small>
                    <ul>
                      <LocalizedCopy>{item.pet_requirements.map((requirement) => (
                        <li key={requirement}><LocalizedCopy>{"✓ "}</LocalizedCopy><LocalizedCopy>{requirement}</LocalizedCopy></li>
                      ))}</LocalizedCopy>
                    </ul>
                  </div>
                ) : null}
              </>
            ) : null}
            <div className="event-experience-note">
              <span><LocalizedCopy>{"🎟️"}</LocalizedCopy></span>
              <div>
                <b><LocalizedCopy>{"Ticket tersimpan otomatis"}</LocalizedCopy></b>
                <small><LocalizedCopy>{"Sesudah registrasi, QR ticket dan detail event dapat dibuka kembali dari Aktivitas."}</LocalizedCopy></small>
              </div>
            </div>
            <LocalizedButton className="primary-button full" onClick={start}>
              <LocalizedCopy>{item.price ? "Pilih pet & ambil tiket" : "Amankan tiket gratis"}</LocalizedCopy>
            </LocalizedButton>
          </>
        )}</LocalizedCopy>
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
function SpotPage({
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
    <section className="petspot-detail-page" aria-label={item.name}>
      <LocalizedButton type="button" className="secondary-button petspot-back" onClick={close}>
        <Icon name="arrow" className="back-arrow" size={17} /><LocalizedCopy>{"Kembali ke PetSpot"}</LocalizedCopy>
      </LocalizedButton>
      <PetSpotDetail
        item={item}
        ownerName={ownerName}
        close={close}
        notify={notify}
        gallery={(spot) => (
          <WorldImageGallery
            detail
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
    </section>
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
        <LocalizedCopy>{item.playback_url ? (
          <SlivaVideo src={item.playback_url} autoPlay />
        ) : (
          <>
            <span><LocalizedCopy>{"🐕‍🦺"}</LocalizedCopy></span>
            <small>
              <LocalizedCopy>{item.status === "live"
                ? "● LIVE · playback sedang dipersiapkan"
                : when(item.scheduled_at)}</LocalizedCopy>
            </small>
          </>
        )}</LocalizedCopy>
      </div>
      <div className="stream-body">
        <small>
          <LocalizedCopy>{item.status === "live"
            ? `${item.viewer_count.toLocaleString(petOwnerIntlLocale())} sedang menonton`
            : "Live terjadwal"}</LocalizedCopy>
        </small>
        <h2><LocalizedCopy>{item.title}</LocalizedCopy></h2>
        <p><LocalizedCopy>{item.description}</LocalizedCopy></p>
        <div className="stream-channel">
          <span><LocalizedCopy>{item.channel_name.slice(0, 1)}</LocalizedCopy></span>
          <p>
            <b>
              <LocalizedCopy>{item.channel_name}</LocalizedCopy> <LocalizedCopy>{item.verified && "✓"}</LocalizedCopy>
            </b>
            <small><LocalizedCopy>{item.channel_handle}</LocalizedCopy></small>
          </p>
          <LocalizedButton onClick={follow}><LocalizedCopy>{"Ikuti"}</LocalizedCopy></LocalizedButton>
        </div>
        <div className="live-chat">
          <b><LocalizedCopy>{"Live chat"}</LocalizedCopy></b>
          <div className="empty-state compact"><LocalizedCopy>{"Pesan live akan tampil ketika provider streaming mengaktifkan room chat."}</LocalizedCopy></div>
          <label>
            <LocalizedInput
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Tulis pesan yang suportif…"
              disabled
            />
            <LocalizedButton disabled><LocalizedCopy>{"Kirim"}</LocalizedCopy></LocalizedButton>
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
  const { requirePet } = usePetOwnerFlow();
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
    if (!requirePet()) return;
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
        <small><LocalizedCopy>{"PETHUB DISCUSSION"}</LocalizedCopy></small>
        <h2><LocalizedCopy>{"Komentar ("}</LocalizedCopy><LocalizedCopy>{comments.length}</LocalizedCopy><LocalizedCopy>{")"}</LocalizedCopy></h2>
        <p><LocalizedCopy>{post.content}</LocalizedCopy></p>
      </div>
      <div className="comments-list" role="log" aria-label="Daftar komentar">
        <LocalizedCopy>{busy ? (
          <span role="status"><LocalizedCopy>{"Memuat komentar…"}</LocalizedCopy></span>
        ) : error ? (
          <span role="alert"><LocalizedCopy>{error}</LocalizedCopy></span>
        ) : comments.length ? (
          comments.map((item) => (
            <div className="comment-row" key={item.id}>
              <i><LocalizedCopy>{item.author_name.slice(0, 1)}</LocalizedCopy></i>
              <p>
                <b><LocalizedCopy preserve>{item.author_name}</LocalizedCopy></b>
                <span><LocalizedCopy>{item.content}</LocalizedCopy></span>
                <small><LocalizedCopy>{when(item.created_at)}</LocalizedCopy></small>
              </p>
            </div>
          ))
        ) : (
          <span><LocalizedCopy>{"Belum ada komentar. Jadilah yang pertama."}</LocalizedCopy></span>
        )}</LocalizedCopy>
      </div>
      <footer>
        <LocalizedInput
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
        <LocalizedButton onClick={() => void send()} disabled={sending || !text.trim()}>
          <LocalizedCopy>{sending ? "Mengirim…" : "Kirim"}</LocalizedCopy>
        </LocalizedButton>
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
  const dialog = useDialogFocus<HTMLElement>(true, close);
  return (
    <div className="modal-overlay" onMouseDown={close}>
      <section
        className={`modal ${className}`}
        ref={dialog}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="Detail Slivadoc"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <LocalizedButton
          type="button"
          className="modal-close"
          aria-label="Tutup detail"
          onClick={close}
        >
          <Icon name="close" />
        </LocalizedButton>
        <LocalizedCopy>{children}</LocalizedCopy>
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
      <h2><LocalizedCopy>{title}</LocalizedCopy></h2>
      <p><LocalizedCopy>{note}</LocalizedCopy></p>
      <LocalizedButton
        className="primary-button full"
        onClick={() => {
          close();
          if (activity)
            window.dispatchEvent(
              new CustomEvent("slivadoc:open-activity", { detail: activity }),
            );
        }}
      ><LocalizedCopy>{"Lihat di Aktivitas"}</LocalizedCopy></LocalizedButton>
    </div>
  );
}
