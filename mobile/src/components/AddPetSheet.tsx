import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { dateKey } from "../../../shared/calendar";
import { petProfilePayload, type PetProfileDraft, type PetSpeciesOption } from "../../../shared/pet-profile";
import { createMobilePet, getMobilePetSpecies } from "../api";
import { LocalizedText as Text, LocalizedTextInput as TextInput } from "../i18n";
import { colors } from "../theme";
import { LocalizedPressable as Pressable } from "./LocalizedPressable";
import { BoundedBottomSheet } from "./ui";
import { SlivaOptionPicker } from "./SlivaOptionPicker";
import { SlivaDatePicker } from "./SlivaDatePicker";

const blank: PetProfileDraft = { name: "", speciesCode: "", customSpecies: "", customScientificName: "", breed: "", sex: "unknown", birthDate: "", weight: "" };
export function AddPetSheet({ onClose, onSaved }: { onClose: () => void; onSaved: (id: string) => Promise<void> }) {
  const [draft, setDraft] = useState(blank);
  const [species, setSpecies] = useState<PetSpeciesOption[]>([]);
  const [speciesLoading, setSpeciesLoading] = useState(true);
  const [speciesError, setSpeciesError] = useState("");
  const [speciesAttempt, setSpeciesAttempt] = useState(0);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const created = useRef("");
  const saving = useRef(false);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    let active = true;
    queueMicrotask(() => { if (active) { setSpeciesLoading(true); setSpeciesError(""); } });
    void getMobilePetSpecies().then((result) => { if (active) { setSpecies(result.data); if (!result.data.length) setSpeciesError("Katalog spesies belum tersedia. Coba lagi."); } })
      .catch(() => { if (active) setSpeciesError("Katalog spesies belum dapat dimuat. Coba lagi."); })
      .finally(() => { if (active) setSpeciesLoading(false); });
    return () => { active = false; };
  }, [speciesAttempt]);
  const change = <K extends keyof PetProfileDraft>(key: K, value: PetProfileDraft[K]) => { setMessage(""); setDraft((current) => ({ ...current, [key]: value })); };
  const save = async () => {
    if (saving.current) return;
    saving.current = true;
    setMessage("");
    try {
      const input = created.current ? null : petProfilePayload(draft, species);
      setBusy(true);
      if (input) { const result = await createMobilePet(input); created.current = result.id; setSaved(true); }
      await onSaved(created.current);
      onClose();
    } catch (cause) {
      setMessage(created.current ? "Pet sudah tersimpan. Muat ulang profil untuk melanjutkan." : cause instanceof Error ? cause.message : "Profil hewan belum dapat disimpan");
    } finally { saving.current = false; setBusy(false); }
  };
  return <BoundedBottomSheet visible onClose={() => { if (!saving.current) onClose(); }} maxHeight="92%">
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.header}><View style={styles.heading}><Text style={styles.eyebrow}>ANGGOTA KELUARGA BARU</Text><Text accessibilityRole="header" style={styles.title}>Tambah profil hewan</Text></View><Pressable accessibilityLabel="Tutup" disabled={busy} onPress={onClose} style={styles.close}><Ionicons name="close" size={22} color={colors.navy}/></Pressable></View>
      <Text style={styles.note}>Lengkapi identitas dasar agar perawatan lebih personal.</Text>
      <Text style={styles.label}>Nama pet *</Text><TextInput accessibilityLabel="Nama pet" editable={!busy && !saved} placeholder="Nama pet" value={draft.name} onChangeText={(value) => change("name", value)} maxLength={120} style={styles.input}/>
      <Text style={styles.label}>Jenis hewan *</Text><SlivaOptionPicker label="Jenis hewan" value={draft.speciesCode} options={species.map((item) => ({ value: item.code, label: item.label }))} loading={speciesLoading} error={speciesError} onRetry={() => setSpeciesAttempt((attempt) => attempt + 1)} disabled={busy || saved} onChange={(value) => change("speciesCode", value)}/>
      {speciesError && <View style={styles.feedback}><Text accessibilityRole="alert" style={styles.error}>{speciesError}</Text><Pressable style={styles.retry} disabled={speciesLoading || busy} onPress={() => setSpeciesAttempt((attempt) => attempt + 1)}><Text>Coba lagi</Text></Pressable></View>}
      {draft.speciesCode === "other" && <>
        <Text style={styles.label}>Nama spesies *</Text><TextInput accessibilityLabel="Nama spesies" editable={!busy && !saved} value={draft.customSpecies} onChangeText={(value) => change("customSpecies", value)} style={styles.input}/>
        <Text style={styles.label}>Nama ilmiah (opsional)</Text><TextInput accessibilityLabel="Nama ilmiah" editable={!busy && !saved} value={draft.customScientificName} onChangeText={(value) => change("customScientificName", value)} style={styles.input}/>
      </>}
      <Text style={styles.label}>Ras (opsional)</Text><TextInput accessibilityLabel="Ras" editable={!busy && !saved} value={draft.breed} onChangeText={(value) => change("breed", value)} style={styles.input}/>
      <Text style={styles.label}>Jenis kelamin</Text><View style={styles.choices}>{([{ value: "male", label: "Jantan" }, { value: "female", label: "Betina" }, { value: "unknown", label: "Belum diketahui" }] as const).map((item) => <Pressable key={item.value} accessibilityRole="radio" accessibilityState={{ checked: draft.sex === item.value }} disabled={busy || saved} onPress={() => change("sex", item.value)} style={[styles.choice, draft.sex === item.value && styles.active]}><Text>{item.label}</Text></Pressable>)}</View>
      <Text style={styles.label}>Tanggal lahir (opsional)</Text><SlivaDatePicker label="Tanggal lahir" value={draft.birthDate} max={dateKey(new Date())} disabled={busy || saved} onChangeText={(value) => change("birthDate", value)}/>
      <Text style={styles.label}>Berat badan (kg, opsional)</Text><TextInput accessibilityLabel="Berat badan (kg)" editable={!busy && !saved} keyboardType="decimal-pad" value={draft.weight} onChangeText={(value) => change("weight", value)} style={styles.input}/>
      {!!message && <Text accessibilityRole="alert" style={styles.error}>{message}</Text>}
      <Pressable disabled={busy || speciesLoading || !!speciesError} accessibilityState={{ disabled: busy || speciesLoading || !!speciesError }} onPress={() => void save()} style={[styles.primary, (busy || speciesLoading || !!speciesError) && styles.disabled]}>{busy ? <ActivityIndicator color={colors.white}/> : <Text style={styles.primaryText}>{saved ? "Muat ulang profil" : "Simpan profil hewan"}</Text>}</Pressable>
    </ScrollView>
  </BoundedBottomSheet>;
}
const styles = StyleSheet.create({
  content: { padding: 18, gap: 10 }, header: { flexDirection: "row", alignItems: "center", gap: 12 }, heading: { flex: 1 },
  eyebrow: { color: colors.sky600, fontSize: 10, fontWeight: "700", letterSpacing: 1 }, title: { color: colors.navy, fontSize: 24, fontWeight: "700", marginTop: 6 },
  close: { width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: 14, backgroundColor: colors.sky50 },
  note: { color: colors.muted, fontSize: 13, lineHeight: 19, marginBottom: 8 }, label: { color: colors.navy, fontSize: 13, fontWeight: "600", marginTop: 6 },
  input: { minHeight: 48, padding: 12, borderWidth: 1, borderColor: colors.sky100, borderRadius: 14, color: colors.navy, backgroundColor: colors.white },
  choices: { flexDirection: "row", flexWrap: "wrap", gap: 8 }, choice: { minHeight: 44, padding: 12, borderWidth: 1, borderColor: colors.sky100, borderRadius: 14 }, active: { borderColor: colors.sky600, backgroundColor: colors.sky50 },
  feedback: { gap: 8 }, error: { color: colors.red, fontSize: 13, lineHeight: 19 }, retry: { minHeight: 44, alignSelf: "flex-start", padding: 12, borderRadius: 14, backgroundColor: colors.sky50 },
  primary: { minHeight: 48, alignItems: "center", justifyContent: "center", padding: 12, marginTop: 10, borderRadius: 14, backgroundColor: colors.sky600 }, primaryText: { color: colors.white, fontSize: 15, fontWeight: "700" }, disabled: { opacity: 0.5 },
});
