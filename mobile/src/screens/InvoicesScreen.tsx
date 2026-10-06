import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import {
  getMobileInvoice,
  getMobileInvoices,
  type MobileInvoice,
  type MobileInvoiceDetail,
} from "../api";
import { BoundedBottomSheet, Card, EmptyState, Pill, Screen, TopHeader } from "../components/ui";
import { LocalizedText as Text, useI18n } from "../i18n";
import { colors } from "../theme";

const statusLabel: Record<MobileInvoice["status"], string> = {
  pending: "Belum lunas",
  paid: "Lunas",
  void: "Dibatalkan",
  refunded: "Dikembalikan",
  partially_refunded: "Dikembalikan sebagian",
};
const statusTone: Record<MobileInvoice["status"], "blue" | "mint" | "yellow" | "red"> = {
  pending: "yellow",
  paid: "mint",
  void: "red",
  refunded: "red",
  partially_refunded: "yellow",
};

function outstanding(invoice: MobileInvoice) {
  return invoice.status === "void" ? 0 : Math.max(0, invoice.total_amount - invoice.paid_amount);
}

export function InvoicesScreen({
  onBack,
  onAction,
  onOpenNotifications,
}: {
  onBack: () => void;
  onAction: (message: string) => void;
  onOpenNotifications: () => void;
}) {
  const { formatCurrency, formatDate } = useI18n();
  const [invoices, setInvoices] = useState<MobileInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<MobileInvoice>();
  const [detail, setDetail] = useState<MobileInvoiceDetail>();
  const [detailError, setDetailError] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    getMobileInvoices()
      .then((result) => setInvoices(result.data))
      .catch((cause) =>
        setError(cause instanceof Error ? cause.message : "Invoice belum dapat dimuat"),
      )
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
  }, [load]);

  const loadDetail = useCallback((invoice: MobileInvoice) => {
    setDetail(undefined);
    setDetailError("");
    getMobileInvoice(invoice.id)
      .then(setDetail)
      .catch((cause) =>
        setDetailError(cause instanceof Error ? cause.message : "Detail invoice belum dapat dimuat"),
      );
  }, []);
  const open = (invoice: MobileInvoice) => {
    setSelected(invoice);
    loadDetail(invoice);
  };

  const issued = (invoice: MobileInvoice) =>
    invoice.issued_at ? formatDate(invoice.issued_at, { day: "numeric", month: "short", year: "numeric" }) : "—";
  const branchLine = (invoice: MobileInvoice) =>
    [invoice.business_name, invoice.branch_name].filter(Boolean).join(" · ");
  const shown = detail ?? selected;

  return (
    <Screen contentStyle={styles.content}>
      <TopHeader title="Invoice" subtitle="Tagihan klinik & toko" onNotification={onOpenNotifications} />
      <Pressable accessibilityRole="button" accessibilityLabel="Kembali ke akun" onPress={onBack} style={({ pressed }) => [styles.back, pressed && styles.pressed]}>
        <Ionicons name="arrow-back" size={18} color={colors.navy} />
        <Text style={styles.backText}>Akun</Text>
      </Pressable>
      {loading ? (
        <View style={styles.loading} accessibilityRole="progressbar"><ActivityIndicator color={colors.sky600} /><Text style={styles.note}>Memuat invoice…</Text></View>
      ) : error ? (
        <EmptyState icon="cloud-offline-outline" title="Invoice belum dapat dimuat" note={error} action="Coba lagi" onAction={() => { load(); onAction("Memuat ulang invoice…"); }} />
      ) : invoices.length ? (
        <View style={styles.list}>
          {invoices.map((invoice) => (
            <Pressable key={invoice.id} accessibilityRole="button" accessibilityLabel={`Buka invoice ${invoice.invoice_number}`} onPress={() => open(invoice)} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
              <View style={styles.rowTop}>
                <Text style={styles.number} numberOfLines={1}>{invoice.invoice_number}</Text>
                <Pill tone={statusTone[invoice.status]}>{statusLabel[invoice.status]}</Pill>
              </View>
              {branchLine(invoice) ? <Text style={styles.note} numberOfLines={1}>{branchLine(invoice)}</Text> : null}
              <View style={styles.rowBottom}>
                <Text style={styles.note}>{issued(invoice)}</Text>
                <Text style={styles.total}>{formatCurrency(invoice.total_amount)}</Text>
              </View>
              <Text style={styles.note}>Dibayar {formatCurrency(invoice.paid_amount)} · Sisa {formatCurrency(outstanding(invoice))}</Text>
            </Pressable>
          ))}
        </View>
      ) : (
        <EmptyState icon="receipt-outline" title="Belum ada invoice" note="Belum ada invoice tertaut. Tautkan kode pet owner di klinik agar invoice muncul di sini." action="Muat ulang" onAction={load} />
      )}

      <BoundedBottomSheet visible={Boolean(selected)} onClose={() => setSelected(undefined)} maxHeight="88%">
        {shown ? (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.sheet}>
            <View style={styles.rowTop}>
              <Text style={styles.sheetTitle} numberOfLines={1}>{shown.invoice_number}</Text>
              <Pill tone={statusTone[shown.status]}>{statusLabel[shown.status]}</Pill>
            </View>
            {branchLine(shown) ? <Text style={styles.note}>{branchLine(shown)}</Text> : null}
            <Text style={styles.note}>Terbit {issued(shown)}{shown.paid_at ? ` · Dibayar ${formatDate(shown.paid_at, { day: "numeric", month: "short", year: "numeric" })}` : ""}</Text>
            <Card style={styles.items}>
              {detail ? (
                detail.items.map((item, index) => (
                  <View key={`${item.description}-${index}`} style={styles.item}>
                    <View style={styles.itemCopy}>
                      <Text style={styles.itemName}>{item.description}</Text>
                      <Text style={styles.note}>{item.quantity} × {formatCurrency(item.unit_price)}{item.discount_amount > 0 ? ` · Diskon ${formatCurrency(item.discount_amount)}` : ""}</Text>
                    </View>
                    <Text style={styles.itemTotal}>{formatCurrency(item.line_total)}</Text>
                  </View>
                ))
              ) : detailError ? (
                <View style={styles.detailError}>
                  <Text style={styles.note}>{detailError}</Text>
                  <Pressable accessibilityRole="button" onPress={() => selected && loadDetail(selected)}><Text style={styles.retry}>Coba lagi</Text></Pressable>
                </View>
              ) : (
                <View style={styles.loading}><ActivityIndicator color={colors.sky600} /><Text style={styles.note}>Memuat rincian…</Text></View>
              )}
            </Card>
            <View style={styles.sums}>
              <Sum label="Subtotal" value={formatCurrency(shown.subtotal)} />
              {shown.discount_amount > 0 ? <Sum label="Diskon" value={`-${formatCurrency(shown.discount_amount)}`} /> : null}
              {shown.tax_amount > 0 ? <Sum label="Pajak" value={formatCurrency(shown.tax_amount)} /> : null}
              <Sum label="Total" value={formatCurrency(shown.total_amount)} strong />
              <Sum label="Sudah dibayar" value={formatCurrency(shown.paid_amount)} />
              {shown.refunded_amount > 0 ? <Sum label="Dikembalikan" value={formatCurrency(shown.refunded_amount)} /> : null}
              <Sum label="Sisa tagihan" value={formatCurrency(outstanding(shown))} strong />
            </View>
          </ScrollView>
        ) : null}
      </BoundedBottomSheet>
    </Screen>
  );
}

