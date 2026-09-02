import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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
  createMobilePetHubPost,
  enrollMobileAcademy,
  getMobileAcademy,
  getMobileAdoptions,
  getMobileConsultationPlans,
  getMobileDocumentProducts,
  getMobileEvents,
  getMobileMyPawDatingProfiles,
  getMobilePawDatingProfiles,
  getMobilePetHubFeed,
  getMobilePetSpots,
  getMobileStreams,
  reactMobilePetHubPost,
  registerMobileEvent,
  sendMobilePawDatingInterest,
  trackMobileAcademyProgramClick,
  type MobileOwner,
  type MobilePaymentIntent,
  type WorldItem,
} from "../api";
import { colors, shadow } from "../theme";
import { PrimaryButton, Screen, TopHeader } from "../components/ui";
import {
  MobileBatpayModal,
  MobilePaymentMethods,
} from "../components/BatpayPayment";

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
const modes: Array<{ id: Mode; label: string; icon: string }> = [
  { id: "pawdating", label: "PAW Dating", icon: "♡" },
  { id: "academy", label: "Academy", icon: "🎓" },
  { id: "events", label: "Event", icon: "🎟️" },
  { id: "petspot", label: "PetSpot", icon: "📍" },
  { id: "pethub", label: "PetHub", icon: "▶️" },
  { id: "consult", label: "Konsultasi", icon: "🩺" },
  { id: "adoption", label: "Adopsi", icon: "♡" },
  { id: "documents", label: "Dokumen", icon: "▤" },
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
const money = (value?: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value ?? 0);
const when = (value?: string) =>
  value
    ? new Intl.DateTimeFormat("id-ID", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(value))
    : "Segera";

const worldEmoji = (mode: Mode, item?: WorldItem | null) => {
  if (mode === "pawdating") return item?.species === "cat" ? "🐈" : "🐕";
  if (mode === "academy") return "🎓";
  if (mode === "events") return "🎟️";
  if (mode === "petspot")
    return item?.category === "cafe"
      ? "☕"
      : item?.category === "mall"
        ? "🏬"
        : "🌳";
  if (mode === "consult") return "🩺";
  if (mode === "adoption") return item?.species === "cat" ? "🐈" : "🐕";
  if (mode === "documents") return "📄";
  return "▶️";
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
        placeholderTextColor="#93A2AF"
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
  onLogin,
}: {
  refreshVersion: number;
  onAction: (message: string) => void;
  onOpenNotifications: () => void;
  owner?: MobileOwner;
  petName?: string;
  pet?: WorldPet;
  onLogin: () => void;
}) {
  const [mode, setMode] = useState<Mode>("academy");
  const [items, setItems] = useState<Record<Mode, WorldItem[]>>(emptyWorld);
  const [selected, setSelected] = useState<WorldItem | null>(null);
  const [composer, setComposer] = useState(false);
  const [thread, setThread] = useState("");
  const [liked, setLiked] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("qris");
  const [payment, setPayment] = useState<MobilePaymentIntent>();
  const [adoptionForm, setAdoptionForm] =
    useState<AdoptionForm>(emptyAdoptionForm);
  const [documentForm, setDocumentForm] =
    useState<DocumentForm>(emptyDocumentForm);
  useEffect(() => {
    queueMicrotask(() => {
      setLoading(true);
      void Promise.allSettled([
        getMobilePawDatingProfiles(),
        getMobileAcademy(),
        getMobileEvents(),
        getMobilePetSpots(),
        getMobileStreams(),
        getMobilePetHubFeed(),
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
            streams,
            feed,
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
              pethub: [
                ...(streams.status === "fulfilled" ? streams.value.data : []),
                ...(feed.status === "fulfilled" ? feed.value.data : []),
              ],
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
    if (mode === "academy" && selected)
      void trackMobileAcademyProgramClick(selected.id).catch(() => undefined);
  }, [mode, selected]);
  useEffect(() => {
    if (!selected) return;
    if (mode === "adoption") {
      setAdoptionForm({
        ...emptyAdoptionForm(),
        applicantName: owner?.full_name ?? "",
        phone: owner?.phone ?? "",
      });
    }
    if (mode === "documents") setDocumentForm(emptyDocumentForm());
  }, [mode, owner?.full_name, owner?.phone, selected]);
  const publish = async () => {
    if (thread.trim().length < 3) return;
    if (!owner) {
      onLogin();
      return;
    }
    setBusy(true);
    try {
      await createMobilePetHubPost(thread.trim(), owner.full_name);
      const feed = await getMobilePetHubFeed();
      setItems((current) => ({
        ...current,
        pethub: [...current.pethub.filter((item) => item.status), ...feed.data],
      }));
      setThread("");
      setComposer(false);
      onAction("Pet thread diterbitkan dan tersinkron");
    } catch (cause) {
      onAction(
        cause instanceof Error
          ? cause.message
          : "Pet thread belum dapat diterbitkan",
      );
    } finally {
      setBusy(false);
    }
  };
  const toggleLike = async (item: WorldItem) => {
    if (!owner) {
      onLogin();
      return;
    }
    try {
      const result = await reactMobilePetHubPost(item.id);
      setLiked((current) =>
        result.liked
          ? [...new Set([...current, item.id])]
          : current.filter((id) => id !== item.id),
      );
    } catch (cause) {
      onAction(
        cause instanceof Error ? cause.message : "Reaksi belum tersimpan",
      );
    }
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
    { kicker: string; title: string; note: string; emoji: string }
  > = {
    pawdating: {
      kicker: "RESPONSIBLE PET MATCHMAKING",
      title: "Pasangan tepat, kesehatan jelas.",
      note: "Filter level, genetik, silsilah, karakter, usia, dan jarak dengan verifikasi dokter.",
      emoji: "🐕♡🐕",
    },
    academy: {
      kicker: "PET TRAINING & ACADEMY",
      title: "Belajar dan bertumbuh bersama.",
      note: "Trainer terverifikasi, kurikulum terukur, dan progres digital.",
      emoji: "🐕‍🦺",
    },
    events: {
      kicker: "PET EVENT DI KOTAMU",
      title: "Isi kalender pet-mu.",
      note: "Festival, workshop, meet-up, dan fun race pilihan.",
      emoji: "🎪",
    },
    petspot: {
      kicker: "PET FRIENDLY DISCOVERY",
      title: `Ke mana hari ini bersama ${petName || "pet-mu"}?`,
      note: "Cafe, mall, taman, dan playground yang pet friendly.",
      emoji: "🌳",
    },
    pethub: {
      kicker: "PETHUB LIVE & THREAD",
      title: "Satu layar untuk dunia pet.",
      note: "Live streaming, story, komentar, channel, dan pet thread.",
      emoji: "▶️",
    },
    consult: {
      kicker: "VIRTUAL VET",
      title: "Dokter sedekat layar kamu.",
      note: "Chat, voice, video call, bundling, dan medical record.",
      emoji: "🩺",
    },
    adoption: {
      kicker: "RESPONSIBLE ADOPTION",
      title: "Rumah baru. Awal baru.",
      note: "Screening, health check, meet & greet, dan pendampingan.",
      emoji: "🐕",
    },
    documents: {
      kicker: "PET DOCUMENTS",
      title: "Urus dokumen tanpa bingung.",
      note: "Akte, surat sehat, karantina, pesawat, dan kapal.",
      emoji: "▤",
    },
  };
  return (
    <>
      <Screen>
        <TopHeader
          title="Sliva World"
          subtitle="Seluruh dunia pet dalam satu aplikasi"
          onNotification={onOpenNotifications}
        />
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
              <Text style={styles.modeIcon}>{item.icon}</Text>
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
            mode === "pethub" && styles.darkHero,
            mode === "events" && styles.eventHero,
            mode === "pawdating" && styles.pawDatingHero,
          ]}
        >
          <Text style={styles.heroKicker}>{heroCopy[mode].kicker}</Text>
          <Text style={styles.heroTitle}>{heroCopy[mode].title}</Text>
          <Text style={styles.heroNote}>{heroCopy[mode].note}</Text>
          <Text style={styles.heroEmoji}>{heroCopy[mode].emoji}</Text>
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
                : mode === "pethub"
                  ? "Sedang ramai"
                  : mode === "petspot"
                    ? "Di sekitar kamu"
                    : "Pilihan untukmu"}
            </Text>
          </View>
          {mode === "pethub" ? (
            <Pressable onPress={() => setComposer(true)} style={styles.create}>
              <Ionicons name="add" size={17} color={colors.white} />
              <Text style={styles.createText}>Buat thread</Text>
            </Pressable>
          ) : (
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
          )}
        </View>
        <View style={styles.list}>
          {items[mode].map((item, index) =>
            mode === "pethub" && item.content ? (
              <View key={item.id} style={styles.threadCard}>
                <View style={styles.author}>
                  <View style={styles.avatar}>
                    <Text>
                      {(item.channel_name || item.author_name || "S")[0]}
                    </Text>
                  </View>
                  <View style={styles.authorCopy}>
                    <Text style={styles.authorName}>{item.author_name}</Text>
                    <Text style={styles.authorHandle}>
                      {item.channel_name} · baru saja
                    </Text>
                  </View>
                  <Pressable onPress={() => onAction("Thread disimpan")}>
                    <Ionicons
                      name="ellipsis-horizontal"
                      size={18}
                      color={colors.muted}
                    />
                  </Pressable>
                </View>
                <Text style={styles.threadBody}>{item.content}</Text>
                <View style={styles.actions}>
                  <Pressable
                    style={styles.actionItem}
                    onPress={() => toggleLike(item)}
                  >
                    <Ionicons
                      name={liked.includes(item.id) ? "heart" : "heart-outline"}
                      size={18}
                      color={
                        liked.includes(item.id) ? colors.red : colors.muted
                      }
                    />
                    <Text style={styles.actionText}>
                      {(item.like_count ?? 0) +
                        (liked.includes(item.id) ? 1 : 0)}
                    </Text>
                  </Pressable>
                  <Pressable
                    style={styles.actionItem}
                    onPress={() => onAction("Diskusi thread dibuka")}
                  >
                    <Ionicons
                      name="chatbubble-outline"
                      size={17}
                      color={colors.muted}
                    />
                    <Text style={styles.actionText}>
                      {item.comment_count ?? 0}
                    </Text>
                  </Pressable>
                  <Pressable
                    style={styles.actionItem}
                    onPress={() => onAction("Thread dibagikan")}
                  >
                    <Ionicons
                      name="share-social-outline"
                      size={18}
                      color={colors.muted}
                    />
                  </Pressable>
                </View>
              </View>
            ) : (
              <Pressable
                key={item.id}
                onPress={() => setSelected(item)}
                style={styles.card}
              >
                <View
                  style={[
                    styles.visual,
                    index % 3 === 1 && styles.visualPeach,
                    index % 3 === 2 && styles.visualViolet,
                  ]}
                >
                  <Text style={styles.visualEmoji}>
                    {worldEmoji(mode, item)}
                  </Text>
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
                                  : `${item.viewer_count?.toLocaleString("id-ID") ?? 0} menonton`}
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
            ),
          )}
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
                    <Text style={styles.sheetHeroText}>
                      {worldEmoji(mode, selected)}
                    </Text>
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
                      <Text style={styles.welfareTitle}>
                        🛡️ Welfare check aktif
                      </Text>
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
                        <Text style={styles.petSummaryIcon}>🐾</Text>
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
      <Modal
        visible={composer}
        animationType="slide"
        onRequestClose={() => setComposer(false)}
      >
        <SafeAreaView style={styles.composer}>
          <View style={styles.composerHead}>
            <View>
              <Text style={styles.eyebrow}>BUAT PET THREAD</Text>
              <Text style={styles.composerTitle}>
                Apa yang sedang kamu pikirkan?
              </Text>
            </View>
            <Pressable onPress={() => setComposer(false)}>
              <Ionicons name="close" size={23} color={colors.text} />
            </Pressable>
          </View>
          <TextInput
            value={thread}
            onChangeText={setThread}
            multiline
            autoFocus
            maxLength={5000}
            placeholder="Bagikan insight, cerita, atau pertanyaan tentang pet…"
            placeholderTextColor="#9AA7B6"
            style={styles.input}
          />
          <Text style={styles.counter}>{thread.length}/5000</Text>
          <PrimaryButton label="Terbitkan thread" onPress={publish} />
        </SafeAreaView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  modeRow: { gap: 8, paddingVertical: 10, paddingRight: 18 },
  mode: {
    minWidth: 91,
    minHeight: 62,
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 15,
    backgroundColor: colors.white,
  },
  activeMode: { borderColor: colors.sky400, backgroundColor: colors.sky50 },
  modeIcon: { fontSize: 23 },
  modeLabel: { color: colors.muted, fontSize: 12, fontWeight: "800" },
  activeModeLabel: { color: colors.sky600 },
  hero: {
    position: "relative",
    minHeight: 235,
    overflow: "hidden",
    justifyContent: "center",
    marginTop: 8,
    padding: 22,
    borderRadius: 24,
    backgroundColor: "#159B88",
    ...shadow,
  },
  darkHero: { backgroundColor: "#173E61" },
  eventHero: { backgroundColor: "#7C5CAD" },
  pawDatingHero: { backgroundColor: colors.sky600 },
  heroKicker: {
    color: "rgba(255,255,255,.78)",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.1,
  },
  heroTitle: {
    maxWidth: "72%",
    marginTop: 9,
    color: colors.white,
    fontSize: 30,
    lineHeight: 34,
    fontWeight: "900",
    letterSpacing: -0.6,
  },
  heroNote: {
    maxWidth: "73%",
    marginTop: 9,
    color: "rgba(255,255,255,.82)",
    fontSize: 13,
    lineHeight: 20,
  },
  heroEmoji: { position: "absolute", right: -8, bottom: 3, fontSize: 72 },
  sectionHead: {
    minHeight: 82,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  eyebrow: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1,
  },
  sectionTitle: {
    marginTop: 4,
    color: colors.navy,
    fontSize: 23,
    fontWeight: "900",
  },
  create: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 13,
    borderRadius: 12,
    backgroundColor: colors.sky500,
  },
  createText: { color: colors.white, fontWeight: "800" },
  list: { gap: 13 },
  card: {
    overflow: "hidden",
    flexDirection: "row",
    minHeight: 158,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 19,
    backgroundColor: colors.white,
    ...shadow,
  },
  visual: {
    position: "relative",
    width: 112,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.mint50,
  },
  visualPeach: { backgroundColor: "#FFF0E5" },
  visualViolet: { backgroundColor: colors.violet50 },
  visualEmoji: { fontSize: 51 },
  live: {
    position: "absolute",
    left: 8,
    top: 8,
    paddingHorizontal: 7,
    paddingVertical: 5,
    borderRadius: 7,
    backgroundColor: colors.red,
  },
  liveText: { color: colors.white, fontSize: 10, fontWeight: "900" },
  verified: {
    position: "absolute",
    left: 8,
    top: 8,
    paddingHorizontal: 7,
    paddingVertical: 5,
    borderRadius: 7,
    backgroundColor: "rgba(255,255,255,.94)",
  },
  verifiedText: { color: "#8B5A18", fontSize: 10, fontWeight: "900" },
  cardCopy: { minWidth: 0, flex: 1, padding: 14 },
  cardKicker: { color: colors.sky600, fontSize: 11, fontWeight: "800" },
  cardTitle: {
    marginTop: 6,
    color: colors.navy,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "900",
  },
  cardNote: { marginTop: 6, color: colors.muted, fontSize: 12, lineHeight: 18 },
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
    fontSize: 12,
    fontWeight: "900",
  },
  arrow: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 11,
    backgroundColor: colors.sky500,
  },
  threadCard: {
    padding: 16,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 19,
    backgroundColor: colors.white,
    ...shadow,
  },
  author: { flexDirection: "row", alignItems: "center", gap: 10 },
  avatar: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 13,
    backgroundColor: colors.mint50,
  },
  authorCopy: { minWidth: 0, flex: 1 },
  authorName: { color: colors.navy, fontSize: 13, fontWeight: "900" },
  authorHandle: { marginTop: 3, color: colors.muted, fontSize: 11 },
  threadBody: {
    marginVertical: 14,
    color: colors.text,
    fontSize: 14,
    lineHeight: 22,
  },
  actions: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 28,
  },
  actionItem: {
    minWidth: 44,
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  actionText: { color: colors.muted, fontSize: 12 },
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(14,32,55,.42)",
  },
  sheetKeyboard: { flex: 1, justifyContent: "flex-end" },
  sheetWrap: { width: "100%", maxHeight: "92%" },
  sheet: {
    maxHeight: "100%",
    borderTopLeftRadius: 27,
    borderTopRightRadius: 27,
    backgroundColor: colors.white,
  },
  handle: {
    alignSelf: "center",
    width: 42,
    height: 5,
    marginTop: 9,
    marginBottom: 14,
    borderRadius: 3,
    backgroundColor: "#DCE5EB",
  },
  sheetClose: {
    position: "absolute",
    zIndex: 3,
    top: 15,
    right: 17,
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: colors.canvas,
  },
  sheetContent: { paddingHorizontal: 20, paddingBottom: 24 },
  sheetHero: {
    height: 145,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
    backgroundColor: colors.sky50,
  },
  sheetHeroText: { fontSize: 72 },
  sheetKicker: {
    marginTop: 17,
    color: colors.sky600,
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  sheetTitle: {
    marginTop: 7,
    color: colors.navy,
    fontSize: 26,
    lineHeight: 32,
    fontWeight: "900",
    letterSpacing: -0.4,
  },
  sheetNote: {
    marginTop: 8,
    color: colors.muted,
    fontSize: 14,
    lineHeight: 22,
  },
  details: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 9,
    marginVertical: 16,
  },
  detail: {
    minWidth: "46%",
    flex: 1,
    padding: 12,
    borderRadius: 13,
    backgroundColor: colors.canvas,
  },
  detailLabel: { color: colors.muted, fontSize: 11, lineHeight: 16 },
  detailValue: {
    marginTop: 5,
    color: colors.navy,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "800",
  },
  welfareNote: {
    marginBottom: 14,
    padding: 13,
    borderRadius: 13,
    backgroundColor: "#EDF8F4",
  },
  welfareTitle: { color: "#25695F", fontSize: 12, fontWeight: "900" },
  welfareText: { marginTop: 5, color: "#5F756F", fontSize: 11, lineHeight: 17 },
  formSection: {
    gap: 10,
    marginBottom: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 16,
    backgroundColor: colors.canvas,
  },
  formTitle: { color: colors.navy, fontSize: 18, fontWeight: "900" },
  formNote: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  formField: { gap: 6 },
  formLabel: {
    color: colors.text,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "800",
  },
  formInput: {
    minHeight: 48,
    paddingHorizontal: 13,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    backgroundColor: colors.white,
    color: colors.text,
    fontSize: 14,
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
  composer: { flex: 1, padding: 20, backgroundColor: colors.white },
  composerHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
  },
  composerTitle: {
    marginTop: 4,
    color: colors.navy,
    fontSize: 26,
    lineHeight: 32,
    fontWeight: "900",
  },
  input: {
    minHeight: 210,
    marginTop: 25,
    padding: 15,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 16,
    color: colors.text,
    fontSize: 16,
    lineHeight: 24,
    textAlignVertical: "top",
  },
  counter: {
    marginVertical: 8,
    color: colors.muted,
    fontSize: 12,
    textAlign: "right",
  },
});
