import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
  type RefObject,
} from "react";
import {
  Animated,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  type TextInputProps,
  useWindowDimensions,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import {
  activityTypeForReference,
  applyMobileAdoption,
  createMobilePetSpotReservation,
  createMobilePawDatingHealthReport,
  createMobilePawDatingMessage,
  createMobilePawDatingProfile,
  createMobileConsultation,
  createMobileTrainerConsultation,
  createMobileDocumentRequest,
  createMobilePaymentIntent,
  enrollMobileAcademy,
  getMobileAcademy,
  getMobileAcademyProgram,
  getMobileAcademyTrainer,
  getMobileAcademyTrainers,
  getMobileAdoptions,
  getMobileConsultationPlans,
  getMobileDocumentProducts,
  getMobileEvents,
  getMobileMyPawDatingProfiles,
  getMobilePawDatingProfile,
  getMobilePawDatingProfiles,
  getMobilePawDatingInterests,
  getMobilePawDatingMessages,
  getMobilePetSpots,
  getMobilePetSpot,
  getMobilePetSpotAvailability,
  getMobileTrainerAvailability,
  getMobileTrainerConsultationPlans,
  passMobilePawDatingProfile,
  registerMobileEvent,
  respondMobilePawDatingInterest,
  saveMobileAcademyProgramReview,
  sendMobilePawDatingInterest,
  submitMobilePawDatingProfile,
  trackMobileAcademyProgramClick,
  type MobileActivityType,
  type MobileAcademyTrainer,
  type MobileOwner,
  type MobilePaymentIntent,
  type MobilePawDatingInterest,
  type MobilePawDatingMessage,
  type MobilePetSpotResource,
  type MobileTrainerAvailabilitySlot,
  type WorldItem,
  uploadMobileImage,
} from "../api";
import {
  LocalizedText as Text,
  LocalizedTextInput as TextInput,
  useI18n,
} from "../i18n";
import { colors, shadow } from "../theme";
import {
  PetRequiredNotice,
  PrimaryButton,
  Screen,
  TopHeader,
} from "../components/ui";
import {
  MobileQrisModal,
  MobilePaymentMethods,
} from "../components/QrisPayment";
import {
  completeDocuments,
  DocumentPhotoPicker,
  type DocumentPhotos,
} from "../components/DocumentPhotoPicker";
import { PetHubExperience } from "./PetHubExperience";
import {
  PetSpotCard,
  PetSpotVenueInformation,
} from "../components/PetSpotExperience";
import { AdoptionManager } from "./AdoptionManager";

export type WorldMode =
  | "pawdating"
  | "academy"
  | "events"
  | "petspot"
  | "pethub"
  | "consult"
  | "adoption"
  | "documents";
type Mode = WorldMode;
type ConsultProviderFilter = "all" | "veterinarian" | "trainer";
type WorldPet = {
  id: string;
  name: string;
  species?: string;
  breed: string;
  icon?: string;
};
type AdoptionForm = {
  applicantName: string;
  phone: string;
  address: string;
  housingType: "Rumah milik" | "Rumah sewa" | "Apartemen";
  hasOtherPets: boolean;
  experience: string;
  reason: string;
};
type DocumentForm = {
  originCity: string;
  destinationCity: string;
  departureAt: string;
  transportType: "flight" | "ship";
};
type PetSpotReservationForm = {
  date: string;
  time: string;
  durationMinutes: number;
  checkoutDate: string;
  stayKind: string;
  guestCount: number;
  petCount: number;
  specialRequest: string;
};
const academySpeciesOptions = [
  { id: "all", label: "Semua pet", icon: "apps-outline" },
  { id: "dog", label: "Anjing", icon: "paw" },
  { id: "cat", label: "Kucing", icon: "paw-outline" },
  { id: "rabbit", label: "Kelinci", icon: "leaf-outline" },
  { id: "bird", label: "Burung", icon: "airplane-outline" },
  { id: "small_mammal", label: "Small pet", icon: "sparkles-outline" },
] as const;

const emptyAdoptionForm = (): AdoptionForm => ({
  applicantName: "",
  phone: "",
  address: "",
  housingType: "Rumah milik",
  hasOtherPets: false,
  experience: "",
  reason: "",
});
const emptyDocumentForm = (): DocumentForm => ({
  originCity: "",
  destinationCity: "",
  departureAt: "",
  transportType: "flight",
});
const emptyPetSpotReservationForm = (
  slotMinutes = 90,
  stayKind = "",
): PetSpotReservationForm => {
  const target = new Date();
  target.setDate(target.getDate() + 1);
  target.setHours(18, 0, 0, 0);
  return {
    date: target.toISOString().slice(0, 10),
    time: stayKind ? "14:00" : "18:00",
    durationMinutes:
      stayKind === "boarding_house" ? 43200 : stayKind ? 1440 : slotMinutes,
    checkoutDate: stayKind
      ? new Date(
          target.getTime() +
            (stayKind === "boarding_house" ? 30 : 1) * 86400000,
        )
          .toISOString()
          .slice(0, 10)
      : "",
    stayKind,
    guestCount: 2,
    petCount: 1,
    specialRequest: "",
  };
};
const petSpotWindow = (form: PetSpotReservationForm) => {
  const starts = new Date(`${form.date}T${form.time}:00+07:00`);
  const ends = form.stayKind
    ? new Date(form.checkoutDate + "T" + form.time + ":00+07:00")
    : new Date(starts.getTime() + form.durationMinutes * 60_000);
  if (Number.isNaN(starts.getTime()) || Number.isNaN(ends.getTime()))
    throw new Error("Tanggal atau jam reservasi belum valid");
  const nights = (ends.getTime() - starts.getTime()) / 86400000;
  if (
    form.stayKind &&
    (nights < (form.stayKind === "boarding_house" ? 30 : 1) || nights > 366)
  )
    throw new Error(
      form.stayKind === "boarding_house"
        ? "Kosan minimal 30 dan maksimal 366 malam"
        : "Apartemen minimal 1 dan maksimal 366 malam",
    );
  return { startsAt: starts.toISOString(), endsAt: ends.toISOString() };
};
const housingQuote = (
  spot: WorldItem,
  unit: MobilePetSpotResource,
  form: PetSpotReservationForm,
) => {
  try {
    const window = petSpotWindow(form);
    const nights = Math.ceil(
      (new Date(window.endsAt).getTime() -
        new Date(window.startsAt).getTime()) /
        86400000,
    );
    const periods = !form.stayKind
      ? 1
      : unit.booking_rules?.rate_period === "month"
        ? Math.ceil(nights / 30)
        : nights;
    const baseSubtotal = unit.base_price * periods;
    const depositType =
      unit.minimum_deposit_type === "inherit"
        ? spot.deposit_type
        : unit.minimum_deposit_type;
    const depositValue =
      unit.minimum_deposit_type === "inherit"
        ? spot.deposit_value
        : unit.minimum_deposit_value;
    const deposit = Math.ceil(
      depositType === "fixed"
        ? Number(depositValue ?? 0)
        : (baseSubtotal * Number(depositValue ?? 0)) / 100,
    );
    const subtotal = Math.max(baseSubtotal, deposit);
    return {
      subtotal,
      deposit,
      balance: Math.max(0, subtotal - deposit),
      periods,
      nights,
    };
  } catch {
    return null;
  }
};
const modes: Array<{
  id: Mode;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}> = [
  { id: "pawdating", label: "PAW Dating", icon: "heart-circle-outline" },
  { id: "academy", label: "Academy", icon: "school-outline" },
  { id: "events", label: "Event", icon: "ticket-outline" },
  { id: "petspot", label: "PetSpot", icon: "navigate-circle-outline" },
  { id: "pethub", label: "PetHub", icon: "play-circle-outline" },
  { id: "consult", label: "Konsultasi", icon: "medical-outline" },
  { id: "adoption", label: "Adopsi", icon: "home-outline" },
  { id: "documents", label: "Dokumen", icon: "document-text-outline" },
];
const emptyWorld = (): Record<Mode, WorldItem[]> => ({
  pawdating: [],
  academy: [],
  events: [],
  petspot: [],
  pethub: [],
  consult: [],
  adoption: [],
  documents: [],
});
const worldIcon = (
  mode: Mode,
  item?: WorldItem | null,
): keyof typeof Ionicons.glyphMap => {
  if (mode === "pawdating") return "heart-circle-outline";
  if (mode === "academy") return "school-outline";
  if (mode === "events") return "ticket-outline";
  if (mode === "petspot")
    return item?.category === "boarding_house"
      ? "home-outline"
      : item?.category === "apartment"
        ? "business-outline"
        : item?.category === "cafe"
          ? "cafe-outline"
          : item?.category === "mall"
            ? "business-outline"
            : "leaf-outline";
  if (mode === "consult") return "medical-outline";
  if (mode === "adoption") return "home-outline";
  if (mode === "documents") return "document-text-outline";
  return "play-circle-outline";
};

function FormTextField({
  label,
  multiline,
  ...props
}: TextInputProps & {
  label: string;
}) {
  return (
    <View style={styles.formField}>
      <Text style={styles.formLabel}>{label}</Text>
      <TextInput
        {...props}
        multiline={multiline}
        placeholderTextColor={colors.muted}
        style={[
          styles.formInput,
          multiline && styles.formTextarea,
          props.style,
        ]}
      />
    </View>
  );
}

function MobilePawDatingDeck({
  profiles,
  busy,
  onDetail,
  onSwipe,
}: {
  profiles: WorldItem[];
  busy: boolean;
  onDetail: (profile: WorldItem) => void;
  onSwipe: (profile: WorldItem, decision: "like" | "pass") => void;
}) {
  const active = profiles[0];
  const next = profiles[1];
  const [position] = useState(() => new Animated.ValueXY());
  const rotate = position.x.interpolate({
    inputRange: [-220, 0, 220],
    outputRange: ["-13deg", "0deg", "13deg"],
  });
  const likeOpacity = position.x.interpolate({
    inputRange: [0, 75],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });
  const passOpacity = position.x.interpolate({
    inputRange: [-75, 0],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });

  const finish = (decision: "like" | "pass") => {
    if (!active) return;
    Animated.timing(position, {
      toValue: { x: decision === "like" ? 520 : -520, y: 0 },
      duration: 180,
      useNativeDriver: true,
    }).start(() => {
      position.setValue({ x: 0, y: 0 });
      onSwipe(active, decision);
    });
  };
  const responder = PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) =>
      !busy &&
      Math.abs(gesture.dx) > 6 &&
      Math.abs(gesture.dx) > Math.abs(gesture.dy),
    onPanResponderMove: (_, gesture) =>
      position.setValue({ x: gesture.dx, y: 0 }),
    onPanResponderRelease: (_, gesture) => {
      if (gesture.dx > 85) finish("like");
      else if (gesture.dx < -85) finish("pass");
      else
        Animated.spring(position, {
          toValue: { x: 0, y: 0 },
          useNativeDriver: true,
        }).start();
    },
    onPanResponderTerminate: () =>
      Animated.spring(position, {
        toValue: { x: 0, y: 0 },
        useNativeDriver: true,
      }).start(),
  });

  if (!active) return null;
  const renderCard = (item: WorldItem) => (
    <View style={styles.swipeCard}>
      <View style={styles.swipeVisual}>
        {item.photo_urls?.[0] ? (
          <Image
            source={{ uri: item.photo_urls[0] }}
            alt={`Foto ${item.name || "pet"}`}
            style={styles.swipePhoto}
          />
        ) : (
          <Ionicons name="paw" size={64} color={colors.sky600} />
        )}
        <View style={styles.swipeVerified}>
          <Text style={styles.swipeVerifiedText}>
            ✦ LEVEL {item.profile_level} · HEALTH {item.health_score}/100
          </Text>
        </View>
      </View>
      <View style={styles.swipeCopy}>
        <View style={styles.swipeTitleRow}>
          <View>
            <Text style={styles.swipeName}>{item.name}</Text>
            <Text style={styles.swipeMeta}>
              {item.breed} · {item.sex === "female" ? "Betina" : "Jantan"}
            </Text>
          </View>
          <Text style={styles.swipeDistance}>
            {item.distance_km != null
              ? `${item.distance_km.toFixed(1)} km`
              : item.city}
          </Text>
        </View>
        <Text numberOfLines={2} style={styles.swipeDescription}>
          {item.description ||
            `${item.name} mencari pasangan yang sehat dan cocok.`}
        </Text>
        <Pressable style={styles.swipeDetail} onPress={() => onDetail(item)}>
          <Text style={styles.swipeDetailText}>Lihat detail pet & owner</Text>
          <Ionicons name="arrow-forward" size={15} color={colors.sky600} />
        </Pressable>
      </View>
    </View>
  );

  return (
    <View style={styles.swipeExperience}>
      <Text style={styles.swipeGuide}>
        ← kiri untuk lewati · kanan untuk suka →
      </Text>
      <View style={styles.swipeStage}>
        {next ? (
          <View style={styles.swipeCardNext}>{renderCard(next)}</View>
        ) : null}
        <Animated.View
          {...responder.panHandlers}
          style={[
            styles.swipeCardActive,
            { transform: [...position.getTranslateTransform(), { rotate }] },
          ]}
        >
          <Animated.Text
            style={[
              styles.swipeStamp,
              styles.swipeLikeStamp,
              { opacity: likeOpacity },
            ]}
          >
            SUKA
          </Animated.Text>
          <Animated.Text
            style={[
              styles.swipeStamp,
              styles.swipePassStamp,
              { opacity: passOpacity },
            ]}
          >
            LEWATI
          </Animated.Text>
          {renderCard(active)}
        </Animated.View>
      </View>
      <View style={styles.swipeButtons}>
        <Pressable
          disabled={busy}
          onPress={() => finish("pass")}
          style={[styles.swipeButton, styles.swipePassButton]}
        >
          <Ionicons name="close" size={30} color="#C94B4B" />
        </Pressable>
        <Pressable
          disabled={busy}
          onPress={() => onDetail(active)}
          style={styles.swipeDetailButton}
        >
          <Text style={styles.swipeDetailButtonText}>Detail</Text>
        </Pressable>
        <Pressable
          disabled={busy}
          onPress={() => finish("like")}
          style={[styles.swipeButton, styles.swipeLikeButton]}
        >
          <Ionicons name="heart" size={28} color="#128464" />
        </Pressable>
      </View>
    </View>
  );
}

