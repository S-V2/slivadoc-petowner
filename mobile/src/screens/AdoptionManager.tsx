import { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import {
  getMobileAdoptionListingApplications,
  getMobileMyAdoptionApplications,
  getMobileMyAdoptionListings,
  reviewMobileAdoptionApplication,
  withdrawMobileAdoptionApplication,
  type MobileAdoptionApplicationRecord,
  type MobileAdoptionApplicationStatus,
  type MobileMyAdoptionApplication,
  type MobileMyAdoptionListing,
} from "../api";
import { LocalizedText as Text, LocalizedTextInput as TextInput } from "../i18n";
import { colors } from "../theme";

type ReviewStatus = Parameters<typeof reviewMobileAdoptionApplication>[1];

const statusLabel: Record<MobileAdoptionApplicationStatus, string> = {
  submitted: "Diajukan",
  screening: "Sedang ditinjau",
  home_visit: "Kunjungan rumah",
  approved: "Disetujui",
  rejected: "Belum berhasil",
  completed: "Adopsi selesai",
  withdrawn: "Ditarik",
};

const transitions: Partial<Record<MobileAdoptionApplicationStatus, ReviewStatus[]>> = {
  submitted: ["screening", "rejected"],
  screening: ["home_visit", "approved", "rejected"],
  home_visit: ["approved", "rejected"],
  approved: ["completed"],
};

const actionLabel: Record<ReviewStatus, string> = {
  screening: "Mulai tinjau",
  home_visit: "Jadwalkan kunjungan",
  approved: "Setujui",
  rejected: "Tolak",
  completed: "Tandai selesai",
};

const withdrawable: Partial<Record<MobileAdoptionApplicationStatus, true>> = { submitted: true, screening: true, home_visit: true, approved: true };

const errorMessage = (error: unknown, fallback: string) => (error instanceof Error ? error.message : fallback);

function ListingApplications({ listingId, onAction, changed }: { listingId: string; onAction: (message: string) => void; changed: () => Promise<void> }) {
  const [apps, setApps] = useState<MobileAdoptionApplicationRecord[] | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    try {
      setApps((await getMobileAdoptionListingApplications(listingId)).data ?? []);
    } catch (error) {
      setApps([]);
      onAction(errorMessage(error, "Lamaran belum dapat dimuat"));
    }
  }, [listingId, onAction]);
  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);
  const review = async (app: MobileAdoptionApplicationRecord, status: ReviewStatus) => {
    setBusy(true);
    try {
      await reviewMobileAdoptionApplication(app.id, status, (notes[app.id] ?? "").trim());
      onAction(`Lamaran ${app.applicant_name}: ${statusLabel[status]}`);
      setNotes((current) => ({ ...current, [app.id]: "" }));
      await Promise.all([load(), changed()]);
    } catch (error) {
      onAction(errorMessage(error, "Lamaran belum dapat diproses"));
    } finally {
      setBusy(false);
    }
  };
  if (!apps) return <Text style={styles.note}>Memuat lamaran…</Text>;
  if (!apps.length) return <Text style={styles.note}>Belum ada lamaran masuk.</Text>;
  return (
    <View style={styles.stack}>
      {apps.map((app) => (
        <View key={app.id} style={styles.application}>
          <View style={styles.row}>
            <Text style={styles.title}>{app.applicant_name}</Text>
            <Text style={styles.badge}>{statusLabel[app.status] ?? app.status}</Text>
          </View>
          <Text style={styles.note}>{`Telepon: ${app.phone}`}</Text>
          <Text style={styles.note}>{`Alamat: ${app.address}`}</Text>
          <Text style={styles.note}>{`Tempat tinggal: ${app.housing_type} · Hewan lain: ${app.has_other_pets ? "Ya" : "Tidak"}`}</Text>
          <Text style={styles.note}>{`Pengalaman: ${app.experience || "-"}`}</Text>
          <Text style={styles.note}>{`Alasan: ${app.reason}`}</Text>
          {app.status_note ? <Text style={styles.note}>{`Catatan: ${app.status_note}`}</Text> : null}
          {transitions[app.status] ? (
            <>
              <TextInput
                value={notes[app.id] ?? ""}
                onChangeText={(value) => setNotes((current) => ({ ...current, [app.id]: value }))}
                placeholder="Catatan untuk pelamar (opsional)"
                placeholderTextColor={colors.muted}
                accessibilityLabel={`Catatan untuk ${app.applicant_name}`}
                style={styles.input}
              />
              <View style={styles.actions}>
                {transitions[app.status]?.map((next) => (
                  <Pressable
                    key={next}
                    accessibilityRole="button"
                    disabled={busy}
                    onPress={() => void review(app, next)}
                    style={[styles.button, next === "rejected" && styles.buttonSecondary, busy && styles.disabled]}
                  >
                    <Text style={[styles.buttonText, next === "rejected" && styles.buttonSecondaryText]}>{actionLabel[next]}</Text>
                  </Pressable>
                ))}
              </View>
            </>
          ) : null}
        </View>
      ))}
    </View>
  );
}

