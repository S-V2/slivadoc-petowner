import { useEffect, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  type TextInputProps,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import {
  applyMobileAdoption,
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
  getMobilePawDatingProfiles,
  getMobilePetSpots,
  registerMobileEvent,
  sendMobilePawDatingInterest,
  trackMobileAcademyProgramClick,
  type MobileOwner,
  type MobilePaymentIntent,
  type WorldItem,
} from "../api";
import { LocalizedText as Text, LocalizedTextInput as TextInput, useI18n } from "../i18n";
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
const modes: Array<{ id: Mode; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
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
const worldIcon = (mode: Mode, item?: WorldItem | null): keyof typeof Ionicons.glyphMap => {
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
  const when = (value?: string) => value
    ? formatDate(value, { dateStyle: "medium", timeStyle: "short" })
    : "Segera";
  const [mode, setMode] = useState<Mode>(intent?.mode ?? "academy");
  const [items, setItems] = useState<Record<Mode, WorldItem[]>>(emptyWorld);
  const [selected, setSelected] = useState<WorldItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("qris");
  const [payment, setPayment] = useState<MobilePaymentIntent>();
  const [adoptionForm, setAdoptionForm] =
    useState<AdoptionForm>(emptyAdoptionForm);
  const [documentForm, setDocumentForm] =
    useState<DocumentForm>(emptyDocumentForm);
  const handledIntent = useRef(0);
  useEffect(() => {
    queueMicrotask(() => {
      setLoading(true);
      void Promise.allSettled([
        getMobilePawDatingProfiles(),
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
          ]) =>
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
            }),
        )
        .finally(() => setLoading(false));
    });
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
  // Opening an item starts its form fresh. This runs in the open handler rather than an
  // effect on purpose. Calling setState in an effect body is the cascading render that
  // react-hooks/set-state-in-effect rejects, and the effect's dependency on
  // owner.full_name / owner.phone / the `selected` object identity made it re-run and
  // wipe whatever the user had already typed every time owner data or the fetched list
  // refreshed underneath an open sheet. `selected` only ever becomes non-null here, so
  // this is the single entry point.
  const openItem = (item: WorldItem) => {
    if (mode === "adoption") {
      setAdoptionForm({
        ...emptyAdoptionForm(),
        applicantName: owner?.full_name ?? "",
        phone: owner?.phone ?? "",
      });
    }
    if (mode === "documents") setDocumentForm(emptyDocumentForm());
    setSelected(item);
  };
  const runPrimaryAction = async () => {
    if (!selected) return;
    if (
      !owner &&
      mode !== "petspot" &&
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
    setBusy(true);
    let completed = false;
    try {
      if (mode === "pawdating") {
        const mine = await getMobileMyPawDatingProfiles();
        const source = mine.data[0]?.id;
        if (!source)
          throw new Error("Buat profil PAW Dating pet terlebih dahulu");
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
        const query =
          selected.latitude != null && selected.longitude != null
            ? `${selected.latitude},${selected.longitude}`
            : encodeURIComponent(selected.address || selected.name || "");
        await Linking.openURL(
          `https://www.google.com/maps/search/?api=1&query=${query}`,
        );
        onAction("Petunjuk arah dibuka");
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
    Mode,
    { kicker: string; title: string; note: string; icon: keyof typeof Ionicons.glyphMap }
  > = {
    pawdating: {
      kicker: "RESPONSIBLE PET MATCHMAKING",
      title: "Pasangan tepat, kesehatan jelas.",
      note: "Filter level, genetik, silsilah, karakter, usia, dan jarak dengan verifikasi dokter.",
      icon: "heart-circle-outline",
    },
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
        {!hasPet && owner ? <PetRequiredNotice onAddPet={onRequirePet} /> : null}
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
              <Ionicons name={item.icon} size={20} color={mode === item.id ? colors.sky600 : colors.muted} />
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
        {!hasPet && owner ? <PetRequiredNotice onAddPet={onRequirePet} /> : null}
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
              <Ionicons name={item.icon} size={20} color={mode === item.id ? colors.sky600 : colors.muted} />
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
        <View
          style={[
            styles.hero,
            mode === "events" && styles.eventHero,
            mode === "pawdating" && styles.pawDatingHero,
          ]}
        >
          <Text style={styles.heroKicker}>{heroCopy[mode].kicker}</Text>
          <Text style={styles.heroTitle}>{heroCopy[mode].title}</Text>
          <Text style={styles.heroNote}>{heroCopy[mode].note}</Text>
          <Ionicons name={heroCopy[mode].icon} size={56} color="rgba(255,255,255,.88)" style={styles.heroEmoji} />
        </View>
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
          <Pressable
            onPress={() =>
              onAction(
                mode === "petspot"
                  ? "Lokasi perangkat digunakan untuk mengurutkan PetSpot"
                  : mode === "pawdating"
                    ? "Filter level, kesehatan, ras, gender, dan jarak dibuka"
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
        </View>
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
                  <Ionicons name={worldIcon(mode, item)} size={38} color={colors.sky600} />
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
                    <Ionicons name={worldIcon(mode, selected)} size={48} color={colors.sky600} />
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
                  </View>
                  {mode === "pawdating" ? (
                    <View style={styles.welfareNote}>
                      <View style={styles.welfareTitleRow}><Ionicons name="shield-checkmark-outline" size={17} color={colors.sky600}/><Text style={styles.welfareTitle}>Welfare check aktif</Text></View>
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
                        <Ionicons name="paw-outline" size={22} color={colors.sky600}/>
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
                  {["academy", "events", "consult", "documents"].includes(
                    mode,
                  ) &&
                  Number(selected?.price || selected?.total_fee || 0) > 0 ? (
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
                                    ? "Buka petunjuk arah"
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
    </>
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
  modeLabel: { color: colors.muted, fontSize: 10, fontWeight: "800" },
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
    fontWeight: "900",
    letterSpacing: 1.1,
  },
  heroTitle: {
    maxWidth: "72%",
    marginTop: 7,
    color: colors.white,
    fontSize: 23,
    lineHeight: 27,
    fontWeight: "900",
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
    fontWeight: "900",
    letterSpacing: 1,
  },
  sectionTitle: {
    marginTop: 3,
    color: colors.navy,
    fontSize: 17,
    fontWeight: "900",
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
  createText: { color: colors.white, fontSize: 11, fontWeight: "800" },
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
  liveText: { color: colors.white, fontSize: 8, fontWeight: "900" },
  verified: {
    position: "absolute",
    left: 8,
    top: 8,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 7,
    backgroundColor: "rgba(255,255,255,.94)",
  },
  verifiedText: { color: "#8B5A18", fontSize: 8, fontWeight: "900" },
  cardCopy: { minWidth: 0, flex: 1, padding: 11 },
  cardKicker: { color: colors.sky600, fontSize: 9, fontWeight: "800" },
  cardTitle: {
    marginTop: 4,
    color: colors.navy,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: "900",
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
    fontWeight: "900",
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
  authorName: { color: colors.navy, fontSize: 12, fontWeight: "900" },
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
    fontWeight: "900",
    textTransform: "uppercase",
  },
  sheetTitle: {
    marginTop: 5,
    color: colors.navy,
    fontSize: 21,
    lineHeight: 26,
    fontWeight: "900",
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
    fontWeight: "800",
  },
  welfareNote: {
    marginBottom: 14,
    padding: 13,
    borderRadius: 13,
    backgroundColor: "#EDF8F4",
  },
  welfareTitleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  welfareTitle: { color: "#25695F", fontSize: 12, fontWeight: "900" },
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
  formTitle: { color: colors.navy, fontSize: 15, fontWeight: "900" },
  formNote: { color: colors.muted, fontSize: 10, lineHeight: 15 },
  formField: { gap: 6 },
  formLabel: {
    color: colors.text,
    fontSize: 11,
    lineHeight: 18,
    fontWeight: "800",
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
  choiceText: { color: colors.muted, fontSize: 12, fontWeight: "800" },
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
    fontWeight: "900",
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
    fontWeight: "900",
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
});
