"use client";
import { petOwnerIntlLocale } from "../../lib/petowner-locale";
import { LocalizedCopy, LocalizedButton } from "../LocalizedCopy";

import NextImage from "next/image";
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useRef, useState } from "react";
import { usePetOwnerI18n } from "../PetOwnerI18n";
import {
  getPaymentIntent,
  getPaymentMethods,
  type PaymentIntent,
  type PaymentMethod,
} from "../../lib/platform-api";

function neutralPaymentMessage(value: unknown, fallback: string) {
  if (value instanceof Error && "status" in value && value.status === 401)
    return "Sesi Anda berakhir. Silakan login kembali.";
  return fallback;
}

export function PaymentMethodPicker({
  value,
  onChange,
  disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const { t } = usePetOwnerI18n();
  const [method, setMethod] = useState<PaymentMethod | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    void getPaymentMethods()
      .then((result) => {
        if (!active) return;
        const qris = result.data.find((item) => item.method === "qris" && item.code === "qris");
        setMethod(qris ?? null);
        if (!qris) setMessage("Pembayaran QRIS sementara belum tersedia. Coba lagi.");
      })
      .catch((error) => {
        if (active)
          setMessage(
            neutralPaymentMessage(
              error,
              "Pembayaran QRIS sementara belum tersedia. Coba lagi.",
            ),
          );
      })
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
    <fieldset className="qris-methods" disabled={disabled} aria-busy={loading}>
      <legend><LocalizedCopy>{t("Metode pembayaran")}</LocalizedCopy></legend>
      <div>
        <LocalizedButton
          type="button"
          disabled={loading || !method}
          aria-pressed={!!method && method.code === value}
          className={method && method.code === value ? "active" : ""}
          onClick={() => method && onChange(method.code)}
        >
          <span><LocalizedCopy>{"▦"}</LocalizedCopy></span>
          <p><b><LocalizedCopy>{"QRIS"}</LocalizedCopy></b><small><LocalizedCopy>{t("Pindai kode QR dengan aplikasi pembayaran pilihan Anda.")}</LocalizedCopy></small></p>
          <i><LocalizedCopy>{loading ? <span className="button-spinner" aria-hidden="true" /> : method && method.code === value ? "✓" : ""}</LocalizedCopy></i>
        </LocalizedButton>
      </div>
      <LocalizedCopy>{loading ? <p className="qris-method-message" role="status"><LocalizedCopy>{t("Memuat metode pembayaran…")}</LocalizedCopy></p> : message ? (
        <div className="qris-method-feedback" role="alert">
          <p><LocalizedCopy>{t(message)}</LocalizedCopy></p>
          <LocalizedButton type="button" onClick={retry}><LocalizedCopy>{t("Coba lagi")}</LocalizedCopy></LocalizedButton>
        </div>
      ) : null}</LocalizedCopy>
    </fieldset>
  );
}

export function QrisPaymentPanel(props: {
  payment: PaymentIntent;
  onPaid?: () => void;
  onClose?: () => void;
  onOpenActivity?: () => void;
}) {
  return <QrisPaymentState key={props.payment.id} {...props} />;
}