function Sum({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return <View style={styles.sum}><Text style={[styles.sumLabel, strong && styles.strong]}>{label}</Text><Text style={[styles.sumValue, strong && styles.strong]}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  content: { gap: 12 },
  pressed: { opacity: 0.88 },
  back: { alignSelf: "flex-start", minHeight: 38, flexDirection: "row", alignItems: "center", gap: 6 },
  backText: { color: colors.navy, fontSize: 13, fontWeight: "600" },
  loading: { minHeight: 90, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  list: { gap: 9 },
  row: { gap: 5, padding: 13, borderWidth: 1, borderColor: colors.sky100, borderRadius: 18, backgroundColor: colors.white },
  rowTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  rowBottom: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  number: { minWidth: 0, flex: 1, color: colors.navy, fontSize: 13, fontWeight: "700" },
  note: { color: colors.muted, fontSize: 11, lineHeight: 16 },
  total: { color: colors.navy, fontSize: 14, fontWeight: "700" },
  sheet: { gap: 8, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 22 },
  sheetTitle: { minWidth: 0, flex: 1, color: colors.navy, fontSize: 16, fontWeight: "700" },
  items: { paddingHorizontal: 12, marginTop: 6 },
  item: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.line },
  itemCopy: { minWidth: 0, flex: 1, gap: 2 },
  itemName: { color: colors.navy, fontSize: 12, fontWeight: "600" },
  itemTotal: { color: colors.navy, fontSize: 12, fontWeight: "700" },
  detailError: { gap: 8, paddingVertical: 14, alignItems: "center" },
  retry: { color: colors.sky600, fontSize: 12, fontWeight: "700" },
  sums: { gap: 6, marginTop: 6 },
  sum: { flexDirection: "row", justifyContent: "space-between", gap: 10 },
  sumLabel: { color: colors.muted, fontSize: 12 },
  sumValue: { color: colors.text, fontSize: 12 },
  strong: { color: colors.navy, fontWeight: "700" },
});
