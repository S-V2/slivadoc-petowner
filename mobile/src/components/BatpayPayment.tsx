import { useEffect, useRef, useState } from "react";
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  getMobilePaymentIntent,
  getMobilePaymentMethods,
  type MobilePaymentIntent,
  type MobilePaymentMethod,
} from "../api";
import { colors, shadow } from "../theme";

export function MobilePaymentMethods({
  value,
  onChange,
  disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const [methods, setMethods] = useState<MobilePaymentMethod[]>([]);
  const [message, setMessage] = useState("");
  useEffect(() => {
    let active = true;
    void getMobilePaymentMethods()
      .then((result) => {
        if (!active) return;
        setMethods(result.data);
        const first = result.data[0];
        if (first && !result.data.some((item) => item.code === value))
          onChange(first.code);
      })
      .catch(
        (cause) =>
          active &&
          setMessage(
            cause instanceof Error
              ? cause.message
              : "Metode pembayaran belum tersedia",
          ),
      );
    return () => {
      active = false;
    };
  }, [onChange, value]);
  return (
    <View style={styles.methods}>
      <Text style={styles.label}>Metode pembayaran</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.methodRow}
      >
        {methods.map((item) => (
          <Pressable
            disabled={disabled}
            onPress={() => onChange(item.code)}
            key={item.code}
            style={[styles.method, item.code === value && styles.methodActive]}
          >
            <Text style={styles.methodIcon}>
              {item.method === "qris" ? "▦" : "🏦"}
            </Text>
            <Text style={styles.methodLabel}>{item.label}</Text>
            <Text numberOfLines={1} style={styles.methodNote}>
              {item.description}
            </Text>
            {item.code === value ? <Text style={styles.check}>✓</Text> : null}
          </Pressable>
        ))}
      </ScrollView>
      {!methods.length ? (
        <Text style={styles.message}>{message || "Memuat metode BatPay…"}</Text>
      ) : null}
    </View>
  );
}

export function MobileBatpayModal({
  payment,
  onClose,
  onPaid,
}: {
  payment?: MobilePaymentIntent;
  onClose: () => void;
  onPaid: () => void;
}) {
  if (!payment) return null;
  return (
    <MobileBatpayModalState
      key={payment.id}
      payment={payment}
      onClose={onClose}
      onPaid={onPaid}
    />
  );
}

function MobileBatpayModalState({
  payment,
  onClose,
  onPaid,
}: {
  payment: MobilePaymentIntent;
  onClose: () => void;
  onPaid: () => void;
}) {
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
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
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
              <Text>×</Text>
            </Pressable>
            {current.status === "paid" ? (
              <View style={styles.center}>
                <View style={styles.success}>
                  <Text style={styles.successText}>✓</Text>
                </View>
                <Text style={styles.title}>Pembayaran berhasil</Text>
                <Text style={styles.note}>
                  Transaksi sudah tercatat dan layanan sedang diproses.
                </Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={onClose}
                  style={styles.primary}
                >
                  <Text style={styles.primaryText}>Selesai</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.center}>
                <Text style={styles.kicker}>
                  BATPAY ·{" "}
                  {current.method === "qris"
                    ? "QRIS"
                    : `${current.bank_code || "BANK"} VA`}
                </Text>
                <Text style={styles.title}>
                  {current.method === "qris"
                    ? "Scan QR untuk membayar"
                    : "Transfer ke Virtual Account"}
                </Text>
                <Text style={styles.note}>
                  {current.order_id} · berlaku 15 menit
                </Text>
                {current.method === "qris" && current.qr_url ? (
                  // React Native Image uses accessibilityLabel rather than HTML alt.
                  // eslint-disable-next-line jsx-a11y/alt-text
                  <Image
                    accessibilityLabel="QRIS pembayaran BatPay"
                    source={{ uri: current.qr_url }}
                    style={styles.qr}
                  />
                ) : (
                  <View style={styles.va}>
                    <Text style={styles.vaLabel}>Nomor Virtual Account</Text>
                    <Text selectable style={styles.vaNumber}>
                      {current.va_number || "—"}
                    </Text>
                    {current.va_name ? (
                      <Text style={styles.note}>a.n. {current.va_name}</Text>
                    ) : null}
                  </View>
                )}
                <Text style={styles.amount}>
                  {new Intl.NumberFormat("id-ID", {
                    style: "currency",
                    currency: "IDR",
                    maximumFractionDigits: 0,
                  }).format(current.amount)}
                </Text>
                <Text
                  style={
                    current.status === "failed" || current.status === "refunded"
                      ? styles.failed
                      : styles.wait
                  }
                >
                  {current.status === "refunded"
                    ? "Pembayaran sudah direfund"
                    : current.status === "failed"
                      ? "Pembayaran gagal atau kedaluwarsa"
                      : "● Menunggu konfirmasi pembayaran…"}
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
    fontSize: 11,
    fontWeight: "800",
  },
  methodRow: { gap: 8, paddingRight: 8 },
  method: {
    position: "relative",
    width: 132,
    minHeight: 74,
    padding: 9,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 14,
    backgroundColor: colors.white,
  },
  methodActive: { borderColor: colors.sky500, backgroundColor: colors.sky50 },
  methodIcon: { fontSize: 17 },
  methodLabel: {
    marginTop: 5,
    color: colors.navy,
    fontSize: 11,
    fontWeight: "900",
  },
  methodNote: { marginTop: 3, color: colors.muted, fontSize: 10 },
  check: {
    position: "absolute",
    right: 9,
    top: 9,
    color: colors.sky600,
    fontWeight: "900",
  },
  message: {
    padding: 12,
    color: colors.muted,
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
    borderRadius: 12,
    backgroundColor: colors.canvas,
  },
  center: { alignItems: "center", gap: 8, paddingTop: 24 },
  kicker: {
    color: colors.sky600,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1,
  },
  title: {
    color: colors.navy,
    fontSize: 20,
    lineHeight: 25,
    fontWeight: "900",
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
    borderColor: colors.line,
    borderRadius: 14,
    backgroundColor: colors.white,
  },
  va: {
    width: "100%",
    alignItems: "center",
    gap: 8,
    marginVertical: 18,
    padding: 22,
    borderWidth: 1,
    borderColor: colors.sky100,
    borderRadius: 16,
    backgroundColor: colors.sky50,
  },
  vaLabel: { color: colors.muted, fontSize: 11 },
  vaNumber: {
    color: colors.sky600,
    fontSize: 19,
    fontWeight: "900",
    letterSpacing: 1,
    textAlign: "center",
  },
  amount: { color: colors.navy, fontSize: 19, fontWeight: "900" },
  wait: { color: "#D97706", fontSize: 12, fontWeight: "800" },
  failed: { color: colors.red, fontSize: 12, fontWeight: "800" },
  success: {
    width: 60,
    height: 60,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 30,
    backgroundColor: colors.mint,
  },
  successText: { color: colors.white, fontSize: 30, fontWeight: "900" },
  primary: {
    width: "100%",
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 15,
    borderRadius: 14,
    backgroundColor: colors.sky500,
  },
  primaryText: { color: colors.white, fontWeight: "900" },
});
