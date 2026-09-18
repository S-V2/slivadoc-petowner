import { useEffect, useRef, useState } from "react";
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
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import {
  applyMobileAdoption,
  createMobilePetSpotReservation,
  createMobilePawDatingHealthReport,
  createMobilePawDatingProfile,
  createMobileConsultation,
  createMobileDocumentRequest,
  createMobilePaymentIntent,
  enrollMobileAcademy,
  getMobileAcademy,
  getMobileAdoptions,
  getMobileConsultationPlans,
  getMobileDocumentProducts,
  getMobileEvents,
  getMobileMyPawDatingProfiles,
  getMobilePawDatingProfile,
  getMobilePawDatingProfiles,
  getMobilePetSpots,
  getMobilePetSpotAvailability,
  passMobilePawDatingProfile,
  registerMobileEvent,
  sendMobilePawDatingInterest,
  submitMobilePawDatingProfile,
  trackMobileAcademyProgramClick,
  type MobileOwner,
  type MobilePaymentIntent,
  type MobilePetSpotResource,
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
  MobileBatpayModal,
  MobilePaymentMethods,
} from "../components/BatpayPayment";
import { PetHubExperience } from "./PetHubExperience";

type Mode =
  | "pawdating"
  | "academy"
  | "events"
  | "petspot"
  | "pethub"
  | "consult"
  | "adoption"
  | "documents";
