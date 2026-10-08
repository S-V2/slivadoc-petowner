import { LocalizedPressable as Pressable } from "./LocalizedPressable";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,

  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import QRCode from "react-native-qrcode-svg";
import { Ionicons } from "@expo/vector-icons";
import {
  getMobilePaymentIntent,
  getMobilePaymentMethods,
  type MobilePaymentIntent,
  type MobilePaymentMethod,
} from "../api";
import { LocalizedText as Text, useI18n } from "../i18n";
import { colors, shadow } from "../theme";

// Copy for every status that must not render a payable QR.
const qrClosedMessages: Record<string, string> = {
  expired: "QR kedaluwarsa. Buat pembayaran baru dari Aktivitas.",
  refund_pending:
    "Pembayaran diterima setelah transaksi ditutup. Dana akan dikembalikan setelah diverifikasi.",
  refunded: "Dana sudah dikembalikan.",
  failed: "Pembayaran gagal.",
};

function neutralPaymentMessage(value: unknown, fallback: string) {
  if (value instanceof Error && "status" in value && value.status === 401)
    return "Sesi Anda berakhir. Silakan login kembali.";
  return fallback;
}

export function MobilePaymentMethods({
  value,
  onChange,
  disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const [method, setMethod] = useState<MobilePaymentMethod | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    void getMobilePaymentMethods()
      .then((result) => {
        if (!active) return;
        const qris = result.data.find((item) => item.method === "qris" && item.code === "qris");
        setMethod(qris ?? null);
        if (!qris) setMessage("Pembayaran QRIS sementara belum tersedia. Coba lagi.");
      })
      .catch(
        (cause) =>
          active &&
          setMessage(
            neutralPaymentMessage(cause, "Pembayaran QRIS sementara belum tersedia. Coba lagi."),
          ),
      )
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [attempt]);
  useEffect(() => {
    onChange(method?.code ?? "");
  }, [method, onChange]);

  function retry() {
    setMethod(null);
    setMessage("");
    setLoading(true);
    setAttempt((current) => current + 1);
  }
  return (
    <View style={styles.methods}>
      <Text style={styles.label}>Metode pembayaran</Text>
      <Pressable
        accessibilityRole="radio"
        accessibilityLabel="QRIS"
        accessibilityState={{ checked: !!method && method.code === value, disabled: disabled || loading || !method, busy: loading }}
        disabled={disabled || loading || !method}
        onPress={() => method && onChange(method.code)}
        style={[styles.method, method && method.code === value && styles.methodActive]}
      >
        <View style={styles.methodIcon}><Ionicons name="qr-code-outline" size={22} color={colors.sky600} /></View>
        <View style={styles.methodCopy}>
          <Text style={styles.methodLabel}>QRIS</Text>
          <Text style={styles.methodNote}>Bayar dengan aplikasi pilihan Anda</Text>
        </View>
        {loading ? <ActivityIndicator size="small" color={colors.sky600} /> : method && method.code === value ? <Ionicons name="checkmark-circle" size={21} color={colors.sky600} /> : null}
      </Pressable>
      {loading ? <Text accessibilityLiveRegion="polite" style={styles.message}>Memuat metode pembayaran…</Text> : message ? (
        <View style={styles.feedback}>
          <Text accessibilityRole="alert" style={styles.message}>{message}</Text>
          <Pressable disabled={disabled} accessibilityRole="button" onPress={retry} style={styles.retry}>
            <Ionicons name="refresh-outline" size={16} color={colors.sky600} />
            <Text style={styles.retryText}>Coba lagi</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

export function MobileQrisModal({
  payment,
  onClose,
  onPaid,
  onOpenActivity,
}: {
  payment?: MobilePaymentIntent;
  onClose: () => void;
  onPaid: () => void;
  onOpenActivity?: () => void;
}) {
  if (!payment) return null;
  return (
    <MobileQrisModalState
      key={payment.id}
      payment={payment}
      onClose={onClose}
      onPaid={onPaid}
      onOpenActivity={onOpenActivity}
    />
  );
}

function MobileQrisModalState({
  payment,
  onClose,
  onPaid,
  onOpenActivity,
}: {
  payment: MobilePaymentIntent;
  onClose: () => void;
  onPaid: () => void;
  onOpenActivity?: () => void;
}) {
  const { formatCurrency } = useI18n();
  const [current, setCurrent] = useState(payment);
  const notified = useRef(false);
  const currentID = current.id;
  const currentStatus = current.status;
  useEffect(() => {
    if (current?.status === "paid" && !notified.current) {
      notified.current = true;
      onPaid();
    }
  }, [current?.status, onPaid]);
  useEffect(() => {
    if (currentStatus !== "pending") return;
    let active = true;
    const poll = () =>
      void getMobilePaymentIntent(currentID)
        .then((result) => active && setCurrent(result))
        .catch(() => undefined);
    const timer = setInterval(poll, 5000);
    void poll();
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [currentID, currentStatus]);
  return (
    <Modal supportedOrientations={["portrait", "portrait-upside-down", "landscape-left", "landscape-right"]} visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <SafeAreaView style={styles.wrap}>
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Tutup pembayaran"
              onPress={onClose}
              style={styles.close}
            >
              <Ionicons name="close" size={21} color={colors.text} />
            </Pressable>
            {current.status === "paid" ? (
              <View style={styles.center}>
                <View style={styles.success}>
                  <Ionicons name="checkmark" size={28} color={colors.white} />
                </View>
                <Text style={styles.title}>Pembayaran berhasil</Text>
                <Text style={styles.note}>
                  Transaksi sudah tercatat dan layanan sedang diproses.
                </Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={onOpenActivity ?? onClose}
                  style={styles.primary}
                >
                  <Text style={styles.primaryText}>
                    {onOpenActivity ? "Lihat di Aktivitas" : "Selesai"}
                  </Text>
                </Pressable>
              </View>
            ) : current.status !== "pending" ? (
              <View style={styles.center}>
                <Text style={styles.title}>Pembayaran</Text>
                <Text style={styles.amount}>
                  {formatCurrency(current.amount)}
                </Text>
                <Text
                  style={
                    current.status === "refund_pending"
                      ? styles.wait
                      : styles.failed
                  }
                >
                  {qrClosedMessages[current.status] ??
                    "Pembayaran tidak dapat dilanjutkan."}
                </Text>
              </View>
            ) : (
              <View style={styles.center}>
                <Text style={styles.kicker}>PEMBAYARAN · QRIS</Text>
                <Text style={styles.title}>Scan QR untuk membayar</Text>
                <Text style={styles.note}>
                  {current.order_id} · berlaku 15 menit
                </Text>
                {current.qr_string ? (
                  <View
                    accessible
                    accessibilityLabel="Kode QRIS pembayaran"
                    style={[styles.qr, styles.qrCode]}
                  >
                    <QRCode value={current.qr_string} size={185} ecl="M" />
                  </View>
                ) : current.qr_url ? (
                  // Rows written before the cutover carry an image URL and no EMV string.
                  // React Native Image uses accessibilityLabel rather than HTML alt.
                  // eslint-disable-next-line jsx-a11y/alt-text
                  <Image
                    accessibilityLabel="Kode QRIS pembayaran"
                    source={{ uri: current.qr_url }}
                    style={styles.qr}
                  />
                ) : (
                  <View style={[styles.qr, styles.qrCode]}>
                    <Text style={styles.note}>QR belum tersedia</Text>
                  </View>
                )}
                <Text style={styles.amount}>
                  {formatCurrency(current.amount)}
                </Text>
                <Text style={styles.wait}>
                  ● Menunggu konfirmasi pembayaran…
                </Text>
              </View>
            )}
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  methods: { marginTop: 12 },
  label: {
    marginBottom: 8,
    color: colors.text,
    fontSize: 12,
    fontWeight: "600",
  },
  method: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 74,
    padding: 13,
    borderWidth: 1,
    borderColor: colors.sky100,
    borderRadius: 14,
    backgroundColor: colors.white,
  },
  methodCopy: { flex: 1 },
  methodActive: { borderColor: colors.sky500, backgroundColor: colors.sky50 },
  methodIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.sky50,
  },
  methodLabel: {
    color: colors.navy,
    fontSize: 15,
    fontWeight: "700",
  },
  methodNote: { marginTop: 3, color: colors.muted, fontSize: 12, lineHeight: 17 },
  feedback: { gap: 4 },
  retry: { minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: 12, backgroundColor: colors.sky50 },
  retryText: { color: colors.sky600, fontSize: 13, fontWeight: "600" },
  message: {
    padding: 12,
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
    backgroundColor: colors.canvas,
    borderRadius: 12,
  },
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(14,32,55,.42)",
  },
  wrap: { maxHeight: "88%" },
  sheet: {
    position: "relative",
    minHeight: 430,
    padding: 18,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: colors.sky100,
    backgroundColor: colors.white,
    ...shadow,
  },
  handle: {
    alignSelf: "center",
    width: 42,
    height: 5,
    marginTop: -11,
    marginBottom: 14,
    borderRadius: 3,
    backgroundColor: "#DCE5EB",
  },
  close: {
    position: "absolute",
    zIndex: 2,
    right: 18,
    top: 18,
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: colors.sky50,
  },
  center: { alignItems: "center", gap: 8, paddingTop: 24 },
  kicker: {
    color: colors.sky600,
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1,
  },
  title: {
    color: colors.navy,
    fontSize: 20,
    lineHeight: 25,
    fontWeight: "700",
    textAlign: "center",
  },
  note: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
  },
  qr: {
    width: 205,
    height: 205,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: colors.sky100,
    borderRadius: 18,
    backgroundColor: colors.white,
  },
  qrCode: { alignItems: "center", justifyContent: "center" },
  amount: { color: colors.navy, fontSize: 19, fontWeight: "700" },
  wait: { color: colors.yellow, fontSize: 12, fontWeight: "600" },
  failed: { color: colors.red, fontSize: 12, fontWeight: "600" },
  success: {
    width: 60,
    height: 60,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 30,
    backgroundColor: colors.mint,
  },
  successText: { color: colors.white, fontSize: 30, fontWeight: "700" },
  primary: {
    width: "100%",
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 15,
    borderRadius: 14,
    backgroundColor: colors.sky600,
  },
  primaryText: { color: colors.white, fontWeight: "700" },
});
