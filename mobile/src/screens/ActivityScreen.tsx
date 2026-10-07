import { LocalizedPressable as Pressable } from "../components/LocalizedPressable";
import { SlivaAlert } from "../components/SlivaAlert";
import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Modal,

  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import QRCode from "react-native-qrcode-svg";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";

import {
  cancelMobileBooking,
  cancelMobileOrder,
  MobileApiError,
  createMobilePaymentIntent,
  getMobileTransactionInvoiceHTML,
  requestMobileOrderReturn,
  resubmitMobileDocuments,
  type MobilePaymentIntent,
  type MobileActivityCenterItem,
  type MobileActivityOrderItem,
  type MobileActivityState,
  type MobileActivityType,
  type MobileOrderFulfillment,
} from "../api";
import {
  activityAttentionReason,
  activityStatusLabel,
  activityStatusTone,
  activityTypePresentation,
  emptyActivitySummary,
  getActivityTypePresentation,
} from "../activity";
import {
  BoundedBottomSheet,
  Card,
  ChatUnreadBadge,
  EmptyState,
  PetRequiredNotice,
  Pill,
  PrimaryButton,
  Screen,
  useAppSurface,
} from "../components/ui";
import { MobileQrisModal } from "../components/QrisPayment";
import {
  completeDocuments,
  DocumentPhotoPicker,
  type DocumentPhotos,
} from "../components/DocumentPhotoPicker";
import { LocalizedText as Text, LocalizedTextInput as TextInput, useI18n } from "../i18n";
import { colors, shadow, typography } from "../theme";

type TypeFilter = MobileActivityType | "all";
type ActivityKey = { type: MobileActivityType; id: string };
type SelectedActivity = ActivityKey & {
  autoPay: boolean;
  fallback: MobileActivityCenterItem;
};

type ActivityScreenProps = {
  authenticated: boolean;
  hasPet: boolean;
  activities: MobileActivityCenterItem[];
  summary?: Record<MobileActivityType, number>;
  loading: boolean;
  onReload: () => Promise<void>;
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
  // Without an id the intent only applies the type filter.
  intent?: { token: number; type: MobileActivityType; id?: string };
  onIntentHandled: (token: number) => void;
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
  { id: "booking", ...activityTypePresentation.booking },
  { id: "order", ...activityTypePresentation.order },
  { id: "consultation", ...activityTypePresentation.consultation },
  { id: "academy", ...activityTypePresentation.academy },
  { id: "event", ...activityTypePresentation.event },
  { id: "reservation", ...activityTypePresentation.reservation },
  { id: "document", ...activityTypePresentation.document },
  { id: "donation", ...activityTypePresentation.donation },
  { id: "hotel", ...activityTypePresentation.hotel },
  { id: "home_service", ...activityTypePresentation.home_service },
];

const stateOptions: Array<{ id: MobileActivityState; label: string }> = [
  { id: "all", label: "Semua" },
  { id: "upcoming", label: "Mendatang" },
  { id: "ongoing", label: "Berjalan" },
  { id: "history", label: "Riwayat" },
];

const repeatLabels: Partial<Record<MobileActivityType, string>> = {
  booking: "Booking lagi",
  order: "Beli lagi",
  consultation: "Konsultasi ulang",
};

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

function formatActivityRange(
  start: string | null | undefined,
  end: string | null | undefined,
  locale: string,
) {
  if (!start) return undefined;
  const from = formatActivityDate(start, locale);
  return end ? `${from} – ${formatActivityDate(end, locale)}` : from;
}

const shipmentSteps = ["Diproses", "Pickup", "Dalam perjalanan", "Selesai"];