function QrisPaymentState({
  payment,
  onPaid,
  onClose,
  onOpenActivity,
}: {
  payment: PaymentIntent;
  onPaid?: () => void;
  onClose?: () => void;
  onOpenActivity?: () => void;
}) {
  const [current, setCurrent] = useState(payment);
  const [message, setMessage] = useState("");
  const paidNotified = useRef(false);
  useEffect(() => {
    if (current.status === "paid" && !paidNotified.current) {
      paidNotified.current = true;
      onPaid?.();
    }
  }, [current.status, onPaid]);
  useEffect(() => {
    if (current.status !== "pending" && current.status !== "refund_pending")
      return;
    let active = true;
    const poll = () =>
      void getPaymentIntent(current.id)
        .then((result) => {
          if (active) setCurrent(result);
        })
        .catch(() => {
          if (active)
            setMessage(
              "Status pembayaran belum dapat diperiksa. Pemeriksaan akan dicoba kembali otomatis.",
            );
        });
    const timer = window.setInterval(poll, 2000);
    void poll();
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [current.id, current.status]);
  async function copy(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      setMessage(`${label} berhasil disalin.`);
    } catch {
      setMessage("Browser tidak mengizinkan clipboard.");
    }
  }
  if (current.status === "paid")
    return (
      <section className="qris-result paid">
        <span><LocalizedCopy>{"✓"}</LocalizedCopy></span>
        <h3><LocalizedCopy>{"Pembayaran berhasil"}</LocalizedCopy></h3>
        <p><LocalizedCopy>{"Transaksi sudah tercatat dan layanan sedang diproses."}</LocalizedCopy></p>
        <LocalizedCopy>{onOpenActivity && (
          <LocalizedButton
            type="button"
            className="primary-button full"
            onClick={onOpenActivity}
          ><LocalizedCopy>{"Lihat di Aktivitas"}</LocalizedCopy></LocalizedButton>
        )}</LocalizedCopy>
        <LocalizedCopy>{onClose && (
          <LocalizedButton
            type="button"
            className="primary-button full"
            onClick={onClose}
          ><LocalizedCopy>{"Selesai"}</LocalizedCopy></LocalizedButton>
        )}</LocalizedCopy>
      </section>
    );
  if (current.status === "refund_pending")
    return (
      <section className="qris-result pending" role="status">
        <h3><LocalizedCopy>{"Menunggu pengembalian dana"}</LocalizedCopy></h3>
        <p><LocalizedCopy>{"Pembayaran diterima setelah transaksi ditutup. Dana akan dikembalikan setelah diverifikasi."}</LocalizedCopy></p>
        <p><LocalizedCopy>{current.order_id}</LocalizedCopy></p>
        <LocalizedCopy>{message && <p className="form-message"><LocalizedCopy>{message}</LocalizedCopy></p>}</LocalizedCopy>
        <LocalizedCopy>{onClose && (
          <LocalizedButton
            type="button"
            className="secondary-button full"
            onClick={onClose}
          ><LocalizedCopy>{"Tutup"}</LocalizedCopy></LocalizedButton>
        )}</LocalizedCopy>
      </section>
    );
  if (
    current.status === "failed" ||
    current.status === "expired" ||
    current.status === "refunded"
  )
    return (
      <section className="qris-result failed">
        <span><LocalizedCopy>{"!"}</LocalizedCopy></span>
        <h3>
          <LocalizedCopy>{current.status === "refunded"
            ? "Dana sudah dikembalikan"
            : current.status === "expired"
              ? "QR kedaluwarsa"
              : "Pembayaran gagal"}</LocalizedCopy>
        </h3>
        <p>
          <LocalizedCopy>{current.status === "refunded"
            ? "Dana sudah dikembalikan."
            : current.status === "expired"
              ? "QR kedaluwarsa. Buat pembayaran baru dari Aktivitas."
              : "Pembayaran gagal."}</LocalizedCopy>
        </p>
        <LocalizedCopy>{onClose && (
          <LocalizedButton
            type="button"
            className="secondary-button full"
            onClick={onClose}
          ><LocalizedCopy>{"Tutup"}</LocalizedCopy></LocalizedButton>
        )}</LocalizedCopy>
      </section>
    );
  const copyable = current.qr_string || current.qr_url || "";
  return (
    <section className="qris-result pending">
      <small><LocalizedCopy>{"PEMBAYARAN · QRIS"}</LocalizedCopy></small>
      <h3><LocalizedCopy>{"Scan QR untuk membayar"}</LocalizedCopy></h3>
      <p>
        <LocalizedCopy>{current.order_id}</LocalizedCopy><LocalizedCopy>{" ·"}</LocalizedCopy><LocalizedCopy>{" "}</LocalizedCopy>
        <LocalizedCopy>{current.expires_at
          ? `berlaku hingga ${new Date(current.expires_at).toLocaleTimeString(petOwnerIntlLocale(), { hour: "2-digit", minute: "2-digit" })}`
          : "selesaikan dalam 15 menit"}</LocalizedCopy>
      </p>
      <LocalizedCopy>{current.qr_string ? (
        <div className="qris-code">
          <QRCodeSVG
            value={current.qr_string}
            size={280}
            level="M"
            marginSize={4}
            title="Kode QRIS pembayaran"
          />
        </div>
      ) : current.qr_url ? (
        // Rows written before the cutover carry an image URL and no EMV string.
        <NextImage
          src={current.qr_url}
          alt="Kode QRIS pembayaran"
          width={320}
          height={320}
          unoptimized
        />
      ) : (
        <div className="qris-code-placeholder"><LocalizedCopy>{"QR"}</LocalizedCopy></div>
      )}</LocalizedCopy>
      <strong>
        <LocalizedCopy>{new Intl.NumberFormat(petOwnerIntlLocale(), {
          style: "currency",
          currency: "IDR",
          maximumFractionDigits: 0,
        }).format(current.amount)}</LocalizedCopy>
      </strong>
      <em>
        <i /><LocalizedCopy>{" Menunggu konfirmasi pembayaran…"}</LocalizedCopy></em>
      <LocalizedCopy>{copyable && (
        <LocalizedButton
          type="button"
          className="secondary-button"
          onClick={() => void copy(copyable, "Kode QRIS")}
        ><LocalizedCopy>{"Salin kode QRIS"}</LocalizedCopy></LocalizedButton>
      )}</LocalizedCopy>
      <LocalizedCopy>{message && <p className="form-message"><LocalizedCopy>{message}</LocalizedCopy></p>}</LocalizedCopy>
    </section>
  );
}
