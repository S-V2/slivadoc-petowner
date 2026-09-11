import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  getMobileActivityCenter,
  getMobileTransactionInvoiceHTML,
  type MobileActivityCenterItem,
  type MobileActivityOrderItem,
  type MobileActivityState,
  type MobileActivityType,
} from "../api";
import {
  BoundedBottomSheet,
  Card,
  EmptyState,
  PetRequiredNotice,
  Pill,
  PrimaryButton,
  Screen,
} from "../components/ui";
import { LocalizedText as Text, useI18n } from "../i18n";
import { colors, shadow, typography } from "../theme";

type TypeFilter = MobileActivityType | "all";
type PillTone = "blue" | "mint" | "yellow" | "violet" | "red";

type ActivityScreenProps = {
  authenticated: boolean;
  hasPet: boolean;
  refreshVersion: number;
  onAction: (message: string) => void;
  onOpenNotifications: () => void;
  onLogin: () => void;
  onRequirePet: () => void;
  onCreateBooking: () => void;
  onCreateOrder: () => void;
  onCreateConsultation: () => void;
  onRebook: (serviceId?: string) => void;
  onReorder: (items: MobileActivityOrderItem[]) => void;
  onReconsult: (planId?: string) => void;
  onOpenProduct: (productId: string) => void;
};

const typeOptions: Array<{
  id: TypeFilter;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}> = [
  { id: "all", label: "Semua", icon: "sparkles-outline" },
  { id: "booking", label: "Booking", icon: "calendar-outline" },
  { id: "order", label: "Belanja", icon: "bag-handle-outline" },
  { id: "consultation", label: "Konsultasi", icon: "chatbubbles-outline" },
];

const stateOptions: Array<{ id: MobileActivityState; label: string }> = [
  { id: "all", label: "Semua" },
  { id: "upcoming", label: "Mendatang" },
  { id: "ongoing", label: "Berjalan" },
  { id: "history", label: "Riwayat" },
];

