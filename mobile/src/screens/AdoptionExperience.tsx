import { LocalizedPressable as Pressable } from "../components/LocalizedPressable";
/* eslint-disable jsx-a11y/alt-text */
import { useEffect, useRef, useState } from "react";
import {
  Image,

  ScrollView,
  StyleSheet,
  Switch,
  View,
  useWindowDimensions,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import {
  applyMobileAdoption,
  createMobileAdoptionListing,
  getMobileAdoptions,
  uploadMobileImage,
  type MobileOwner,
  type WorldItem,
  type MobileAdoptionApplicationInput,
} from "../api";
import {
  LocalizedText as Text,
  LocalizedTextInput as TextInput,
  useI18n,
} from "../i18n";
import { BoundedBottomSheet, PrimaryButton } from "../components/ui";
import { PetHubPhotos } from "../components/PetHubPhotos";
import { AdoptionManager } from "./AdoptionManager";
import { colors } from "../theme";

type PetChoice = {
  id: string;
  name: string;
  breed: string;
  photo_url?: string;
  access_role?: string;
};
const steps = [
  "Screening keluarga",
  "Tinjauan pemilik",
  "Meet & greet",
  "Serah terima",
];
const emptyApplication = (): MobileAdoptionApplicationInput => ({
  applicant_name: "",
  phone: "",
  address: "",
  housing_type: "Rumah milik",
  has_other_pets: false,
  experience: "",
  reason: "",
});
function Field({
  label,
  value,
  change,
  multiline = false,
  numeric = false,
}: {
  label: string;
  value: string;
  change: (v: string) => void;
  multiline?: boolean;
  numeric?: boolean;
}) {
  return (
    <View style={s.field}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholder={label}
        placeholderTextColor={colors.muted}
        value={value}
        onChangeText={change}
        multiline={multiline}
        keyboardType={numeric ? "number-pad" : "default"}
        style={[s.input, multiline && s.textarea]}
      />
    </View>
  );
}
export function AdoptionExperience({
  owner,
  pets,
  onLogin,
  onRequirePet,
  onAction,
  refreshVersion,
}: {
  owner?: MobileOwner;
  pets: PetChoice[];
  onLogin: () => void;
  onRequirePet: () => void;
  onAction: (m: string) => void;
  refreshVersion: number;
}) {
  const { formatCurrency } = useI18n();
  const { height: screenHeight } = useWindowDimensions();
  const [items, setItems] = useState<WorldItem[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const [query, setQuery] = useState(""),
    [species, setSpecies] = useState("all"),
    [tab, setTab] = useState<"browse" | "manage">("browse");
  const [selected, setSelected] = useState<WorldItem | null>(null),
    [step, setStep] = useState(0),
    [compose, setCompose] = useState(false),
    [epoch, setEpoch] = useState(0);
  const [busy, setBusy] = useState(false),
    [uploading, setUploading] = useState(false),
    pending = useRef(false);
  const [application, setApplication] = useState(emptyApplication);
  const ownPets = pets.filter(
    (p) => !p.access_role || p.access_role === "owner",
  );
  const [petID, setPetID] = useState(""),
    [city, setCity] = useState(""),
    [description, setDescription] = useState(""),
    [traits, setTraits] = useState(""),
    [health, setHealth] = useState(""),
    [fee, setFee] = useState("0"),
    [vaccinated, setVaccinated] = useState(false),
    [sterilized, setSterilized] = useState(false),
    [photos, setPhotos] = useState<string[]>([]);
  useEffect(() => {
    let current = true;
    void getMobileAdoptions()
      .then((result) => {
        if (current) {
          setItems(result.data);
          setError("");
        }
      })
      .catch((e) => {
        if (current)
          setError(
            e instanceof Error ? e.message : "Data adopsi belum dapat dimuat",
          );
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    return () => {
      current = false;
    };
  }, [refreshVersion, epoch]);
  const eligible = items.filter(
    (item) =>
      (species === "all" || item.species === species) &&
      `${item.name} ${item.breed} ${item.city} ${(item.personality ?? []).join(" ")}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const choosePet = ownPets.find((p) => p.id === petID);
  const feeLabel = (item: WorldItem) =>
    item.adoption_fee ? formatCurrency(item.adoption_fee) : "Tanpa biaya";
  function startComposer() {
    if (!owner) {
      onLogin();
      return;
    }
    const firstPet = ownPets[0];
    if (!firstPet) {
      onRequirePet();
      return;
    }
    setPetID(firstPet.id);
    setPhotos([]);
    setCompose(true);
  }
  async function pickPhotos() {
    if (uploading || busy) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      onAction("Izinkan akses foto untuk menambah galeri pet");
      return;
    }
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      selectionLimit: Math.max(1, 10 - photos.length),
      quality: 0.85,
    });
    if (picked.canceled) return;
    if (picked.assets.length + photos.length > 10) {
      onAction("Maksimal 10 foto");
      return;
    }
    setUploading(true);
    try {
      for (const asset of picked.assets) {
        const result = await uploadMobileImage(
          asset.uri,
          asset.mimeType || "image/jpeg",
          asset.fileName || "adoption.jpg",
        );
        setPhotos((current) => [...current, result.url]);
      }
    } catch (e) {
      onAction(e instanceof Error ? e.message : "Upload foto gagal");
    } finally {
      setUploading(false);
    }
  }
  async function publish() {
    if (!choosePet || pending.current || uploading) return;
    const amount = Number(fee);
    if (
      city.trim().length < 2 ||
      description.trim().length < 20 ||
      !Number.isSafeInteger(amount) ||
      amount < 0 ||
      amount > 100000000
    ) {
      onAction(
        "Lengkapi kota, cerita minimal 20 karakter, dan biaya tetap yang valid",
      );
      return;
    }
    pending.current = true;
    setBusy(true);
    try {
      await createMobileAdoptionListing({
        pet_id: choosePet.id,
        city: city.trim(),
        description: description.trim(),
        personality: traits
          .split(",")
          .map((v) => v.trim())
          .filter(Boolean),
        health_status: health.trim(),
        vaccinated,
        sterilized,
        photo_urls: photos.length
          ? photos
          : choosePet.photo_url
            ? [choosePet.photo_url]
            : [],
        adoption_fee: amount,
      });
      setCompose(false);
      setPetID("");
      setCity("");
      setDescription("");
      setTraits("");
      setHealth("");
      setFee("0");
      setVaccinated(false);
      setSterilized(false);
      setPhotos([]);
      setTab("manage");
      setEpoch((v) => v + 1);
      onAction("Pet passport masuk review sebelum tampil publik");
    } catch (e) {
      onAction(e instanceof Error ? e.message : "Pengajuan belum dapat dibuat");
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  async function apply() {
    if (!owner) {
      onLogin();
      return;
    }
    if (!selected || pending.current) return;
    if (
      !application.applicant_name.trim() ||
      !application.phone.trim() ||
      !application.address.trim() ||
      application.reason.trim().length < 10
    ) {
      onAction("Lengkapi nama, kontak privat, alamat, dan alasan adopsi");
      return;
    }
    pending.current = true;
    setBusy(true);
    try {
      await applyMobileAdoption(selected.id, application);
      setStep(2);
      setEpoch((v) => v + 1);
      onAction("Pengajuan screening terkirim");
    } catch (e) {
      onAction(
        e instanceof Error ? e.message : "Pengajuan belum dapat dikirim",
      );
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <View style={s.stack}>
      <View style={s.hero}>
        <Text style={s.eyebrow}>SLIVA HOME · PET PASSPORT</Text>
        <Text style={s.heroTitle}>Rumah baru. Cerita bahagia berikutnya.</Text>
        <Text style={s.copy}>
          Kenali karakter dan kebutuhan pet sebelum menjadi keluarga. Pengajuan
          + biaya tetap, tanpa lelang.
        </Text>
        <PrimaryButton
          label="Ajukan pet dari koleksi"
          icon="paw-outline"
          onPress={startComposer}
        />
      </View>
      <View style={s.tabs}>
        {(
          [
            ["browse", "Jelajahi"],
            ["manage", "Pengajuan & pet saya"],
          ] as const
        ).map(([key, label]) => (
          <Pressable
            key={key}
            accessibilityRole="button"
            accessibilityState={{ selected: tab === key }}
            onPress={() => {
              if (key === "manage" && !owner) onLogin();
              else setTab(key);
            }}
            style={[s.chip, tab === key && s.active]}
          >
            <Text style={s.label}>{label}</Text>
          </Pressable>
        ))}
      </View>
      {tab === "manage" ? (
        <AdoptionManager key={epoch} onAction={onAction} />
      ) : (
        <>
          <Field
            label="Cari nama, ras, kota atau karakter"
            value={query}
            change={setQuery}
          />
          <View style={s.tabs}>
            {(
              [
                ["all", "Semua"],
                ["dog", "Anjing"],
                ["cat", "Kucing"],
              ] as const
            ).map(([key, label]) => (
              <Pressable
                key={key}
                onPress={() => setSpecies(key)}
                style={[s.chip, species === key && s.active]}
                accessibilityRole="button"
                accessibilityState={{ selected: species === key }}
              >
                <Text style={s.label}>{label}</Text>
              </Pressable>
            ))}
          </View>
          {loading ? (
            <Text style={s.copy}>Memuat pet passport…</Text>
          ) : error ? (
            <View>
              <Text style={s.copy}>{error}</Text>
              <PrimaryButton
                label="Coba lagi"
                onPress={() => {
                  setLoading(true);
                  setEpoch((v) => v + 1);
                }}
              />
            </View>
          ) : (
            <Text style={s.copy}>{eligible.length} pet sesuai filter</Text>
          )}
          <View style={s.grid}>
            {eligible.map((item) => (
              <Pressable
                key={item.id}
                onPress={() => {
                  setSelected(item);
                  setStep(0);
                  setApplication({
                    ...emptyApplication(),
                    applicant_name: owner?.full_name || "",
                    phone: owner?.phone || "",
                  });
                }}
                style={s.card}
                accessibilityRole="button"
                accessibilityLabel={`Kenalan dengan ${item.name}`}
              >
                {item.photo_urls?.[0] ? (
                  <Image source={{ uri: item.photo_urls[0] }} style={s.cover} />
                ) : (
                  <View style={[s.cover, s.placeholder]}>
                    <Ionicons name="paw" size={40} color={colors.sky600} />
                    <Text style={s.copy}>Foto belum tersedia</Text>
                  </View>
                )}
                <View style={s.cardCopy}>
                  <Text style={s.eyebrow}>{item.city}</Text>
                  <Text style={s.title}>{item.name}</Text>
                  <Text style={s.copy}>
                    {item.breed} · {item.age_months ?? 0} bulan
                  </Text>
                  <View style={s.tags}>
                    {(item.personality ?? []).slice(0, 2).map((trait) => (
                      <Text key={trait} style={s.tag}>
                        {trait}
                      </Text>
                    ))}
                  </View>
                  <Text style={s.copy}>
                    {item.vaccinated
                      ? "✓ Sudah vaksin"
                      : "Vaksin belum dikonfirmasi"}
                  </Text>
                  <Text style={s.eyebrow}>BIAYA TETAP</Text>
                  <Text style={s.price}>{feeLabel(item)}</Text>
                  <Text style={s.link}>Buka pet passport →</Text>
                </View>
              </Pressable>
            ))}
          </View>
          {!loading && !error && !eligible.length && (
            <Text style={s.copy}>
              Belum ada pet yang cocok. Ubah pencarian atau jenis pet.
            </Text>
          )}
        </>
      )}
      <BoundedBottomSheet
        visible={!!selected}
        onClose={() => setSelected(null)}
        maxHeight="90%"
      >
        <ScrollView
          style={[s.sheetScroll, { maxHeight: screenHeight * 0.78 }]}
          contentContainerStyle={s.sheet}
          nestedScrollEnabled
          keyboardShouldPersistTaps="handled"
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Tutup pet passport"
            onPress={() => setSelected(null)}
            style={s.close}
          >
            <Ionicons name="close" size={24} color={colors.navy} />
          </Pressable>
          {selected &&
            (step === 2 ? (
              <View style={s.stack}>
                <Ionicons
                  name="checkmark-circle"
                  size={60}
                  color={colors.sky600}
                />
                <Text style={s.title}>Pengajuan terkirim</Text>
                <Text style={s.copy}>
                  Pemilik dan pendamping meninjau kesiapan keluarga. Lihat
                  perkembangan di Pengajuan & pet saya. Belum ada biaya ditarik.
                </Text>
                <PrimaryButton
                  label="Lihat pengajuan saya"
                  onPress={() => {
                    setSelected(null);
                    setTab("manage");
                  }}
                />
              </View>
            ) : (
              <>
                {!!selected.photo_urls?.length && (
                  <PetHubPhotos detail
                    urls={selected.photo_urls}
                    author={selected.name || "Pet"}
                  />
                )}
                <Text style={s.eyebrow}>PET PASSPORT · {selected.city}</Text>
                <Text style={s.heroTitle}>{selected.name}</Text>
                <Text style={s.copy}>
                  {selected.breed} · {selected.age_months ?? 0} bulan ·{" "}
                  {selected.sex}
                </Text>
                {step === 0 ? (
                  <View style={s.stack}>
                    <Text style={s.copy}>{selected.description}</Text>
                    <View style={s.tags}>
                      {(selected.personality ?? []).map((trait) => (
                        <Text key={trait} style={s.tag}>
                          {trait}
                        </Text>
                      ))}
                    </View>
                    <View style={s.facts}>
                      {[
                        [
                          "Kesehatan",
                          selected.health_status || "Belum dijelaskan",
                        ],
                        [
                          "Vaksin",
                          selected.vaccinated ? "Sudah" : "Belum dikonfirmasi",
                        ],
                        [
                          "Sterilisasi",
                          selected.sterilized ? "Sudah" : "Belum",
                        ],
                        [
                          "Diajukan oleh",
                          selected.submitted_by_name || "Pet parent",
                        ],
                      ].map(([label, value]) => (
                        <View key={label} style={s.fact}>
                          <Text style={s.copy}>{label}</Text>
                          <Text style={s.label}>{value}</Text>
                        </View>
                      ))}
                    </View>
                    <View style={s.fee}>
                      <Text style={s.eyebrow}>BIAYA ADOPSI TETAP</Text>
                      <Text style={s.price}>{feeLabel(selected)}</Text>
                      <Text style={s.copy}>
                        Screening gratis. Tidak ada penawaran harga atau
                        pembayaran otomatis.
                      </Text>
                    </View>
                    <View style={s.stack}>
                      {steps.map((label, i) => (
                        <Text key={label} style={s.label}>
                          {i + 1}. {label}
                        </Text>
                      ))}
                    </View>
                    <PrimaryButton
                      label="Mulai screening keluarga"
                      onPress={() => (owner ? setStep(1) : onLogin())}
                    />
                  </View>
                ) : (
                  <View style={s.stack}>
                    <Pressable onPress={() => setStep(0)}>
                      <Text style={s.link}>← Kembali ke pet passport</Text>
                    </Pressable>
                    {(
                      [
                        ["applicant_name", "Nama lengkap"],
                        ["phone", "Nomor untuk verifikasi privat"],
                        ["address", "Alamat tempat tinggal"],
                        ["reason", "Mengapa ingin mengadopsi?"],
                        ["experience", "Pengalaman merawat pet"],
                      ] as const
                    ).map(([key, label]) => (
                      <Field
                        key={key}
                        label={label}
                        value={application[key]}
                        change={(value) =>
                          setApplication((v) => ({ ...v, [key]: value }))
                        }
                        multiline={["address", "reason", "experience"].includes(
                          key,
                        )}
                      />
                    ))}
                    <Text style={s.label}>Tipe hunian</Text>
                    <View style={s.tabs}>
                      {(
                        ["Rumah milik", "Rumah sewa", "Apartemen"] as const
                      ).map((value) => (
                        <Pressable
                          key={value}
                          onPress={() =>
                            setApplication((v) => ({
                              ...v,
                              housing_type: value,
                            }))
                          }
                          style={[
                            s.chip,
                            application.housing_type === value && s.active,
                          ]}
                        >
                          <Text style={s.label}>{value}</Text>
                        </Pressable>
                      ))}
                    </View>
                    <View style={s.row}>
                      <Text style={s.label}>Memiliki pet lain</Text>
                      <Switch
                        value={application.has_other_pets}
                        onValueChange={(value) =>
                          setApplication((v) => ({
                            ...v,
                            has_other_pets: value,
                          }))
                        }
                      />
                    </View>
                    <Text style={s.copy}>
                      Kontak hanya untuk verifikasi privat; tidak
                      dipublikasikan.
                    </Text>
                    <PrimaryButton
                      label={busy ? "Mengirim…" : "Kirim pengajuan screening"}
                      disabled={busy}
                      onPress={() => void apply()}
                    />
                  </View>
                )}
              </>
            ))}
        </ScrollView>
      </BoundedBottomSheet>
      <BoundedBottomSheet
        visible={compose}
        onClose={() => {
          if (!busy && !uploading) setCompose(false);
        }}
        maxHeight="90%"
      >
        <ScrollView
          style={[s.sheetScroll, { maxHeight: screenHeight * 0.78 }]}
          contentContainerStyle={s.sheet}
          nestedScrollEnabled
          keyboardShouldPersistTaps="handled"
        >
          <Text style={s.eyebrow}>AJUKAN PET DARI KOLEKSI</Text>
          <Text style={s.heroTitle}>Mulai pet passport</Text>
          <Text style={s.copy}>
            Identitas dan kesehatan diperiksa sebelum tampil publik.
          </Text>
          <View style={s.tabs}>
            {ownPets.map((p) => (
              <Pressable
                key={p.id}
                disabled={uploading || busy}
                onPress={() => {
                  setPetID(p.id);
                  setPhotos([]);
                }}
                style={[s.chip, petID === p.id && s.active]}
              >
                <Text style={s.label}>{p.name}</Text>
              </Pressable>
            ))}
          </View>
          <Field label="Kota domisili" value={city} change={setCity} />
          <Field
            label="Cerita, kebutuhan & alasan adopsi"
            value={description}
            change={setDescription}
            multiline
          />
          <Field
            label="Karakter (pisahkan koma)"
            value={traits}
            change={setTraits}
          />
          <Field
            label="Kesehatan & kebutuhan khusus"
            value={health}
            change={setHealth}
            multiline
          />
          <View style={s.row}>
            <Text style={s.label}>Sudah vaksin</Text>
            <Switch value={vaccinated} onValueChange={setVaccinated} />
          </View>
          <View style={s.row}>
            <Text style={s.label}>Sudah steril</Text>
            <Switch value={sterilized} onValueChange={setSterilized} />
          </View>
          <Field
            label="Biaya adopsi tetap (Rp), 0 jika gratis"
            value={fee}
            change={setFee}
            numeric
          />
          <Text style={s.copy}>
            Jelaskan alasan biaya di cerita pet. Pengajuan screening tidak
            menarik pembayaran.
          </Text>
          <PrimaryButton
            label={
              uploading
                ? "Mengunggah foto…"
                : `Tambah foto (${photos.length}/10)`
            }
            disabled={uploading || busy || photos.length >= 10}
            onPress={() => void pickPhotos()}
            light
            icon="images-outline"
          />
          <Text style={s.copy}>
            Jika tidak menambah galeri, foto profil pet dipakai.
          </Text>
          <View style={s.tags}>
            {photos.map((uri, i) => (
              <Pressable
                key={uri}
                onPress={() =>
                  setPhotos((v) => v.filter((_, index) => index !== i))
                }
                accessibilityLabel={`Hapus foto ${i + 1}`}
              >
                <Image source={{ uri }} style={s.thumb} />
                <Text style={s.copy}>Hapus ×</Text>
              </Pressable>
            ))}
          </View>
          <PrimaryButton
            label={busy ? "Mengirim…" : "Kirim untuk diperiksa"}
            disabled={busy || uploading || !choosePet}
            onPress={() => void publish()}
          />
          <PrimaryButton
            label="Batal"
            disabled={busy || uploading}
            light
            onPress={() => setCompose(false)}
          />
        </ScrollView>
      </BoundedBottomSheet>
    </View>
  );
}
const s = StyleSheet.create({
  stack: { gap: 16 },
  hero: {
    padding: 22,
    borderRadius: 24,
    backgroundColor: "#DDF4FC",
    borderWidth: 1,
    borderColor: "#BFE6F4",
    gap: 14,
  },
  eyebrow: {
    color: colors.sky600,
    fontSize: 10,
    letterSpacing: 1,
    fontWeight: "700",
  },
  heroTitle: {
    color: colors.navy,
    fontSize: 26,
    lineHeight: 32,
    fontWeight: "700",
  },
  title: { color: colors.navy, fontSize: 20, fontWeight: "700" },
  copy: { color: colors.muted, fontSize: 13, lineHeight: 20 },
  tabs: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D6E7EF",
    backgroundColor: "#fff",
  },
  active: { backgroundColor: "#DDF4FC", borderColor: colors.sky600 },
  label: { color: colors.navy, fontSize: 13, fontWeight: "600" },
  field: { gap: 8 },
  input: {
    padding: 14,
    minHeight: 48,
    fontSize: 14,
    color: colors.navy,
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#D6E7EF",
  },
  textarea: { minHeight: 104, textAlignVertical: "top" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  card: {
    width: "48%",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#D6E7EF",
    backgroundColor: "#fff",
    borderRadius: 18,
  },
  cover: { width: "100%", aspectRatio: 0.85 },
  placeholder: {
    backgroundColor: "#EAF8FD",
    alignItems: "center",
    justifyContent: "center",
  },
  cardCopy: { padding: 12, gap: 8 },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  tag: {
    color: "#31796D",
    backgroundColor: "#E9F7EF",
    fontSize: 11,
    padding: 6,
    borderRadius: 8,
  },
  price: { fontSize: 19, fontWeight: "700", color: colors.sky600 },
  link: { color: colors.sky600, fontSize: 13, fontWeight: "600" },
  sheetScroll: { flexShrink: 1 },
  sheet: { padding: 22, paddingBottom: 34, gap: 16 },
  close: {
    alignSelf: "flex-end",
    minHeight: 42,
    minWidth: 42,
    alignItems: "center",
    justifyContent: "center",
  },
  facts: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  fact: {
    width: "48%",
    padding: 14,
    borderRadius: 14,
    backgroundColor: "#F1F9FC",
    gap: 6,
  },
  fee: { padding: 18, borderRadius: 18, backgroundColor: "#DDF4FC", gap: 8 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  thumb: { width: 84, height: 84, borderRadius: 12 },
});