function shipmentPresentation(status: string): { label: string; stage: number } {
  const normalized = status.toLowerCase();
  if (normalized === "delivered") return { label: "Sudah diterima", stage: 3 };
  if (normalized === "returning") return { label: "Dalam perjalanan retur", stage: 2 };
  if (normalized === "returned") return { label: "Diretur ke pengirim", stage: 2 };
  if (["in_transit", "exception"].includes(normalized)) {
    return {
      label: normalized === "exception" ? "Ada kendala pengiriman" : "Dalam perjalanan",
      stage: 2,
    };
  }
  if (["booked", "pickup_requested"].includes(normalized)) {
    return { label: normalized === "booked" ? "Menunggu pickup" : "Pickup dijadwalkan", stage: 1 };
  }
  if (normalized === "cancelled") return { label: "Pengiriman dibatalkan", stage: 0 };
  return { label: "Sedang diproses", stage: 0 };
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
  const presentation = getActivityTypePresentation(item.type);
  const repeatLabel = repeatLabels[item.type];
  const amount = item.total_amount ?? item.amount;
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
            <Pill tone={activityStatusTone(item)}>
              {activityStatusLabel(item)}
            </Pill>
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
            {amount > 0 ? (
              <>
                <Text style={styles.metaDivider}>•</Text>
                <Text numberOfLines={1} style={styles.amountInline}>
                  {formatCurrency(amount)}
                </Text>
              </>
            ) : null}
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
        {repeatLabel ? (
          <Pressable
            accessibilityRole="button"
            onPress={onRepeat}
            style={({ pressed }) => [
              styles.repeatButton,
              pressed && styles.pressed,
            ]}
          >
            <Ionicons name="refresh-outline" size={14} color={colors.sky600} />
            <Text style={styles.repeatText}>{repeatLabel}</Text>
          </Pressable>
        ) : null}
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

// Retur is offered only for delivered packages still inside the return window.
function ReturnRequest({
  orderId,
  fulfillment,
  onReload,
}: {
  orderId: string;
  fulfillment: MobileOrderFulfillment;
  onReload: () => Promise<void>;
}) {
  const { formatDate } = useI18n();
  const [openedAt] = useState(() => Date.now());
  const [formOpen, setFormOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (fulfillment.return_requested)
    return (
      <View style={styles.returnRequested}>
        <Ionicons name="checkmark-circle-outline" size={15} color={colors.mint} />
        <Text style={styles.returnNote}>
          Retur diajukan · {fulfillment.business_name}
        </Text>
      </View>
    );
  if (
    fulfillment.status !== "delivered" ||
    !fulfillment.return_until ||
    Date.parse(fulfillment.return_until) <= openedAt
  )
    return null;
  const submit = async () => {
    const text = reason.trim();
    if (text.length < 10 || text.length > 1000) {
      setError("Alasan retur wajib diisi 10–1000 karakter.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const result = await requestMobileOrderReturn(orderId, fulfillment.id, text);
      setFormOpen(false);
      setReason("");
      await onReload();
      SlivaAlert.alert(`Permintaan retur terkirim (${result.ticket_number})`);
    } catch (cause) {
      if (cause instanceof MobileApiError && cause.code === "return_already_requested")
        void onReload();
      setError(
        cause instanceof Error
          ? cause.message
          : "Permintaan retur belum dapat dikirim.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <View style={styles.returnCard}>
      <Text style={styles.returnTitle}>Paket dari {fulfillment.business_name}</Text>
      <Text style={styles.returnNote}>
        Retur dapat diajukan hingga{" "}
        {formatDate(fulfillment.return_until, { dateStyle: "medium" })}.
      </Text>
      {formOpen ? (
        <>
          <TextInput
            multiline
            maxLength={1000}
            value={reason}
            onChangeText={setReason}
            placeholder="Ceritakan alasan retur (minimal 10 karakter)"
            placeholderTextColor={colors.muted}
            style={styles.returnInput}
          />
          {error ? <Text style={styles.returnError}>{error}</Text> : null}
          <PrimaryButton
            compact
            disabled={busy}
            label={busy ? "Mengirim…" : "Kirim permintaan retur"}
            icon="send-outline"
            onPress={() => void submit()}
          />
        </>
      ) : (
        <PrimaryButton
          compact
          light
          label="Ajukan retur"
          icon="return-down-back-outline"
          onPress={() => setFormOpen(true)}
        />
      )}
    </View>
  );
}

function ActivityDetailSheet({
  item,
  autoPay,
  onClose,
  onOpenProduct,
  onRepeat,
  onReload,
}: {
  item: MobileActivityCenterItem;
  autoPay: boolean;
  onClose: () => void;
  onOpenProduct: (productId: string) => void;
  onRepeat: () => void;
  onReload: () => Promise<void>;
}) {
  const { formatCurrency, locale } = useI18n();
  const [invoiceBusy, setInvoiceBusy] = useState(false);
  const [invoiceHTML, setInvoiceHTML] = useState("");
  const [payment, setPayment] = useState<MobilePaymentIntent>();
  const [paymentBusy, setPaymentBusy] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const autoPayStarted = useRef(false);
  const [cancelBusy, setCancelBusy] = useState(false);
  const [orderCancelBusy, setOrderCancelBusy] = useState(false);
  const [documentPhotos, setDocumentPhotos] = useState<DocumentPhotos>({});
  const [resubmitBusy, setResubmitBusy] = useState(false);
  const bookingCancellable =
    item.type === "booking" && item.source !== "clinic";
  // Read once per opened sheet; the backend re-checks the cutoff on cancel.
  const [openedAt] = useState(() => Date.now());
  const cancellable =
    bookingCancellable &&
    Boolean(item.cancellable_until) &&
    openedAt <= Date.parse(item.cancellable_until ?? "");
  const cancelHint =
    bookingCancellable && item.cancellation_cutoff_hours !== undefined
      ? `Bisa dibatalkan hingga ${item.cancellation_cutoff_hours} jam sebelum jadwal`
      : undefined;
  const confirmCancel = () =>
    SlivaAlert.alert(
      "Batalkan booking?",
      [item.cancellation_policy, cancelHint].filter(Boolean).join("\n\n"),
      [
        { text: "Kembali", style: "cancel" },
        {
          text: "Batalkan booking",
          style: "destructive",
          onPress: () => {
            setCancelBusy(true);
            cancelMobileBooking(item.reference_id)
              .then(async (result) => {
                await onReload();
                SlivaAlert.alert(
                  result.refund_queued
                    ? "Booking dibatalkan. Dana akan dikembalikan setelah diverifikasi tim finance."
                    : "Booking dibatalkan.",
                );
              })
              .catch((cause) =>
                SlivaAlert.alert(
                  "Booking belum dapat dibatalkan",
                  cause instanceof Error
                    ? cause.message
                    : "Silakan coba lagi beberapa saat.",
                ),
              )
              .finally(() => setCancelBusy(false));
          },
        },
      ],
    );
  const confirmCancelOrder = () =>
    SlivaAlert.alert(
      "Batalkan pesanan?",
      "Pesanan akan dibatalkan sebelum diproses penjual dan dana masuk antrean pengembalian.",
      [
        { text: "Kembali", style: "cancel" },
        {
          text: "Batalkan pesanan",
          style: "destructive",
          onPress: () => {
            setOrderCancelBusy(true);
            cancelMobileOrder(item.reference_id)
              .then(async (result) => {
                await onReload();
                SlivaAlert.alert(
                  result.refund_queued
                    ? "Pesanan dibatalkan. Dana akan dikembalikan setelah diverifikasi tim finance."
                    : "Pesanan dibatalkan.",
                );
              })
              .catch((cause) => {
                // Order state moved on (e.g. seller started processing): resync so the button disappears.
                if (cause instanceof MobileApiError && cause.code === "order_not_cancellable")
                  void onReload();
                SlivaAlert.alert(
                  "Pesanan belum dapat dibatalkan",
                  cause instanceof Error
                    ? cause.message
                    : "Silakan coba lagi beberapa saat.",
                );
              })
              .finally(() => setOrderCancelBusy(false));
          },
        },
      ],
    );
  const resubmit = async () => {
    const documents = completeDocuments(
      item.missing_requirements ?? [],
      documentPhotos,
    );
    if (!documents) {
      SlivaAlert.alert("Unggah foto untuk semua dokumen yang kurang");
      return;
    }
    setResubmitBusy(true);
    try {
      await resubmitMobileDocuments(item.reference_id, documents);
      setDocumentPhotos({});
      await onReload();
      SlivaAlert.alert("Dokumen dikirim ulang dan akan ditinjau kembali.");
    } catch (cause) {
      SlivaAlert.alert(
        "Dokumen belum dapat dikirim",
        cause instanceof Error
          ? cause.message
          : "Silakan coba lagi beberapa saat.",
      );
    } finally {
      setResubmitBusy(false);
    }
  };
  const { payable, payment_reference_type, reference_id } = item;
  const pay = useCallback(async () => {
    setPaymentBusy(true);
    setPaymentError("");
    try {
      setPayment(
        await createMobilePaymentIntent(
          payment_reference_type,
          reference_id,
          "qris",
        ),
      );
    } catch (cause) {
      setPaymentError(
        (cause instanceof Error && cause.message) ||
          "Pembayaran belum dapat dibuka",
      );
    } finally {
      setPaymentBusy(false);
    }
  }, [payment_reference_type, reference_id]);
  useEffect(() => {
    if (!autoPay || !payable || autoPayStarted.current) return;
    autoPayStarted.current = true;
    queueMicrotask(() => void pay());
  }, [autoPay, pay, payable]);

  const presentation = getActivityTypePresentation(item.type);
  const repeatLabel = repeatLabels[item.type];
  const amount = item.total_amount ?? item.amount;
  const invoiceReferenceType =
    item.payment_status === "paid" &&
    item.payment_reference_type &&
    item.payment_reference_type !== "petspot_reservation"
      ? (item.payment_reference_type as Parameters<
          typeof getMobileTransactionInvoiceHTML
        >[0])
      : undefined;
  const showTicket =
    item.type === "event" &&
    item.payment_status === "paid" &&
    (item.status === "confirmed" || item.status === "checked_in");
  const hasCoordinates =
    typeof item.latitude === "number" && typeof item.longitude === "number";
  const place = [item.address, item.city].filter(Boolean).join(", ");
  return <>
    <Modal supportedOrientations={["portrait", "portrait-upside-down", "landscape-left", "landscape-right"]} visible transparent animationType="slide" onRequestClose={onClose}>
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
                <Pill tone={activityStatusTone(item)}>
                  {activityStatusLabel(item)}
                </Pill>
                <Text style={styles.detailTitle}>{item.title}</Text>
                <Text style={styles.detailSubtitle}>{item.subtitle}</Text>
                {amount > 0 ? (
                  <Text style={styles.detailAmount}>
                    {formatCurrency(amount)}
                  </Text>
                ) : null}
              </View>

              {showTicket && item.qr_token ? (
                <View
                  accessible
                  accessibilityLabel="Tiket QR"
                  style={styles.ticket}
                >
                  <QRCode value={item.qr_token} size={180} ecl="M" />
                  <Text style={styles.ticketCode}>
                    {item.qr_token.slice(0, 13).toUpperCase()}
                  </Text>
                  <Text style={styles.ticketNote}>
                    Tunjukkan QR ini ke petugas saat check-in.
                  </Text>
                </View>
              ) : null}

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
                    icon="cut-outline"
                    label="Layanan"
                    value={item.service_name}
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
                  <DetailRow icon="location-outline" label="Lokasi" value={place} />
                  <DetailRow
                    icon="document-text-outline"
                    label="Catatan"
                    value={item.notes || "Tidak ada catatan tambahan"}
                  />
                  <DetailRow
                    icon="shield-checkmark-outline"
                    label="Pembatalan"
                    value={cancelHint}
                  />
                  {cancellable ? (
                    <PrimaryButton
                      compact
                      light
                      disabled={cancelBusy}
                      label={cancelBusy ? "Membatalkan…" : "Batalkan booking"}
                      icon="close-circle-outline"
                      onPress={confirmCancel}
                      style={styles.detailAction}
                    />
                  ) : null}
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
                        <Text catalogue numberOfLines={2} style={styles.productName}>
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
                  {Boolean(item.shipments?.length) ? (
                    <View style={styles.trackingReadOnlyNote}>
                      <Ionicons name="sync-outline" size={15} color={colors.sky600} />
                      <Text style={styles.trackingReadOnlyText}>
                        Status pengiriman bersifat view-only dan tersinkron otomatis dari Lion Parcel.
                      </Text>
                    </View>
                  ) : null}
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
                            {shipmentPresentation(shipment.status).label}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.shipmentProgress}>
                        {shipmentSteps.map((step, index) => (
                          <View key={step} style={styles.shipmentProgressStep}>
                            <View
                              style={[
                                styles.shipmentProgressDot,
                                index <= shipmentPresentation(shipment.status).stage &&
                                  styles.shipmentProgressDotActive,
                              ]}
                            />
                            <Text
                              style={[
                                styles.shipmentProgressLabel,
                                index <= shipmentPresentation(shipment.status).stage &&
                                  styles.shipmentProgressLabelActive,
                              ]}
                            >
                              {step}
                            </Text>
                          </View>
                        ))}
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
                  {(item.fulfillments ?? []).map((fulfillment) => (
                    <ReturnRequest
                      key={fulfillment.id}
                      orderId={item.reference_id}
                      fulfillment={fulfillment}
                      onReload={onReload}
                    />
                  ))}
                  {item.cancellable ? (
                    <View style={styles.orderAction}>
                      <PrimaryButton
                        compact
                        light
                        disabled={orderCancelBusy}
                        label={orderCancelBusy ? "Membatalkan…" : "Batalkan pesanan"}
                        icon="close-circle-outline"
                        onPress={confirmCancelOrder}
                      />
                    </View>
                  ) : null}
                </View>
              ) : null}

              {item.type === "consultation" ? (
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>
                    Informasi konsultasi
                  </Text>
                  <DetailRow
                    icon="person-outline"
                    label={
                      item.provider_type === "trainer"
                        ? "Pet Trainer"
                        : "Dokter hewan"
                    }
                    value={
                      item.provider_type === "trainer"
                        ? item.trainer_name ||
                          item.provider_name ||
                          item.doctor_name
                        : item.provider_name || item.doctor_name
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
                  {item.provider_type !== "trainer" ? (
                    <DetailRow
                      icon="clipboard-outline"
                      label="Diagnosis"
                      value={item.diagnosis || "Belum ada diagnosis"}
                    />
                  ) : null}
                  <DetailRow
                    icon="document-text-outline"
                    label={
                      item.provider_type === "trainer"
                        ? "Rencana latihan"
                        : "Catatan dokter"
                    }
                    value={
                      item.doctor_notes ||
                      (item.provider_type === "trainer"
                        ? "Belum ada rencana latihan"
                        : "Belum ada catatan dokter")
                    }
                  />
                  <DetailRow
                    icon="calendar-outline"
                    label="Follow-up"
                    value={
                      item.followup_until
                        ? formatActivityDate(item.followup_until, locale)
                        : item.followup_days
                          ? `${item.followup_days} hari setelah sesi`
                          : undefined
                    }
                  />
                </View>
              ) : null}

              {item.type === "academy" ? (
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Informasi kelas</Text>
                  <DetailRow
                    icon="school-outline"
                    label="Program"
                    value={item.program_title}
                  />
                  <DetailRow
                    icon="business-outline"
                    label="Academy"
                    value={item.academy_name}
                  />
                  <DetailRow
                    icon="person-outline"
                    label="Trainer"
                    value={item.trainer_name}
                  />
                  <DetailRow
                    icon="calendar-outline"
                    label="Sesi berikutnya"
                    value={
                      item.scheduled_at
                        ? [
                            formatActivityRange(item.scheduled_at, item.ends_at, locale),
                            item.location || item.online_url,
                          ]
                            .filter(Boolean)
                            .join(" · ")
                        : undefined
                    }
                  />
                  {typeof item.progress_percent === "number" ? (
                    <View style={styles.detailRow}>
                      <View style={styles.detailRowIcon}>
                        <Ionicons
                          name="trending-up-outline"
                          size={16}
                          color={colors.sky600}
                        />
                      </View>
                      <View style={styles.detailRowCopy}>
                        <Text style={styles.detailRowLabel}>Progres</Text>
                        <View style={styles.progressTrack}>
                          <View
                            style={[
                              styles.progressFill,
                              {
                                width: `${Math.min(100, Math.max(0, item.progress_percent))}%`,
                              },
                            ]}
                          />
                        </View>
                        <Text style={styles.detailRowValue}>
                          {`${item.progress_percent}%${item.progress_notes ? ` · ${item.progress_notes}` : ""}`}
                        </Text>
                        {item.last_progress_at ? (
                          <Text style={styles.progressNote}>
                            {formatActivityDate(item.last_progress_at, locale)}
                          </Text>
                        ) : null}
                      </View>
                    </View>
                  ) : null}
                  <DetailRow
                    icon="people-outline"
                    label="Peserta"
                    value={[item.participant_name, item.pet_name]
                      .filter(Boolean)
                      .join(" · ")}
                  />
                </View>
              ) : null}

              {item.type === "event" ? (
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Informasi event</Text>
                  <DetailRow
                    icon="calendar-outline"
                    label="Waktu"
                    value={formatActivityRange(item.scheduled_at, item.ends_at, locale)}
                  />
                  <DetailRow
                    icon="location-outline"
                    label="Lokasi"
                    value={[item.venue, place].filter(Boolean).join(" · ")}
                  />
                  <DetailRow
                    icon="ticket-outline"
                    label="Tiket"
                    value={
                      item.ticket_quantity
                        ? `${item.ticket_quantity} tiket`
                        : undefined
                    }
                  />
                  <DetailRow icon="paw-outline" label="Pet" value={item.pet_name} />
                  <DetailRow
                    icon="checkmark-circle-outline"
                    label="Check-in"
                    value={
                      item.status === "checked_in"
                        ? "Sudah check-in"
                        : showTicket
                          ? "Belum check-in"
                          : undefined
                    }
                  />
                </View>
              ) : null}

              {item.type === "reservation" ? (
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>
                    Informasi reservasi
                  </Text>
                  <DetailRow
                    icon="storefront-outline"
                    label="Tempat"
                    value={[item.spot_name, item.resource_name]
                      .filter(Boolean)
                      .join(" · ")}
                  />
                  <DetailRow
                    icon="calendar-outline"
                    label="Waktu"
                    value={formatActivityRange(item.scheduled_at, item.ends_at, locale)}
                  />
                  <DetailRow
                    icon="people-outline"
                    label="Tamu"
                    value={
                      typeof item.guest_count === "number"
                        ? `${item.guest_count} orang · ${item.pet_count ?? 0} pet`
                        : undefined
                    }
                  />
                  <DetailRow
                    icon="wallet-outline"
                    label="DP"
                    value={
                      item.deposit_amount
                        ? formatCurrency(item.deposit_amount)
                        : undefined
                    }
                  />
                  <DetailRow
                    icon="cash-outline"
                    label="Sisa dibayar di lokasi"
                    value={
                      item.remaining_amount
                        ? formatCurrency(item.remaining_amount)
                        : undefined
                    }
                  />
                  <DetailRow icon="location-outline" label="Lokasi" value={place} />
                </View>
              ) : null}

              {item.type === "document" ? (
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>
                    Informasi dokumen
                  </Text>
                  <DetailRow
                    icon="document-text-outline"
                    label="Layanan"
                    value={item.product_name}
                  />
                  <DetailRow
                    icon="airplane-outline"
                    label="Rute"
                    value={
                      item.origin_city && item.destination_city
                        ? `${item.origin_city} → ${item.destination_city}`
                        : undefined
                    }
                  />
                  <DetailRow
                    icon="calendar-outline"
                    label="Keberangkatan"
                    value={
                      item.departure_at
                        ? formatActivityDate(item.departure_at, locale)
                        : undefined
                    }
                  />
                  <DetailRow
                    icon="alert-circle-outline"
                    label="Persyaratan kurang"
                    value={
                      item.status === "need_revision"
                        ? (item.missing_requirements ?? [])
                            .map((requirement) => `• ${requirement}`)
                            .join("\n")
                        : undefined
                    }
                  />
                  <DetailRow icon="paw-outline" label="Pet" value={item.pet_name} />
                  {item.status === "need_revision" &&
                  item.missing_requirements?.length ? (
                    <View style={styles.detailResubmit}>
                      <Text style={styles.detailSectionTitle}>
                        Lengkapi dokumen
                      </Text>
                      <DocumentPhotoPicker
                        requirements={item.missing_requirements}
                        photos={documentPhotos}
                        onChange={(requirement, document) =>
                          setDocumentPhotos((current) => ({
                            ...current,
                            [requirement]: document,
                          }))
                        }
                        onAction={(message) => SlivaAlert.alert(message)}
                        disabled={resubmitBusy}
                      />
                      <PrimaryButton
                        compact
                        disabled={resubmitBusy}
                        label={resubmitBusy ? "Mengirim…" : "Kirim ulang dokumen"}
                        icon="cloud-upload-outline"
                        onPress={() => void resubmit()}
                        style={styles.detailAction}
                      />
                    </View>
                  ) : null}
                  {item.status === "issued" && item.issued_document_url ? (
                    <PrimaryButton
                      compact
                      light
                      label="Buka dokumen terbit"
                      icon="open-outline"
                      onPress={() =>
                        void Linking.openURL(item.issued_document_url ?? "")
                      }
                      style={styles.detailAction}
                    />
                  ) : null}
                </View>
              ) : null}

              {item.type === "donation" ? (
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Informasi donasi</Text>
                  <DetailRow
                    icon="megaphone-outline"
                    label="Campaign"
                    value={item.fundraiser_title}
                  />
                  <DetailRow
                    icon="paw-outline"
                    label="Penerima"
                    value={item.beneficiary_name}
                  />
                  <DetailRow
                    icon="chatbubble-outline"
                    label="Pesan"
                    value={item.message}
                  />
                  <DetailRow
                    icon="eye-off-outline"
                    label="Anonim"
                    value={
                      item.anonymous === undefined
                        ? undefined
                        : item.anonymous
                          ? "Ya"
                          : "Tidak"
                    }
                  />
                  <DetailRow
                    icon="checkmark-circle-outline"
                    label="Dibayar"
                    value={
                      item.paid_at
                        ? formatActivityDate(item.paid_at, locale)
                        : undefined
                    }
                  />
                </View>
              ) : null}

              {item.type === "hotel" ? (
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>
                    Informasi pet hotel
                  </Text>
                  <DetailRow icon="bed-outline" label="Kamar" value={item.room_name} />
                  <DetailRow
                    icon="storefront-outline"
                    label="Klinik"
                    value={[item.business_name, item.branch_name]
                      .filter(Boolean)
                      .join(" · ")}
                  />
                  <DetailRow
                    icon="log-in-outline"
                    label="Check-in"
                    value={[
                      item.scheduled_at
                        ? `Rencana ${formatActivityDate(item.scheduled_at, locale)}`
                        : "",
                      item.checked_in_at
                        ? `Aktual ${formatActivityDate(item.checked_in_at, locale)}`
                        : "",
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  />
                  <DetailRow
                    icon="log-out-outline"
                    label="Check-out"
                    value={[
                      item.ends_at
                        ? `Rencana ${formatActivityDate(item.ends_at, locale)}`
                        : "",
                      item.checked_out_at
                        ? `Aktual ${formatActivityDate(item.checked_out_at, locale)}`
                        : "",
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  />
                  <DetailRow icon="paw-outline" label="Pet" value={item.pet_name} />
                </View>
              ) : null}

              {item.type === "home_service" ? (
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>
                    Informasi layanan jemput
                  </Text>
                  <DetailRow icon="barcode-outline" label="Kode" value={item.job_code} />
                  <DetailRow icon="cut-outline" label="Layanan" value={item.service_type} />
                  <DetailRow icon="location-outline" label="Jemput" value={item.pickup_address} />
                  <DetailRow icon="flag-outline" label="Tujuan" value={item.destination_address} />
                  <DetailRow
                    icon="calendar-outline"
                    label="Jadwal"
                    value={formatActivityDate(item.scheduled_at, locale)}
                  />
                  <DetailRow icon="person-outline" label="Driver" value={item.driver_name} />
                  <DetailRow icon="paw-outline" label="Pet" value={item.pet_name} />
                </View>
              ) : null}

              {item.amount > 0 ? (
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
                      {activityStatusLabel({
                        payable: item.payable,
                        status: item.payment_status,
                        payment_status: item.payment_status,
                      })}
                    </Text>
                  </View>
                  <Text style={styles.paymentAmount}>
                    {formatCurrency(item.amount)}
                  </Text>
                </View>
              ) : null}
              {item.payable ? (
                <PrimaryButton
                  compact
                  disabled={paymentBusy}
                  label={paymentBusy ? "Membuka pembayaran…" : "Bayar sekarang"}
                  icon="qr-code-outline"
                  onPress={() => void pay()}
                  style={styles.detailAction}
                />
              ) : null}
              {paymentError ? (
                <Text style={styles.paymentError}>{paymentError}</Text>
              ) : null}
              {invoiceReferenceType ? (
                <PrimaryButton
                  compact
                  light
                  disabled={invoiceBusy}
                  label={
                    invoiceBusy ? "Membuka invoice…" : "Buka invoice Slivadoc"
                  }
                  icon="document-text-outline"
                  style={styles.detailAction}
                  onPress={() => {
                    setInvoiceBusy(true);
                    void getMobileTransactionInvoiceHTML(
                      invoiceReferenceType,
                      item.reference_id,
                    )
                      .then(setInvoiceHTML)
                      .catch((cause) =>
                        SlivaAlert.alert(
                          "Invoice belum dapat dibuka",
                          cause instanceof Error
                            ? cause.message
                            : "Silakan coba lagi beberapa saat.",
                        ),
                      )
                      .finally(() => setInvoiceBusy(false));
                  }}
                />
              ) : null}
              {hasCoordinates ? (
                <PrimaryButton
                  compact
                  light
                  label="Petunjuk arah"
                  icon="navigate-outline"
                  style={styles.detailAction}
                  onPress={() =>
                    void Linking.openURL(
                      `https://www.google.com/maps/dir/?api=1&destination=${item.latitude},${item.longitude}`,
                    )
                  }
                />
              ) : null}
              <Text style={styles.createdAt}>
                Dibuat {formatActivityDate(item.occurred_at, locale)}
              </Text>
              {repeatLabel ? (
                <PrimaryButton
                  label={repeatLabel}
                  icon="refresh-outline"
                  onPress={onRepeat}
                />
              ) : null}
            </ScrollView>
            <MobileQrisModal
              payment={payment}
              onClose={() => setPayment(undefined)}
              onPaid={() => void onReload()}
            />
          </Pressable>
        </SafeAreaView>
      </Pressable>
    </Modal>
    <Modal supportedOrientations={["portrait", "portrait-upside-down", "landscape-left", "landscape-right"]}
      visible={Boolean(invoiceHTML)}
      animationType="slide"
      presentationStyle="fullScreen"
      statusBarTranslucent={false}
      onRequestClose={() => setInvoiceHTML("")}
    >
      <SafeAreaView edges={["top", "bottom", "left", "right"]} style={styles.invoicePage}>
        <View style={styles.invoiceHeader}>
          <View style={styles.invoiceHeaderIcon}><Ionicons name="document-text" size={20} color={colors.white} /></View>
          <View style={styles.invoiceHeaderCopy}>
            <Text style={styles.invoiceHeaderEyebrow}>DOKUMEN TRANSAKSI</Text>
            <Text numberOfLines={1} style={styles.invoiceHeaderTitle}>{item.code}</Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Tutup invoice" onPress={() => setInvoiceHTML("")} style={styles.invoiceClose}>
            <Ionicons name="close" size={22} color={colors.navy} />
          </Pressable>
        </View>
        {invoiceHTML ? (
          <WebView
            source={{ html: invoiceHTML, baseUrl: "https://slivadoc.com" }}
            originWhitelist={["about:blank", "https://*"]}
            setSupportMultipleWindows={false}
            javaScriptEnabled={false}
            style={styles.invoiceWebView}
          />
        ) : null}
      </SafeAreaView>
    </Modal>
  </>;
}

export function ActivityScreen({
  authenticated,
  hasPet,
  activities,
  summary = emptyActivitySummary,
  hasMore,
  loadingMore,
  onLoadMore,
  loading,
  onReload,
  intent,
  onIntentHandled,
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
  const { formatDate } = useI18n();
  const { unreadNotifications, openChatInbox } = useAppSurface();
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [stateFilter, setStateFilter] = useState<MobileActivityState>("all");
  const [selected, setSelected] = useState<SelectedActivity>();
  const [createOpen, setCreateOpen] = useState(false);

  const handledIntent = useRef(0);

  const openDetail = (item: MobileActivityCenterItem, autoPay = false) =>
    setSelected({ type: item.type, id: item.id, autoPay, fallback: item });
  const detailItem = selected
    ? (activities.find(
        (item) => item.type === selected.type && item.id === selected.id,
      ) ?? selected.fallback)
    : undefined;

  useEffect(() => {
    if (!intent || handledIntent.current === intent.token) return;
    handledIntent.current = intent.token;
    const { token, type, id } = intent;
    queueMicrotask(() => {
      // Without an id the intent only filters, e.g. the marketplace "Pesanan" shortcut.
      if (!id) {
        setTypeFilter(type);
        onIntentHandled(token);
        return;
      }
      const item = activities.find(
        (activity) => activity.type === type && activity.id === id,
      );
      if (item) {
        setStateFilter(item.state);
        setTypeFilter("all");
        setSelected({ type, id, autoPay: false, fallback: item });
      } else {
        onAction("Aktivitas belum tersedia. Coba lagi sebentar.");
      }
      onIntentHandled(token);
    });
  }, [activities, intent, onAction, onIntentHandled]);

  const repeat = useCallback(
    (item: MobileActivityCenterItem) => {
      setSelected(undefined);
      if (item.type === "booking") onRebook(item.service_id);
      else if (item.type === "order") onReorder(item.items ?? []);
      else if (item.type === "consultation") onReconsult(item.plan_id);
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
      ? Object.values(summary).reduce((total, count) => total + count, 0)
      : summary[type];
  const attention = activities.filter((item) => item.needs_action);
  const visible = activities.filter(
    (item) =>
      (typeFilter === "all" || item.type === typeFilter) &&
      (stateFilter === "all" || item.state === stateFilter),
  );

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
            accessibilityLabel="Buka daftar chat"
            onPress={() => openChatInbox()}
            style={styles.headerButton}
          >
            <Ionicons name="chatbubble-ellipses-outline" size={20} color={colors.text} />
            <ChatUnreadBadge />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Buka notifikasi"
            onPress={() => onOpenNotifications()}
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
            accessibilityLabel="Buka daftar chat"
            onPress={() => openChatInbox()}
            style={styles.headerButton}
          >
            <Ionicons name="chatbubble-ellipses-outline" size={20} color={colors.text} />
            <ChatUnreadBadge />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Buka notifikasi"
            onPress={() => onOpenNotifications()}
            style={styles.headerButton}
          >
            <Ionicons
              name="notifications-outline"
              size={20}
              color={colors.text}
            />
            {unreadNotifications > 0 ? <View style={styles.notificationDot} /> : null}
          </Pressable>
        </View>

        {!hasPet ? <PetRequiredNotice onAddPet={onRequirePet} /> : null}

        {attention.length ? (
          <Card style={styles.attentionCard}>
            <View style={styles.attentionHeader}>
              <Text style={styles.attentionTitle}>Perlu tindakan</Text>
              <View style={styles.typeCount}>
                <Text style={styles.typeCountText}>{attention.length}</Text>
              </View>
            </View>
            {attention.map((item) => {
              const presentation = getActivityTypePresentation(item.type);
              const reason = activityAttentionReason(item, (value) =>
                formatDate(value, { weekday: "short", hour: "2-digit", minute: "2-digit" }),
              );
              return (
                <View key={`${item.type}-${item.id}`} style={styles.attentionRow}>
                  <View
                    style={[
                      styles.attentionIcon,
                      { backgroundColor: presentation.surface },
                    ]}
                  >
                    <Ionicons
                      name={presentation.icon}
                      size={18}
                      color={presentation.color}
                    />
                  </View>
                  <View style={styles.activityCopy}>
                    <Text numberOfLines={1} style={styles.attentionItemTitle}>
                      {item.title}
                    </Text>
                    <Text numberOfLines={1} style={styles.activitySubtitle}>
                      {reason}
                    </Text>
                  </View>
                  <PrimaryButton
                    compact
                    label={
                      item.payable
                        ? "Bayar"
                        : item.type === "event"
                          ? "Tiket QR"
                          : "Lihat detail"
                    }
                    onPress={() => openDetail(item, item.payable)}
                  />
                </View>
              );
            })}
          </Card>
        ) : null}

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.typeFilters}
        >
          {typeOptions
            .filter(
              (option) =>
                option.id === "all" ||
                option.id === typeFilter ||
                typeCount(option.id) > 0,
            )
            .map((option) => {
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
            <Text style={styles.sectionTitle}>{visible.length} aktivitas</Text>
          </View>
          <PrimaryButton
            compact
            label="Buat baru"
            icon="add"
            onPress={createForFilter}
            style={styles.createCompactButton}
          />
        </View>

        {loading && !activities.length ? (
          <View style={styles.loadingState}>
            <ActivityIndicator color={colors.sky600} />
            <Text style={styles.loadingText}>Mengambil aktivitas terbaru…</Text>
          </View>
        ) : visible.length ? (
          <View style={styles.activityList}>
            {visible.map((item) => (
              <ActivityCard
                key={`${item.type}-${item.id}`}
                item={item}
                onDetail={() => openDetail(item)}
                onRepeat={() => repeat(item)}
              />
            ))}
          </View>
        ) : (
          <Card style={styles.emptyCard}>
            <EmptyState
              icon={
                typeFilter === "all"
                  ? "calendar-outline"
                  : getActivityTypePresentation(typeFilter).icon
              }
              title="Belum ada aktivitas"
              note="Filter ini masih kosong. Mulai aktivitas baru dan progresnya akan tampil otomatis di sini."
              action="Buat aktivitas baru"
              onAction={createForFilter}
            />
          </Card>
        )}
        {hasMore ? (
          <PrimaryButton
            compact
            light
            disabled={loadingMore}
            label={loadingMore ? "Memuat…" : "Muat lebih banyak"}
            icon="chevron-down"
            onPress={onLoadMore}
            style={styles.loadMore}
          />
        ) : null}
      </Screen>
      {selected && detailItem ? (
        <ActivityDetailSheet
          key={`${selected.type}-${selected.id}`}
          item={detailItem}
          autoPay={selected.autoPay}
          onClose={() => setSelected(undefined)}
          onOpenProduct={(productId) => {
            setSelected(undefined);
            onOpenProduct(productId);
          }}
          onRepeat={() => repeat(detailItem)}
          onReload={onReload}
        />
      ) : null}
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
  attentionCard: {
    gap: 10,
    marginTop: 4,
    padding: 14,
    borderColor: "#F3D8A6",
    borderRadius: 20,
    backgroundColor: "#FFFAF0",
  },
  attentionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  attentionTitle: { color: colors.navy, fontSize: 15, fontWeight: "700" },
  attentionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 10,
    borderRadius: 14,
    backgroundColor: colors.white,
  },
  attentionIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  attentionItemTitle: { color: colors.navy, fontSize: 12, fontWeight: "700" },
  ticket: {
    alignItems: "center",
    gap: 6,
    marginTop: 14,
    padding: 14,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#C9D8E3",
    borderRadius: 16,
  },
  ticketCode: {
    color: colors.navy,
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 1,
  },
  ticketNote: { color: colors.muted, fontSize: 10, textAlign: "center" },
  progressTrack: {
    height: 8,
    marginTop: 6,
    overflow: "hidden",
    borderRadius: 4,
    backgroundColor: "#E7EEF4",
  },
  progressFill: { height: "100%", backgroundColor: "#19A37F" },
  progressNote: { marginTop: 2, color: colors.muted, fontSize: 9 },
  detailAction: { marginTop: 12 },
  detailResubmit: { gap: 8, marginTop: 12 },
  paymentError: { marginTop: 8, color: colors.red, fontSize: 11 },
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
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 6,
  },
  activityType: {
    minWidth: 0,
    flex: 1,
    flexShrink: 1,
    fontSize: 9,
    lineHeight: 14,
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
  sheetSafeArea: {maxWidth: 720, alignSelf: "center",  width: "100%", maxHeight: "88%" },
  invoicePage: { flex: 1, backgroundColor: colors.white },
  invoiceHeader: { minHeight: 66, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: colors.sky100, backgroundColor: colors.sky25 },
  invoiceHeaderIcon: { width: 40, height: 40, alignItems: "center", justifyContent: "center", borderRadius: 14, backgroundColor: colors.sky600 },
  invoiceHeaderCopy: { minWidth: 0, flex: 1 },
  invoiceHeaderEyebrow: { color: colors.sky600, fontSize: 8, fontWeight: "700", letterSpacing: 1 },
  invoiceHeaderTitle: { marginTop: 2, color: colors.navy, fontSize: 14, fontWeight: "700" },
  invoiceClose: { width: 40, height: 40, alignItems: "center", justifyContent: "center", borderRadius: 14, backgroundColor: colors.white },
  invoiceWebView: { flex: 1, backgroundColor: colors.white },
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
  orderAction: { gap: 8, marginTop: 14 },
  returnCard: {
    gap: 8,
    marginTop: 12,
    padding: 13,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: colors.sky100,
    backgroundColor: colors.white,
  },
  returnTitle: { color: colors.navy, fontSize: 12, fontWeight: "700" },
  returnNote: { color: colors.muted, fontSize: 10, lineHeight: 15 },
  returnInput: {
    minHeight: 92,
    padding: 11,
    borderWidth: 1,
    borderColor: colors.sky100,
    borderRadius: 13,
    color: colors.text,
    fontSize: 12,
    textAlignVertical: "top",
  },
  returnError: { color: colors.red, fontSize: 10, lineHeight: 15 },
  returnRequested: { flexDirection: "row", alignItems: "center", gap: 6 },
  loadMore: { marginTop: 12 },
  trackingReadOnlyNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
    padding: 10,
    borderRadius: 13,
    backgroundColor: "#EAF7FD",
  },
  trackingReadOnlyText: { flex: 1, color: colors.text, fontSize: 9, lineHeight: 13 },
  shipmentTitleRow: { flexDirection: "row", alignItems: "center", gap: 9 },
  shipmentTitleCopy: { flex: 1 },
  shipmentNumber: { color: colors.navy, fontSize: 12, fontWeight: "700" },
  shipmentStatus: {
    marginTop: 2,
    color: colors.muted,
    fontSize: 9,
    textTransform: "capitalize",
  },
  shipmentProgress: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 4,
    paddingVertical: 5,
  },
  shipmentProgressStep: { flex: 1, alignItems: "center", gap: 4 },
  shipmentProgressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.line,
  },
  shipmentProgressDotActive: { backgroundColor: colors.sky600 },
  shipmentProgressLabel: {
    color: colors.muted,
    fontSize: 7,
    textAlign: "center",
  },
  shipmentProgressLabelActive: { color: colors.navy, fontWeight: "700" },
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