export function AdoptionManager({ onAction }: { onAction: (message: string) => void }) {
  const [applications, setApplications] = useState<MobileMyAdoptionApplication[] | null>(null);
  const [listings, setListings] = useState<MobileMyAdoptionListing[] | null>(null);
  const [openId, setOpenId] = useState("");
  const [busy, setBusy] = useState(false);
  const loadApplications = useCallback(async () => {
    try {
      setApplications((await getMobileMyAdoptionApplications()).data ?? []);
    } catch (error) {
      setApplications([]);
      onAction(errorMessage(error, "Lamaran belum dapat dimuat"));
    }
  }, [onAction]);
  const loadListings = useCallback(async () => {
    try {
      setListings((await getMobileMyAdoptionListings()).data ?? []);
    } catch (error) {
      setListings([]);
      onAction(errorMessage(error, "Listing belum dapat dimuat"));
    }
  }, [onAction]);
  useEffect(() => {
    queueMicrotask(() => {
      void loadApplications();
      void loadListings();
    });
  }, [loadApplications, loadListings]);
  const withdraw = async (item: MobileMyAdoptionApplication) => {
    setBusy(true);
    try {
      await withdrawMobileAdoptionApplication(item.id);
      onAction(`Lamaran ${item.listing_name} ditarik`);
      await loadApplications();
    } catch (error) {
      onAction(errorMessage(error, "Lamaran belum dapat ditarik"));
    } finally {
      setBusy(false);
    }
  };
  return (
    <View style={styles.stack}>
      <Text style={styles.heading}>Lamaran saya</Text>
      {!applications ? (
        <Text style={styles.note}>Memuat lamaran…</Text>
      ) : !applications.length ? (
        <Text style={styles.note}>Belum ada lamaran adopsi. Pilih pet di atas untuk mengajukan.</Text>
      ) : (
        applications.map((item) => (
          <View key={item.id} style={styles.application}>
            <View style={styles.row}>
              <Text style={styles.title}>{item.listing_name}</Text>
              <Text style={styles.badge}>{statusLabel[item.status] ?? item.status}</Text>
            </View>
            {item.status_note ? <Text style={styles.note}>{`Catatan: ${item.status_note}`}</Text> : null}
            {withdrawable[item.status] ? (
              <Pressable
                accessibilityRole="button"
                disabled={busy}
                onPress={() => void withdraw(item)}
                style={[styles.button, styles.buttonSecondary, busy && styles.disabled]}
              >
                <Text style={styles.buttonSecondaryText}>Tarik lamaran</Text>
              </Pressable>
            ) : null}
          </View>
        ))
      )}
      {listings?.length ? (
        <>
          <Text style={styles.heading}>Listing adopsi saya</Text>
          {listings.map((item) => (
            <View key={item.id} style={styles.application}>
              <View style={styles.row}>
                <View style={styles.grow}>
                  <Text style={styles.title}>{item.name}</Text>
                  <Text style={styles.note}>{`${item.breed || item.species} · ${item.city} · ${item.status}`}</Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ expanded: openId === item.id }}
                  onPress={() => setOpenId(openId === item.id ? "" : item.id)}
                  style={[styles.button, styles.buttonSecondary]}
                >
                  <Text style={styles.buttonSecondaryText}>{`${item.applicant_count} lamaran`}</Text>
                </Pressable>
              </View>
              {openId === item.id ? <ListingApplications listingId={item.id} onAction={onAction} changed={loadListings} /> : null}
            </View>
          ))}
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 10, marginTop: 16 },
  heading: { color: colors.navy, fontSize: 17, fontWeight: "700" },
  application: { gap: 6, padding: 13, borderWidth: 1, borderColor: colors.sky100, borderRadius: 18, backgroundColor: colors.white },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  grow: { flex: 1 },
  title: { flexShrink: 1, color: colors.navy, fontSize: 14, fontWeight: "700" },
  note: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  badge: { overflow: "hidden", paddingHorizontal: 9, paddingVertical: 4, borderRadius: 10, backgroundColor: colors.sky50, color: colors.sky600, fontSize: 10, fontWeight: "700" },
  input: { minHeight: 42, paddingHorizontal: 12, borderWidth: 1, borderColor: colors.sky100, borderRadius: 14, backgroundColor: colors.canvas, color: colors.text, fontSize: 13 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  button: { minHeight: 40, alignItems: "center", justifyContent: "center", paddingHorizontal: 14, borderRadius: 13, backgroundColor: colors.sky600 },
  buttonText: { color: colors.white, fontSize: 12, fontWeight: "700" },
  buttonSecondary: { borderWidth: 1, borderColor: colors.sky100, backgroundColor: colors.white },
  buttonSecondaryText: { color: colors.sky600, fontSize: 12, fontWeight: "700" },
  disabled: { opacity: 0.55 },
});
