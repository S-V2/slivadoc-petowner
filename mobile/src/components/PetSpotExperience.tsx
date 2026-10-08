import { LocalizedPressable as Pressable } from "./LocalizedPressable";
/* Native Image uses accessibilityLabel rather than web alt. */
/* eslint-disable jsx-a11y/alt-text */
import { useEffect, useMemo, useState } from "react";
import {
  AppState,
  Image,
  Linking,

  StyleSheet,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { WorldItem } from "../api";
import { LocalizedText as Text, useI18n } from "../i18n";
import { colors } from "../theme";

const categories: Record<string, string> = {
  cafe: "Cafe",
  restaurant: "Restoran",
  park: "Taman",
  hotel: "Hotel",
  boarding_house: "Kosan / Coliving",
  apartment: "Apartemen",
  mall: "Mall",
  workspace: "Workspace",
  beach: "Pantai",
  store: "Pet shop",
};
export const petSpotCategory = (value?: string) =>
  categories[value ?? ""] ?? "Pet-friendly venue";

export function PetSpotCard({
  item,
  onOpen,
}: {
  item: WorldItem;
  onOpen: () => void;
}) {
  const { formatCurrency } = useI18n();
  const images = useMemo(
    () => [
      ...new Set(
        [item.cover_url, ...(item.image_urls ?? [])].filter(
          (url): url is string => Boolean(url),
        ),
      ),
    ],
    [item.cover_url, item.image_urls],
  );
  const [index, setIndex] = useState(0);
  const [foreground, setForeground] = useState(
    AppState.currentState === "active",
  );
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) =>
      setForeground(state === "active"),
    );
    return () => subscription.remove();
  }, []);
  useEffect(() => {
    if (images.length < 2 || !foreground) return;
    const timer = setInterval(
      () => setIndex((current) => (current + 1) % images.length),
      1000,
    );
    return () => clearInterval(timer);
  }, [images.length, foreground]);
  const rate = item.resources?.length
    ? Math.min(...item.resources.map((unit) => unit.base_price))
    : null;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Lihat detail ${item.name}`}
      onPress={onOpen}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.photo}>
        {images.length ? (
          <Image
            accessibilityLabel={`Foto ${item.name} ${(index % images.length) + 1}`}
            source={{ uri: images[index % images.length] }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.noPhoto}>
            <Ionicons
              name="storefront-outline"
              size={34}
              color={colors.sky600}
            />
            <Text style={styles.noPhotoText}>Foto belum tersedia</Text>
          </View>
        )}
        {item.id.startsWith("92000000-") ? (
          <View style={styles.verified}>
            <Text style={styles.verifiedText}>Demo · Foto ilustrasi</Text>
          </View>
        ) : item.verified ? (
          <View style={styles.verified}>
            <Ionicons name="checkmark-circle" size={11} color="#fff" />
            <Text style={styles.verifiedText}>Verified</Text>
          </View>
        ) : null}
        {images.length > 1 ? (
          <View style={styles.photoCount}>
            <Ionicons name="images-outline" size={11} color="#fff" />
            <Text style={styles.photoCountText}>
              {(index % images.length) + 1}/{images.length}
            </Text>
          </View>
        ) : null}
      </View>
      <View style={styles.copy}>
        <Text style={styles.category}>{petSpotCategory(item.category)}</Text>
        <Text numberOfLines={2} style={styles.title}>
          {item.name}
        </Text>
        <View style={styles.rating}>
          <Ionicons name="star" size={12} color="#e6a51c" />
          <Text style={styles.ratingText}>
            {(item.review_count ?? 0) > 0
              ? `${Number(item.rating).toFixed(1)} (${item.review_count})`
              : "Belum dinilai"}
          </Text>
        </View>
        <View style={styles.location}>
          <Ionicons name="location-outline" size={12} color={colors.muted} />
          <Text numberOfLines={1} style={styles.locationText}>
            {item.city}
            {typeof item.distance_km === "number"
              ? ` · ${item.distance_km.toFixed(1)} km`
              : ""}
          </Text>
        </View>
        <View style={styles.facilities}>
          {(item.pet_facilities ?? []).slice(0, 2).map((facility) => (
            <Text key={facility} numberOfLines={1} style={styles.facility}>
              {facility}
            </Text>
          ))}
        </View>
        <View style={styles.footer}>
          <Text style={styles.booking}>
            {rate !== null
              ? `Mulai ${formatCurrency(rate)}`
              : item.reservable
                ? "Reservasi tersedia"
                : "Lihat tempat"}
          </Text>
          <Ionicons name="arrow-forward" size={16} color={colors.sky600} />
        </View>
      </View>
    </Pressable>
  );
}

export function PetSpotVenueInformation({ item }: { item: WorldItem }) {
  const { formatDate, formatCurrency } = useI18n();
  const facilities = item.facility_details?.length
    ? item.facility_details
    : (item.pet_facilities ?? []);
  const policy = item.reservation_policy;
  const mapURL =
    typeof item.latitude === "number" && typeof item.longitude === "number"
      ? `https://www.google.com/maps/dir/?api=1&destination=${item.latitude},${item.longitude}`
      : undefined;
  return (
    <View style={styles.details}>
      <View style={styles.summary}>
        <View style={styles.score}>
          <Text style={styles.scoreNumber}>
            {(item.review_count ?? 0) > 0
              ? Number(item.rating).toFixed(1)
              : "—"}
          </Text>
        </View>
        <View style={styles.summaryCopy}>
          <Text style={styles.sectionTitle}>
            {(item.review_count ?? 0) > 0
              ? "Pengalaman pet parents"
              : "Tempat baru untuk dijelajahi"}
          </Text>
          <Text style={styles.note}>
            {item.review_count ?? 0} ulasan ·{" "}
            {item.verified ? "Partner terverifikasi" : "Rekomendasi komunitas"}
          </Text>
        </View>
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Lokasi & kontak</Text>
        <Text style={styles.body}>
          {item.address || "Alamat belum tersedia"}
        </Text>
        <Text style={styles.note}>{item.city}</Text>
        <View style={styles.contactRow}>
          {mapURL ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => void Linking.openURL(mapURL)}
              style={styles.contact}
            >
              <Ionicons
                name="navigate-outline"
                size={17}
                color={colors.sky600}
              />
              <Text style={styles.contactText}>Petunjuk arah</Text>
            </Pressable>
          ) : null}
          {item.phone ? (
            <Pressable
              accessibilityRole="button"
              onPress={() =>
                void Linking.openURL(
                  `tel:${item.phone?.replace(/[^+0-9]/g, "")}`,
                )
              }
              style={styles.contact}
            >
              <Ionicons name="call-outline" size={17} color={colors.sky600} />
              <Text style={styles.contactText}>Hubungi tempat</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Fasilitas tempat</Text>
        <View style={styles.facilityGrid}>
          {facilities.map((facility) => {
            const name =
              typeof facility === "string" ? facility : facility.name;
            return (
              <View key={name} style={styles.facilityTile}>
                <Ionicons
                  name="checkmark-circle-outline"
                  size={18}
                  color="#128464"
                />
                <View style={styles.flex}>
                  <Text style={styles.facilityName}>{name}</Text>
                  {typeof facility !== "string" && facility.description ? (
                    <Text style={styles.note}>{facility.description}</Text>
                  ) : null}
                </View>
              </View>
            );
          })}
        </View>
        {!facilities.length ? (
          <Text style={styles.note}>
            Pengelola belum menambahkan informasi fasilitas.
          </Text>
        ) : null}
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Jam operasional</Text>
        {Object.entries(item.opening_hours ?? {}).length ? (
          Object.entries(item.opening_hours ?? {}).map(([day, hours]) => (
            <View key={day} style={styles.factRow}>
              <Text style={styles.body}>
                {day === "daily" ? "Setiap hari" : day}
              </Text>
              <Text style={styles.factValue}>{hours}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.note}>
            Konfirmasi jam buka kepada pengelola sebelum berkunjung.
          </Text>
        )}
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Pet policy & aturan tempat</Text>
        {policy?.require_vaccine ? (
          <Text style={styles.rule}>✓ Bukti vaksin diperlukan</Text>
        ) : null}
        {[...(policy?.pet_rules ?? []), ...(policy?.house_rules ?? [])].map(
          (rule) => (
            <Text key={rule} style={styles.rule}>
              • {rule}
            </Text>
          ),
        )}
        {!policy?.pet_rules?.length && !policy?.house_rules?.length ? (
          <Text style={styles.note}>
            Tanyakan aturan ukuran, jenis pet, dan leash kepada pengelola.
          </Text>
        ) : null}
        {item.reservable ? (
          <View style={styles.policyFacts}>
            {typeof policy?.minimum_notice_minutes === "number" ? (
              <Text style={styles.note}>
                Pesan minimal {policy.minimum_notice_minutes} menit sebelum
                kunjungan.
              </Text>
            ) : null}
            {typeof policy?.maximum_party_size === "number" ? (
              <Text style={styles.note}>
                Maksimal {policy.maximum_party_size} tamu per reservasi.
              </Text>
            ) : null}
            {typeof policy?.cancellation_hours === "number" ? (
              <Text style={styles.note}>
                Batas pembatalan: {policy.cancellation_hours} jam sebelum jadwal
                {policy.cancellation_fee_percent
                  ? ` · biaya ${policy.cancellation_fee_percent}%`
                  : ""}
                .
              </Text>
            ) : null}
          </View>
        ) : null}
      </View>
      {item.resources?.length ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pilihan meja & unit</Text>
          <Text style={styles.note}>
            Pilih jadwal di bawah untuk memeriksa ketersediaan aktual.
          </Text>
          <View style={styles.facilityGrid}>
            {item.resources.map((unit) => (
              <View key={unit.id} style={styles.unit}>
                <View style={styles.flex}>
                  <Text style={styles.facilityName}>{unit.name}</Text>
                  <Text style={styles.note}>
                    {unit.floor_name || unit.resource_type} · {unit.capacity}{" "}
                    tamu
                  </Text>
                  {unit.description ? (
                    <Text style={styles.note}>{unit.description}</Text>
                  ) : null}
                </View>
                <Text style={styles.unitPrice}>
                  {formatCurrency(unit.base_price)}
                </Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}
      {item.supported_events?.length ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Aktivitas di tempat</Text>
          <View style={styles.facilityGrid}>
            {item.supported_events.map((event) => (
              <View key={event.name} style={styles.unit}>
                <View style={styles.flex}>
                  <Text style={styles.facilityName}>{event.name}</Text>
                  <Text style={styles.note}>{event.description}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      ) : null}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Ulasan pengunjung ({item.review_count ?? 0})
        </Text>
        {item.petspot_reviews?.length ? (
          item.petspot_reviews.map((review) => (
            <View key={review.id} style={styles.review}>
              <View style={styles.factRow}>
                <Text translate={false} style={styles.facilityName}>{review.reviewer_name}</Text>
                <Text style={styles.reviewStars}>★ {review.rating}/5</Text>
              </View>
              <Text style={styles.note}>
                {review.verified_visit ? "Kunjungan terverifikasi · " : ""}
                {formatDate(review.created_at, {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </Text>
              <Text style={styles.body}>
                {review.comment || "Pengunjung memberi rating tanpa komentar."}
              </Text>
            </View>
          ))
        ) : (
          <Text style={styles.note}>
            Belum ada ulasan pengunjung. Rating tidak dibuat secara otomatis.
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "48%",
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: colors.white,
  },
  pressed: { opacity: 0.8 },
  photo: { width: "100%", aspectRatio: 1.15, backgroundColor: colors.sky50 },
  noPhoto: { flex: 1, alignItems: "center", justifyContent: "center", gap: 7 },
  noPhotoText: { fontSize: 10, color: colors.muted },
  verified: {
    position: "absolute",
    left: 7,
    top: 7,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    padding: 5,
    borderRadius: 7,
    backgroundColor: "rgba(2,97,148,.85)",
  },
  verifiedText: { fontSize: 9, color: "#fff", fontWeight: "700" },
  photoCount: {
    position: "absolute",
    right: 7,
    bottom: 7,
    flexDirection: "row",
    gap: 4,
    padding: 5,
    borderRadius: 7,
    backgroundColor: "rgba(5,30,46,.7)",
  },
  photoCountText: { color: "#fff", fontSize: 9 },
  copy: { flex: 1, padding: 10, gap: 7 },
  category: { fontSize: 10, fontWeight: "700", color: colors.sky600 },
  title: {
    minHeight: 36,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "700",
    color: colors.navy,
  },
  rating: { flexDirection: "row", alignItems: "center", gap: 4 },
  ratingText: { color: colors.text, fontSize: 10 },
  location: { flexDirection: "row", alignItems: "center", gap: 3 },
  locationText: { flex: 1, fontSize: 10, color: colors.muted },
  facilities: { gap: 4 },
  facility: {
    borderRadius: 5,
    paddingHorizontal: 5,
    paddingVertical: 3,
    color: "#128464",
    backgroundColor: "#ecfdf5",
    fontSize: 9,
  },
  footer: {
    marginTop: "auto",
    paddingTop: 9,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  booking: { flex: 1, color: colors.sky600, fontSize: 10, fontWeight: "700" },
  details: { marginTop: 18, gap: 16 },
  summary: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    padding: 14,
    borderRadius: 16,
    backgroundColor: colors.sky50,
  },
  score: {
    width: 48,
    height: 48,
    borderRadius: 13,
    backgroundColor: colors.sky600,
    alignItems: "center",
    justifyContent: "center",
  },
  scoreNumber: { color: "#fff", fontSize: 20, fontWeight: "700" },
  summaryCopy: { flex: 1, gap: 5 },
  section: {
    gap: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 16,
    backgroundColor: "#fff",
  },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: colors.navy },
  body: { fontSize: 12, lineHeight: 19, color: colors.text },
  note: { fontSize: 11, lineHeight: 17, color: colors.muted },
  facilityGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  facilityTile: {
    width: "48%",
    flexGrow: 1,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 7,
    padding: 10,
    borderRadius: 10,
    backgroundColor: colors.sky50,
  },
  facilityName: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "700",
    color: colors.navy,
  },
  flex: { flex: 1, gap: 4 },
  contactRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  contact: {
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: colors.sky50,
  },
  contactText: { fontSize: 11, fontWeight: "700", color: colors.sky600 },
  factRow: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  factValue: { fontSize: 12, fontWeight: "600", color: colors.navy },
  rule: { fontSize: 12, lineHeight: 19, color: colors.text },
  policyFacts: {
    padding: 10,
    borderRadius: 10,
    backgroundColor: colors.sky50,
    gap: 5,
  },
  unit: {
    width: "48%",
    flexGrow: 1,
    flexDirection: "row",
    gap: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  unitPrice: { color: colors.sky600, fontWeight: "700", fontSize: 12 },
  review: {
    gap: 7,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  reviewStars: { color: "#b77909", fontSize: 12, fontWeight: "700" },
});