type WorldPet = { id: string; name: string; breed: string };
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
  guestCount: number;
  petCount: number;
  specialRequest: string;
};

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
): PetSpotReservationForm => {
  const target = new Date();
  target.setDate(target.getDate() + 1);
  target.setHours(18, 0, 0, 0);
  return {
    date: target.toISOString().slice(0, 10),
    time: "18:00",
    durationMinutes: slotMinutes,
    guestCount: 2,
    petCount: 1,
    specialRequest: "",
  };
};
const petSpotWindow = (form: PetSpotReservationForm) => {
  const starts = new Date(`${form.date}T${form.time}:00`);
  const ends = new Date(starts.getTime() + form.durationMinutes * 60_000);
  if (Number.isNaN(starts.getTime()) || Number.isNaN(ends.getTime()))
    throw new Error("Tanggal atau jam reservasi belum valid");
  return { startsAt: starts.toISOString(), endsAt: ends.toISOString() };
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
    return item?.category === "cafe"
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
  hasPet,
  onLogin,
  onRequirePet,
  intent,
}: {
  refreshVersion: number;
  onAction: (message: string) => void;
  onOpenNotifications: () => void;
  owner?: MobileOwner;
  petName?: string;
  pet?: WorldPet;
  hasPet: boolean;
  onLogin: () => void;
  onRequirePet: () => void;
  intent?: { token: number; mode: "consult"; itemId?: string };
}) {
  const { formatCurrency, formatDate, formatNumber } = useI18n();
  const money = (value?: number) => formatCurrency(value ?? 0);
  const when = (value?: string) =>
    value
      ? formatDate(value, { dateStyle: "medium", timeStyle: "short" })
      : "Segera";
  const [mode, setMode] = useState<Mode>(intent?.mode ?? "academy");
  const [items, setItems] = useState<Record<Mode, WorldItem[]>>(emptyWorld);
  const [selected, setSelected] = useState<WorldItem | null>(null);
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  }>();
  const [pawDatingCreateOpen, setPawDatingCreateOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("qris");
  const [payment, setPayment] = useState<MobilePaymentIntent>();
  const [petSpotForm, setPetSpotForm] = useState<PetSpotReservationForm>(
    emptyPetSpotReservationForm,
  );
  const [petSpotResources, setPetSpotResources] = useState<
    MobilePetSpotResource[]
  >([]);
  const [selectedPetSpotResource, setSelectedPetSpotResource] =
    useState<MobilePetSpotResource>();
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [adoptionForm, setAdoptionForm] =
    useState<AdoptionForm>(emptyAdoptionForm);
  const [documentForm, setDocumentForm] =
    useState<DocumentForm>(emptyDocumentForm);
  const handledIntent = useRef(0);
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
            adoption,
            documents,
          ]) => {
            if (!current) return;
            setItems({
              pawdating:
                pawdating.status === "fulfilled" ? pawdating.value.data : [],
              academy: academy.status === "fulfilled" ? academy.value.data : [],
              events: events.status === "fulfilled" ? events.value.data : [],
              petspot: spots.status === "fulfilled" ? spots.value.data : [],
              pethub: [],
              consult: consult.status === "fulfilled" ? consult.value.data : [],
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
  useEffect(() => {
    if (!intent || loading || handledIntent.current === intent.token) return;
    queueMicrotask(() => {
      handledIntent.current = intent.token;
      setMode("consult");
      if (!intent.itemId) {
        setSelected(null);
        return;
      }
      const plan = items.consult.find((item) => item.id === intent.itemId);
      if (!plan) {
        setSelected(null);
        onAction("Paket konsultasi sebelumnya sudah tidak tersedia");
        return;
      }
      setSelected(plan);
    });
  }, [intent, items.consult, loading, onAction]);
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
    setSelectedPetSpotResource(undefined);
    try {
      const window = petSpotWindow(form);
      const result = await getMobilePetSpotAvailability(
        spot.id,
        window.startsAt,
        window.endsAt,
        form.guestCount,
      );
      setPetSpotResources(result.data);
      setSelectedPetSpotResource(
        result.data.find((resource) => resource.available),
      );
    } catch (cause) {
      setPetSpotResources([]);
      onAction(
        cause instanceof Error
          ? cause.message
          : "Ketersediaan meja atau unit belum dapat dimuat",
      );
    } finally {
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
    if (mode === "documents") setDocumentForm(emptyDocumentForm());
    if (mode === "petspot" && item.reservable) {
      const form = emptyPetSpotReservationForm(
        item.reservation_policy?.slot_minutes ?? 90,
      );
      setPetSpotForm(form);
      setPetSpotResources([]);
      setSelectedPetSpotResource(undefined);
      void loadPetSpotAvailability(item, form);
    }
    setSelected(item);
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
    if (
      mode === "petspot" &&
      selected.reservable &&
      !selectedPetSpotResource
    ) {
      onAction("Pilih meja atau unit yang masih tersedia");
      return;
    }
    if (mode === "petspot" && selected.reservable && !owner?.phone?.trim()) {
      onAction("Lengkapi nomor telepon di profil sebelum membuat reservasi");
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
          petName || "Pet",
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
        const source = await registerMobileEvent(
          selected.id,
          owner!.full_name,
          owner!.email,
        );
        if (source.amount > 0)
          setPayment(
            await createMobilePaymentIntent(
              "event_registration",
              source.id,
              paymentMethod,
            ),
          );
        else onAction("Tiket event gratis berhasil dibuat");
      } else if (mode === "consult") {
        const source = await createMobileConsultation(
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
          submitted_documents: [],
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
      } else {
        onAction(
          selected.status === "live"
            ? "Live PetHub dibuka"
            : "Pengingat PetHub diaktifkan",
        );
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
      note: "Cafe, mall, taman, dan playground yang pet friendly.",
      icon: "leaf-outline",
    },
    pethub: {
      kicker: "PETHUB LIVE & THREAD",
      title: "Satu layar untuk dunia pet.",
      note: "Live streaming, story, komentar, channel, dan pet thread.",
      icon: "play-circle-outline",
    },
    consult: {
      kicker: "VIRTUAL VET",
      title: "Dokter sedekat layar kamu.",
      note: "Chat, voice, video call, bundling, dan medical record.",
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
              onPress={() => setMode(item.id)}
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
              onPress={() => setMode(item.id)}
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
        {loading ? (
          <Text style={styles.cardNote}>Memuat informasi terbaru…</Text>
        ) : busy ? (
          <Text style={styles.cardNote}>Memproses permintaan…</Text>
        ) : items[mode].length === 0 ? (
          <Text style={styles.cardNote}>Belum ada data pada kategori ini.</Text>
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
          ) : (
            <Pressable
              onPress={() =>
                onAction(
                  mode === "petspot"
                    ? "Lokasi perangkat digunakan untuk mengurutkan PetSpot"
                    : "Filter dibuka",
                )
              }
            >
              <Ionicons
                name={mode === "petspot" ? "navigate" : "options"}
                size={20}
                color={colors.sky600}
              />
            </Pressable>
          )}
        </View>
        {mode === "pawdating" && items.pawdating.length > 0 ? (
          <MobilePawDatingDeck
            profiles={items.pawdating}
            busy={busy}
            onDetail={(item) => void openItem(item)}
            onSwipe={(item, decision) => void swipePawDating(item, decision)}
          />
        ) : (
          <View style={styles.list}>
            {items[mode].map((item, index) => (
              <Pressable
                key={item.id}
                onPress={() => openItem(item)}
                style={styles.card}
              >
                <View
                  style={[
                    styles.visual,
                    index % 3 === 1 && styles.visualPeach,
                    index % 3 === 2 && styles.visualViolet,
                  ]}
                >
                  <Ionicons
                    name={worldIcon(mode, item)}
                    size={38}
                    color={colors.sky600}
                  />
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
                          : mode === "petspot"
                            ? `★ ${item.rating} · ${item.distance_km ?? "—"} km`
                            : mode === "consult"
                              ? `${item.duration_minutes ?? "—"} menit · dokter terverifikasi`
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
                      : item.description}
                  </Text>
                  <View style={styles.cardFooter}>
                    <Text style={styles.cardPrice}>
                      {mode === "pawdating"
                        ? `✓ ${item.eligibility_status === "eligible" ? "Verified eligible" : "Conditional"}`
                        : mode === "academy"
                          ? money(item.price)
                          : mode === "events"
                            ? item.price
                              ? money(item.price)
                              : "Gratis"
                            : mode === "petspot"
                              ? item.city
                              : mode === "consult"
                                ? money(item.total_fee ?? item.price)
                                : mode === "adoption"
                                  ? `${item.breed || "Pet"} · ${item.vaccinated ? "Vaksin lengkap" : "Vaksin diproses"}`
                                  : mode === "documents"
                                    ? money(item.total_fee ?? item.price)
                                    : item.channel_name}
                    </Text>
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
      </Screen>
      <Modal
        visible={!!selected}
        transparent
        animationType="slide"
        onRequestClose={() => setSelected(null)}
      >
        <Pressable style={styles.backdrop} onPress={() => setSelected(null)}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.sheetKeyboard}
          >
            <SafeAreaView style={styles.sheetWrap}>
              <Pressable
                style={styles.sheet}
                onPress={(event) => event.stopPropagation()}
              >
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
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.sheetContent}
                >
                  <View style={styles.sheetHero}>
                    <Ionicons
                      name={worldIcon(mode, selected)}
                      size={48}
                      color={colors.sky600}
                    />
                  </View>
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
                  <View style={styles.details}>
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
                  {mode === "petspot" && selected?.reservable ? (
                    <View style={styles.petSpotReservation}>
                      <View style={styles.petSpotReservationHead}>
                        <View>
                          <Text style={styles.formTitle}>Reservasi PetSpot</Text>
                          <Text style={styles.formNote}>
                            Pilih jadwal lalu lihat meja atau unit yang tersedia.
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
                            label="Tanggal"
                            value={petSpotForm.date}
                            onChangeText={(date) =>
                              setPetSpotForm((current) => ({
                                ...current,
                                date,
                              }))
                            }
                            placeholder="YYYY-MM-DD"
                          />
                        </View>
                        <View style={styles.dateField}>
                          <FormTextField
                            label="Jam"
                            value={petSpotForm.time}
                            onChangeText={(time) =>
                              setPetSpotForm((current) => ({
                                ...current,
                                time,
                              }))
                            }
                            placeholder="18:00"
                          />
                        </View>
                      </View>
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
                              petSpotForm.durationMinutes === durationMinutes &&
                                styles.choiceActive,
                            ]}
                          >
                            <Text
                              style={[
                                styles.choiceText,
                                petSpotForm.durationMinutes ===
                                  durationMinutes && styles.choiceTextActive,
                              ]}
                            >
                              {durationMinutes === 1440
                                ? "1 hari"
                                : `${durationMinutes} menit`}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
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
                            <Text style={styles.formLabel}>{counter.label}</Text>
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
                                    [counter.key]:
                                      current[counter.key] + 1,
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
                            : "Perbarui denah ketersediaan"}
                        </Text>
                      </Pressable>
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
                      {selectedPetSpotResource ? (
                        <View style={styles.selectedResourceCard}>
                          <View>
                            <Text style={styles.formTitle}>
                              {selectedPetSpotResource.name}
                            </Text>
                            <Text style={styles.formNote}>
                              {selectedPetSpotResource.floor_name} · kapasitas{" "}
                              {selectedPetSpotResource.capacity} ·{" "}
                              {money(selectedPetSpotResource.base_price)}
                            </Text>
                          </View>
                          <Ionicons
                            name="checkmark-circle"
                            size={24}
                            color="#128464"
                          />
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
                          {selected.reservation_policy?.hold_minutes ?? 15} menit.
                          Reservasi baru dikonfirmasi setelah DP terverifikasi.
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
                            Dokumen yang perlu disiapkan
                          </Text>
                          {selected.requirements.map((requirement) => (
                            <Text key={requirement} style={styles.requirement}>
                              ✓ {requirement}
                            </Text>
                          ))}
                        </View>
                      ) : null}
                    </View>
                  ) : null}
                  {(["academy", "events", "consult", "documents"].includes(
                    mode,
                  ) &&
                    Number(selected?.price || selected?.total_fee || 0) > 0) ||
                  (mode === "petspot" && selected?.reservable) ? (
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
                          ? `Daftarkan ${petName || "pet"}`
                          : mode === "events"
                            ? "Ambil tiket"
                            : mode === "consult"
                              ? "Mulai konsultasi"
                              : mode === "adoption"
                                ? "Kirim pengajuan screening"
                                : mode === "documents"
                                  ? "Ajukan dokumen"
                                  : mode === "petspot"
                                    ? selected?.reservable
                                      ? "Reservasi & bayar DP"
                                      : "Buka petunjuk arah"
                                    : selected?.status === "live"
                                      ? "Tonton live"
                                      : "Aktifkan pengingat"
                    }
                    onPress={runPrimaryAction}
                    disabled={busy}
                  />
                </ScrollView>
              </Pressable>
            </SafeAreaView>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>
      <MobileBatpayModal
        payment={payment}
        onClose={() => setPayment(undefined)}
        onPaid={() => {
          onAction("Pembayaran berhasil dan transaksi sudah tercatat");
        }}
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
  visual: {
    position: "relative",
    width: 96,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.mint50,
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
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginTop: "auto",
  },
  cardPrice: {
    minWidth: 0,
    flex: 1,
    color: colors.sky600,
    fontSize: 10,
    fontWeight: "700",
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
  sheetWrap: { width: "100%", maxHeight: "88%" },
  sheet: {
    maxHeight: "100%",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: colors.white,
  },
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
  sheetContent: { paddingHorizontal: 16, paddingBottom: 20 },
  sheetHero: {
    height: 118,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
    backgroundColor: colors.sky50,
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
  depositBadgeText: { color: "#9A5B08", fontSize: 9, fontWeight: "800" },
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
  counterValue: { color: colors.navy, fontSize: 15, fontWeight: "800" },
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
    fontWeight: "800",
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
  layoutResourceCode: { color: "#25695F", fontSize: 10, fontWeight: "800" },
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
    fontSize: 11,
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
});