function formatActivityDate(value: string | null | undefined, locale: string) {
  if (!value) return "Belum dijadwalkan";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? "Belum dijadwalkan"
    : new Intl.DateTimeFormat(locale, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(parsed);
}

function typePresentation(type: MobileActivityType) {
  if (type === "booking") {
    return {
      label: "Booking",
      icon: "calendar-outline" as const,
      color: colors.sky600,
      surface: colors.sky50,
    };
  }
  if (type === "order") {
    return {
      label: "Belanja",
      icon: "bag-handle-outline" as const,
      color: "#6655C7",
      surface: colors.violet50,
    };
  }
  return {
    label: "Konsultasi",
    icon: "chatbubbles-outline" as const,
    color: "#14836E",
    surface: colors.mint50,
  };
}

function statusPresentation(status: string): { label: string; tone: PillTone } {
  const normalized = status.toLowerCase();
  const labels: Record<string, string> = {
    pending_payment: "Menunggu pembayaran",
    requested: "Menunggu konfirmasi",
    confirmed: "Terkonfirmasi",
    scheduled: "Terjadwal",
    waiting: "Menunggu dokter",
    active: "Sedang berlangsung",
    in_progress: "Sedang berlangsung",
    processing: "Diproses",
    shipped: "Dikirim",
    completed: "Selesai",
    cancelled: "Dibatalkan",
    no_show: "Tidak hadir",
  };
  if (normalized === "completed") return { label: "Selesai", tone: "mint" };
  if (normalized === "cancelled" || normalized === "no_show")
    return { label: labels[normalized] ?? status, tone: "red" };
  if (["active", "in_progress", "processing", "shipped"].includes(normalized)) {
    return { label: labels[normalized] ?? status, tone: "blue" };
  }
  return {
    label: labels[normalized] ?? status.replaceAll("_", " "),
    tone: "yellow",
  };
}

function repeatLabel(item: MobileActivityCenterItem) {
  if (item.type === "booking") return "Booking lagi";
  if (item.type === "order") return "Beli lagi";
  return "Konsultasi ulang";
}

function ActivityCard({
  item,
  onDetail,
  onRepeat,
}: {
  item: MobileActivityCenterItem;
  onDetail: () => void;
  onRepeat: () => void;
}) {
  const { formatCurrency, locale } = useI18n();
  const presentation = typePresentation(item.type);
  const status = statusPresentation(item.status);
  const when = item.scheduled_at || item.occurred_at;
  return (
    <Card style={styles.activityCard}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Lihat detail ${item.title}`}
        onPress={onDetail}
        style={({ pressed }) => [styles.activityTop, pressed && styles.pressed]}
      >
        <View
          style={[
            styles.activityIcon,
            { backgroundColor: presentation.surface },
          ]}
        >
          <Ionicons
            name={presentation.icon}
            size={21}
            color={presentation.color}
          />
        </View>
        <View style={styles.activityCopy}>
          <View style={styles.activityMetaRow}>
            <Text style={[styles.activityType, { color: presentation.color }]}>
              {presentation.label} · {item.code}
            </Text>
            <Pill tone={status.tone}>{status.label}</Pill>
          </View>
          <Text numberOfLines={1} style={styles.activityTitle}>
            {item.title}
          </Text>
          <Text numberOfLines={1} style={styles.activitySubtitle}>
            {item.subtitle}
          </Text>
          <View style={styles.compactMeta}>
            <Ionicons name="time-outline" size={13} color={colors.muted} />
            <Text numberOfLines={1} style={styles.dateInlineText}>
              {formatActivityDate(when, locale)}
            </Text>
            <Text style={styles.metaDivider}>•</Text>
            <Text numberOfLines={1} style={styles.amountInline}>
              {formatCurrency(item.total_amount ?? item.amount)}
            </Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={17} color={colors.muted} />
      </Pressable>
      <View style={styles.compactFooter}>
        <View style={styles.contextInline}>
          <Ionicons
            name={item.type === "order" ? "cube-outline" : "paw-outline"}
            size={14}
            color={presentation.color}
          />
          <Text numberOfLines={1} style={styles.activityHint}>
            {item.type === "order" && item.item_count
              ? `${item.item_count} produk`
              : item.pet_name || "Pet kamu"}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={onRepeat}
          style={({ pressed }) => [
            styles.repeatButton,
            pressed && styles.pressed,
          ]}
        >
          <Ionicons name="refresh-outline" size={14} color={colors.sky600} />
          <Text style={styles.repeatText}>{repeatLabel(item)}</Text>
        </Pressable>
      </View>
    </Card>
  );
}

function CreateActivitySheet({
  visible,
  onClose,
  onBooking,
  onOrder,
  onConsultation,
}: {
  visible: boolean;
  onClose: () => void;
  onBooking: () => void;
  onOrder: () => void;
  onConsultation: () => void;
}) {
  const actions = [
    {
      label: "Booking layanan",
      note: "Pilih layanan dari seluruh klinik dan petshop",
      icon: "calendar-outline" as const,
      tone: colors.sky600,
      surface: colors.sky50,
      action: onBooking,
    },
    {
      label: "Belanja produk",
      note: "Cari kebutuhan pet dari marketplace Slivadoc",
      icon: "bag-handle-outline" as const,
      tone: "#6655C7",
      surface: colors.violet50,
      action: onOrder,
    },
    {
      label: "Konsultasi dokter",
      note: "Pilih dokter dan paket konsultasi yang sesuai",
      icon: "chatbubbles-outline" as const,
      tone: "#14836E",
      surface: colors.mint50,
      action: onConsultation,
    },
  ];
  return (
    <BoundedBottomSheet visible={visible} onClose={onClose} maxHeight="68%">
      <View style={styles.createSheetHeader}>
        <View>
          <Text style={styles.sectionEyebrow}>AKTIVITAS BARU</Text>
          <Text style={styles.createSheetTitle}>Mau melakukan apa?</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Tutup pilihan aktivitas"
          onPress={onClose}
          style={styles.sheetClose}
        >
          <Ionicons name="close" size={21} color={colors.text} />
        </Pressable>
      </View>
      <ScrollView
        contentContainerStyle={styles.createSheetContent}
        showsVerticalScrollIndicator={false}
      >
        {actions.map((item) => (
          <Pressable
            key={item.label}
            accessibilityRole="button"
            onPress={() => {
              onClose();
              item.action();
            }}
            style={({ pressed }) => [
              styles.createChoice,
              pressed && styles.pressed,
            ]}
          >
            <View
              style={[
                styles.createChoiceIcon,
                { backgroundColor: item.surface },
              ]}
            >
              <Ionicons name={item.icon} size={21} color={item.tone} />
            </View>
            <View style={styles.createChoiceCopy}>
              <Text style={styles.createChoiceTitle}>{item.label}</Text>
              <Text style={styles.createChoiceNote}>{item.note}</Text>
            </View>
            <Ionicons name="arrow-forward" size={18} color={item.tone} />
          </Pressable>
        ))}
      </ScrollView>
    </BoundedBottomSheet>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
}) {
  if (!value) return null;
  return (
    <View style={styles.detailRow}>
      <View style={styles.detailRowIcon}>
        <Ionicons name={icon} size={16} color={colors.sky600} />
      </View>
      <View style={styles.detailRowCopy}>
        <Text style={styles.detailRowLabel}>{label}</Text>
        <Text style={styles.detailRowValue}>{value}</Text>
      </View>
    </View>
  );
}

function ActivityDetailSheet({
  item,
  onClose,
  onOpenProduct,
  onRepeat,
}: {
  item?: MobileActivityCenterItem;
  onClose: () => void;
  onOpenProduct: (productId: string) => void;
  onRepeat: () => void;
}) {
  const { formatCurrency, locale } = useI18n();
  const [invoiceBusy, setInvoiceBusy] = useState(false);
  if (!item) return null;
  const presentation = typePresentation(item.type);
  const status = statusPresentation(item.status);
  const invoiceReferenceType = {
    booking: "petowner_booking",
    order: "shop_order",
    consultation: "consultation",
  }[item.type];
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <SafeAreaView
          edges={["bottom", "left", "right"]}
          style={styles.sheetSafeArea}
        >
          <Pressable
            style={styles.sheet}
            onPress={(event) => event.stopPropagation()}
          >
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <View
                style={[
                  styles.sheetHeaderIcon,
                  { backgroundColor: presentation.surface },
                ]}
              >
                <Ionicons
                  name={presentation.icon}
                  size={21}
                  color={presentation.color}
                />
              </View>
              <View style={styles.sheetHeaderCopy}>
                <Text
                  style={[styles.sheetEyebrow, { color: presentation.color }]}
                >
                  DETAIL {presentation.label.toUpperCase()}
                </Text>
                <Text numberOfLines={1} style={styles.sheetTitle}>
                  {item.code}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Tutup detail"
                onPress={onClose}
                style={styles.sheetClose}
              >
                <Ionicons name="close" size={22} color={colors.text} />
              </Pressable>
            </View>
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.sheetContent}
            >
              <View
                style={[
                  styles.detailHero,
                  { backgroundColor: presentation.surface },
                ]}
              >
                <Pill tone={status.tone}>{status.label}</Pill>
                <Text style={styles.detailTitle}>{item.title}</Text>
                <Text style={styles.detailSubtitle}>{item.subtitle}</Text>
                <Text style={styles.detailAmount}>
                  {formatCurrency(item.total_amount ?? item.amount)}
                </Text>
              </View>

              {item.type === "booking" ? (
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>
                    Informasi booking
                  </Text>
                  <DetailRow
                    icon="calendar-outline"
                    label="Jadwal"
                    value={formatActivityDate(item.scheduled_at, locale)}
                  />
                  <DetailRow
                    icon="time-outline"
                    label="Durasi"
                    value={
                      item.service_duration_minutes
                        ? `${item.service_duration_minutes} menit`
                        : undefined
                    }
                  />
                  <DetailRow
                    icon="paw-outline"
                    label="Pet"
                    value={item.pet_name}
                  />
                  <DetailRow
                    icon="storefront-outline"
                    label="Klinik / petshop"
                    value={[item.business_name, item.branch_name]
                      .filter(Boolean)
                      .join(" · ")}
                  />
                  <DetailRow
                    icon="location-outline"
                    label="Lokasi"
                    value={[item.address, item.city].filter(Boolean).join(", ")}
                  />
                  <DetailRow
                    icon="document-text-outline"
                    label="Catatan"
                    value={item.notes || "Tidak ada catatan tambahan"}
                  />
                </View>
              ) : null}

              {item.type === "order" ? (
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>
                    Produk dalam pesanan
                  </Text>
                  {(item.items ?? []).map((product) => (
                    <View key={product.id} style={styles.productRow}>
                      <View style={styles.productImageFallback}>
                        <Ionicons
                          name="cube-outline"
                          size={20}
                          color="#6655C7"
                        />
                      </View>
                      <View style={styles.productCopy}>
                        <Text numberOfLines={2} style={styles.productName}>
                          {product.name}
                        </Text>
                        <Text style={styles.productStore}>
                          {product.business_name} · {product.quantity} item
                        </Text>
                        <Text style={styles.productPrice}>
                          {formatCurrency(product.line_total)}
                        </Text>
                      </View>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Lihat ${product.name}`}
                        onPress={() => onOpenProduct(product.product_id)}
                        style={styles.productOpen}
                      >
                        <Ionicons
                          name="arrow-forward"
                          size={17}
                          color={colors.sky600}
                        />
                      </Pressable>
                    </View>
                  ))}
                  <View style={styles.priceBreakdown}>
                    <View style={styles.priceLine}>
                      <Text style={styles.priceLabel}>Subtotal</Text>
                      <Text style={styles.priceValue}>
                        {formatCurrency(item.subtotal ?? 0)}
                      </Text>
                    </View>
                    <View style={styles.priceLine}>
                      <Text style={styles.priceLabel}>Biaya platform</Text>
                      <Text style={styles.priceValue}>
                        {formatCurrency(item.platform_fee ?? 0)}
                      </Text>
                    </View>
                    <View style={styles.priceLine}>
                      <Text style={styles.priceLabel}>Ongkir Lion Parcel</Text>
                      <Text style={styles.priceValue}>
                        {formatCurrency(item.shipping_fee ?? 0)}
                      </Text>
                    </View>
                    {item.discount_amount ? (
                      <View style={styles.priceLine}>
                        <Text style={styles.priceDiscountLabel}>
                          Voucher {item.voucher_code || "promo"}
                        </Text>
                        <Text style={styles.priceDiscountValue}>
                          −{formatCurrency(item.discount_amount)}
                        </Text>
                      </View>
                    ) : null}
                    {item.points_discount ? (
                      <View style={styles.priceLine}>
                        <Text style={styles.priceDiscountLabel}>
                          {item.points_redeemed ?? 0} Sliva Points
                        </Text>
                        <Text style={styles.priceDiscountValue}>
                          −{formatCurrency(item.points_discount)}
                        </Text>
                      </View>
                    ) : null}
                    <View style={[styles.priceLine, styles.priceTotal]}>
                      <Text style={styles.priceTotalLabel}>Total</Text>
                      <Text style={styles.priceTotalValue}>
                        {formatCurrency(item.total_amount ?? item.amount)}
                      </Text>
                    </View>
                  </View>
                  {(item.shipments ?? []).map((shipment) => (
                    <View key={shipment.id} style={styles.shipmentCard}>
                      <View style={styles.shipmentTitleRow}>
                        <Ionicons
                          name="cube-outline"
                          size={18}
                          color={colors.sky600}
                        />
                        <View style={styles.shipmentTitleCopy}>
                          <Text style={styles.shipmentNumber}>
                            {shipment.shipping_number}
                          </Text>
                          <Text style={styles.shipmentStatus}>
                            Lion Parcel · {shipment.service_code} ·{" "}
                            {shipment.status.replaceAll("_", " ")}
                          </Text>
                        </View>
                      </View>
                      <DetailRow
                        icon="barcode-outline"
                        label="STT / AWB"
                        value={shipment.stt_no || "Menunggu scan Lion Parcel"}
                      />
                      <DetailRow
                        icon="time-outline"
                        label="Estimasi"
                        value={shipment.estimated_sla || "Mengikuti rute"}
                      />
                      {(shipment.events ?? []).map((event) => (
                        <View
                          key={`${event.status_code}-${event.occurred_at}`}
                          style={styles.shipmentEvent}
                        >
                          <View style={styles.shipmentDot} />
                          <View style={styles.shipmentEventCopy}>
                            <Text style={styles.shipmentEventTitle}>
                              {event.description || event.status}
                            </Text>
                            <Text style={styles.shipmentEventMeta}>
                              {[
                                event.location,
                                event.journey_type
                                  ? `Journey ${event.journey_type}`
                                  : "",
                                event.reference_stt_no
                                  ? `Ref ${event.reference_stt_no}`
                                  : "",
                                formatActivityDate(event.occurred_at, locale),
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                            </Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  ))}
                </View>
              ) : null}

              {item.type === "consultation" ? (
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>
                    Informasi konsultasi
                  </Text>
                  <DetailRow
                    icon="person-outline"
                    label="Dokter hewan"
                    value={
                      item.doctor_name ? `drh. ${item.doctor_name}` : undefined
                    }
                  />
                  <DetailRow
                    icon="chatbubble-ellipses-outline"
                    label="Paket & mode"
                    value={[item.plan_name, item.mode]
                      .filter(Boolean)
                      .join(" · ")}
                  />
                  <DetailRow
                    icon="calendar-outline"
                    label="Jadwal"
                    value={formatActivityDate(item.scheduled_at, locale)}
                  />
                  <DetailRow
                    icon="time-outline"
                    label="Durasi"
                    value={
                      item.duration_minutes
                        ? `${item.duration_minutes} menit`
                        : undefined
                    }
                  />
                  <DetailRow
                    icon="paw-outline"
                    label="Pet"
                    value={item.pet_name}
                  />
                  <DetailRow
                    icon="medical-outline"
                    label="Keluhan"
                    value={item.complaint}
                  />
                  <DetailRow
                    icon="clipboard-outline"
                    label="Diagnosis"
                    value={item.diagnosis || "Belum ada diagnosis"}
                  />
                  <DetailRow
                    icon="document-text-outline"
                    label="Catatan dokter"
                    value={item.doctor_notes || "Belum ada catatan dokter"}
                  />
                </View>
              ) : null}

              <View style={styles.paymentCard}>
                <View style={styles.paymentIcon}>
                  <Ionicons
                    name="wallet-outline"
                    size={18}
                    color={colors.sky600}
                  />
                </View>
                <View style={styles.paymentCopy}>
                  <Text style={styles.paymentLabel}>Status pembayaran</Text>
                  <Text style={styles.paymentValue}>
                    {item.payment_status.replaceAll("_", " ")}
                  </Text>
                </View>
                <Text style={styles.paymentAmount}>
                  {formatCurrency(item.amount)}
                </Text>
              </View>
              <PrimaryButton
                compact
                disabled={invoiceBusy}
                label={
                  invoiceBusy ? "Membuka invoice…" : "Buka invoice Slivadoc"
                }
                icon="document-text-outline"
                onPress={() => {
                  setInvoiceBusy(true);
                  void getMobileTransactionInvoiceHTML(
                    invoiceReferenceType,
                    item.id,
                  )
                    .then((html) =>
                      Linking.openURL(
                        `data:text/html;charset=utf-8,${encodeURIComponent(html)}`,
                      ),
                    )
                    .catch((cause) =>
                      Alert.alert(
                        "Invoice belum dapat dibuka",
                        cause instanceof Error
                          ? cause.message
                          : "Silakan coba lagi beberapa saat.",
                      ),
                    )
                    .finally(() => setInvoiceBusy(false));
                }}
              />
              <Text style={styles.createdAt}>
                Dibuat {formatActivityDate(item.occurred_at, locale)}
              </Text>
              <PrimaryButton
                label={repeatLabel(item)}
                icon="refresh-outline"
                onPress={onRepeat}
              />
            </ScrollView>
          </Pressable>
        </SafeAreaView>
      </Pressable>
    </Modal>
  );
}

export function ActivityScreen({
  authenticated,
  hasPet,
  refreshVersion,
  onAction,
  onOpenNotifications,
  onLogin,
  onRequirePet,
  onCreateBooking,
  onCreateOrder,
  onCreateConsultation,
  onRebook,
  onReorder,
  onReconsult,
  onOpenProduct,
}: ActivityScreenProps) {
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [stateFilter, setStateFilter] = useState<MobileActivityState>("all");
  const [activities, setActivities] = useState<MobileActivityCenterItem[]>([]);
  const [summary, setSummary] = useState({
    booking: 0,
    order: 0,
    consultation: 0,
  });
  const [selected, setSelected] = useState<MobileActivityCenterItem>();
  const [createOpen, setCreateOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const requestSequence = useRef(0);

  const loadActivities = useCallback(async () => {
    if (!authenticated) return;
    const request = requestSequence.current + 1;
    requestSequence.current = request;
    setLoading(true);
    try {
      const result = await getMobileActivityCenter(typeFilter, stateFilter);
      if (requestSequence.current !== request) return;
      setActivities(result.data);
      setSummary(result.summary);
    } catch (cause) {
      if (requestSequence.current !== request) return;
      onAction(
        cause instanceof Error ? cause.message : "Aktivitas belum dapat dimuat",
      );
    } finally {
      if (requestSequence.current === request) setLoading(false);
    }
  }, [authenticated, onAction, stateFilter, typeFilter]);

  useEffect(() => {
    queueMicrotask(() => void loadActivities());
  }, [loadActivities, refreshVersion]);

  const repeat = useCallback(
    (item: MobileActivityCenterItem) => {
      setSelected(undefined);
      if (item.type === "booking") {
        onRebook(item.service_id);
        return;
      }
      if (item.type === "order") {
        onReorder(item.items ?? []);
        return;
      }
      onReconsult(item.plan_id);
    },
    [onRebook, onReconsult, onReorder],
  );

  const createForFilter = () => {
    if (typeFilter === "order") return onCreateOrder();
    if (typeFilter === "consultation") return onCreateConsultation();
    if (typeFilter === "booking") return onCreateBooking();
    setCreateOpen(true);
  };

  const typeCount = (type: TypeFilter) =>
    type === "all"
      ? summary.booking + summary.order + summary.consultation
      : summary[type];

  if (!authenticated) {
    return (
      <Screen>
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={styles.headerEyebrow}>PUSAT AKTIVITAS</Text>
            <Text style={styles.headerTitle}>Semua perjalanan pet-mu</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Buka notifikasi"
            onPress={onOpenNotifications}
            style={styles.headerButton}
          >
            <Ionicons
              name="notifications-outline"
              size={20}
              color={colors.text}
            />
          </Pressable>
        </View>
        <Card style={styles.loginCard}>
          <EmptyState
            icon="paw-outline"
            title="Masuk untuk melihat aktivitas"
            note="Booking, belanja, dan konsultasi tersimpan aman di akunmu."
            action="Masuk ke akun"
            onAction={onLogin}
          />
        </Card>
      </Screen>
    );
  }

  return (
    <>
      <Screen contentStyle={styles.screenContent}>
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={styles.headerEyebrow}>PUSAT AKTIVITAS</Text>
            <Text style={styles.headerTitle}>Semua perjalanan pet-mu</Text>
            <Text style={styles.headerSubtitle}>
              Pantau transaksi dan ulangi aktivitas dalam sekali tap.
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Buka notifikasi"
            onPress={onOpenNotifications}
            style={styles.headerButton}
          >
            <Ionicons
              name="notifications-outline"
              size={20}
              color={colors.text}
            />
            <View style={styles.notificationDot} />
          </Pressable>
        </View>

        {!hasPet ? <PetRequiredNotice onAddPet={onRequirePet} /> : null}

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.typeFilters}
        >
          {typeOptions.map((option) => {
            const active = option.id === typeFilter;
            return (
              <Pressable
                key={option.id}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => setTypeFilter(option.id)}
                style={[styles.typeChip, active && styles.typeChipActive]}
              >
                <Ionicons
                  name={option.icon}
                  size={14}
                  color={active ? colors.white : colors.sky600}
                />
                <Text
                  style={[
                    styles.typeChipText,
                    active && styles.typeChipTextActive,
                  ]}
                >
                  {option.label}
                </Text>
                <View
                  style={[styles.typeCount, active && styles.typeCountActive]}
                >
                  <Text
                    style={[
                      styles.typeCountText,
                      active && styles.typeCountTextActive,
                    ]}
                  >
                    {typeCount(option.id)}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.stateTabs}>
          {stateOptions.map((option) => {
            const active = option.id === stateFilter;
            return (
              <Pressable
                key={option.id}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => setStateFilter(option.id)}
                style={[styles.stateTab, active && styles.stateTabActive]}
              >
                <Text
                  style={[
                    styles.stateTabText,
                    active && styles.stateTabTextActive,
                  ]}
                >
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.activityToolbar}>
          <View>
            <Text style={styles.sectionEyebrow}>DATA AKUNMU</Text>
            <Text style={styles.sectionTitle}>
              {activities.length} aktivitas
            </Text>
          </View>
          <PrimaryButton
            compact
            label="Buat baru"
            icon="add"
            onPress={createForFilter}
            style={styles.createCompactButton}
          />
        </View>

        {loading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator color={colors.sky600} />
            <Text style={styles.loadingText}>Mengambil aktivitas terbaru…</Text>
          </View>
        ) : activities.length ? (
          <View style={styles.activityList}>
            {activities.map((item) => (
              <ActivityCard
                key={`${item.type}-${item.id}`}
                item={item}
                onDetail={() => setSelected(item)}
                onRepeat={() => repeat(item)}
              />
            ))}
          </View>
        ) : (
          <Card style={styles.emptyCard}>
            <EmptyState
              icon={
                typeFilter === "order"
                  ? "bag-handle-outline"
                  : typeFilter === "consultation"
                    ? "chatbubbles-outline"
                    : "calendar-outline"
              }
              title="Belum ada aktivitas"
              note="Filter ini masih kosong. Mulai aktivitas baru dan progresnya akan tampil otomatis di sini."
              action="Buat aktivitas baru"
              onAction={createForFilter}
            />
          </Card>
        )}
      </Screen>
      <ActivityDetailSheet
        item={selected}
        onClose={() => setSelected(undefined)}
        onOpenProduct={(productId) => {
          setSelected(undefined);
          onOpenProduct(productId);
        }}
        onRepeat={() => selected && repeat(selected)}
      />
      <CreateActivitySheet
        visible={createOpen}
        onClose={() => setCreateOpen(false)}
        onBooking={onCreateBooking}
        onOrder={onCreateOrder}
        onConsultation={onCreateConsultation}
      />
    </>
  );
}

const styles = StyleSheet.create({
  screenContent: { paddingTop: 4 },
  header: {
    minHeight: 78,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 8,
  },
  headerCopy: { flex: 1 },
  headerEyebrow: {
    color: colors.sky600,
    fontSize: 9,
    fontWeight: "600",
    letterSpacing: 1.2,
  },
  headerTitle: {
    marginTop: 3,
    color: colors.navy,
    fontSize: 21,
    lineHeight: 26,
    fontWeight: "700",
    letterSpacing: -0.4,
  },
  headerSubtitle: {
    marginTop: 3,
    color: colors.muted,
    fontSize: 11,
    lineHeight: 16,
  },
  headerButton: {
    position: "relative",
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
    ...shadow,
  },
  notificationDot: {
    position: "absolute",
    right: 8,
    top: 8,
    width: 7,
    height: 7,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: colors.white,
    backgroundColor: colors.red,
  },
  typeFilters: { gap: 7, paddingTop: 10, paddingBottom: 10 },
  typeChip: {
    height: 36,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 18,
    backgroundColor: colors.white,
  },
  typeChipActive: {
    borderColor: colors.sky600,
    backgroundColor: colors.sky600,
  },
  typeChipText: { color: colors.text, fontSize: 11, fontWeight: "600" },
  typeChipTextActive: { color: colors.white },
  typeCount: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    backgroundColor: colors.sky50,
  },
  typeCountActive: { backgroundColor: "rgba(255,255,255,.2)" },
  typeCountText: { color: colors.sky600, fontSize: 9, fontWeight: "600" },
  typeCountTextActive: { color: colors.white },
  stateTabs: {
    height: 42,
    flexDirection: "row",
    gap: 3,
    padding: 3,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 14,
    backgroundColor: colors.white,
  },
  stateTab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 11,
  },
  stateTabActive: { backgroundColor: colors.sky50 },
  stateTabText: { color: colors.muted, fontSize: 10, fontWeight: "600" },
  stateTabTextActive: { color: colors.sky600, fontWeight: "700" },
  sectionHeadingRow: {
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 18,
    marginBottom: 9,
  },
  sectionEyebrow: {
    color: colors.muted,
    fontSize: 9,
    fontWeight: "600",
    letterSpacing: 1.1,
  },
  sectionTitle: {
    marginTop: 2,
    color: colors.navy,
    fontSize: typography.sectionTitle,
    lineHeight: 22,
    fontWeight: "700",
  },
  activityToolbar: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 13,
    marginBottom: 9,
  },
  createCompactButton: { minWidth: 112 },
  activityList: { gap: 12 },
  activityCard: {
    overflow: "hidden",
    padding: 13,
    borderColor: colors.sky100,
    borderRadius: 22,
  },
  activityTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  activityIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  activityCopy: { minWidth: 0, flex: 1 },
  activityMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
  },
  activityType: {
    fontSize: 9,
    fontWeight: "600",
    letterSpacing: 0.7,
    textTransform: "uppercase",
  },
  activityCode: {
    flexShrink: 1,
    color: colors.muted,
    fontSize: 9,
    fontWeight: "600",
  },
  activityTitle: {
    marginTop: 4,
    color: colors.navy,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "700",
  },
  activitySubtitle: {
    marginTop: 1,
    color: colors.muted,
    fontSize: 10,
    lineHeight: 15,
  },
  compactMeta: {
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 5,
  },
  dateInlineText: { flexShrink: 1, color: colors.muted, fontSize: 9 },
  metaDivider: { color: colors.muted, fontSize: 9 },
  amountInline: { color: colors.text, fontSize: 9, fontWeight: "600" },
  compactFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginTop: 10,
    paddingTop: 9,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  contextInline: {
    minWidth: 0,
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  activityHint: {
    flexShrink: 1,
    color: colors.text,
    fontSize: 10,
    fontWeight: "600",
  },
  repeatButton: {
    minHeight: 34,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    borderRadius: 11,
    backgroundColor: colors.sky50,
  },
  repeatText: { color: colors.sky600, fontSize: 10, fontWeight: "600" },
  loadingState: {
    minHeight: 180,
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
  },
  loadingText: { color: colors.muted, fontSize: 11 },
  emptyCard: { overflow: "hidden" },
  loginCard: { marginTop: 20, overflow: "hidden" },
  createSheetHeader: {
    minHeight: 68,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  createSheetTitle: {
    marginTop: 2,
    color: colors.navy,
    fontSize: 18,
    fontWeight: "700",
  },
  createSheetContent: { gap: 8, padding: 16, paddingBottom: 24 },
  createChoice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    minHeight: 76,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 17,
    backgroundColor: colors.white,
  },
  createChoiceIcon: {
    width: 45,
    height: 45,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  createChoiceCopy: { minWidth: 0, flex: 1 },
  createChoiceTitle: { color: colors.navy, fontSize: 13, fontWeight: "700" },
  createChoiceNote: {
    marginTop: 3,
    color: colors.muted,
    fontSize: 10,
    lineHeight: 15,
  },
  pressed: { opacity: 0.9, transform: [{ scale: 0.985 }] },
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(10,38,58,.38)",
  },
  sheetSafeArea: { width: "100%", maxHeight: "88%" },
  sheet: {
    overflow: "hidden",
    maxHeight: "100%",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: colors.white,
    ...shadow,
  },
  sheetHandle: {
    alignSelf: "center",
    width: 42,
    height: 5,
    marginTop: 8,
    borderRadius: 3,
    backgroundColor: "#DCE7ED",
  },
  sheetHeader: {
    minHeight: 70,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  sheetHeaderIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetHeaderCopy: { minWidth: 0, flex: 1 },
  sheetEyebrow: { fontSize: 9, fontWeight: "600", letterSpacing: 1 },
  sheetTitle: {
    marginTop: 2,
    color: colors.navy,
    fontSize: 16,
    fontWeight: "700",
  },
  sheetClose: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.canvas,
  },
  sheetContent: { padding: 16, paddingBottom: 24 },
  detailHero: { padding: 16, borderRadius: 18 },
  detailTitle: {
    marginTop: 10,
    color: colors.navy,
    fontSize: 20,
    lineHeight: 25,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  detailSubtitle: {
    marginTop: 3,
    color: colors.text,
    fontSize: 11,
    lineHeight: 16,
  },
  detailAmount: {
    marginTop: 11,
    color: colors.navy,
    fontSize: 17,
    fontWeight: "700",
  },
  detailSection: { marginTop: 18 },
  detailSectionTitle: {
    marginBottom: 7,
    color: colors.navy,
    fontSize: 14,
    fontWeight: "700",
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  detailRowIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.sky50,
  },
  detailRowCopy: { minWidth: 0, flex: 1 },
  detailRowLabel: { color: colors.muted, fontSize: 9, fontWeight: "600" },
  detailRowValue: {
    marginTop: 2,
    color: colors.text,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
  },
  productRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  productImageFallback: {
    width: 45,
    height: 45,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.violet50,
  },
  productCopy: { minWidth: 0, flex: 1 },
  productName: {
    color: colors.navy,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "600",
  },
  productStore: { marginTop: 2, color: colors.muted, fontSize: 9 },
  productPrice: {
    marginTop: 3,
    color: colors.text,
    fontSize: 11,
    fontWeight: "600",
  },
  productOpen: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.sky50,
  },
  priceBreakdown: {
    gap: 7,
    marginTop: 13,
    padding: 13,
    borderRadius: 15,
    backgroundColor: colors.canvas,
  },
  shipmentCard: {
    gap: 8,
    marginTop: 12,
    padding: 13,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#CCE9F8",
    backgroundColor: colors.sky50,
  },
  shipmentTitleRow: { flexDirection: "row", alignItems: "center", gap: 9 },
  shipmentTitleCopy: { flex: 1 },
  shipmentNumber: { color: colors.navy, fontSize: 12, fontWeight: "700" },
  shipmentStatus: {
    marginTop: 2,
    color: colors.muted,
    fontSize: 9,
    textTransform: "capitalize",
  },
  shipmentEvent: { flexDirection: "row", gap: 9, paddingLeft: 5 },
  shipmentDot: {
    width: 7,
    height: 7,
    marginTop: 5,
    borderRadius: 4,
    backgroundColor: colors.mint,
  },
  shipmentEventCopy: { flex: 1 },
  shipmentEventTitle: { color: colors.text, fontSize: 10, fontWeight: "600" },
  shipmentEventMeta: { marginTop: 2, color: colors.muted, fontSize: 8 },
  priceLine: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  priceLabel: { color: colors.muted, fontSize: 10 },
  priceValue: { color: colors.text, fontSize: 10, fontWeight: "600" },
  priceDiscountLabel: { color: "#14836E", fontSize: 10 },
  priceDiscountValue: { color: "#14836E", fontSize: 10, fontWeight: "600" },
  priceTotal: {
    marginTop: 3,
    paddingTop: 9,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  priceTotalLabel: { color: colors.navy, fontSize: 12, fontWeight: "700" },
  priceTotalValue: { color: colors.sky600, fontSize: 13, fontWeight: "700" },
  paymentCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 15,
  },
  paymentIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.sky50,
  },
  paymentCopy: { minWidth: 0, flex: 1 },
  paymentLabel: { color: colors.muted, fontSize: 9 },
  paymentValue: {
    marginTop: 2,
    color: colors.navy,
    fontSize: 11,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  paymentAmount: { color: colors.navy, fontSize: 11, fontWeight: "700" },
  createdAt: {
    marginVertical: 12,
    color: colors.muted,
    fontSize: 9,
    textAlign: "center",
  },
});