export function WorldScreen({
  refreshVersion,
  onAction,
  onOpenNotifications,
  owner,
  petName,
  pet,
  pets = [],
  hasPet,
  onLogin,
  onRequirePet,
  intent,
  onOpenActivity,
}: {
  refreshVersion: number;
  onAction: (message: string) => void;
  onOpenNotifications: () => void;
  owner?: MobileOwner;
  petName?: string;
  pet?: WorldPet;
  pets?: WorldPet[];
  hasPet: boolean;
  onLogin: () => void;
  onRequirePet: () => void;
  intent?: {
    token: number;
    mode: WorldMode;
    itemId?: string;
    veterinarianId?: string;
  };
  onOpenActivity: (type: MobileActivityType, id: string) => void;
}) {
  const { formatCurrency, formatDate, formatNumber } = useI18n();
  const { width: viewportWidth } = useWindowDimensions();
  const money = (value?: number) => formatCurrency(value ?? 0);
  const when = (value?: string) =>
    value
      ? formatDate(value, { dateStyle: "medium", timeStyle: "short" })
      : "Segera";
  const eventDatePart = (value: string | undefined, part: "day" | "month") =>
    value
      ? formatDate(
          value,
          part === "day" ? { day: "2-digit" } : { month: "short" },
        )
      : "—";
  const [mode, setMode] = useState<Mode>(intent?.mode ?? "academy");
  const [items, setItems] = useState<Record<Mode, WorldItem[]>>(emptyWorld);
  const [consultProvider, setConsultProvider] =
    useState<ConsultProviderFilter>("all");
  const [consultSpecialty, setConsultSpecialty] = useState("all");
  const [focusedVeterinarianId, setFocusedVeterinarianId] = useState("");
  const [selected, setSelected] = useState<WorldItem | null>(null);
  const [imageViewerIndex, setImageViewerIndex] = useState<number>();
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const detailGalleryRef = useRef<ScrollView>(null);
  const selectedImages = useMemo(
    () =>
      Array.from(
        new Set(
          [
            ...(selected?.image_urls ?? []),
            selected?.cover_url,
            selected?.banner_url,
            selected?.photo_url,
            ...(selected?.photo_urls ?? []),
            selected?.media_url,
            selected?.thumbnail_url,
          ].filter((value): value is string => Boolean(value)),
        ),
      ),
    [selected],
  );
  useEffect(() => {
    if (!selected || selectedImages.length < 2) return;
    const galleryWidth = Math.max(260, viewportWidth - 32);
    const timer = setInterval(() => {
      setSelectedImageIndex((current) => {
        const next = (current + 1) % selectedImages.length;
        detailGalleryRef.current?.scrollTo({
          x: next * galleryWidth,
          animated: true,
        });
        return next;
      });
    }, 1_000);
    return () => clearInterval(timer);
  }, [selected, selectedImages.length, viewportWidth]);
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  }>();
  const [pawDatingCreateOpen, setPawDatingCreateOpen] = useState(false);
  const [pawDatingLoadError, setPawDatingLoadError] = useState("");
  const [pawDatingInterests, setPawDatingInterests] = useState<
    MobilePawDatingInterest[]
  >([]);
  const [pawDatingChat, setPawDatingChat] = useState<MobilePawDatingInterest>();
  const [pawDatingMessages, setPawDatingMessages] = useState<
    MobilePawDatingMessage[]
  >([]);
  const [pawDatingChatBody, setPawDatingChatBody] = useState("");
  const [pawDatingChatBusy, setPawDatingChatBusy] = useState(false);
  const [academyTrainers, setAcademyTrainers] = useState<
    MobileAcademyTrainer[]
  >([]);
  const [academyTrainer, setAcademyTrainer] = useState<MobileAcademyTrainer>();
  const [academySpecies, setAcademySpecies] = useState(
    pet?.species?.toLowerCase() || "all",
  );
  const academySpeciesRailRef = useRef<ScrollView>(null);
  const academyTrainerRailRef = useRef<ScrollView>(null);
  const academySpeciesOffset = useRef(0);
  const academyTrainerOffset = useRef(0);
  const advanceAcademyRail = (
    rail: RefObject<ScrollView | null>,
    offset: MutableRefObject<number>,
  ) => {
    const step = Math.max(240, viewportWidth * 0.72);
    offset.current += step;
    rail.current?.scrollTo({ x: offset.current, animated: true });
  };
  const [selectedAcademyPetID, setSelectedAcademyPetID] = useState("");
  const [selectedAcademyScheduleID, setSelectedAcademyScheduleID] =
    useState("");
  const [academyReviewRating, setAcademyReviewRating] = useState(5);
  const [academyReviewComment, setAcademyReviewComment] = useState("");
  const [academyReviewBusy, setAcademyReviewBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("");
  const requiresPayment =
    (["academy", "events", "consult", "documents"].includes(mode) &&
      Number(selected?.price || selected?.total_fee || 0) > 0) ||
    (mode === "petspot" && !!selected?.reservable);
  const [payment, setPayment] = useState<MobilePaymentIntent>();
  const paymentActivityType = payment
    ? activityTypeForReference(payment.reference_type)
    : undefined;
  const [selectedEventPetID, setSelectedEventPetID] = useState("");
  const [spotCategoryFilter, setSpotCategoryFilter] = useState("all");
  const [petSpotForm, setPetSpotForm] = useState<PetSpotReservationForm>(
    emptyPetSpotReservationForm,
  );
  const [petSpotResources, setPetSpotResources] = useState<
    MobilePetSpotResource[]
  >([]);
  const [selectedPetSpotResource, setSelectedPetSpotResource] =
    useState<MobilePetSpotResource>();
  const spotAvailabilityRequest = useRef(0);
  const spotDetailRequest = useRef(0);
  const [spotDetailLoading, setSpotDetailLoading] = useState(false);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [trainerAvailabilityLoading, setTrainerAvailabilityLoading] =
    useState(false);
  const [trainerSlots, setTrainerSlots] = useState<
    MobileTrainerAvailabilitySlot[]
  >([]);
  const [trainerTimezone, setTrainerTimezone] = useState("Asia/Jakarta");
  const [selectedTrainerSlot, setSelectedTrainerSlot] = useState("");
  const trainerAvailabilityRequest = useRef(0);
  const [adoptionForm, setAdoptionForm] =
    useState<AdoptionForm>(emptyAdoptionForm);
  const [documentForm, setDocumentForm] =
    useState<DocumentForm>(emptyDocumentForm);
  const [documentPhotos, setDocumentPhotos] = useState<DocumentPhotos>({});
  const handledIntent = useRef(0);
  const consultSpecialties = useMemo<Array<[string, string]>>(() => {
    const specialties = new Map<string, string>();
    items.consult
      .filter(
        (item) =>
          consultProvider === "all" || item.provider_type === consultProvider,
      )
      .forEach((item) =>
        (item.specialties ?? []).forEach((specialty) => {
          const label = specialty.trim();
          if (label) specialties.set(label.toLocaleLowerCase("id"), label);
        }),
      );
    return [...specialties.entries()].sort((left, right) =>
      left[1].localeCompare(right[1], "id"),
    );
  }, [consultProvider, items.consult]);
  const consultSpecialtyOptions = useMemo<Array<[string, string]>>(
    () => [["all", "Semua spesialisasi"], ...consultSpecialties],
    [consultSpecialties],
  );
  const visibleItems = useMemo(
    () =>
      mode === "consult"
        ? items.consult.filter(
            (item) =>
              (consultProvider === "all" ||
                item.provider_type === consultProvider) &&
              (!focusedVeterinarianId ||
                item.veterinarian_id === focusedVeterinarianId) &&
              (consultSpecialty === "all" ||
                (item.specialties ?? []).some(
                  (specialty) =>
                    specialty.trim().toLocaleLowerCase("id") ===
                    consultSpecialty,
                )),
          )
        : mode === "petspot"
          ? items.petspot.filter(
              (item) =>
                spotCategoryFilter === "all" ||
                item.category === spotCategoryFilter,
            )
          : items[mode],
    [
      consultProvider,
      consultSpecialty,
      focusedVeterinarianId,
      items,
      mode,
      spotCategoryFilter,
    ],
  );
  const chooseConsultProvider = (provider: ConsultProviderFilter) => {
    setFocusedVeterinarianId("");
    setConsultProvider(provider);
    setConsultSpecialty("all");
  };
  const loadTrainerSlots = useCallback(
    async (item: WorldItem) => {
      const requestID = ++trainerAvailabilityRequest.current;
      setTrainerSlots([]);
      setSelectedTrainerSlot("");
      setTrainerTimezone("Asia/Jakarta");
      if (item.provider_type !== "trainer" || !item.trainer_id) {
        setTrainerAvailabilityLoading(false);
        return;
      }
      setTrainerAvailabilityLoading(true);
      try {
        const result = await getMobileTrainerAvailability(
          item.trainer_id,
          item.id,
        );
        if (trainerAvailabilityRequest.current !== requestID) return;
        setTrainerSlots(result.data);
        setTrainerTimezone(result.timezone || "Asia/Jakarta");
      } catch (cause) {
        if (trainerAvailabilityRequest.current !== requestID) return;
        onAction(
          cause instanceof Error
            ? cause.message
            : "Slot konsultasi trainer belum dapat dimuat",
        );
      } finally {
        if (trainerAvailabilityRequest.current === requestID)
          setTrainerAvailabilityLoading(false);
      }
    },
    [onAction],
  );
  useEffect(() => {
    let current = true;
    queueMicrotask(async () => {
      setLoading(true);
      let location = userLocation;
      try {
        const permission = await Location.getForegroundPermissionsAsync();
        const granted =
          permission.status === "granted"
            ? permission
            : await Location.requestForegroundPermissionsAsync();
        if (granted.status === "granted") {
          const position = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };
          if (current) setUserLocation(location);
        }
      } catch {
        // City is used as the distance fallback when location is unavailable.
      }
      void Promise.allSettled([
        getMobilePawDatingProfiles(location),
        getMobileAcademy(),
        getMobileEvents(),
        getMobilePetSpots(),
        getMobileConsultationPlans(),
        getMobileTrainerConsultationPlans(),
        getMobileAdoptions(),
        getMobileDocumentProducts(),
      ])
        .then(
          ([
            pawdating,
            academy,
            events,
            spots,
            consult,
            trainerConsult,
            adoption,
            documents,
          ]) => {
            if (!current) return;
            const pawDatingFailure =
              pawdating.status === "rejected" ? pawdating.reason : undefined;
            const pawDatingError = pawDatingFailure
              ? pawDatingFailure instanceof Error
                ? pawDatingFailure.message
                : "Profil PAW Dating belum dapat dimuat"
              : "";
            setPawDatingLoadError(pawDatingError);
            if (pawDatingError) {
              console.warn(
                "[PAW Dating] Discovery profile gagal dimuat",
                pawDatingFailure,
              );
            }
            setItems({
              pawdating:
                pawdating.status === "fulfilled" ? pawdating.value.data : [],
              academy: academy.status === "fulfilled" ? academy.value.data : [],
              events: events.status === "fulfilled" ? events.value.data : [],
              petspot: spots.status === "fulfilled" ? spots.value.data : [],
              pethub: [],
              consult: [
                ...(consult.status === "fulfilled" ? consult.value.data : []),
                ...(trainerConsult.status === "fulfilled"
                  ? trainerConsult.value.data
                  : []),
              ],
              adoption:
                adoption.status === "fulfilled" ? adoption.value.data : [],
              documents:
                documents.status === "fulfilled" ? documents.value.data : [],
            });
          },
        )
        .finally(() => {
          if (current) setLoading(false);
        });
    });
    return () => {
      current = false;
    };
    // Location is intentionally read from the current render without becoming a
    // dependency, so granting permission does not immediately duplicate all calls.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshVersion]);
  const loadPawDatingPrivate = useCallback(async () => {
    if (!owner) {
      setPawDatingInterests([]);
      return;
    }
    try {
      const result = await getMobilePawDatingInterests();
      setPawDatingInterests(result.data);
    } catch (cause) {
      onAction(
        cause instanceof Error
          ? cause.message
          : "Match PAW Dating belum dapat dimuat",
      );
    }
  }, [onAction, owner]);
  useEffect(() => {
    if (mode === "pawdating") queueMicrotask(() => void loadPawDatingPrivate());
  }, [loadPawDatingPrivate, mode, refreshVersion]);
  useEffect(() => {
    if (mode !== "academy") return;
    let current = true;
    void getMobileAcademyTrainers(
      academySpecies === "all" ? undefined : academySpecies,
    )
      .then((result) => {
        if (current) setAcademyTrainers(result.data);
      })
      .catch((cause) =>
        onAction(
          cause instanceof Error
            ? cause.message
            : "Daftar pet trainer belum dapat dimuat",
        ),
      );
    return () => {
      current = false;
    };
  }, [academySpecies, mode, onAction, refreshVersion]);
  const openPawDatingChat = async (interest: MobilePawDatingInterest) => {
    if (!interest.match_id) return;
    setPawDatingChat(interest);
    setPawDatingMessages([]);
    setPawDatingChatBusy(true);
    try {
      const result = await getMobilePawDatingMessages(interest.match_id);
      setPawDatingMessages(result.data);
    } catch (cause) {
      onAction(
        cause instanceof Error
          ? cause.message
          : "Percakapan match belum dapat dimuat",
      );
    } finally {
      setPawDatingChatBusy(false);
    }
  };
  const respondPawDating = async (
    interest: MobilePawDatingInterest,
    action: "accept" | "decline",
  ) => {
    setBusy(true);
    try {
      const result = await respondMobilePawDatingInterest(interest.id, action);
      await loadPawDatingPrivate();
      if (action === "accept" && result.match_id) {
        onAction("It’s a match! Ruang chat privat sudah dibuka");
        await openPawDatingChat({
          ...interest,
          status: "matched",
          match_id: result.match_id,
        });
      } else {
        onAction("Permintaan PAW Dating diperbarui");
      }
    } catch (cause) {
      onAction(
        cause instanceof Error
          ? cause.message
          : "Permintaan belum dapat diperbarui",
      );
    } finally {
      setBusy(false);
    }
  };
  const sendPawDatingChat = async () => {
    if (!pawDatingChat?.match_id || !pawDatingChatBody.trim()) return;
    setPawDatingChatBusy(true);
    try {
      await createMobilePawDatingMessage(
        pawDatingChat.match_id,
        pawDatingChatBody.trim(),
      );
      setPawDatingChatBody("");
      const result = await getMobilePawDatingMessages(pawDatingChat.match_id);
      setPawDatingMessages(result.data);
    } catch (cause) {
      onAction(
        cause instanceof Error ? cause.message : "Pesan belum dapat dikirim",
      );
    } finally {
      setPawDatingChatBusy(false);
    }
  };
  const openAcademyTrainer = async (trainer: MobileAcademyTrainer) => {
    setAcademyTrainer(trainer);
    try {
      setAcademyTrainer(await getMobileAcademyTrainer(trainer.id));
    } catch (cause) {
      onAction(
        cause instanceof Error
          ? cause.message
          : "Detail pet trainer belum dapat dimuat",
      );
    }
  };
  const submitAcademyReview = async () => {
    if (!selected || mode !== "academy") return;
    if (!owner) {
      onLogin();
      return;
    }
    if (academyReviewComment.trim().length < 10) {
      onAction("Tulis komentar minimal 10 karakter");
      return;
    }
    setAcademyReviewBusy(true);
    try {
      await saveMobileAcademyProgramReview(selected.id, {
        rating: academyReviewRating,
        comment: academyReviewComment.trim(),
      });
      const detail = await getMobileAcademyProgram(selected.id);
      setSelected(detail);
      setItems((current) => ({
        ...current,
        academy: current.academy.map((item) =>
          item.id === detail.id
            ? {
                ...item,
                rating: detail.rating,
                review_count: detail.review_count,
                participant_count: detail.participant_count,
              }
            : item,
        ),
      }));
      setAcademyReviewComment("");
      onAction("Ulasan terverifikasi berhasil dipublikasikan");
    } catch (cause) {
      onAction(
        cause instanceof Error
          ? cause.message
          : "Ulasan Academy belum dapat disimpan",
      );
    } finally {
      setAcademyReviewBusy(false);
    }
  };
  useEffect(() => {
    if (!intent || loading || handledIntent.current === intent.token) return;
    queueMicrotask(() => {
      handledIntent.current = intent.token;
      setMode(intent.mode);
      if (intent.mode === "consult") {
        setConsultProvider(intent.veterinarianId ? "veterinarian" : "all");
        setConsultSpecialty("all");
        setFocusedVeterinarianId(intent.veterinarianId || "");
        if (!intent.itemId) {
          setSelected(null);
          if (
            intent.veterinarianId &&
            !items.consult.some(
              (item) => item.veterinarian_id === intent.veterinarianId,
            )
          ) {
            onAction("Dokter ini belum memiliki paket konsultasi aktif");
          }
          return;
        }
        const plan = items.consult.find((item) => item.id === intent.itemId);
        if (!plan) {
          setSelected(null);
          onAction("Paket konsultasi sebelumnya sudah tidak tersedia");
          return;
        }
        setSelected(plan);
        void loadTrainerSlots(plan);
        return;
      }
      setFocusedVeterinarianId("");
      if (!intent.itemId) {
        setSelected(null);
        return;
      }
      const item = items[intent.mode].find(
        (candidate) => candidate.id === intent.itemId,
      );
      if (!item) {
        setSelected(null);
        onAction("Detail pilihan tersebut belum tersedia");
        return;
      }
      setSelected(item);
    });
  }, [intent, items, loadTrainerSlots, loading, onAction]);
  useEffect(() => {
    if (mode === "academy" && selected)
      void trackMobileAcademyProgramClick(selected.id).catch(() => undefined);
  }, [mode, selected]);
  const loadPetSpotAvailability = async (
    spot: WorldItem,
    form: PetSpotReservationForm,
  ) => {
    if (!spot.reservable) return;
    setAvailabilityLoading(true);
    const request = ++spotAvailabilityRequest.current;
    setSelectedPetSpotResource(undefined);
    try {
      const window = petSpotWindow(form);
      const result = await getMobilePetSpotAvailability(
        spot.id,
        window.startsAt,
        window.endsAt,
        form.guestCount,
      );
      if (request !== spotAvailabilityRequest.current) return;
      const isHousing = ["boarding_house", "apartment", "hotel"].includes(
        spot.category ?? "",
      );
      const resources = result.data.filter(
        (resource) =>
          (!isHousing || ["room", "unit"].includes(resource.resource_type)) &&
          form.petCount <= Number(resource.pet_policy?.pet_limit ?? resource.pet_policy?.max_pets ?? 99),
      );
      setPetSpotResources(resources);
      // The owner must explicitly choose the table/unit, never auto-select one.
      setSelectedPetSpotResource(undefined);
    } catch (cause) {
      if (request !== spotAvailabilityRequest.current) return;
      setPetSpotResources([]);
      onAction(
        cause instanceof Error
          ? cause.message
          : "Ketersediaan meja atau unit belum dapat dimuat",
      );
    } finally {
      if (request === spotAvailabilityRequest.current)
        setAvailabilityLoading(false);
    }
  };
  // Opening an item starts its form fresh. This runs in the open handler rather than an
  // effect on purpose. Calling setState in an effect body is the cascading render that
  // react-hooks/set-state-in-effect rejects, and the effect's dependency on
  // owner.full_name / owner.phone / the `selected` object identity made it re-run and
  // wipe whatever the user had already typed every time owner data or the fetched list
  // refreshed underneath an open sheet. `selected` only ever becomes non-null here, so
  // this is the single entry point.
  const openItem = async (item: WorldItem) => {
    if (mode === "adoption") {
      setAdoptionForm({
        ...emptyAdoptionForm(),
        applicantName: owner?.full_name ?? "",
        phone: owner?.phone ?? "",
      });
    }
    if (mode === "documents") {
      setDocumentForm(emptyDocumentForm());
      setDocumentPhotos({});
    }
    if (mode === "consult") {
      void loadTrainerSlots(item);
    }
    if (mode === "events" && item.ticket_unit === "owner_pet") {
      const eligible = pets.filter(
        (candidate) =>
          !item.allowed_pet_species?.length ||
          item.allowed_pet_species.includes(candidate.species ?? "other"),
      );
      setSelectedEventPetID(eligible[0]?.id ?? "");
    }
    if (mode === "petspot" && item.reservable) {
      const form = emptyPetSpotReservationForm(
        item.reservation_policy?.slot_minutes ?? 90,
        ["boarding_house", "apartment", "hotel"].includes(item.category ?? "")
          ? item.category
          : "",
      );
      setPetSpotForm(form);
      setPetSpotResources([]);
      setSelectedPetSpotResource(undefined);
      void loadPetSpotAvailability(item, form);
    }
    if (mode === "academy") {
      setSelectedAcademyPetID("");
      setSelectedAcademyScheduleID("");
      setAcademyReviewRating(5);
      setAcademyReviewComment("");
    }
    setSelected(item);
    if (mode === "petspot") {
      const request = ++spotDetailRequest.current;
      setSpotDetailLoading(true);
      try {
        const detail = await getMobilePetSpot(item.id);
        if (request === spotDetailRequest.current) {
          setSelected((current) =>
            current?.id === item.id ? { ...current, ...detail } : current,
          );
          setItems((current) => ({ ...current, petspot: current.petspot.map((venue) => venue.id === detail.id ? { ...venue, ...detail } : venue) }));
        }
      } catch (cause) {
        if (request === spotDetailRequest.current)
          onAction(
            cause instanceof Error
              ? cause.message
              : "Detail tempat belum dapat dimuat",
          );
      } finally {
        if (request === spotDetailRequest.current) setSpotDetailLoading(false);
      }
    }
    if (mode === "pawdating") {
      try {
        setSelected(await getMobilePawDatingProfile(item.id, userLocation));
      } catch (cause) {
        onAction(
          cause instanceof Error
            ? cause.message
            : "Detail profil belum dapat dimuat",
        );
      }
    }
    if (mode === "academy") {
      try {
        const detail = await getMobileAcademyProgram(item.id);
        const eligible = pets.filter(
          (candidate) =>
            !detail.supported_species?.length ||
            detail.supported_species.includes(
              (candidate.species ?? "other").toLowerCase(),
            ),
        );
        setSelectedAcademyPetID(eligible[0]?.id ?? "");
        setSelectedAcademyScheduleID(
          detail.schedules?.find((schedule) => schedule.remaining_capacity > 0)
            ?.id ?? "",
        );
        setSelected(detail);
      } catch (cause) {
        onAction(
          cause instanceof Error
            ? cause.message
            : "Detail kelas belum dapat dimuat",
        );
      }
    }
  };
  const dismissPawDating = (profileId: string) =>
    setItems((current) => ({
      ...current,
      pawdating: current.pawdating.filter((item) => item.id !== profileId),
    }));
  const swipePawDating = async (item: WorldItem, decision: "like" | "pass") => {
    if (busy) return;
    if (decision === "pass") dismissPawDating(item.id);
    if (!owner) {
      if (decision === "like") onLogin();
      return;
    }
    if (!hasPet) {
      if (decision === "like") onRequirePet();
      return;
    }
    setBusy(true);
    try {
      const mine = await getMobileMyPawDatingProfiles();
      const source = mine.data.find(
        (profile) => profile.status === "published",
      )?.id;
      if (!source) {
        if (decision === "like") {
          onAction(
            "Profil pet harus disetujui Marketplace sebelum bisa swipe kanan",
          );
          setPawDatingCreateOpen(true);
        }
        return;
      }
      if (decision === "pass") {
        await passMobilePawDatingProfile(item.id, source);
      } else {
        await sendMobilePawDatingInterest(item.id, source);
        dismissPawDating(item.id);
        onAction(`Kamu menyukai ${item.name}; ketertarikan sudah terkirim`);
      }
    } catch (cause) {
      if (decision === "like")
        onAction(
          cause instanceof Error ? cause.message : "Swipe belum dapat disimpan",
        );
    } finally {
      setBusy(false);
    }
  };
  const runPrimaryAction = async () => {
    if (!selected) return;
    if (
      !owner &&
      (mode !== "petspot" || selected.reservable) &&
      !(mode === "pethub" && selected.playback_url)
    ) {
      onLogin();
      return;
    }
    if (!hasPet && mode !== "petspot" && mode !== "pethub") {
      onRequirePet();
      return;
    }
    if (requiresPayment && !paymentMethod) {
      onAction("Tunggu hingga pembayaran QRIS tersedia.");
      return;
    }
    if (
      mode === "adoption" &&
      (!adoptionForm.applicantName.trim() ||
        !adoptionForm.phone.trim() ||
        !adoptionForm.address.trim() ||
        !adoptionForm.reason.trim())
    ) {
      onAction("Lengkapi nama, nomor kontak, alamat, dan alasan adopsi");
      return;
    }
    const needsTravelDetails =
      mode === "documents" && selected.category !== "birth_certificate";
    if (mode === "documents" && !pet) {
      onAction("Tambahkan atau pilih pet sebelum mengajukan dokumen");
      return;
    }
    const submittedDocuments =
      mode === "documents"
        ? completeDocuments(selected.requirements ?? [], documentPhotos)
        : [];
    if (!submittedDocuments) {
      onAction("Unggah foto untuk semua dokumen yang diperlukan");
      return;
    }
    let departureAt: string | undefined;
    if (needsTravelDetails) {
      if (
        !documentForm.originCity.trim() ||
        !documentForm.destinationCity.trim() ||
        !documentForm.departureAt.trim()
      ) {
        onAction("Lengkapi kota asal, tujuan, dan jadwal keberangkatan");
        return;
      }
      const parsedDeparture = new Date(
        documentForm.departureAt.trim().replace(" ", "T"),
      );
      if (Number.isNaN(parsedDeparture.getTime())) {
        onAction("Format jadwal belum valid. Gunakan YYYY-MM-DD HH:mm");
        return;
      }
      departureAt = parsedDeparture.toISOString();
    }
    if (mode === "petspot" && selected.reservable && !selectedPetSpotResource) {
      onAction("Pilih meja atau unit yang masih tersedia");
      return;
    }
    if (mode === "petspot" && selected.reservable && !owner?.phone?.trim()) {
      onAction("Lengkapi nomor telepon di profil sebelum membuat reservasi");
      return;
    }
    const academyPet = pets.find(
      (candidate) => candidate.id === selectedAcademyPetID,
    );
    if (mode === "academy" && (!academyPet || !selectedAcademyScheduleID)) {
      onAction("Pilih pet dan jadwal mulai kelas terlebih dahulu");
      return;
    }
    setBusy(true);
    let completed = false;
    try {
      if (mode === "pawdating") {
        const mine = await getMobileMyPawDatingProfiles();
        const source = mine.data.find(
          (profile) => profile.status === "published",
        )?.id;
        if (!source)
          throw new Error(
            "Profil pet harus disetujui Marketplace sebelum mengirim ketertarikan",
          );
        await sendMobilePawDatingInterest(selected.id, source);
        onAction("Ketertarikan terkirim; kontak tetap privat sampai disetujui");
      } else if (mode === "academy") {
        const source = await enrollMobileAcademy(
          selected.id,
          owner!.full_name,
          academyPet!.name,
          academyPet!.id,
          selectedAcademyScheduleID,
        );
        if (source.amount > 0)
          setPayment(
            await createMobilePaymentIntent(
              "academy_enrollment",
              source.id,
              paymentMethod,
            ),
          );
        else onAction("Pendaftaran academy berhasil tersinkron");
      } else if (mode === "events") {
        if (selected.ticket_unit === "owner_pet" && !selectedEventPetID) {
          onAction("Pilih pet yang akan dibawa ke event");
          return;
        }
        const source = await registerMobileEvent(
          selected.id,
          owner!.full_name,
          owner!.email,
          selected.ticket_unit === "owner_pet" ? selectedEventPetID : undefined,
        );
        if (source.amount > 0 && source.payment_status !== "paid")
          setPayment(
            await createMobilePaymentIntent(
              "event_registration",
              source.id,
              paymentMethod,
            ),
          );
        else onAction("Tiket event gratis berhasil dibuat");
      } else if (mode === "consult") {
        if (
          selected.provider_type === "trainer" &&
          selected.mode !== "chat" &&
          !selectedTrainerSlot
        ) {
          onAction("Pilih jadwal telepon atau video call dengan trainer");
          return;
        }
        const source =
          selected.provider_type === "trainer"
            ? await createMobileTrainerConsultation(
                selected,
                `Konsultasi training untuk ${petName || "pet"}`,
                selectedTrainerSlot || undefined,
                pet?.id,
              )
            : await createMobileConsultation(
                selected,
                `Konsultasi untuk ${petName || "pet"}`,
              );
        if (source.amount > 0)
          setPayment(
            await createMobilePaymentIntent(
              "consultation",
              source.id,
              paymentMethod,
            ),
          );
        else onAction("Konsultasi gratis berhasil dibuat");
      } else if (mode === "adoption") {
        await applyMobileAdoption(selected.id, {
          applicant_name: adoptionForm.applicantName.trim(),
          phone: adoptionForm.phone.trim(),
          address: adoptionForm.address.trim(),
          housing_type: adoptionForm.housingType,
          has_other_pets: adoptionForm.hasOtherPets,
          experience: adoptionForm.experience.trim(),
          reason: adoptionForm.reason.trim(),
        });
        onAction("Screening adopsi berhasil diajukan");
      } else if (mode === "documents") {
        const source = await createMobileDocumentRequest(selected.id, {
          ...(pet && /^[0-9a-f-]{36}$/i.test(pet.id) ? { pet_id: pet.id } : {}),
          ...(needsTravelDetails
            ? {
                origin_city: documentForm.originCity.trim(),
                destination_city: documentForm.destinationCity.trim(),
                departure_at: departureAt,
                transport_type: documentForm.transportType,
              }
            : {}),
          submitted_documents: submittedDocuments,
        });
        if (source.amount > 0)
          setPayment(
            await createMobilePaymentIntent(
              "document_request",
              source.id,
              paymentMethod,
            ),
          );
        else onAction("Permohonan dokumen gratis berhasil dibuat");
      } else if (mode === "petspot") {
        if (selected.reservable && selectedPetSpotResource) {
          const window = petSpotWindow(petSpotForm);
          const source = await createMobilePetSpotReservation({
            resource_id: selectedPetSpotResource.id,
            ...(pet && /^[0-9a-f-]{36}$/i.test(pet.id)
              ? { pet_id: pet.id }
              : {}),
            guest_name: owner!.full_name,
            guest_phone: owner!.phone ?? "",
            guest_count: petSpotForm.guestCount,
            pet_count: petSpotForm.petCount,
            starts_at: window.startsAt,
            ends_at: window.endsAt,
            special_request: petSpotForm.specialRequest.trim(),
          });
          setPayment(
            await createMobilePaymentIntent(
              "petspot_reservation",
              source.id,
              paymentMethod,
            ),
          );
          onAction(
            `DP ${money(source.deposit_amount)} dibuat untuk ${source.reservation_number}`,
          );
        } else {
          const query =
            selected.latitude != null && selected.longitude != null
              ? `${selected.latitude},${selected.longitude}`
              : encodeURIComponent(selected.address || selected.name || "");
          await Linking.openURL(
            `https://www.google.com/maps/search/?api=1&query=${query}`,
          );
          onAction("Petunjuk arah dibuka");
        }
      } else if (selected.playback_url) {
        await Linking.openURL(selected.playback_url);
        onAction("Live PetHub dibuka");
      }
      completed = true;
    } catch (cause) {
      onAction(
        cause instanceof Error ? cause.message : "Aksi belum dapat diproses",
      );
    } finally {
      setBusy(false);
      if (completed) setSelected(null);
    }
  };
  const heroCopy: Record<
    Exclude<Mode, "pawdating">,
    {
      kicker: string;
      title: string;
      note: string;
      icon: keyof typeof Ionicons.glyphMap;
    }
  > = {
    academy: {
      kicker: "PET TRAINING & ACADEMY",
      title: "Belajar dan bertumbuh bersama.",
      note: "Trainer terverifikasi, kurikulum terukur, dan progres digital.",
      icon: "school-outline",
    },
    events: {
      kicker: "PET EVENT DI KOTAMU",
      title: "Isi kalender pet-mu.",
      note: "Festival, workshop, meet-up, dan fun race pilihan.",
      icon: "ticket-outline",
    },
    petspot: {
      kicker: "PET FRIENDLY DISCOVERY",
      title: `Ke mana hari ini bersama ${petName || "pet-mu"}?`,
      note: "Cafe, kosan, apartemen, mall, dan tempat ramah pet.",
      icon: "leaf-outline",
    },
    pethub: {
      kicker: "PETHUB LIVE & THREAD",
      title: "Satu layar untuk dunia pet.",
      note: "Live streaming, story, komentar, channel, dan pet thread.",
      icon: "play-circle-outline",
    },
    consult: {
      kicker: "VIRTUAL CONSULTATION",
      title: "Dokter dan trainer sedekat layar kamu.",
      note: "Booking chat, telepon, video call, dan bayar dalam satu alur.",
      icon: "medical-outline",
    },
    adoption: {
      kicker: "RESPONSIBLE ADOPTION",
      title: "Rumah baru. Awal baru.",
      note: "Screening, health check, meet & greet, dan pendampingan.",
      icon: "home-outline",
    },
    documents: {
      kicker: "PET DOCUMENTS",
      title: "Urus dokumen tanpa bingung.",
      note: "Akte, surat sehat, karantina, pesawat, dan kapal.",
      icon: "document-text-outline",
    },
  };
  if (mode === "pethub") {
    return (
      <Screen>
        <TopHeader
          title="Sliva World"
          subtitle="Seluruh dunia pet dalam satu aplikasi"
          onNotification={onOpenNotifications}
        />
        {!hasPet && owner ? (
          <PetRequiredNotice onAddPet={onRequirePet} />
        ) : null}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.modeRow}
        >
          {modes.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => {
                setMode(item.id);
                if (item.id !== "consult") setFocusedVeterinarianId("");
              }}
              style={[styles.mode, mode === item.id && styles.activeMode]}
            >
              <Ionicons
                name={item.icon}
                size={20}
                color={mode === item.id ? colors.sky600 : colors.muted}
              />
              <Text
                style={[
                  styles.modeLabel,
                  mode === item.id && styles.activeModeLabel,
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
        <PetHubExperience
          refreshVersion={refreshVersion}
          owner={owner}
          hasPet={hasPet}
          onLogin={onLogin}
          onRequirePet={onRequirePet}
          onAction={onAction}
        />
      </Screen>
    );
  }
  return (
    <>
      <Screen>
        <TopHeader
          title="Sliva World"
          subtitle="Seluruh dunia pet dalam satu aplikasi"
          onNotification={onOpenNotifications}
        />
        {!hasPet && owner ? (
          <PetRequiredNotice onAddPet={onRequirePet} />
        ) : null}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.modeRow}
        >
          {modes.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => {
                setMode(item.id);
                if (item.id !== "consult") setFocusedVeterinarianId("");
              }}
              style={[styles.mode, mode === item.id && styles.activeMode]}
            >
              <Ionicons
                name={item.icon}
                size={20}
                color={mode === item.id ? colors.sky600 : colors.muted}
              />
              <Text
                style={[
                  styles.modeLabel,
                  mode === item.id && styles.activeModeLabel,
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
        {mode !== "pawdating" ? (
          <View style={[styles.hero, mode === "events" && styles.eventHero]}>
            <Text style={styles.heroKicker}>{heroCopy[mode].kicker}</Text>
            <Text style={styles.heroTitle}>{heroCopy[mode].title}</Text>
            <Text style={styles.heroNote}>{heroCopy[mode].note}</Text>
            <Ionicons
              name={heroCopy[mode].icon}
              size={56}
              color="rgba(255,255,255,.88)"
              style={styles.heroEmoji}
            />
          </View>
        ) : null}
        {mode === "consult" ? (
          <View style={styles.consultFilters}>
            {focusedVeterinarianId ? (
              <View style={styles.consultDoctorFocus}>
                <View style={styles.consultDoctorFocusIcon}>
                  <Ionicons
                    name="medkit-outline"
                    size={18}
                    color={colors.sky600}
                  />
                </View>
                <View style={styles.consultDoctorFocusCopy}>
                  <Text style={styles.consultDoctorFocusLabel}>
                    PAKET DOKTER PILIHAN
                  </Text>
                  <Text numberOfLines={1} style={styles.consultDoctorFocusName}>
                    {items.consult.find(
                      (item) => item.veterinarian_id === focusedVeterinarianId,
                    )?.doctor_name || "Dokter hewan pilihanmu"}
                  </Text>
                </View>
                <Pressable
                  onPress={() => setFocusedVeterinarianId("")}
                  hitSlop={8}
                >
                  <Text style={styles.consultDoctorFocusAll}>Lihat semua</Text>
                </Pressable>
              </View>
            ) : null}
            <Text style={styles.consultFilterLabel}>Jenis provider</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.consultFilterRow}
            >
              {(
                [
                  ["all", "Semua"],
                  ["veterinarian", "Dokter Hewan"],
                  ["trainer", "Pet Trainer"],
                ] as const
              ).map(([value, label]) => (
                <Pressable
                  key={value}
                  accessibilityRole="button"
                  accessibilityState={{ selected: consultProvider === value }}
                  onPress={() => chooseConsultProvider(value)}
                  style={[
                    styles.consultFilterChip,
                    consultProvider === value && styles.consultFilterChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.consultFilterChipText,
                      consultProvider === value &&
                        styles.consultFilterChipTextActive,
                    ]}
                  >
                    {label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
            <Text style={styles.consultFilterLabel}>Spesialisasi</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.consultFilterRow}
            >
              {consultSpecialtyOptions.map(([value, label]) => (
                <Pressable
                  key={value}
                  accessibilityRole="button"
                  accessibilityState={{
                    selected: consultSpecialty === value,
                  }}
                  onPress={() => {
                    setFocusedVeterinarianId("");
                    setConsultSpecialty(value);
                  }}
                  style={[
                    styles.consultFilterChip,
                    consultSpecialty === value &&
                      styles.consultFilterChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.consultFilterChipText,
                      consultSpecialty === value &&
                        styles.consultFilterChipTextActive,
                    ]}
                  >
                    {label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        ) : null}
        {loading ? (
          <Text style={styles.cardNote}>Memuat informasi terbaru…</Text>
        ) : busy ? (
          <Text style={styles.cardNote}>Memproses permintaan…</Text>
        ) : visibleItems.length === 0 ? (
          <Text style={styles.cardNote}>
            {mode === "consult"
              ? "Belum ada provider dengan filter tersebut."
              : mode === "pawdating"
                ? pawDatingLoadError ||
                  "Belum ada profil terverifikasi untuk ditampilkan."
                : "Belum ada data pada kategori ini."}
          </Text>
        ) : null}
        <View style={styles.sectionHead}>
          <View>
            <Text style={styles.eyebrow}>{mode.toUpperCase()}</Text>
            <Text style={styles.sectionTitle}>
              {mode === "pawdating"
                ? "Verified matches"
                : mode === "petspot"
                  ? "Di sekitar kamu"
                  : "Pilihan untukmu"}
            </Text>
          </View>
          {mode === "pawdating" ? (
            <Pressable
              style={styles.create}
              onPress={() => {
                if (!owner) onLogin();
                else if (!hasPet || !pet) onRequirePet();
                else setPawDatingCreateOpen(true);
              }}
            >
              <Ionicons name="add" size={18} color={colors.white} />
              <Text style={styles.createText}>Daftarkan pet</Text>
            </Pressable>
          ) : null}
        </View>
        {mode === "pawdating" && pawDatingInterests.length ? (
          <View style={styles.pawMatchSection}>
            <View style={styles.pawMatchHeading}>
              <View>
                <Text style={styles.pawMatchKicker}>MATCH & PERMINTAAN</Text>
                <Text style={styles.pawMatchTitle}>Langkah berikutnya</Text>
              </View>
              <Ionicons
                name="chatbubbles-outline"
                size={22}
                color={colors.sky600}
              />
            </View>
            {pawDatingInterests.map((interest) => (
              <View key={interest.id} style={styles.pawMatchCard}>
                <View style={styles.pawMatchIcon}>
                  <Ionicons
                    name={
                      interest.status === "matched" ? "heart" : "paw-outline"
                    }
                    size={20}
                    color={
                      interest.status === "matched" ? "#EA5B81" : colors.sky600
                    }
                  />
                </View>
                <View style={styles.pawMatchCopy}>
                  <Text style={styles.pawMatchNames} numberOfLines={1}>
                    {interest.source_name} × {interest.target_name}
                  </Text>
                  <Text style={styles.pawMatchStatus}>
                    {interest.status === "matched"
                      ? "Match! Lanjutkan kenalan di ruang chat privat."
                      : interest.direction === "incoming"
                        ? "Permintaan masuk menunggu keputusanmu."
                        : "Ketertarikan sudah dikirim."}
                  </Text>
                </View>
                {interest.status === "matched" && interest.match_id ? (
                  <Pressable
                    style={styles.pawMatchPrimary}
                    onPress={() => void openPawDatingChat(interest)}
                  >
                    <Ionicons
                      name="chatbubble-ellipses"
                      size={17}
                      color={colors.white}
                    />
                    <Text style={styles.pawMatchPrimaryText}>Chat</Text>
                  </Pressable>
                ) : interest.direction === "incoming" &&
                  interest.status === "pending" ? (
                  <View style={styles.pawMatchActions}>
                    <Pressable
                      style={styles.pawMatchAccept}
                      accessibilityRole="button"
                      accessibilityLabel={`Terima permintaan antara ${interest.source_name} dan ${interest.target_name}`}
                      onPress={() => void respondPawDating(interest, "accept")}
                    >
                      <Ionicons
                        name="checkmark"
                        size={17}
                        color={colors.white}
                      />
                    </Pressable>
                    <Pressable
                      style={styles.pawMatchDecline}
                      accessibilityRole="button"
                      accessibilityLabel={`Tolak permintaan antara ${interest.source_name} dan ${interest.target_name}`}
                      onPress={() => void respondPawDating(interest, "decline")}
                    >
                      <Ionicons name="close" size={17} color={colors.muted} />
                    </Pressable>
                  </View>
                ) : null}
              </View>
            ))}
          </View>
        ) : null}
        {mode === "academy" ? (
          <View style={styles.academyTrainerSection}>
            <View style={styles.academyTrainerHead}>
              <View>
                <Text style={styles.academyTrainerKicker}>
                  TRAINER TERVERIFIKASI
                </Text>
                <Text style={styles.academyTrainerTitle}>
                  Pilih berdasarkan jenis pet
                </Text>
              </View>
              <Ionicons name="shield-checkmark" size={22} color="#128464" />
            </View>
            <View style={styles.academyRailWrap}>
              <ScrollView
                ref={academySpeciesRailRef}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.academySpeciesRow}
                onMomentumScrollEnd={(event) => {
                  academySpeciesOffset.current =
                    event.nativeEvent.contentOffset.x;
                }}
              >
                {academySpeciesOptions.map((species) => (
                  <Pressable
                    key={species.id}
                    accessibilityRole="button"
                    accessibilityState={{
                      selected: academySpecies === species.id,
                    }}
                    onPress={() => setAcademySpecies(species.id)}
                    style={[
                      styles.choice,
                      styles.academySpeciesChoice,
                      { width: Math.max(96, (viewportWidth - 62) / 3) },
                      academySpecies === species.id && styles.choiceActive,
                    ]}
                  >
                    <Ionicons
                      name={species.icon}
                      size={15}
                      color={
                        academySpecies === species.id
                          ? colors.white
                          : colors.sky600
                      }
                    />
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.choiceText,
                        academySpecies === species.id &&
                          styles.choiceTextActive,
                      ]}
                    >
                      {species.label}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Lihat jenis pet berikutnya"
                style={styles.academyRailNext}
                onPress={() =>
                  advanceAcademyRail(
                    academySpeciesRailRef,
                    academySpeciesOffset,
                  )
                }
              >
                <Ionicons
                  name="chevron-forward"
                  size={19}
                  color={colors.sky600}
                />
              </Pressable>
            </View>
            <View style={styles.academyRailWrap}>
              <ScrollView
                ref={academyTrainerRailRef}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.academyTrainerRow}
                onMomentumScrollEnd={(event) => {
                  academyTrainerOffset.current =
                    event.nativeEvent.contentOffset.x;
                }}
              >
                {academyTrainers.map((trainer) => (
                  <Pressable
                    key={trainer.id}
                    accessibilityRole="button"
                    accessibilityLabel={`Lihat profil trainer ${trainer.full_name}`}
                    style={[
                      styles.academyTrainerCard,
                      { width: Math.min(230, viewportWidth * 0.62) },
                    ]}
                    onPress={() => void openAcademyTrainer(trainer)}
                  >
                    <View style={styles.academyTrainerAvatar}>
                      {trainer.photo_url ? (
                        <Image
                          alt=""
                          source={{ uri: trainer.photo_url }}
                          style={StyleSheet.absoluteFill}
                          resizeMode="cover"
                        />
                      ) : (
                        <Text style={styles.academyTrainerInitial}>
                          {trainer.full_name.slice(0, 1)}
                        </Text>
                      )}
                    </View>
                    <Text style={styles.academyTrainerName} numberOfLines={1}>
                      {trainer.full_name}
                    </Text>
                    <Text style={styles.academyTrainerMeta}>
                      ★ {trainer.rating.toFixed(1)} · {trainer.experience_years}{" "}
                      th
                    </Text>
                    <Text
                      style={styles.academyTrainerSpecialty}
                      numberOfLines={1}
                    >
                      {trainer.specialties.join(" · ")}
                    </Text>
                    <Text style={styles.academyTrainerDetail}>
                      Lihat profil lengkap
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
              {academyTrainers.length > 1 ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Lihat pet trainer berikutnya"
                  style={styles.academyRailNext}
                  onPress={() =>
                    advanceAcademyRail(
                      academyTrainerRailRef,
                      academyTrainerOffset,
                    )
                  }
                >
                  <Ionicons
                    name="chevron-forward"
                    size={19}
                    color={colors.sky600}
                  />
                </Pressable>
              ) : null}
            </View>
          </View>
        ) : null}
        {mode === "petspot" ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.choiceRow}
          >
            {[
              ["all", "Semua"],
              ["cafe", "Cafe"],
              ["restaurant", "Restoran"],
              ["boarding_house", "Kosan / Coliving"],
              ["apartment", "Apartemen"],
              ["hotel", "Hotel"],
              ["mall", "Mall"],
              ["park", "Taman"],
              ["other", "Lainnya"],
            ].map(([id, label]) => (
              <Pressable
                key={id}
                onPress={() => setSpotCategoryFilter(id ?? "all")}
                style={[
                  styles.choice,
                  spotCategoryFilter === id && styles.choiceActive,
                ]}
              >
                <Text
                  style={[
                    styles.choiceText,
                    spotCategoryFilter === id && styles.choiceTextActive,
                  ]}
                >
                  {label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        ) : null}
        {mode === "pawdating" && items.pawdating.length > 0 ? (
          <MobilePawDatingDeck
            profiles={items.pawdating}
            busy={busy}
            onDetail={(item) => void openItem(item)}
            onSwipe={(item, decision) => void swipePawDating(item, decision)}
          />
        ) : mode === "petspot" ? (
          <View style={styles.petSpotGrid}>
            {visibleItems.map((item) => (
              <PetSpotCard
                key={item.id}
                item={item}
                onOpen={() => void openItem(item)}
              />
            ))}
          </View>
        ) : (
          <View style={styles.list}>
            {visibleItems.map((item, index) => (
              <Pressable
                key={item.id}
                onPress={() => openItem(item)}
                style={[
                  styles.card,
                  mode === "academy" && styles.academyProgramCard,
                  mode === "events" && styles.eventExperienceCard,
                ]}
              >
                <View
                  style={[
                    styles.visual,
                    mode === "academy" && styles.academyProgramVisual,
                    mode === "events" && styles.eventExperienceVisual,
                    index % 3 === 1 && styles.visualPeach,
                    index % 3 === 2 && styles.visualViolet,
                  ]}
                >
                  {["academy", "events", "petspot"].includes(mode) &&
                  (item.cover_url ||
                    item.banner_url ||
                    item.image_urls?.[0]) ? (
                    <Image
                      alt=""
                      source={{
                        uri:
                          item.cover_url ||
                          item.banner_url ||
                          item.image_urls?.[0],
                      }}
                      style={StyleSheet.absoluteFill}
                      resizeMode="cover"
                    />
                  ) : (
                    <Ionicons
                      name={worldIcon(mode, item)}
                      size={38}
                      color={colors.sky600}
                    />
                  )}
                  {mode === "academy" && item.featured ? (
                    <View style={styles.academyFeaturedBadge}>
                      <Ionicons
                        name="sparkles"
                        size={10}
                        color={colors.white}
                      />
                      <Text style={styles.academyFeaturedText}>PILIHAN</Text>
                    </View>
                  ) : null}
                  {mode === "academy" && item.discount_percent ? (
                    <View style={styles.academyDiscountBadge}>
                      <Text style={styles.academyDiscountText}>
                        -{Math.round(item.discount_percent)}%
                      </Text>
                    </View>
                  ) : null}
                  {mode === "consult" && item.discount_percent ? (
                    <View style={styles.academyDiscountBadge}>
                      <Text style={styles.academyDiscountText}>
                        -{Math.round(item.discount_percent)}%
                      </Text>
                    </View>
                  ) : null}
                  {mode === "academy" && (item.image_urls?.length ?? 0) > 1 ? (
                    <View style={styles.academyGalleryBadge}>
                      <Ionicons
                        name="images-outline"
                        size={11}
                        color={colors.white}
                      />
                      <Text style={styles.academyGalleryText}>
                        {item.image_urls?.length}
                      </Text>
                    </View>
                  ) : null}
                  {mode === "events" ? (
                    <>
                      <View style={styles.eventDateBadge}>
                        <Text style={styles.eventDateDay}>
                          {eventDatePart(item.starts_at, "day")}
                        </Text>
                        <Text style={styles.eventDateMonth}>
                          {eventDatePart(item.starts_at, "month")}
                        </Text>
                      </View>
                      <View style={styles.eventCategoryBadge}>
                        <Text style={styles.eventCategoryText}>
                          {item.featured
                            ? "✦ PILIHAN"
                            : item.category || "PET EVENT"}
                        </Text>
                      </View>
                      {(item.image_urls?.length ?? 0) > 1 ? (
                        <View style={styles.academyGalleryBadge}>
                          <Ionicons
                            name="images-outline"
                            size={11}
                            color={colors.white}
                          />
                          <Text style={styles.academyGalleryText}>
                            {item.image_urls?.length}
                          </Text>
                        </View>
                      ) : null}
                    </>
                  ) : null}
                  {mode === "pawdating" ? (
                    <View style={styles.verified}>
                      <Text style={styles.verifiedText}>
                        ✦ LEVEL {item.profile_level}
                      </Text>
                    </View>
                  ) : item.status === "live" ? (
                    <View style={styles.live}>
                      <Text style={styles.liveText}>● LIVE</Text>
                    </View>
                  ) : null}
                </View>
                <View style={styles.cardCopy}>
                  <Text style={styles.cardKicker}>
                    {mode === "pawdating"
                      ? `HEALTH ${item.health_score}/100 · ${item.distance_km ?? "—"} KM`
                      : mode === "academy"
                        ? item.academy_name
                        : mode === "events"
                          ? when(item.starts_at)
                          : mode === "consult"
                            ? `${item.duration_minutes ?? "—"} menit · ${item.provider_type === "trainer" ? "pet trainer" : "dokter"} terverifikasi`
                            : mode === "adoption"
                              ? `${item.city || "Lokasi belum tersedia"} · ${item.health_status || "Health check"}`
                              : mode === "documents"
                                ? `${item.processing_days ?? "—"} hari kerja`
                                : `${formatNumber(item.viewer_count ?? 0)} menonton`}
                  </Text>
                  <Text style={styles.cardTitle}>
                    {item.title || item.name}
                  </Text>
                  <Text numberOfLines={2} style={styles.cardNote}>
                    {mode === "pawdating"
                      ? `${item.breed} · ${item.sex === "female" ? "Betina" : "Jantan"} · ${item.city}`
                      : mode === "consult"
                        ? `${item.trainer_name || item.doctor_name || "Provider"} · ${(item.specialties ?? []).join(" · ") || "Spesialisasi umum"}`
                        : item.description}
                  </Text>
                  {mode === "academy" ? (
                    <View style={styles.academyProgramStats}>
                      <View style={styles.academyProgramStat}>
                        <Ionicons
                          name="people-outline"
                          size={12}
                          color={colors.sky600}
                        />
                        <Text style={styles.academyProgramStatText}>
                          {formatNumber(item.participant_count ?? 0)} peserta
                        </Text>
                      </View>
                      <View style={styles.academyProgramStat}>
                        <Ionicons name="star" size={12} color="#E6A51C" />
                        <Text style={styles.academyProgramStatText}>
                          {(item.review_count ?? 0) > 0
                            ? `${(item.rating ?? 0).toFixed(1)} · ${formatNumber(item.review_count ?? 0)} ulasan`
                            : "Belum dinilai"}
                        </Text>
                      </View>
                      <View style={styles.academyProgramStat}>
                        <Ionicons
                          name="time-outline"
                          size={12}
                          color="#128464"
                        />
                        <Text style={styles.academyProgramStatText}>
                          Sejak{" "}
                          {item.running_since
                            ? formatDate(item.running_since, {
                                month: "short",
                                year: "numeric",
                              })
                            : "baru"}
                        </Text>
                      </View>
                    </View>
                  ) : null}
                  {mode === "events" ? (
                    <View style={styles.eventCardStats}>
                      <View style={styles.eventCardStat}>
                        <Ionicons
                          name="people-outline"
                          size={12}
                          color={colors.sky600}
                        />
                        <Text style={styles.eventCardStatText}>
                          {formatNumber(item.registered_count ?? 0)} terdaftar
                        </Text>
                      </View>
                      <View style={styles.eventCardStat}>
                        <Ionicons
                          name="ticket-outline"
                          size={12}
                          color="#7658C9"
                        />
                        <Text style={styles.eventCardStatText}>
                          {Math.max(
                            0,
                            Number(item.capacity ?? 0) -
                              Number(item.registered_count ?? 0),
                          )}{" "}
                          slot
                        </Text>
                      </View>
                      <View style={styles.eventCardStat}>
                        <Ionicons
                          name="location-outline"
                          size={12}
                          color="#128464"
                        />
                        <Text
                          numberOfLines={1}
                          style={styles.eventCardStatText}
                        >
                          {item.city}
                        </Text>
                      </View>
                    </View>
                  ) : null}
                  <View
                    style={[
                      styles.cardFooter,
                      mode === "events" && styles.eventPriceFooter,
                    ]}
                  >
                    <View style={styles.cardPriceBlock}>
                      {item.original_price &&
                      item.original_price >
                        Number(item.price ?? item.total_fee ?? 0) ? (
                        <Text style={styles.cardOriginalPrice}>
                          {money(item.original_price)}
                        </Text>
                      ) : null}
                      <Text style={styles.cardPrice}>
                        {mode === "pawdating"
                          ? `✓ ${item.eligibility_status === "eligible" ? "Verified eligible" : "Conditional"}`
                          : mode === "academy"
                            ? money(item.price)
                            : mode === "events"
                              ? item.price
                                ? money(item.price)
                                : "Gratis"
                              : mode === "consult"
                                ? money(item.total_fee ?? item.price)
                                : mode === "adoption"
                                  ? `${item.breed || "Pet"} · ${item.vaccinated ? "Vaksin lengkap" : "Vaksin diproses"}`
                                  : mode === "documents"
                                    ? money(item.total_fee ?? item.price)
                                    : item.channel_name}
                      </Text>
                    </View>
                    <View style={styles.arrow}>
                      <Ionicons
                        name="arrow-forward"
                        size={14}
                        color={colors.white}
                      />
                    </View>
                  </View>
                </View>
              </Pressable>
            ))}
          </View>
        )}
        {mode === "adoption" && owner ? (
          <AdoptionManager onAction={onAction} />
        ) : null}
      </Screen>
      <Modal
        visible={!!selected}
        transparent
        animationType="slide"
        statusBarTranslucent={false}
        navigationBarTranslucent={false}
        onRequestClose={() => setSelected(null)}
      >
        <View style={styles.backdrop}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Tutup detail"
            onPress={() => setSelected(null)}
            style={StyleSheet.absoluteFill}
          />
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            pointerEvents="box-none"
            style={styles.sheetKeyboard}
          >
            <SafeAreaView style={styles.sheetWrap}>
              <View style={styles.sheet}>
                <View style={styles.handle} />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Tutup detail"
                  onPress={() => setSelected(null)}
                  style={styles.sheetClose}
                >
                  <Ionicons name="close" size={21} color={colors.text} />
                </Pressable>
                <ScrollView
                  style={styles.sheetScroll}
                  scrollEnabled
                  nestedScrollEnabled
                  bounces
                  alwaysBounceVertical
                  overScrollMode="always"
                  keyboardDismissMode="on-drag"
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.sheetContent}
                >
                  {selectedImages.length ? (
                    <View>
                      <ScrollView
                        ref={detailGalleryRef}
                        horizontal
                        pagingEnabled
                        nestedScrollEnabled
                        showsHorizontalScrollIndicator={false}
                        onMomentumScrollEnd={(event) =>
                          setSelectedImageIndex(
                            Math.round(
                              event.nativeEvent.contentOffset.x /
                                Math.max(260, viewportWidth - 32),
                            ),
                          )
                        }
                      >
                        {selectedImages.map((uri, index) => (
                          <Pressable
                            key={uri}
                            onPress={() => setImageViewerIndex(index)}
                            style={[
                              styles.sheetHero,
                              { width: Math.max(260, viewportWidth - 32) },
                            ]}
                            accessibilityLabel={`Perbesar gambar ${index + 1}`}
                          >
                            <Image
                              alt=""
                              source={{ uri }}
                              style={StyleSheet.absoluteFill}
                              resizeMode="cover"
                            />
                          </Pressable>
                        ))}
                      </ScrollView>
                      {selectedImages.length > 1 ? (
                        <View style={styles.sheetGalleryBadge}>
                          <Ionicons
                            name="images-outline"
                            size={12}
                            color={colors.white}
                          />
                          <Text style={styles.sheetGalleryBadgeText}>
                            {selectedImageIndex + 1}/{selectedImages.length} ·
                            otomatis
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  ) : (
                    <View style={styles.sheetHero}>
                      <Ionicons
                        name={worldIcon(mode, selected)}
                        size={48}
                        color={colors.sky600}
                      />
                    </View>
                  )}
                  <Text style={styles.sheetKicker}>
                    {mode === "pawdating"
                      ? `✦ LEVEL ${selected?.profile_level} · HEALTH ${selected?.health_score}/100`
                      : selected?.category ||
                        selected?.channel_name ||
                        "SLIVADOC VERIFIED"}
                  </Text>
                  <Text style={styles.sheetTitle}>
                    {selected?.title || selected?.name}
                  </Text>
                  <Text style={styles.sheetNote}>{selected?.description}</Text>
                  {mode === "petspot" && selected ? (
                    <>
                      {spotDetailLoading ? (
                        <Text accessibilityRole="text" style={styles.formNote}>
                          Memuat fasilitas, pilihan tempat, dan ulasan…
                        </Text>
                      ) : null}
                      <PetSpotVenueInformation item={selected} />
                    </>
                  ) : null}
                  {mode === "events" ? (
                    <View style={styles.eventSocialSummary}>
                      <View style={styles.eventSocialItem}>
                        <Text style={styles.eventSocialValue}>
                          {formatNumber(selected?.registered_count ?? 0)}
                        </Text>
                        <Text style={styles.eventSocialLabel}>Terdaftar</Text>
                      </View>
                      <View style={styles.eventSocialItem}>
                        <Text style={styles.eventSocialValue}>
                          {Math.max(
                            0,
                            Number(selected?.capacity ?? 0) -
                              Number(selected?.registered_count ?? 0),
                          )}
                        </Text>
                        <Text style={styles.eventSocialLabel}>
                          Slot tersedia
                        </Text>
                      </View>
                      <View style={styles.eventSocialItem}>
                        <Text style={styles.eventSocialValue}>
                          {eventDatePart(selected?.starts_at, "day")}{" "}
                          {eventDatePart(selected?.starts_at, "month")}
                        </Text>
                        <Text style={styles.eventSocialLabel}>
                          Tanggal event
                        </Text>
                      </View>
                    </View>
                  ) : null}
                  {["academy", "consult"].includes(mode) &&
                  Number(selected?.price ?? selected?.total_fee ?? 0) > 0 ? (
                    <View style={styles.worldPromoPrice}>
                      <View style={styles.worldPromoPriceCopy}>
                        <Text style={styles.worldPromoLabel}>
                          {selected?.discount_percent
                            ? `PROMO ${Math.round(selected.discount_percent)}%`
                            : "BIAYA PROGRAM"}
                        </Text>
                        {selected?.original_price &&
                        selected.original_price >
                          Number(selected.price ?? selected.total_fee ?? 0) ? (
                          <Text style={styles.worldPromoOriginal}>
                            {money(selected.original_price)}
                          </Text>
                        ) : null}
                        <Text style={styles.worldPromoFinal}>
                          {money(selected?.price ?? selected?.total_fee)}
                        </Text>
                      </View>
                      {selected?.discount_percent ? (
                        <View style={styles.worldPromoSaving}>
                          <Ionicons name="pricetag" size={15} color="#128464" />
                          <Text style={styles.worldPromoSavingText}>
                            Harga spesial Slivadoc
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  ) : null}
                  {mode === "academy" ? (
                    <View style={styles.academySocialSummary}>
                      <View style={styles.academySocialItem}>
                        <Text style={styles.academySocialValue}>
                          {formatNumber(selected?.participant_count ?? 0)}
                        </Text>
                        <Text style={styles.academySocialLabel}>Peserta</Text>
                      </View>
                      <View style={styles.academySocialDivider} />
                      <View style={styles.academySocialItem}>
                        <Text style={styles.academySocialValue}>
                          {(selected?.review_count ?? 0) > 0
                            ? `★ ${(selected?.rating ?? 0).toFixed(1)}`
                            : "Baru"}
                        </Text>
                        <Text style={styles.academySocialLabel}>
                          {formatNumber(selected?.review_count ?? 0)} ulasan
                        </Text>
                      </View>
                      <View style={styles.academySocialDivider} />
                      <View style={styles.academySocialItem}>
                        <Text style={styles.academySocialValue}>
                          {selected?.running_since
                            ? formatDate(selected.running_since, {
                                month: "short",
                                year: "numeric",
                              })
                            : "Baru"}
                        </Text>
                        <Text style={styles.academySocialLabel}>
                          Berjalan sejak
                        </Text>
                      </View>
                    </View>
                  ) : null}
                  <View
                    style={[
                      styles.details,
                      mode === "petspot" && styles.hidden,
                    ]}
                  >
                    <View style={styles.detail}>
                      <Text style={styles.detailLabel}>
                        {mode === "pawdating"
                          ? "Health clearance"
                          : "Lokasi / partner"}
                      </Text>
                      <Text style={styles.detailValue}>
                        {mode === "pawdating"
                          ? `✓ ${selected?.eligibility_status} · ${selected?.risk_level} risk`
                          : selected?.academy_name ||
                            selected?.trainer_name ||
                            selected?.doctor_name ||
                            selected?.venue ||
                            selected?.city ||
                            selected?.channel_name ||
                            "Slivadoc"}
                      </Text>
                    </View>
                    <View style={styles.detail}>
                      <Text style={styles.detailLabel}>
                        {mode === "pawdating"
                          ? "Profil & jarak"
                          : "Jadwal / status"}
                      </Text>
                      <Text style={styles.detailValue}>
                        {mode === "pawdating"
                          ? `${selected?.breed} · ${selected?.distance_km ?? "—"} km`
                          : selected?.status ||
                            when(
                              selected?.next_schedule || selected?.starts_at,
                            )}
                      </Text>
                    </View>
                    {mode === "pawdating" ? (
                      <View style={[styles.detail, styles.ownerDetail]}>
                        <Text style={styles.detailLabel}>Pet owner</Text>
                        <Text style={styles.detailValue}>
                          {selected?.owner?.name ||
                            selected?.owner_display ||
                            "Pet Owner"}
                          {selected?.owner?.verified
                            ? " · ✓ Terverifikasi"
                            : ""}
                        </Text>
                        <Text style={styles.ownerNote}>
                          {selected?.owner?.member_since
                            ? `Member sejak ${formatDate(selected.owner.member_since, { month: "long", year: "numeric" })}`
                            : "Kontak tetap privat sampai match disetujui"}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                  {mode === "academy" ? (
                    <View style={styles.academyBookingSection}>
                      <Text style={styles.formTitle}>Pet trainer kelas</Text>
                      <Text style={styles.formNote}>
                        Profil trainer, spesialisasi, dan jadwal berasal dari
                        academy.
                      </Text>
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.academyDetailTrainerRow}
                      >
                        {(selected?.trainers ?? []).map((trainer) => (
                          <Pressable
                            key={trainer.id}
                            style={styles.academyDetailTrainer}
                            onPress={() => void openAcademyTrainer(trainer)}
                          >
                            <View style={styles.academyDetailTrainerAvatar}>
                              {trainer.photo_url ? (
                                <Image
                                  alt=""
                                  source={{ uri: trainer.photo_url }}
                                  style={StyleSheet.absoluteFill}
                                  resizeMode="cover"
                                />
                              ) : (
                                <Text style={styles.academyTrainerInitial}>
                                  {trainer.full_name.slice(0, 1)}
                                </Text>
                              )}
                            </View>
                            <Text
                              style={styles.academyTrainerName}
                              numberOfLines={1}
                            >
                              {trainer.full_name}
                            </Text>
                            <Text style={styles.academyTrainerMeta}>
                              ★ {trainer.rating.toFixed(1)}
                            </Text>
                            <Text style={styles.academyTrainerDetail}>
                              Profil lengkap →
                            </Text>
                          </Pressable>
                        ))}
                      </ScrollView>
                      <Text style={styles.formLabel}>
                        PET YANG AKAN SEKOLAH
                      </Text>
                      <View style={styles.eventPetGrid}>
                        {pets
                          .filter(
                            (candidate) =>
                              !selected?.supported_species?.length ||
                              selected.supported_species.includes(
                                (candidate.species ?? "other").toLowerCase(),
                              ),
                          )
                          .map((candidate) => (
                            <Pressable
                              key={candidate.id}
                              accessibilityRole="button"
                              accessibilityLabel={`Pilih ${candidate.name} untuk kelas`}
                              accessibilityState={{
                                selected: selectedAcademyPetID === candidate.id,
                              }}
                              onPress={() =>
                                setSelectedAcademyPetID(candidate.id)
                              }
                              style={[
                                styles.eventPetCard,
                                selectedAcademyPetID === candidate.id &&
                                  styles.eventPetCardActive,
                              ]}
                            >
                              <View style={styles.eventPetIcon}>
                                <Ionicons
                                  name="paw"
                                  size={18}
                                  color={colors.sky600}
                                />
                              </View>
                              <Text style={styles.eventPetName}>
                                {candidate.name}
                              </Text>
                              <Text style={styles.formNote} numberOfLines={1}>
                                {candidate.breed}
                              </Text>
                              <Ionicons
                                name={
                                  selectedAcademyPetID === candidate.id
                                    ? "checkmark-circle"
                                    : "ellipse-outline"
                                }
                                size={20}
                                color={
                                  selectedAcademyPetID === candidate.id
                                    ? "#128464"
                                    : colors.muted
                                }
                                style={styles.eventPetCheck}
                              />
                            </Pressable>
                          ))}
                      </View>
                      <Text style={styles.formLabel}>MULAI IKUT KELAS</Text>
                      <View style={styles.academyScheduleList}>
                        {(selected?.schedules ?? []).map((schedule) => (
                          <Pressable
                            key={schedule.id}
                            accessibilityRole="button"
                            accessibilityLabel={`Pilih jadwal ${when(schedule.starts_at)} bersama ${schedule.trainer_name}`}
                            accessibilityState={{
                              disabled: schedule.remaining_capacity < 1,
                              selected:
                                selectedAcademyScheduleID === schedule.id,
                            }}
                            disabled={schedule.remaining_capacity < 1}
                            onPress={() =>
                              setSelectedAcademyScheduleID(schedule.id)
                            }
                            style={[
                              styles.academySchedule,
                              selectedAcademyScheduleID === schedule.id &&
                                styles.academyScheduleActive,
                              schedule.remaining_capacity < 1 &&
                                styles.academyScheduleDisabled,
                            ]}
                          >
                            <View style={styles.academyScheduleDate}>
                              <Ionicons
                                name="calendar"
                                size={18}
                                color={colors.sky600}
                              />
                            </View>
                            <View style={styles.academyScheduleCopy}>
                              <Text style={styles.academyScheduleTitle}>
                                {when(schedule.starts_at)}
                              </Text>
                              <Text style={styles.academyScheduleMeta}>
                                {schedule.trainer_name} ·{" "}
                                {schedule.location || "Online"}
                              </Text>
                              <Text style={styles.academyScheduleSeats}>
                                {schedule.remaining_capacity} kursi tersisa
                              </Text>
                            </View>
                            <Ionicons
                              name={
                                selectedAcademyScheduleID === schedule.id
                                  ? "checkmark-circle"
                                  : "ellipse-outline"
                              }
                              size={21}
                              color={
                                selectedAcademyScheduleID === schedule.id
                                  ? "#128464"
                                  : colors.muted
                              }
                            />
                          </Pressable>
                        ))}
                      </View>
                      {!(selected?.schedules ?? []).length ? (
                        <Text style={styles.academyEmptySchedule}>
                          Jadwal kelas belum dibuka oleh academy.
                        </Text>
                      ) : null}
                      <View style={styles.academyReviewSection}>
                        <View style={styles.academyReviewHead}>
                          <View>
                            <Text style={styles.formTitle}>
                              Review & komentar
                            </Text>
                            <Text style={styles.formNote}>
                              Cerita asli dari peserta terverifikasi.
                            </Text>
                          </View>
                          <View style={styles.academyReviewCount}>
                            <Text style={styles.academyReviewCountText}>
                              {formatNumber(
                                selected?.review_count ??
                                  selected?.reviews?.length ??
                                  0,
                              )}
                            </Text>
                          </View>
                        </View>
                        {(selected?.reviews ?? []).length ? (
                          <View style={styles.academyReviewList}>
                            {(selected?.reviews ?? []).map((review) => (
                              <View
                                key={review.id}
                                style={styles.academyReviewCard}
                              >
                                <View style={styles.academyReviewerAvatar}>
                                  <Text style={styles.academyReviewerInitial}>
                                    {review.reviewer_name
                                      .slice(0, 1)
                                      .toUpperCase()}
                                  </Text>
                                </View>
                                <View style={styles.academyReviewCopy}>
                                  <View style={styles.academyReviewerRow}>
                                    <Text style={styles.academyReviewerName}>
                                      {review.reviewer_name}
                                    </Text>
                                    {review.verified_enrollment ? (
                                      <View
                                        style={styles.academyVerifiedReview}
                                      >
                                        <Ionicons
                                          name="checkmark-circle"
                                          size={11}
                                          color="#128464"
                                        />
                                        <Text
                                          style={
                                            styles.academyVerifiedReviewText
                                          }
                                        >
                                          Peserta
                                        </Text>
                                      </View>
                                    ) : null}
                                  </View>
                                  <Text style={styles.academyReviewStars}>
                                    {"★".repeat(review.rating)}
                                    {"☆".repeat(5 - review.rating)}
                                  </Text>
                                  <Text style={styles.academyReviewComment}>
                                    {review.comment}
                                  </Text>
                                  <Text style={styles.academyReviewMeta}>
                                    {review.pet_name
                                      ? `${review.pet_name} · `
                                      : ""}
                                    {formatDate(review.created_at, {
                                      dateStyle: "medium",
                                    })}
                                  </Text>
                                </View>
                              </View>
                            ))}
                          </View>
                        ) : (
                          <View style={styles.academyEmptyReview}>
                            <Ionicons
                              name="chatbubble-ellipses-outline"
                              size={20}
                              color={colors.sky600}
                            />
                            <Text style={styles.academyEmptyReviewText}>
                              Belum ada review. Peserta kelas bisa menjadi yang
                              pertama.
                            </Text>
                          </View>
                        )}
                        <View style={styles.academyReviewComposer}>
                          <Text style={styles.formLabel}>
                            BAGIKAN PENGALAMAN KELAS
                          </Text>
                          <View style={styles.academyRatingRow}>
                            {[1, 2, 3, 4, 5].map((rating) => (
                              <Pressable
                                key={rating}
                                accessibilityRole="button"
                                accessibilityLabel={`Beri rating ${rating}`}
                                onPress={() => setAcademyReviewRating(rating)}
                                style={styles.academyRatingButton}
                              >
                                <Ionicons
                                  name={
                                    rating <= academyReviewRating
                                      ? "star"
                                      : "star-outline"
                                  }
                                  size={23}
                                  color="#E6A51C"
                                />
                              </Pressable>
                            ))}
                          </View>
                          <TextInput
                            value={academyReviewComment}
                            onChangeText={setAcademyReviewComment}
                            placeholder="Ceritakan progres pet, trainer, dan pengalaman kelasmu…"
                            placeholderTextColor={colors.muted}
                            multiline
                            maxLength={600}
                            style={styles.academyReviewInput}
                          />
                          <Pressable
                            accessibilityRole="button"
                            disabled={
                              academyReviewBusy ||
                              academyReviewComment.trim().length < 10
                            }
                            onPress={() => void submitAcademyReview()}
                            style={[
                              styles.academyReviewSubmit,
                              (academyReviewBusy ||
                                academyReviewComment.trim().length < 10) &&
                                styles.academyReviewSubmitDisabled,
                            ]}
                          >
                            <Ionicons
                              name="send"
                              size={15}
                              color={colors.white}
                            />
                            <Text style={styles.academyReviewSubmitText}>
                              {academyReviewBusy
                                ? "Mengirim…"
                                : "Kirim review terverifikasi"}
                            </Text>
                          </Pressable>
                          <Text style={styles.academyReviewRule}>
                            Review hanya dapat dikirim oleh pet owner yang sudah
                            terdaftar di kelas ini.
                          </Text>
                        </View>
                      </View>
                    </View>
                  ) : null}
                  {mode === "events" &&
                  selected?.ticket_unit === "owner_pet" ? (
                    <View style={styles.eventSection}>
                      {selected.pet_spot_name ? (
                        <View style={styles.eventHost}>
                          <View style={styles.eventHostIcon}>
                            <Ionicons
                              name="sparkles"
                              size={16}
                              color={colors.white}
                            />
                          </View>
                          <View>
                            <Text style={styles.formNote}>
                              DISELENGGARAKAN OLEH
                            </Text>
                            <Text style={styles.formTitle}>
                              {selected.pet_spot_name}
                            </Text>
                          </View>
                        </View>
                      ) : null}
                      <Text style={styles.formLabel}>PET YANG IKUT</Text>
                      <View style={styles.eventPetGrid}>
                        {pets
                          .filter(
                            (candidate) =>
                              !selected.allowed_pet_species?.length ||
                              selected.allowed_pet_species.includes(
                                candidate.species ?? "other",
                              ),
                          )
                          .map((candidate) => (
                            <Pressable
                              key={candidate.id}
                              onPress={() =>
                                setSelectedEventPetID(candidate.id)
                              }
                              style={[
                                styles.eventPetCard,
                                selectedEventPetID === candidate.id &&
                                  styles.eventPetCardActive,
                              ]}
                            >
                              <View style={styles.eventPetIcon}>
                                <Ionicons
                                  name="paw-outline"
                                  size={21}
                                  color={colors.sky600}
                                />
                              </View>
                              <Text style={styles.eventPetName}>
                                {candidate.name}
                              </Text>
                              <Text numberOfLines={1} style={styles.formNote}>
                                {candidate.breed}
                              </Text>
                              {selectedEventPetID === candidate.id ? (
                                <Ionicons
                                  name="checkmark-circle"
                                  size={18}
                                  color={colors.sky600}
                                  style={styles.eventPetCheck}
                                />
                              ) : null}
                            </Pressable>
                          ))}
                      </View>
                      {!pets.some(
                        (candidate) =>
                          !selected.allowed_pet_species?.length ||
                          selected.allowed_pet_species.includes(
                            candidate.species ?? "other",
                          ),
                      ) ? (
                        <Text style={styles.eventPetEmpty}>
                          Belum ada pet yang sesuai dengan ketentuan event ini.
                        </Text>
                      ) : null}
                      <View style={styles.eventTicketSummary}>
                        <View>
                          <Text style={styles.formNote}>1 TIKET</Text>
                          <Text style={styles.formTitle}>1 owner + 1 pet</Text>
                        </View>
                        <Text style={styles.eventTicketPrice}>
                          {money(selected.price)}
                        </Text>
                      </View>
                      <View style={styles.eventQris}>
                        <Ionicons
                          name="qr-code-outline"
                          size={22}
                          color={colors.sky600}
                        />
                        <View>
                          <Text style={styles.formTitle}>Pembayaran QRIS</Text>
                          <Text style={styles.formNote}>
                            QR tampil otomatis setelah tiket dibuat
                          </Text>
                        </View>
                        <Ionicons
                          name="checkmark-circle"
                          size={18}
                          color="#128464"
                        />
                      </View>
                      {selected.pet_requirements?.length ? (
                        <View style={styles.requirements}>
                          <Text style={styles.formLabel}>
                            PERSIAPAN SEBELUM HADIR
                          </Text>
                          {selected.pet_requirements.map((requirement) => (
                            <Text key={requirement} style={styles.requirement}>
                              ✓ {requirement}
                            </Text>
                          ))}
                        </View>
                      ) : null}
                    </View>
                  ) : null}
                  {mode === "consult" &&
                  selected?.provider_type === "trainer" ? (
                    <View style={styles.formSection}>
                      <Text style={styles.formTitle}>
                        Booking dengan {selected.trainer_name || "Pet Trainer"}
                      </Text>
                      <Text style={styles.formNote}>
                        {selected.mode === "chat"
                          ? "Mulai segera atau pilih jadwal dalam 14 hari ke depan."
                          : `Pilih slot ${selected.mode === "video" ? "video call" : "telepon"} yang masih tersedia.`}
                      </Text>
                      <Text style={styles.formLabel}>
                        JADWAL · {trainerTimezone}
                      </Text>
                      {selected.mode === "chat" ? (
                        <Pressable
                          onPress={() => setSelectedTrainerSlot("")}
                          style={[
                            styles.choice,
                            selectedTrainerSlot === "" && styles.choiceActive,
                          ]}
                        >
                          <Text
                            style={[
                              styles.choiceText,
                              selectedTrainerSlot === "" &&
                                styles.choiceTextActive,
                            ]}
                          >
                            Mulai segera
                          </Text>
                        </Pressable>
                      ) : null}
                      {trainerAvailabilityLoading ? (
                        <Text style={styles.formNote}>
                          Memuat slot trainer…
                        </Text>
                      ) : (
                        <View style={styles.trainerSlotGrid}>
                          {trainerSlots.slice(0, 16).map((slot) => (
                            <Pressable
                              key={slot.starts_at}
                              onPress={() =>
                                setSelectedTrainerSlot(slot.starts_at)
                              }
                              style={[
                                styles.trainerSlot,
                                selectedTrainerSlot === slot.starts_at &&
                                  styles.choiceActive,
                              ]}
                            >
                              <Text
                                style={[
                                  styles.choiceText,
                                  selectedTrainerSlot === slot.starts_at &&
                                    styles.choiceTextActive,
                                ]}
                              >
                                {when(slot.starts_at)} · {slot.duration_minutes}{" "}
                                mnt
                              </Text>
                            </Pressable>
                          ))}
                        </View>
                      )}
                      {!trainerAvailabilityLoading &&
                      trainerSlots.length === 0 &&
                      selected.mode !== "chat" ? (
                        <Text style={styles.availabilityEmpty}>
                          Belum ada slot dalam 14 hari. Pilih paket chat atau
                          trainer lain.
                        </Text>
                      ) : null}
                    </View>
                  ) : null}
                  {mode === "petspot" && selected?.reservable ? (
                    <View style={styles.petSpotReservation}>
                      <View style={styles.petSpotReservationHead}>
                        <View>
                          <Text style={styles.formTitle}>
                            {petSpotForm.stayKind
                              ? "Booking unit hunian"
                              : "Reservasi PetSpot"}
                          </Text>
                          <Text style={styles.formNote}>
                            {petSpotForm.stayKind
                              ? "Pilih check-in dan check-out, lalu cek unit serta harga sewa."
                              : "Pilih jadwal lalu lihat meja yang tersedia."}
                          </Text>
                        </View>
                        <View style={styles.depositBadge}>
                          <Text style={styles.depositBadgeText}>
                            DP WAJIB{" "}
                            {selected.deposit_type === "percentage"
                              ? `${selected.deposit_value ?? 0}%`
                              : money(selected.deposit_value)}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.dateRow}>
                        <View style={styles.dateField}>
                          <FormTextField
                            label={
                              petSpotForm.stayKind ? "Check-in" : "Tanggal"
                            }
                            value={petSpotForm.date}
                            onChangeText={(date) => {
                              setSelectedPetSpotResource(undefined);
                              setPetSpotResources([]);
                              setPetSpotForm((current) => ({
                                ...current,
                                date,
                              }));
                            }}
                            placeholder="YYYY-MM-DD"
                          />
                        </View>
                        <View style={styles.dateField}>
                          <FormTextField
                            label={petSpotForm.stayKind ? "Check-out" : "Jam"}
                            value={
                              petSpotForm.stayKind
                                ? petSpotForm.checkoutDate
                                : petSpotForm.time
                            }
                            onChangeText={(value) => {
                              setSelectedPetSpotResource(undefined);
                              setPetSpotResources([]);
                              setPetSpotForm((current) =>
                                petSpotForm.stayKind
                                  ? { ...current, checkoutDate: value }
                                  : { ...current, time: value },
                              );
                            }}
                            placeholder={
                              petSpotForm.stayKind ? "YYYY-MM-DD" : "18:00"
                            }
                          />
                        </View>
                      </View>
                      {!petSpotForm.stayKind ? (
                        <>
                          <Text style={styles.formLabel}>Durasi</Text>
                          <View style={styles.choiceRow}>
                            {[60, 90, 120, 1440].map((durationMinutes) => (
                              <Pressable
                                key={durationMinutes}
                                onPress={() =>
                                  setPetSpotForm((current) => ({
                                    ...current,
                                    durationMinutes,
                                  }))
                                }
                                style={[
                                  styles.choice,
                                  petSpotForm.durationMinutes ===
                                    durationMinutes && styles.choiceActive,
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.choiceText,
                                    petSpotForm.durationMinutes ===
                                      durationMinutes &&
                                      styles.choiceTextActive,
                                  ]}
                                >
                                  {durationMinutes === 1440
                                    ? "1 hari"
                                    : `${durationMinutes} menit`}
                                </Text>
                              </Pressable>
                            ))}
                          </View>
                        </>
                      ) : (
                        <Text style={styles.formNote}>
                          {petSpotForm.stayKind === "boarding_house"
                            ? "Minimal 30 malam · tarif dapat berlaku per 30 malam"
                            : "Minimal 1 malam · tarif per malam"}
                        </Text>
                      )}
                      <View style={styles.counterRow}>
                        {[
                          {
                            label: "Tamu",
                            key: "guestCount" as const,
                            min: 1,
                          },
                          {
                            label: "Pet",
                            key: "petCount" as const,
                            min: 0,
                          },
                        ].map((counter) => (
                          <View key={counter.key} style={styles.counterCard}>
                            <Text style={styles.formLabel}>
                              {counter.label}
                            </Text>
                            <View style={styles.counterControl}>
                              <Pressable
                                onPress={() =>
                                  setPetSpotForm((current) => ({
                                    ...current,
                                    [counter.key]: Math.max(
                                      counter.min,
                                      current[counter.key] - 1,
                                    ),
                                  }))
                                }
                                style={styles.counterButton}
                              >
                                <Ionicons
                                  name="remove"
                                  size={16}
                                  color={colors.sky600}
                                />
                              </Pressable>
                              <Text style={styles.counterValue}>
                                {petSpotForm[counter.key]}
                              </Text>
                              <Pressable
                                onPress={() =>
                                  setPetSpotForm((current) => ({
                                    ...current,
                                    [counter.key]: current[counter.key] + 1,
                                  }))
                                }
                                style={styles.counterButton}
                              >
                                <Ionicons
                                  name="add"
                                  size={16}
                                  color={colors.sky600}
                                />
                              </Pressable>
                            </View>
                          </View>
                        ))}
                      </View>
                      <Pressable
                        disabled={availabilityLoading}
                        onPress={() =>
                          selected &&
                          void loadPetSpotAvailability(selected, petSpotForm)
                        }
                        style={styles.checkAvailability}
                      >
                        <Ionicons
                          name="search"
                          size={16}
                          color={colors.white}
                        />
                        <Text style={styles.checkAvailabilityText}>
                          {availabilityLoading
                            ? "Memeriksa ketersediaan…"
                            : petSpotForm.stayKind
                              ? "Cek unit tersedia"
                              : "Perbarui denah ketersediaan"}
                        </Text>
                      </Pressable>
                      {petSpotForm.stayKind ? (
                        <View style={styles.housingList}>
                          {petSpotResources.map((resource) => {
                            const active =
                              selectedPetSpotResource?.id === resource.id;
                            return (
                              <Pressable
                                key={resource.id}
                                disabled={!resource.available}
                                onPress={() =>
                                  setSelectedPetSpotResource(resource)
                                }
                                style={[
                                  styles.housingCard,
                                  active && styles.housingCardSelected,
                                  !resource.available && styles.housingCardBusy,
                                ]}
                              >
                                {resource.image_urls?.[0] ? (
                                  <Image
                                    alt={resource.name}
                                    source={{ uri: resource.image_urls[0] }}
                                    style={styles.housingPhoto}
                                  />
                                ) : null}
                                <View style={styles.housingCardBody}>
                                  <Text style={styles.formTitle}>
                                    {resource.name}
                                  </Text>
                                  <Text style={styles.formNote}>
                                    {resource.code} ·{" "}
                                    {resource.floor_name || "Unit"} ·{" "}
                                    {resource.capacity} penghuni ·{" "}
                                    {Number(
                                      resource.pet_policy?.pet_limit ?? resource.pet_policy?.max_pets ?? 0,
                                    )}{" "}
                                    pet
                                  </Text>
                                  {resource.description ? (
                                    <Text style={styles.formNote}>
                                      {resource.description}
                                    </Text>
                                  ) : null}
                                  <Text style={styles.housingAmenities}>
                                    {(resource.amenities ?? [])
                                      .slice(0, 5)
                                      .join(" · ")}
                                  </Text>
                                  <Text style={styles.housingPrice}>
                                    {money(resource.base_price)} /{" "}
                                    {resource.booking_rules?.rate_period ===
                                    "month"
                                      ? "30 malam"
                                      : "malam"}
                                  </Text>
                                  <Text style={styles.formNote}>
                                    {resource.available
                                      ? active
                                        ? "✓ Pilihanmu"
                                        : "Pilih unit"
                                      : "Terisi di tanggal ini"}
                                  </Text>
                                </View>
                              </Pressable>
                            );
                          })}
                          {!availabilityLoading && !petSpotResources.length ? (
                            <Text style={styles.availabilityEmpty}>
                              Belum ada unit untuk tanggal atau jumlah pet yang
                              dipilih.
                            </Text>
                          ) : null}
                        </View>
                      ) : (
                        <>
                          <View style={styles.layoutLegend}>
                            <Text style={styles.layoutLegendAvailable}>
                              ● Tersedia
                            </Text>
                            <Text style={styles.layoutLegendReserved}>
                              ● Sudah direservasi
                            </Text>
                            <Text style={styles.layoutLegendSelected}>
                              ● Pilihanmu
                            </Text>
                          </View>
                          <View style={styles.petSpotLayout}>
                            <View style={styles.layoutDoor}>
                              <Text style={styles.layoutDoorText}>PINTU</Text>
                            </View>
                            {petSpotResources.map((resource) => {
                              const active =
                                selectedPetSpotResource?.id === resource.id;
                              return (
                                <Pressable
                                  key={resource.id}
                                  disabled={!resource.available}
                                  onPress={() =>
                                    setSelectedPetSpotResource(resource)
                                  }
                                  style={[
                                    styles.layoutResource,
                                    {
                                      left: `${Math.min(82, Math.max(3, resource.x_percent))}%`,
                                      top: `${Math.min(74, Math.max(5, resource.y_percent))}%`,
                                    },
                                    resource.shape === "round" &&
                                      styles.layoutResourceRound,
                                    !resource.available &&
                                      styles.layoutResourceReserved,
                                    active && styles.layoutResourceSelected,
                                  ]}
                                >
                                  <Text
                                    style={[
                                      styles.layoutResourceCode,
                                      active && styles.layoutResourceCodeActive,
                                    ]}
                                  >
                                    {resource.code}
                                  </Text>
                                  <Text
                                    style={[
                                      styles.layoutResourceCapacity,
                                      active && styles.layoutResourceCodeActive,
                                    ]}
                                  >
                                    {resource.capacity} org
                                  </Text>
                                </Pressable>
                              );
                            })}
                            {!availabilityLoading &&
                            !petSpotResources.length ? (
                              <View style={styles.layoutEmpty}>
                                <Ionicons
                                  name="calendar-outline"
                                  size={24}
                                  color={colors.muted}
                                />
                                <Text style={styles.formNote}>
                                  Belum ada resource untuk jadwal ini
                                </Text>
                              </View>
                            ) : null}
                          </View>
                        </>
                      )}
                      {selectedPetSpotResource ? (
                        <View style={styles.selectedResourceCard}>
                          <View>
                            <Text style={styles.formTitle}>
                              {selectedPetSpotResource.name}
                            </Text>
                            <Text style={styles.formNote}>
                              {selectedPetSpotResource.floor_name} · kapasitas{" "}
                              {selectedPetSpotResource.capacity} ·{" "}
                              {money(selectedPetSpotResource.base_price)} /{" "}
                              {petSpotForm.stayKind
                                ? selectedPetSpotResource.booking_rules
                                    ?.rate_period === "month"
                                  ? "30 malam"
                                  : "malam"
                                : "reservasi"}
                            </Text>
                          </View>
                          <Ionicons
                            name="checkmark-circle"
                            size={24}
                            color="#128464"
                          />
                        </View>
                      ) : null}
                      {selectedPetSpotResource &&
                      housingQuote(
                        selected,
                        selectedPetSpotResource,
                        petSpotForm,
                      ) ? (
                        <View style={styles.housingQuote}>
                          <Text style={styles.formTitle}>Rincian biaya</Text>
                          <Text style={styles.formNote}>
                            Total{" "}
                            {petSpotForm.stayKind
                              ? `sewa ${housingQuote(selected, selectedPetSpotResource, petSpotForm)?.periods} periode`
                              : "reservasi"}
                            :{" "}
                            {money(
                              housingQuote(
                                selected,
                                selectedPetSpotResource,
                                petSpotForm,
                              )?.subtotal ?? 0,
                            )}
                          </Text>
                          <Text style={styles.formNote}>
                            DP sekarang:{" "}
                            {money(
                              housingQuote(
                                selected,
                                selectedPetSpotResource,
                                petSpotForm,
                              )?.deposit ?? 0,
                            )}
                          </Text>
                          <Text style={styles.formNote}>
                            Sisa sesuai ketentuan pemilik:{" "}
                            {money(
                              housingQuote(
                                selected,
                                selectedPetSpotResource,
                                petSpotForm,
                              )?.balance ?? 0,
                            )}
                          </Text>
                        </View>
                      ) : null}
                      <FormTextField
                        label="Permintaan khusus (opsional)"
                        value={petSpotForm.specialRequest}
                        onChangeText={(specialRequest) =>
                          setPetSpotForm((current) => ({
                            ...current,
                            specialRequest,
                          }))
                        }
                        multiline
                        placeholder="Contoh: dekat outdoor, membawa 2 anjing"
                      />
                      <View style={styles.depositNotice}>
                        <Ionicons
                          name="shield-checkmark-outline"
                          size={20}
                          color={colors.sky600}
                        />
                        <Text style={styles.depositNoticeText}>
                          Resource ditahan sementara selama{" "}
                          {selected.reservation_policy?.hold_minutes ?? 15}{" "}
                          menit. Reservasi baru dikonfirmasi setelah DP
                          terverifikasi.
                        </Text>
                      </View>
                    </View>
                  ) : null}
                  {mode === "pawdating" ? (
                    <View style={styles.welfareNote}>
                      <View style={styles.welfareTitleRow}>
                        <Ionicons
                          name="shield-checkmark-outline"
                          size={17}
                          color={colors.sky600}
                        />
                        <Text style={styles.welfareTitle}>
                          Welfare check aktif
                        </Text>
                      </View>
                      <Text style={styles.welfareText}>
                        Sistem memblokir pairing tidak aman, data kedaluwarsa,
                        dan indikasi kekerabatan. Pemeriksaan pra-breeding tetap
                        wajib.
                      </Text>
                    </View>
                  ) : null}
                  {mode === "adoption" ? (
                    <View style={styles.formSection}>
                      <Text style={styles.formTitle}>Screening adopter</Text>
                      <Text style={styles.formNote}>
                        Data kontak hanya dipakai untuk verifikasi privat dan
                        tidak ditampilkan pada posting publik.
                      </Text>
                      <FormTextField
                        label="Nama lengkap"
                        value={adoptionForm.applicantName}
                        onChangeText={(applicantName) =>
                          setAdoptionForm((current) => ({
                            ...current,
                            applicantName,
                          }))
                        }
                        placeholder="Nama calon adopter"
                      />
                      <FormTextField
                        label="Nomor untuk verifikasi"
                        value={adoptionForm.phone}
                        onChangeText={(phone) =>
                          setAdoptionForm((current) => ({ ...current, phone }))
                        }
                        keyboardType="phone-pad"
                        placeholder="08xxxxxxxxxx"
                      />
                      <FormTextField
                        label="Alamat tempat tinggal"
                        value={adoptionForm.address}
                        onChangeText={(address) =>
                          setAdoptionForm((current) => ({
                            ...current,
                            address,
                          }))
                        }
                        multiline
                        placeholder="Alamat lengkap"
                      />
                      <Text style={styles.formLabel}>Tipe hunian</Text>
                      <View style={styles.choiceRow}>
                        {(
                          ["Rumah milik", "Rumah sewa", "Apartemen"] as const
                        ).map((housingType) => (
                          <Pressable
                            key={housingType}
                            onPress={() =>
                              setAdoptionForm((current) => ({
                                ...current,
                                housingType,
                              }))
                            }
                            style={[
                              styles.choice,
                              adoptionForm.housingType === housingType &&
                                styles.choiceActive,
                            ]}
                          >
                            <Text
                              style={[
                                styles.choiceText,
                                adoptionForm.housingType === housingType &&
                                  styles.choiceTextActive,
                              ]}
                            >
                              {housingType}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                      <Text style={styles.formLabel}>Memiliki pet lain?</Text>
                      <View style={styles.choiceRow}>
                        {[
                          { label: "Tidak", value: false },
                          { label: "Ya", value: true },
                        ].map((choice) => (
                          <Pressable
                            key={choice.label}
                            onPress={() =>
                              setAdoptionForm((current) => ({
                                ...current,
                                hasOtherPets: choice.value,
                              }))
                            }
                            style={[
                              styles.choice,
                              adoptionForm.hasOtherPets === choice.value &&
                                styles.choiceActive,
                            ]}
                          >
                            <Text
                              style={[
                                styles.choiceText,
                                adoptionForm.hasOtherPets === choice.value &&
                                  styles.choiceTextActive,
                              ]}
                            >
                              {choice.label}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                      <FormTextField
                        label={`Mengapa ingin mengadopsi ${selected?.name || "pet ini"}?`}
                        value={adoptionForm.reason}
                        onChangeText={(reason) =>
                          setAdoptionForm((current) => ({ ...current, reason }))
                        }
                        multiline
                        placeholder="Ceritakan alasan dan kesiapanmu"
                      />
                      <FormTextField
                        label="Pengalaman merawat pet (opsional)"
                        value={adoptionForm.experience}
                        onChangeText={(experience) =>
                          setAdoptionForm((current) => ({
                            ...current,
                            experience,
                          }))
                        }
                        multiline
                        placeholder="Pengalaman sebelumnya"
                      />
                    </View>
                  ) : null}
                  {mode === "documents" ? (
                    <View style={styles.formSection}>
                      <Text style={styles.formTitle}>Data permohonan</Text>
                      <View style={styles.petSummary}>
                        <Ionicons
                          name="paw-outline"
                          size={22}
                          color={colors.sky600}
                        />
                        <View style={styles.petSummaryCopy}>
                          <Text style={styles.formLabel}>PET</Text>
                          <Text style={styles.petSummaryName}>
                            {pet
                              ? `${pet.name} · ${pet.breed}`
                              : "Belum ada pet"}
                          </Text>
                        </View>
                      </View>
                      {selected?.category !== "birth_certificate" ? (
                        <>
                          <FormTextField
                            label="Kota asal"
                            value={documentForm.originCity}
                            onChangeText={(originCity) =>
                              setDocumentForm((current) => ({
                                ...current,
                                originCity,
                              }))
                            }
                            placeholder="Contoh: Jakarta"
                          />
                          <FormTextField
                            label="Kota / negara tujuan"
                            value={documentForm.destinationCity}
                            onChangeText={(destinationCity) =>
                              setDocumentForm((current) => ({
                                ...current,
                                destinationCity,
                              }))
                            }
                            placeholder="Contoh: Denpasar"
                          />
                          <FormTextField
                            label="Jadwal keberangkatan"
                            value={documentForm.departureAt}
                            onChangeText={(departureAt) =>
                              setDocumentForm((current) => ({
                                ...current,
                                departureAt,
                              }))
                            }
                            autoCapitalize="none"
                            placeholder="YYYY-MM-DD HH:mm"
                          />
                          <Text style={styles.formLabel}>Transportasi</Text>
                          <View style={styles.choiceRow}>
                            {[
                              { label: "Pesawat", value: "flight" as const },
                              { label: "Kapal", value: "ship" as const },
                            ].map((choice) => (
                              <Pressable
                                key={choice.value}
                                onPress={() =>
                                  setDocumentForm((current) => ({
                                    ...current,
                                    transportType: choice.value,
                                  }))
                                }
                                style={[
                                  styles.choice,
                                  documentForm.transportType === choice.value &&
                                    styles.choiceActive,
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.choiceText,
                                    documentForm.transportType ===
                                      choice.value && styles.choiceTextActive,
                                  ]}
                                >
                                  {choice.label}
                                </Text>
                              </Pressable>
                            ))}
                          </View>
                        </>
                      ) : null}
                      {selected?.requirements?.length ? (
                        <View style={styles.requirements}>
                          <Text style={styles.formLabel}>
                            Unggah dokumen yang diperlukan
                          </Text>
                          <DocumentPhotoPicker
                            requirements={selected.requirements}
                            photos={documentPhotos}
                            onChange={(requirement, document) =>
                              setDocumentPhotos((current) => ({
                                ...current,
                                [requirement]: document,
                              }))
                            }
                            onAction={onAction}
                            disabled={busy}
                          />
                        </View>
                      ) : null}
                    </View>
                  ) : null}
                  {requiresPayment ? (
                    <MobilePaymentMethods
                      value={paymentMethod}
                      onChange={setPaymentMethod}
                      disabled={busy}
                    />
                  ) : null}
                  <PrimaryButton
                    label={
                      mode === "pawdating"
                        ? "♡ Kirim ketertarikan"
                        : mode === "academy"
                          ? "Daftar kelas & bayar"
                          : mode === "events"
                            ? "Ambil tiket"
                            : mode === "consult"
                              ? selected?.provider_type === "trainer"
                                ? "Booking trainer & bayar"
                                : "Mulai konsultasi dokter"
                              : mode === "adoption"
                                ? "Kirim pengajuan screening"
                                : mode === "documents"
                                  ? "Ajukan dokumen"
                                  : mode === "petspot"
                                    ? selected?.reservable
                                      ? "Reservasi & bayar DP"
                                      : "Buka petunjuk arah"
                                    : "Tonton live"
                    }
                    onPress={runPrimaryAction}
                    disabled={
                      busy ||
                      (!!owner && requiresPayment && !paymentMethod) ||
                      (mode === "events" &&
                        selected?.ticket_unit === "owner_pet" &&
                        !selectedEventPetID) ||
                      (mode === "academy" &&
                        (!selectedAcademyPetID ||
                          !selectedAcademyScheduleID)) ||
                      (mode === "consult" &&
                        selected?.provider_type === "trainer" &&
                        (trainerAvailabilityLoading ||
                          (selected.mode !== "chat" && !selectedTrainerSlot)))
                    }
                  />
                </ScrollView>
              </View>
            </SafeAreaView>
          </KeyboardAvoidingView>
        </View>
      </Modal>
      <Modal
        visible={!!pawDatingChat}
        transparent
        animationType="slide"
        statusBarTranslucent={false}
        onRequestClose={() => setPawDatingChat(undefined)}
      >
        <View style={styles.pawChatBackdrop}>
          <SafeAreaView style={styles.pawChatSheet}>
            <View style={styles.pawChatHeader}>
              <View style={styles.pawChatHeart}>
                <Ionicons name="heart" size={20} color="#EA5B81" />
              </View>
              <View style={styles.pawChatHeaderCopy}>
                <Text style={styles.pawChatKicker}>MATCHED · PRIVATE ROOM</Text>
                <Text style={styles.pawChatTitle} numberOfLines={1}>
                  {pawDatingChat?.source_name} × {pawDatingChat?.target_name}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Tutup chat match"
                style={styles.pawChatClose}
                onPress={() => setPawDatingChat(undefined)}
              >
                <Ionicons name="close" size={21} color={colors.text} />
              </Pressable>
            </View>
            <View style={styles.pawChatSafety}>
              <Ionicons
                name="shield-checkmark-outline"
                size={17}
                color="#128464"
              />
              <Text style={styles.pawChatSafetyText}>
                Diskusikan kecocokan dan kesehatan pet. Kontak pribadi tetap
                dilindungi.
              </Text>
            </View>
            <ScrollView
              style={styles.pawChatMessages}
              contentContainerStyle={styles.pawChatMessagesContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {pawDatingChatBusy && !pawDatingMessages.length ? (
                <Text style={styles.pawChatEmpty}>Memuat percakapan…</Text>
              ) : pawDatingMessages.length ? (
                pawDatingMessages.map((message) => {
                  const mine = message.sender_user_id === owner?.id;
                  return (
                    <View
                      key={message.id}
                      style={[
                        styles.pawChatBubble,
                        mine && styles.pawChatBubbleMine,
                      ]}
                    >
                      <Text
                        style={[
                          styles.pawChatSender,
                          mine && styles.pawChatSenderMine,
                        ]}
                      >
                        {mine ? "Kamu" : message.sender_name}
                      </Text>
                      <Text
                        style={[
                          styles.pawChatBody,
                          mine && styles.pawChatBodyMine,
                        ]}
                      >
                        {message.body}
                      </Text>
                      <Text
                        style={[
                          styles.pawChatTime,
                          mine && styles.pawChatTimeMine,
                        ]}
                      >
                        {formatDate(message.created_at, {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </Text>
                    </View>
                  );
                })
              ) : (
                <Text style={styles.pawChatEmpty}>
                  Belum ada pesan. Mulai kenalan dengan aman di sini.
                </Text>
              )}
            </ScrollView>
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : undefined}
            >
              <View style={styles.pawChatComposer}>
                <TextInput
                  value={pawDatingChatBody}
                  onChangeText={setPawDatingChatBody}
                  placeholder="Tulis pesan…"
                  multiline
                  maxLength={1000}
                  style={styles.pawChatInput}
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Kirim pesan"
                  disabled={!pawDatingChatBody.trim() || pawDatingChatBusy}
                  onPress={() => void sendPawDatingChat()}
                  style={[
                    styles.pawChatSend,
                    (!pawDatingChatBody.trim() || pawDatingChatBusy) &&
                      styles.pawChatSendDisabled,
                  ]}
                >
                  <Ionicons name="send" size={19} color={colors.white} />
                </Pressable>
              </View>
            </KeyboardAvoidingView>
          </SafeAreaView>
        </View>
      </Modal>
      <Modal
        visible={!!academyTrainer}
        transparent
        animationType="slide"
        statusBarTranslucent={false}
        onRequestClose={() => setAcademyTrainer(undefined)}
      >
        <View style={styles.backdrop}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Tutup profil trainer"
            onPress={() => setAcademyTrainer(undefined)}
            style={StyleSheet.absoluteFill}
          />
          <SafeAreaView style={styles.trainerSheetWrap}>
            <View style={styles.trainerSheet}>
              <View style={styles.handle} />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Tutup profil trainer"
                style={styles.sheetClose}
                onPress={() => setAcademyTrainer(undefined)}
              >
                <Ionicons name="close" size={21} color={colors.text} />
              </Pressable>
              <ScrollView
                style={styles.trainerSheetScroll}
                contentContainerStyle={styles.trainerSheetContent}
                scrollEnabled
                nestedScrollEnabled
                bounces
                alwaysBounceVertical
                overScrollMode="always"
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.trainerProfileTop}>
                  <View style={styles.trainerProfilePhoto}>
                    {academyTrainer?.photo_url ? (
                      <Image
                        alt=""
                        source={{ uri: academyTrainer.photo_url }}
                        style={StyleSheet.absoluteFill}
                        resizeMode="cover"
                      />
                    ) : (
                      <Text style={styles.trainerProfileInitial}>
                        {academyTrainer?.full_name.slice(0, 1)}
                      </Text>
                    )}
                  </View>
                  <Text style={styles.academyTrainerKicker}>
                    PET TRAINER TERVERIFIKASI
                  </Text>
                  <Text style={styles.trainerProfileName}>
                    {academyTrainer?.full_name}
                  </Text>
                  <Text style={styles.trainerProfileAcademy}>
                    {academyTrainer?.academy_name}
                  </Text>
                  <Text style={styles.trainerProfileRating}>
                    ★ {academyTrainer?.rating.toFixed(1)} ·{" "}
                    {academyTrainer?.experience_years} tahun pengalaman
                  </Text>
                </View>
                <Text style={styles.trainerProfileBio}>
                  {academyTrainer?.bio}
                </Text>
                <View style={styles.trainerProfileFacts}>
                  <View>
                    <Text style={styles.detailLabel}>SERTIFIKASI</Text>
                    <Text style={styles.detailValue}>
                      {academyTrainer?.certification || "Slivadoc verified"}
                    </Text>
                  </View>
                  <View>
                    <Text style={styles.detailLabel}>JENIS PET</Text>
                    <Text style={styles.detailValue}>
                      {academyTrainer?.pet_types?.join(" · ")}
                    </Text>
                  </View>
                  <View>
                    <Text style={styles.detailLabel}>SPESIALISASI</Text>
                    <Text style={styles.detailValue}>
                      {academyTrainer?.specialties?.join(" · ")}
                    </Text>
                  </View>
                </View>
                {academyTrainer?.programs?.length ? (
                  <View style={styles.trainerPrograms}>
                    <Text style={styles.formTitle}>Kelas yang tersedia</Text>
                    {academyTrainer.programs.map((program) => (
                      <View key={program.id} style={styles.trainerProgramRow}>
                        <View>
                          <Text style={styles.trainerProgramName}>
                            {program.title}
                          </Text>
                          <Text style={styles.formNote}>
                            {program.level} · {program.session_count} sesi
                          </Text>
                        </View>
                        <Text style={styles.trainerProgramPrice}>
                          {money(program.price)}
                        </Text>
                      </View>
                    ))}
                  </View>
                ) : null}
              </ScrollView>
            </View>
          </SafeAreaView>
        </View>
      </Modal>
      <Modal
        visible={imageViewerIndex !== undefined}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setImageViewerIndex(undefined)}
      >
        <SafeAreaView style={styles.worldImageViewer}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Tutup galeri"
            hitSlop={10}
            onPress={() => setImageViewerIndex(undefined)}
            style={styles.worldImageViewerClose}
          >
            <Ionicons name="close" size={24} color={colors.white} />
          </Pressable>
          {selectedImages[imageViewerIndex ?? 0] ? (
            <Image
              alt=""
              source={{ uri: selectedImages[imageViewerIndex ?? 0] }}
              resizeMode="contain"
              style={styles.worldImageViewerImage}
            />
          ) : null}
          {selectedImages.length > 1 ? (
            <View style={styles.worldImageViewerControls}>
              <Pressable
                onPress={() =>
                  setImageViewerIndex(
                    (current) =>
                      ((current ?? 0) - 1 + selectedImages.length) %
                      selectedImages.length,
                  )
                }
              >
                <Ionicons name="chevron-back" size={25} color={colors.white} />
              </Pressable>
              <Text style={styles.worldImageViewerCount}>
                {(imageViewerIndex ?? 0) + 1} / {selectedImages.length}
              </Text>
              <Pressable
                onPress={() =>
                  setImageViewerIndex(
                    (current) => ((current ?? 0) + 1) % selectedImages.length,
                  )
                }
              >
                <Ionicons
                  name="chevron-forward"
                  size={25}
                  color={colors.white}
                />
              </Pressable>
            </View>
          ) : null}
        </SafeAreaView>
      </Modal>
      <MobileQrisModal
        payment={payment}
        onClose={() => setPayment(undefined)}
        onPaid={() => {
          onAction("Pembayaran berhasil dan transaksi sudah tercatat");
        }}
        onOpenActivity={
          payment && paymentActivityType
            ? () => {
                setPayment(undefined);
                onOpenActivity(paymentActivityType, payment.reference_id);
              }
            : undefined
        }
      />
      {pet ? (
        <PawDatingCreateModal
          key={pet.id}
          visible={pawDatingCreateOpen}
          pet={pet}
          location={userLocation}
          onClose={() => setPawDatingCreateOpen(false)}
          onAction={onAction}
          onCreated={(message) => {
            setPawDatingCreateOpen(false);
            onAction(message);
          }}
        />
      ) : null}
    </>
  );
}

function PawDatingCreateModal({
  visible,
  pet,
  location,
  onClose,
  onAction,
  onCreated,
}: {
  visible: boolean;
  pet: WorldPet;
  location?: { latitude: number; longitude: number };
  onClose: () => void;
  onAction: (message: string) => void;
  onCreated: (message: string) => void;
}) {
  const today = new Date();
  const validDate = new Date(today);
  validDate.setDate(validDate.getDate() + 180);
  const [busy, setBusy] = useState(false);
  const [vaccineBook, setVaccineBook] =
    useState<ImagePicker.ImagePickerAsset>();
  const [form, setForm] = useState({
    city: "",
    description: `${pet.name} adalah ${pet.breed} yang sehat dan bersahabat.`,
    clinic: "",
    doctor: "",
    license: "",
    exam: today.toISOString().slice(0, 10),
    valid: validDate.toISOString().slice(0, 10),
  });
  const update = (key: keyof typeof form, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  const pickVaccineBook = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      onAction("Izin galeri diperlukan untuk mengunggah foto buku vaksin");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: false,
      quality: 0.9,
    });
    if (!result.canceled && result.assets[0]) setVaccineBook(result.assets[0]);
  };

  const submit = async () => {
    if (
      !form.city.trim() ||
      form.description.trim().length < 20 ||
      !form.clinic.trim() ||
      !form.doctor.trim() ||
      !form.exam ||
      !form.valid ||
      !vaccineBook
    ) {
      onAction(
        "Lengkapi kota, deskripsi, data pemeriksaan, dan foto buku vaksin",
      );
      return;
    }
    setBusy(true);
    try {
      const upload = await uploadMobileImage(
        vaccineBook.uri,
        vaccineBook.mimeType ?? "image/jpeg",
        vaccineBook.fileName ?? "buku-vaksin.jpg",
        "documents",
      );
      const profile = await createMobilePawDatingProfile({
        pet_id: pet.id,
        city: form.city.trim(),
        latitude: location?.latitude,
        longitude: location?.longitude,
        pedigree_status: "none",
        description: form.description.trim(),
        temperament: [],
        traits: [],
        preferred_breeds: [pet.breed],
        preferred_age_min_months: 18,
        preferred_age_max_months: 84,
        max_distance_km: 200,
        photo_urls: [],
        vaccine_book_urls: [upload.url],
        visibility: "public",
      });
      await createMobilePawDatingHealthReport(profile.id, {
        examination_at: `${form.exam}T00:00:00Z`,
        valid_until: `${form.valid}T00:00:00Z`,
        clinic_name: form.clinic.trim(),
        veterinarian_name: form.doctor.trim(),
        veterinarian_license: form.license.trim(),
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
        document_urls: [upload.url],
      });
      await submitMobilePawDatingProfile(profile.id);
      setVaccineBook(undefined);
      onCreated(
        "Profil masuk antrean approval Marketplace dan belum tampil ke publik",
      );
    } catch (cause) {
      onAction(
        cause instanceof Error
          ? cause.message
          : "Profil PAW Dating belum dapat dikirim",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.createModalBackdrop}
      >
        <SafeAreaView style={styles.createModalSafe}>
          <View style={styles.createModalSheet}>
            <View style={styles.createModalHeader}>
              <View>
                <Text style={styles.eyebrow}>PAW DATING REGISTRATION</Text>
                <Text style={styles.createModalTitle}>
                  Daftarkan {pet.name}
                </Text>
              </View>
              <Pressable onPress={onClose} style={styles.sheetCloseInline}>
                <Ionicons name="close" size={21} color={colors.text} />
              </Pressable>
            </View>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.createModalContent}
            >
              <View style={styles.petSummary}>
                <Ionicons name="paw" size={24} color={colors.sky600} />
                <View style={styles.petSummaryCopy}>
                  <Text style={styles.formLabel}>PET</Text>
                  <Text style={styles.petSummaryName}>
                    {pet.name} · {pet.breed}
                  </Text>
                </View>
              </View>
              <FormTextField
                label="Kota"
                value={form.city}
                onChangeText={(value) => update("city", value)}
                placeholder="Contoh: Jakarta Selatan"
              />
              <FormTextField
                label="Tentang pet"
                value={form.description}
                onChangeText={(value) => update("description", value)}
                multiline
                placeholder="Ceritakan karakter dan kebutuhan pet"
              />
              <View style={styles.formSection}>
                <Text style={styles.formTitle}>Health screening</Text>
                <Text style={styles.formNote}>
                  Profil baru dirilis setelah dokter memverifikasi kesehatan dan
                  Marketplace menyetujui dokumen.
                </Text>
                <FormTextField
                  label="Klinik / rumah sakit"
                  value={form.clinic}
                  onChangeText={(value) => update("clinic", value)}
                />
                <FormTextField
                  label="Nama dokter"
                  value={form.doctor}
                  onChangeText={(value) => update("doctor", value)}
                />
                <FormTextField
                  label="Nomor STRV / SIP (opsional)"
                  value={form.license}
                  onChangeText={(value) => update("license", value)}
                />
                <View style={styles.dateRow}>
                  <View style={styles.dateField}>
                    <FormTextField
                      label="Tanggal periksa"
                      value={form.exam}
                      onChangeText={(value) => update("exam", value)}
                      placeholder="YYYY-MM-DD"
                    />
                  </View>
                  <View style={styles.dateField}>
                    <FormTextField
                      label="Valid sampai"
                      value={form.valid}
                      onChangeText={(value) => update("valid", value)}
                      placeholder="YYYY-MM-DD"
                    />
                  </View>
                </View>
                <Text style={styles.formLabel}>Foto buku vaksin · wajib</Text>
                <Pressable
                  style={styles.vaccinePicker}
                  onPress={() => void pickVaccineBook()}
                >
                  {vaccineBook ? (
                    <Image
                      source={{ uri: vaccineBook.uri }}
                      alt={`Foto buku vaksin ${pet.name}`}
                      style={styles.vaccinePreview}
                    />
                  ) : (
                    <Ionicons
                      name="camera-outline"
                      size={25}
                      color={colors.sky600}
                    />
                  )}
                  <View style={styles.vaccinePickerCopy}>
                    <Text style={styles.vaccinePickerTitle}>
                      {vaccineBook
                        ? "Foto buku vaksin dipilih"
                        : "Pilih foto buku vaksin"}
                    </Text>
                    <Text style={styles.formNote}>
                      Hanya dapat dilihat oleh tim verifikasi.
                    </Text>
                  </View>
                </Pressable>
              </View>
              <PrimaryButton
                label={
                  busy
                    ? "Mengunggah & mengirim…"
                    : "Kirim ke antrean Marketplace"
                }
                onPress={() => void submit()}
                disabled={busy}
              />
            </ScrollView>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modeRow: { gap: 6, paddingVertical: 9, paddingRight: 14 },
  mode: {
    minWidth: 78,
    minHeight: 54,
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    borderWidth: 1,
    borderColor: colors.sky100,
    borderRadius: 17,
    backgroundColor: colors.white,
  },
  activeMode: { borderColor: colors.sky400, backgroundColor: colors.sky50 },
  modeIcon: { fontSize: 20 },
  modeLabel: { color: colors.muted, fontSize: 10, fontWeight: "600" },
  activeModeLabel: { color: colors.sky600 },
  hero: {
    position: "relative",
    minHeight: 188,
    overflow: "hidden",
    justifyContent: "center",
    marginTop: 5,
    padding: 18,
    borderRadius: 23,
    backgroundColor: colors.sky600,
    ...shadow,
  },
  darkHero: { backgroundColor: "#173E61" },
  eventHero: { backgroundColor: "#7C5CAD" },
  pawDatingHero: { backgroundColor: colors.sky600 },
  heroKicker: {
    color: "rgba(255,255,255,.9)",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1.1,
  },
  heroTitle: {
    maxWidth: "72%",
    marginTop: 7,
    color: colors.white,
    fontSize: 23,
    lineHeight: 27,
    fontWeight: "700",
    letterSpacing: -0.6,
  },
  heroNote: {
    maxWidth: "73%",
    marginTop: 6,
    color: "rgba(255,255,255,.9)",
    fontSize: 11,
    lineHeight: 17,
  },
  heroEmoji: { position: "absolute", right: -5, bottom: 2, fontSize: 56 },
  consultFilters: {
    gap: 7,
    marginTop: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.sky100,
    borderRadius: 18,
    backgroundColor: colors.white,
  },
  consultDoctorFocus: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    marginBottom: 3,
    padding: 9,
    borderRadius: 14,
    backgroundColor: colors.sky50,
  },
  consultDoctorFocusIcon: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: colors.white,
  },
  consultDoctorFocusCopy: { minWidth: 0, flex: 1 },
  consultDoctorFocusLabel: {
    color: colors.sky600,
    fontSize: 8,
    fontWeight: "700",
    letterSpacing: 0.6,
  },
  consultDoctorFocusName: {
    marginTop: 2,
    color: colors.navy,
    fontSize: 12,
    fontWeight: "700",
  },
  consultDoctorFocusAll: {
    color: colors.sky600,
    fontSize: 9,
    fontWeight: "700",
  },
  consultFilterLabel: {
    color: colors.muted,
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  consultFilterRow: { gap: 7, paddingRight: 10 },
  consultFilterChip: {
    minHeight: 34,
    justifyContent: "center",
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.sky100,
    borderRadius: 11,
    backgroundColor: colors.white,
  },
  consultFilterChipActive: {
    borderColor: colors.sky400,
    backgroundColor: colors.sky50,
  },
  consultFilterChipText: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: "600",
  },
  consultFilterChipTextActive: { color: colors.sky600 },
  sectionHead: {
    minHeight: 65,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  eyebrow: {
    color: colors.muted,
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1,
  },
  sectionTitle: {
    marginTop: 3,
    color: colors.navy,
    fontSize: 17,
    fontWeight: "700",
  },
  create: {
    minHeight: 38,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 11,
    borderRadius: 12,
    backgroundColor: colors.sky600,
  },
  createText: { color: colors.white, fontSize: 11, fontWeight: "600" },
  list: { gap: 12 },
  petSpotGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 14,
    marginTop: 14,
  },
  hidden: { display: "none" },
  card: {
    overflow: "hidden",
    flexDirection: "row",
    minHeight: 132,
    borderWidth: 1,
    borderColor: colors.sky100,
    borderRadius: 22,
    backgroundColor: colors.white,
    ...shadow,
  },
  academyProgramCard: {
    minHeight: 0,
    flexDirection: "column",
    borderRadius: 20,
  },
  eventExperienceCard: {
    minHeight: 0,
    flexDirection: "column",
    borderRadius: 20,
  },
  visual: {
    position: "relative",
    width: 96,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.mint50,
  },
  academyProgramVisual: { width: "100%", height: 186 },
  eventExperienceVisual: {
    width: "100%",
    height: 190,
    backgroundColor: "#EFE9FA",
  },
  academyFeaturedBadge: {
    position: "absolute",
    left: 10,
    top: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 9,
    backgroundColor: "rgba(8,99,145,.92)",
  },
  academyFeaturedText: {
    color: colors.white,
    fontSize: 8,
    fontWeight: "700",
    letterSpacing: 0.7,
  },
  academyDiscountBadge: {
    position: "absolute",
    right: 10,
    top: 10,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 9,
    backgroundColor: "#F16F5A",
  },
  academyDiscountText: { color: colors.white, fontSize: 9, fontWeight: "700" },
  academyGalleryBadge: {
    position: "absolute",
    right: 10,
    bottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 99,
    backgroundColor: "rgba(7,35,57,.72)",
  },
  academyGalleryText: { color: colors.white, fontSize: 9, fontWeight: "700" },
  eventDateBadge: {
    position: "absolute",
    left: 10,
    bottom: 10,
    width: 48,
    height: 51,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,.95)",
  },
  eventDateDay: {
    color: "#62458F",
    fontSize: 20,
    lineHeight: 21,
    fontWeight: "700",
  },
  eventDateMonth: {
    color: "#7D6B94",
    fontSize: 8,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  eventCategoryBadge: {
    position: "absolute",
    left: 10,
    top: 10,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 9,
    backgroundColor: "rgba(47,32,72,.75)",
  },
  eventCategoryText: {
    color: colors.white,
    fontSize: 8,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  visualPeach: { backgroundColor: "#FFF0E5" },
  visualViolet: { backgroundColor: colors.violet50 },
  visualEmoji: { fontSize: 41 },
  live: {
    position: "absolute",
    left: 8,
    top: 8,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 7,
    backgroundColor: colors.red,
  },
  liveText: { color: colors.white, fontSize: 8, fontWeight: "600" },
  verified: {
    position: "absolute",
    left: 8,
    top: 8,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 7,
    backgroundColor: "rgba(255,255,255,.94)",
  },
  verifiedText: { color: "#8B5A18", fontSize: 8, fontWeight: "600" },
  cardCopy: { minWidth: 0, flex: 1, padding: 11 },
  cardKicker: { color: colors.sky600, fontSize: 9, fontWeight: "600" },
  cardTitle: {
    marginTop: 4,
    color: colors.navy,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: "700",
  },
  cardNote: { marginTop: 4, color: colors.muted, fontSize: 10, lineHeight: 15 },
  academyProgramStats: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
    marginTop: 10,
  },
  academyProgramStat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: "#F0F8FB",
  },
  academyProgramStatText: {
    color: colors.text,
    fontSize: 8,
    fontWeight: "600",
  },
  eventCardStats: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
    marginTop: 10,
  },
  eventCardStat: {
    minWidth: "29%",
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 6,
    borderRadius: 9,
    backgroundColor: "#F8F4FE",
  },
  eventCardStatText: {
    minWidth: 0,
    flex: 1,
    color: colors.text,
    fontSize: 8,
    fontWeight: "600",
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginTop: "auto",
  },
  eventPriceFooter: {
    marginTop: 16,
    paddingTop: 12,
    gap: 16,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  cardPrice: {
    minWidth: 0,
    flex: 1,
    color: colors.sky600,
    fontSize: 10,
    fontWeight: "700",
  },
  cardPriceBlock: {
    minWidth: 0,
    minHeight: 34,
    flex: 1,
    justifyContent: "center",
  },
  cardOriginalPrice: {
    marginBottom: 2,
    color: colors.muted,
    fontSize: 8,
    textDecorationLine: "line-through",
  },
  arrow: {
    width: 31,
    height: 31,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 11,
    backgroundColor: colors.sky600,
  },
  threadCard: {
    padding: 12,
    borderWidth: 1,
    borderColor: colors.sky100,
    borderRadius: 22,
    backgroundColor: colors.white,
    ...shadow,
  },
  author: { flexDirection: "row", alignItems: "center", gap: 9 },
  avatar: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 13,
    backgroundColor: colors.mint50,
  },
  authorCopy: { minWidth: 0, flex: 1 },
  authorName: { color: colors.navy, fontSize: 12, fontWeight: "700" },
  authorHandle: { marginTop: 2, color: colors.muted, fontSize: 9 },
  threadBody: {
    marginVertical: 10,
    color: colors.text,
    fontSize: 13,
    lineHeight: 19,
  },
  actions: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 22,
  },
  actionItem: {
    minWidth: 44,
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  actionText: { color: colors.muted, fontSize: 10 },
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(14,32,55,.42)",
  },
  sheetKeyboard: { flex: 1, justifyContent: "flex-end" },
  sheetWrap: { width: "100%", height: "92%", maxHeight: "92%" },
  sheet: {
    flex: 1,
    minHeight: 0,
    overflow: "hidden",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: colors.white,
  },
  sheetScroll: { flex: 1, minHeight: 0 },
  handle: {
    alignSelf: "center",
    width: 42,
    height: 5,
    marginTop: 9,
    marginBottom: 11,
    borderRadius: 3,
    backgroundColor: "#DCE5EB",
  },
  sheetClose: {
    position: "absolute",
    zIndex: 3,
    top: 15,
    right: 17,
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: colors.canvas,
  },
  sheetContent: { flexGrow: 1, paddingHorizontal: 16, paddingBottom: 48 },
  sheetHero: {
    height: 118,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
    backgroundColor: colors.sky50,
  },
  sheetGalleryBadge: {
    position: "absolute",
    right: 9,
    bottom: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: "rgba(8,33,49,.68)",
  },
  sheetGalleryBadgeText: {
    color: colors.white,
    fontSize: 8,
    fontWeight: "700",
  },
  worldImageViewer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(3,17,26,.96)",
  },
  worldImageViewerImage: { width: "100%", height: "78%" },
  worldImageViewerClose: {
    position: "absolute",
    zIndex: 2,
    top: 24,
    right: 24,
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,.24)",
    borderRadius: 17,
    backgroundColor: "rgba(7,35,57,.72)",
  },
  worldImageViewerControls: {
    position: "absolute",
    bottom: 24,
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,.12)",
  },
  worldImageViewerCount: {
    minWidth: 46,
    color: colors.white,
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
  },
  sheetHeroText: { fontSize: 54 },
  sheetKicker: {
    marginTop: 13,
    color: colors.sky600,
    fontSize: 9,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  sheetTitle: {
    marginTop: 5,
    color: colors.navy,
    fontSize: 21,
    lineHeight: 26,
    fontWeight: "700",
    letterSpacing: -0.4,
  },
  sheetNote: {
    marginTop: 6,
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
  },
  worldPromoPrice: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 13,
    padding: 13,
    borderWidth: 1,
    borderColor: "#CFEAF5",
    borderRadius: 15,
    backgroundColor: "#F0FAFE",
  },
  worldPromoPriceCopy: { minWidth: 0, flex: 1 },
  worldPromoLabel: {
    color: "#D55443",
    fontSize: 8,
    fontWeight: "700",
    letterSpacing: 0.7,
  },
  worldPromoOriginal: {
    marginTop: 4,
    color: colors.muted,
    fontSize: 9,
    textDecorationLine: "line-through",
  },
  worldPromoFinal: {
    marginTop: 1,
    color: colors.sky600,
    fontSize: 19,
    fontWeight: "700",
  },
  worldPromoSaving: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 7,
    borderRadius: 9,
    backgroundColor: "#E8F8F2",
  },
  worldPromoSavingText: { color: "#128464", fontSize: 8, fontWeight: "700" },
  academySocialSummary: {
    flexDirection: "row",
    alignItems: "stretch",
    marginTop: 10,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: colors.sky100,
    borderRadius: 15,
    backgroundColor: colors.white,
  },
  academySocialItem: {
    minWidth: 0,
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 4,
  },
  academySocialValue: {
    color: colors.navy,
    fontSize: 11,
    fontWeight: "700",
    textAlign: "center",
  },
  academySocialLabel: {
    marginTop: 3,
    color: colors.muted,
    fontSize: 7,
    textAlign: "center",
  },
  academySocialDivider: { width: 1, backgroundColor: colors.line },
  eventSocialSummary: { flexDirection: "row", gap: 8, marginTop: 12 },
  eventSocialItem: {
    minWidth: 0,
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: "#E4DCF3",
    borderRadius: 13,
    backgroundColor: "#FBF9FF",
  },
  eventSocialValue: {
    color: "#513477",
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
  },
  eventSocialLabel: {
    marginTop: 3,
    color: colors.muted,
    fontSize: 7,
    textAlign: "center",
  },
  details: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 9,
    marginVertical: 12,
  },
  detail: {
    minWidth: "46%",
    flex: 1,
    padding: 10,
    borderRadius: 13,
    backgroundColor: colors.canvas,
  },
  detailLabel: { color: colors.muted, fontSize: 9, lineHeight: 14 },
  detailValue: {
    marginTop: 5,
    color: colors.navy,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: "600",
  },
  housingList: { gap: 10 },
  housingCard: {
    flexDirection: "row",
    gap: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 14,
    backgroundColor: colors.white,
  },
  housingCardSelected: { borderColor: colors.sky600, borderWidth: 2 },
  housingCardBusy: { opacity: 0.48 },
  housingPhoto: { width: 90, height: 100, borderRadius: 10 },
  housingCardBody: { flex: 1, gap: 5 },
  housingAmenities: { color: colors.sky600, fontSize: 11 },
  housingPrice: { color: colors.navy, fontSize: 15, fontWeight: "700" },
  housingQuote: {
    gap: 7,
    padding: 13,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.sky100,
    backgroundColor: colors.white,
  },
  petSpotReservation: {
    gap: 11,
    marginBottom: 14,
    padding: 13,
    borderWidth: 1,
    borderColor: colors.sky100,
    borderRadius: 18,
    backgroundColor: "#F7FCFF",
  },
  petSpotReservationHead: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },
  depositBadge: {
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 9,
    backgroundColor: "#FFF0D8",
  },
  depositBadgeText: { color: "#9A5B08", fontSize: 9, fontWeight: "700" },
  counterRow: { flexDirection: "row", gap: 9 },
  counterCard: {
    flex: 1,
    gap: 7,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 13,
    backgroundColor: colors.white,
  },
  counterControl: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  counterButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    backgroundColor: colors.sky50,
  },
  counterValue: { color: colors.navy, fontSize: 15, fontWeight: "700" },
  checkAvailability: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    borderRadius: 12,
    backgroundColor: colors.sky600,
  },
  checkAvailabilityText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: "700",
  },
  layoutLegend: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  layoutLegendAvailable: { color: "#128464", fontSize: 9 },
  layoutLegendReserved: { color: "#C55454", fontSize: 9 },
  layoutLegendSelected: { color: colors.sky600, fontSize: 9 },
  petSpotLayout: {
    position: "relative",
    minHeight: 270,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#D8E6ED",
    borderRadius: 16,
    backgroundColor: colors.white,
  },
  layoutDoor: {
    position: "absolute",
    bottom: 0,
    left: "39%",
    width: "22%",
    paddingVertical: 4,
    borderTopLeftRadius: 7,
    borderTopRightRadius: 7,
    backgroundColor: "#DCE8EE",
  },
  layoutDoorText: {
    color: colors.muted,
    fontSize: 8,
    fontWeight: "700",
    textAlign: "center",
  },
  layoutResource: {
    position: "absolute",
    width: 58,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    padding: 5,
    borderWidth: 2,
    borderColor: "#9ED9C5",
    borderRadius: 10,
    backgroundColor: "#EAF8F2",
  },
  layoutResourceRound: { width: 54, height: 54, borderRadius: 27 },
  layoutResourceReserved: {
    borderColor: "#E6B5B5",
    backgroundColor: "#FFF0F0",
    opacity: 0.7,
  },
  layoutResourceSelected: {
    borderColor: colors.sky600,
    backgroundColor: colors.sky600,
    ...shadow,
  },
  layoutResourceCode: { color: "#25695F", fontSize: 10, fontWeight: "700" },
  layoutResourceCodeActive: { color: colors.white },
  layoutResourceCapacity: { color: colors.muted, fontSize: 8 },
  layoutEmpty: {
    position: "absolute",
    inset: 0,
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  selectedResourceCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    padding: 11,
    borderRadius: 13,
    backgroundColor: "#EAF8F2",
  },
  depositNotice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 11,
    borderRadius: 13,
    backgroundColor: colors.sky50,
  },
  depositNoticeText: {
    flex: 1,
    color: colors.text,
    fontSize: 10,
    lineHeight: 16,
  },
  welfareNote: {
    marginBottom: 14,
    padding: 13,
    borderRadius: 13,
    backgroundColor: "#EDF8F4",
  },
  welfareTitleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  welfareTitle: { color: "#25695F", fontSize: 12, fontWeight: "700" },
  welfareText: { marginTop: 5, color: "#5F756F", fontSize: 11, lineHeight: 17 },
  formSection: {
    gap: 9,
    marginBottom: 9,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 16,
    backgroundColor: colors.canvas,
  },
  formTitle: { color: colors.navy, fontSize: 15, fontWeight: "700" },
  formNote: { color: colors.muted, fontSize: 10, lineHeight: 15 },
  formField: { gap: 6 },
  formLabel: {
    color: colors.text,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "600",
  },
  formInput: {
    minHeight: 44,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    backgroundColor: colors.white,
    color: colors.text,
    fontSize: 13,
  },
  formTextarea: {
    minHeight: 88,
    paddingTop: 12,
    paddingBottom: 12,
    textAlignVertical: "top",
  },
  choiceRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  choice: {
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 13,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    backgroundColor: colors.white,
  },
  choiceActive: {
    borderColor: colors.sky500,
    backgroundColor: colors.sky50,
  },
  choiceText: { color: colors.muted, fontSize: 12, fontWeight: "600" },
  choiceTextActive: { color: colors.sky600 },
  trainerSlotGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  trainerSlot: {
    width: "48%",
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 9,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    backgroundColor: colors.white,
  },
  availabilityEmpty: {
    padding: 10,
    borderRadius: 10,
    backgroundColor: "#FFF8DC",
    color: "#91630E",
    fontSize: 10,
    lineHeight: 15,
  },
  petSummary: {
    minHeight: 62,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 11,
    borderRadius: 13,
    backgroundColor: colors.white,
  },
  petSummaryIcon: {
    width: 40,
    height: 40,
    overflow: "hidden",
    borderRadius: 12,
    backgroundColor: colors.sky50,
    fontSize: 24,
    lineHeight: 40,
    textAlign: "center",
  },
  petSummaryCopy: { minWidth: 0, flex: 1 },
  petSummaryName: {
    marginTop: 3,
    color: colors.navy,
    fontSize: 14,
    fontWeight: "700",
  },
  requirements: { gap: 7, marginTop: 3 },
  requirement: {
    padding: 10,
    borderRadius: 10,
    backgroundColor: colors.white,
    color: colors.text,
    fontSize: 12,
    lineHeight: 18,
  },
  composer: { flex: 1, padding: 16, backgroundColor: colors.white },
  composerHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
  },
  composerTitle: {
    marginTop: 4,
    color: colors.navy,
    fontSize: 21,
    lineHeight: 26,
    fontWeight: "700",
  },
  input: {
    minHeight: 160,
    marginTop: 17,
    padding: 13,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 16,
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
    textAlignVertical: "top",
  },
  counter: {
    marginVertical: 8,
    color: colors.muted,
    fontSize: 12,
    textAlign: "right",
  },
  swipeExperience: { marginBottom: 20 },
  swipeGuide: {
    marginBottom: 10,
    color: colors.muted,
    fontSize: 10,
    fontWeight: "600",
    textAlign: "center",
  },
  swipeStage: { height: 426, position: "relative" },
  swipeCardActive: { position: "absolute", inset: 0, zIndex: 2 },
  swipeCardNext: {
    position: "absolute",
    inset: 0,
    opacity: 0.55,
    transform: [{ scale: 0.95 }, { translateY: 13 }],
  },
  swipeCard: {
    overflow: "hidden",
    height: 416,
    borderWidth: 1,
    borderColor: colors.sky100,
    borderRadius: 24,
    backgroundColor: colors.white,
    ...shadow,
  },
  swipeVisual: {
    height: 238,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.sky50,
  },
  swipePhoto: { width: "100%", height: "100%" },
  swipeVerified: {
    position: "absolute",
    left: 12,
    top: 12,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 9,
    backgroundColor: "rgba(255,255,255,.93)",
  },
  swipeVerifiedText: { color: colors.sky600, fontSize: 9, fontWeight: "700" },
  swipeCopy: { flex: 1, padding: 15 },
  swipeTitleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },
  swipeName: { color: colors.navy, fontSize: 23, fontWeight: "700" },
  swipeMeta: { marginTop: 3, color: colors.muted, fontSize: 11 },
  swipeDistance: {
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colors.mint50,
    color: "#176D5C",
    fontSize: 10,
    fontWeight: "700",
  },
  swipeDescription: {
    marginTop: 9,
    color: colors.muted,
    fontSize: 11,
    lineHeight: 17,
  },
  swipeDetail: {
    minHeight: 43,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: "auto",
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: colors.sky50,
  },
  swipeDetailText: { color: colors.sky600, fontSize: 11, fontWeight: "700" },
  swipeStamp: {
    position: "absolute",
    top: 58,
    zIndex: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 3,
    borderRadius: 9,
    backgroundColor: "rgba(255,255,255,.9)",
    fontSize: 24,
    fontWeight: "700",
    letterSpacing: 2,
  },
  swipeLikeStamp: {
    left: 20,
    borderColor: "#128464",
    color: "#128464",
    transform: [{ rotate: "-10deg" }],
  },
  swipePassStamp: {
    right: 20,
    borderColor: "#C94B4B",
    color: "#C94B4B",
    transform: [{ rotate: "10deg" }],
  },
  swipeButtons: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 18,
    marginTop: 13,
  },
  swipeButton: {
    width: 58,
    height: 58,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: 29,
    backgroundColor: colors.white,
    ...shadow,
  },
  swipePassButton: { borderColor: "#F2C7C7" },
  swipeLikeButton: { borderColor: "#BFE3D8" },
  swipeDetailButton: {
    minHeight: 42,
    justifyContent: "center",
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: colors.sky100,
    borderRadius: 21,
    backgroundColor: colors.white,
  },
  swipeDetailButtonText: {
    color: colors.sky600,
    fontSize: 11,
    fontWeight: "700",
  },
  ownerDetail: { flexBasis: "100%" },
  ownerNote: { marginTop: 3, color: colors.muted, fontSize: 9 },
  createModalBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(14,32,55,.42)",
  },
  createModalSafe: { maxHeight: "94%" },
  createModalSheet: {
    maxHeight: "100%",
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    backgroundColor: colors.white,
  },
  createModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  createModalTitle: {
    marginTop: 4,
    color: colors.navy,
    fontSize: 21,
    fontWeight: "700",
  },
  sheetCloseInline: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: colors.canvas,
  },
  createModalContent: { gap: 12, padding: 16, paddingBottom: 28 },
  dateRow: { flexDirection: "row", gap: 9 },
  dateField: { flex: 1 },
  vaccinePicker: {
    minHeight: 78,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    padding: 11,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.sky400,
    borderRadius: 13,
    backgroundColor: colors.white,
  },
  vaccinePreview: { width: 54, height: 54, borderRadius: 10 },
  vaccinePickerCopy: { flex: 1 },
  vaccinePickerTitle: { color: colors.navy, fontSize: 12, fontWeight: "700" },
  eventSection: {
    gap: 12,
    marginTop: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.sky100,
    borderRadius: 18,
    backgroundColor: colors.sky50,
  },
  eventHost: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 10,
    borderRadius: 13,
    backgroundColor: colors.white,
  },
  eventHostIcon: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 11,
    backgroundColor: colors.sky600,
  },
  eventPetGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  eventPetCard: {
    position: "relative",
    width: "31%",
    minHeight: 94,
    alignItems: "center",
    justifyContent: "center",
    padding: 9,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 14,
    backgroundColor: colors.white,
  },
  eventPetCardActive: {
    borderColor: colors.sky400,
    backgroundColor: "#EAF8FE",
  },
  eventPetIcon: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: colors.sky50,
  },
  eventPetName: {
    marginTop: 4,
    color: colors.navy,
    fontSize: 11,
    fontWeight: "700",
  },
  eventPetCheck: { position: "absolute", right: 6, top: 6 },
  eventPetEmpty: {
    padding: 11,
    borderRadius: 11,
    color: "#A15D20",
    backgroundColor: "#FFF5E7",
    fontSize: 11,
  },
  eventTicketSummary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 13,
    borderRadius: 13,
    backgroundColor: colors.white,
  },
  eventTicketPrice: {
    color: colors.sky600,
    fontSize: 18,
    fontWeight: "700",
  },
  eventQris: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.sky100,
    borderRadius: 13,
    backgroundColor: colors.white,
  },
  pawMatchSection: {
    marginBottom: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "#D8EAF3",
    borderRadius: 18,
    backgroundColor: "#F7FCFF",
    gap: 10,
  },
  pawMatchHeading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  pawMatchKicker: {
    color: colors.sky600,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
  },
  pawMatchTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
    marginTop: 3,
  },
  pawMatchCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 11,
    borderRadius: 14,
    backgroundColor: colors.white,
  },
  pawMatchIcon: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 13,
    backgroundColor: "#EAF7FC",
  },
  pawMatchCopy: { flex: 1, minWidth: 0 },
  pawMatchNames: { color: colors.text, fontSize: 13, fontWeight: "700" },
  pawMatchStatus: {
    color: colors.muted,
    fontSize: 10,
    lineHeight: 15,
    marginTop: 2,
  },
  pawMatchPrimary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    minHeight: 38,
    paddingHorizontal: 11,
    borderRadius: 12,
    backgroundColor: colors.sky600,
  },
  pawMatchPrimaryText: { color: colors.white, fontSize: 10, fontWeight: "700" },
  pawMatchActions: { flexDirection: "row", gap: 6 },
  pawMatchAccept: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "#128464",
  },
  pawMatchDecline: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "#EEF3F6",
  },
  academyTrainerSection: {
    marginBottom: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "#D8EAF3",
    borderRadius: 18,
    backgroundColor: "#F8FDFF",
    gap: 11,
  },
  academyTrainerHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  academyTrainerKicker: {
    color: colors.sky600,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
  },
  academyTrainerTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
    marginTop: 3,
  },
  academyRailWrap: { position: "relative", minWidth: 0 },
  academySpeciesRow: { gap: 7, paddingRight: 50 },
  academySpeciesChoice: {
    minHeight: 48,
    justifyContent: "center",
    paddingHorizontal: 9,
  },
  academyRailNext: {
    position: "absolute",
    zIndex: 3,
    right: 2,
    top: "50%",
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -20,
    borderWidth: 1,
    borderColor: "#CAE5F1",
    borderRadius: 14,
    backgroundColor: colors.white,
    ...shadow,
  },
  academyTrainerRow: { gap: 10, paddingRight: 50 },
  academyTrainerCard: {
    padding: 12,
    borderWidth: 1,
    borderColor: "#DCEAF1",
    borderRadius: 15,
    backgroundColor: colors.white,
  },
  academyTrainerAvatar: {
    width: 48,
    height: 48,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 15,
    backgroundColor: colors.sky600,
    marginBottom: 9,
  },
  academyTrainerInitial: {
    color: colors.white,
    fontSize: 20,
    fontWeight: "700",
  },
  academyTrainerName: { color: colors.text, fontSize: 12, fontWeight: "700" },
  academyTrainerMeta: { color: "#A66A00", fontSize: 9, marginTop: 3 },
  academyTrainerSpecialty: { color: colors.muted, fontSize: 9, marginTop: 4 },
  academyTrainerDetail: {
    color: colors.sky600,
    fontSize: 9,
    fontWeight: "700",
    marginTop: 8,
  },
  academyBookingSection: {
    gap: 10,
    marginTop: 4,
    padding: 13,
    borderRadius: 16,
    backgroundColor: "#F7FCFF",
  },
  academyDetailTrainerRow: { gap: 8, paddingVertical: 2 },
  academyDetailTrainer: {
    width: 140,
    padding: 10,
    borderWidth: 1,
    borderColor: "#D8EAF3",
    borderRadius: 14,
    backgroundColor: colors.white,
  },
  academyDetailTrainerAvatar: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderRadius: 13,
    backgroundColor: colors.sky600,
    marginBottom: 7,
  },
  academyScheduleList: { gap: 8 },
  academySchedule: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#D7E7EF",
    borderRadius: 14,
    backgroundColor: colors.white,
  },
  academyScheduleActive: {
    borderColor: colors.sky600,
    backgroundColor: "#EDF9FE",
  },
  academyScheduleDisabled: { opacity: 0.48 },
  academyScheduleDate: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "#E6F6FC",
  },
  academyScheduleCopy: { flex: 1, minWidth: 0 },
  academyScheduleTitle: { color: colors.text, fontSize: 11, fontWeight: "700" },
  academyScheduleMeta: { color: colors.muted, fontSize: 9, marginTop: 2 },
  academyScheduleSeats: {
    color: "#128464",
    fontSize: 9,
    fontWeight: "700",
    marginTop: 3,
  },
  academyEmptySchedule: {
    color: "#A15D20",
    fontSize: 10,
    padding: 11,
    borderRadius: 11,
    backgroundColor: "#FFF5E7",
  },
  academyReviewSection: {
    gap: 11,
    marginTop: 8,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: "#DCEAF1",
  },
  academyReviewHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  academyReviewCount: {
    minWidth: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 11,
    backgroundColor: "#E7F7FD",
  },
  academyReviewCountText: {
    color: colors.sky600,
    fontSize: 11,
    fontWeight: "700",
  },
  academyReviewList: { gap: 8 },
  academyReviewCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 9,
    padding: 11,
    borderWidth: 1,
    borderColor: "#DFEBF1",
    borderRadius: 14,
    backgroundColor: colors.white,
  },
  academyReviewerAvatar: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "#DBF2FB",
  },
  academyReviewerInitial: {
    color: colors.sky600,
    fontSize: 14,
    fontWeight: "700",
  },
  academyReviewCopy: { minWidth: 0, flex: 1 },
  academyReviewerRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
  },
  academyReviewerName: { color: colors.navy, fontSize: 10, fontWeight: "700" },
  academyVerifiedReview: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 5,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: "#E8F8F2",
  },
  academyVerifiedReviewText: {
    color: "#128464",
    fontSize: 7,
    fontWeight: "700",
  },
  academyReviewStars: {
    marginTop: 3,
    color: "#E6A51C",
    fontSize: 10,
    letterSpacing: 0.5,
  },
  academyReviewComment: {
    marginTop: 5,
    color: colors.text,
    fontSize: 10,
    lineHeight: 16,
  },
  academyReviewMeta: { marginTop: 5, color: colors.muted, fontSize: 8 },
  academyEmptyReview: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    padding: 11,
    borderRadius: 13,
    backgroundColor: "#EEF9FD",
  },
  academyEmptyReviewText: {
    minWidth: 0,
    flex: 1,
    color: colors.muted,
    fontSize: 9,
    lineHeight: 14,
  },
  academyReviewComposer: {
    gap: 8,
    padding: 11,
    borderWidth: 1,
    borderColor: "#D7EAF3",
    borderRadius: 15,
    backgroundColor: colors.white,
  },
  academyRatingRow: { flexDirection: "row", gap: 3 },
  academyRatingButton: {
    width: 33,
    height: 33,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    backgroundColor: "#FFF9E9",
  },
  academyReviewInput: {
    minHeight: 92,
    maxHeight: 150,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#D7E5EC",
    borderRadius: 13,
    color: colors.text,
    fontSize: 11,
    lineHeight: 17,
    textAlignVertical: "top",
    backgroundColor: "#FAFCFD",
  },
  academyReviewSubmit: {
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    borderRadius: 12,
    backgroundColor: colors.sky600,
  },
  academyReviewSubmitDisabled: { opacity: 0.42 },
  academyReviewSubmitText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: "700",
  },
  academyReviewRule: {
    color: colors.muted,
    fontSize: 8,
    lineHeight: 12,
    textAlign: "center",
  },
  pawChatBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(14,32,55,.45)",
  },
  pawChatSheet: {
    height: "88%",
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    backgroundColor: colors.white,
    overflow: "hidden",
  },
  pawChatHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: colors.sky100,
  },
  pawChatHeart: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: "#FFF0F4",
  },
  pawChatHeaderCopy: { flex: 1, minWidth: 0 },
  pawChatKicker: {
    color: "#C8476C",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1,
  },
  pawChatTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "700",
    marginTop: 3,
  },
  pawChatClose: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "#EEF5F8",
  },
  pawChatSafety: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    margin: 12,
    padding: 10,
    borderRadius: 12,
    backgroundColor: "#ECFAF5",
  },
  pawChatSafetyText: { flex: 1, color: "#28705D", fontSize: 9, lineHeight: 14 },
  pawChatMessages: { flex: 1 },
  pawChatMessagesContent: {
    flexGrow: 1,
    justifyContent: "flex-end",
    gap: 9,
    padding: 14,
  },
  pawChatEmpty: {
    alignSelf: "center",
    color: colors.muted,
    fontSize: 11,
    textAlign: "center",
    marginVertical: 30,
  },
  pawChatBubble: {
    alignSelf: "flex-start",
    maxWidth: "82%",
    padding: 11,
    borderRadius: 15,
    borderBottomLeftRadius: 5,
    backgroundColor: "#EEF5F8",
  },
  pawChatBubbleMine: {
    alignSelf: "flex-end",
    borderBottomLeftRadius: 15,
    borderBottomRightRadius: 5,
    backgroundColor: colors.sky600,
  },
  pawChatSender: {
    color: colors.sky600,
    fontSize: 8,
    fontWeight: "700",
    marginBottom: 3,
  },
  pawChatSenderMine: { color: "#D9F4FF" },
  pawChatBody: { color: colors.text, fontSize: 12, lineHeight: 18 },
  pawChatBodyMine: { color: colors.white },
  pawChatTime: {
    color: colors.muted,
    fontSize: 7,
    marginTop: 4,
    textAlign: "right",
  },
  pawChatTimeMine: { color: "#D9F4FF" },
  pawChatComposer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: colors.sky100,
    backgroundColor: colors.white,
  },
  pawChatInput: {
    flex: 1,
    maxHeight: 96,
    minHeight: 44,
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#D5E5ED",
    borderRadius: 15,
    color: colors.text,
    fontSize: 12,
    backgroundColor: "#F9FCFD",
  },
  pawChatSend: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: colors.sky600,
  },
  pawChatSendDisabled: { opacity: 0.42 },
  trainerSheetWrap: { width: "100%", height: "86%", maxHeight: "86%" },
  trainerSheet: {
    flex: 1,
    minHeight: 0,
    overflow: "hidden",
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    backgroundColor: colors.white,
  },
  trainerSheetScroll: { flex: 1, minHeight: 0 },
  trainerSheetContent: { flexGrow: 1, padding: 18, paddingBottom: 48 },
  trainerProfileTop: { alignItems: "center", paddingTop: 10 },
  trainerProfilePhoto: {
    width: 92,
    height: 92,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderRadius: 28,
    backgroundColor: colors.sky600,
    marginBottom: 12,
  },
  trainerProfileInitial: {
    color: colors.white,
    fontSize: 38,
    fontWeight: "700",
  },
  trainerProfileName: {
    color: colors.text,
    fontSize: 23,
    fontWeight: "700",
    marginTop: 5,
  },
  trainerProfileAcademy: { color: colors.muted, fontSize: 11, marginTop: 3 },
  trainerProfileRating: { color: "#A66A00", fontSize: 10, marginTop: 6 },
  trainerProfileBio: {
    color: colors.muted,
    fontSize: 11,
    lineHeight: 18,
    marginVertical: 16,
  },
  trainerProfileFacts: { gap: 8 },
  trainerPrograms: { gap: 8, marginTop: 18 },
  trainerProgramRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.sky100,
    borderRadius: 13,
  },
  trainerProgramName: { color: colors.text, fontSize: 11, fontWeight: "700" },
  trainerProgramPrice: {
    color: colors.sky600,
    fontSize: 11,
    fontWeight: "700",
  },
});
