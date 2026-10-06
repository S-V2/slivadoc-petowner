"use client";

import NextImage from "next/image";
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useRef, useState } from "react";
import {
  getPaymentIntent,
  getPaymentMethods,
  type PaymentIntent,
  type PaymentMethod,
} from "../../lib/platform-api";

// No provider name may reach a customer. BatPay stays in the pattern because errors
// and references written before the Yokke cutover can still carry it.
const providerBrandPattern = /\b(?:bat[\s-]?pay|yokke)\b/gi;

function neutralPaymentMessage(value: unknown, fallback: string) {
  const message = value instanceof Error ? value.message : String(value || "");
  return message.trim()
    ? message.replace(providerBrandPattern, "penyedia pembayaran")
    : fallback;
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
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [message, setMessage] = useState("");
  useEffect(() => {
    let active = true;
    void getPaymentMethods()
      .then((result) => {
        if (!active) return;
        // Only QRIS is collected. A backend that predates the cutover still lists
        // other methods while frontends roll out first, so narrow the list here too.
        const qris = result.data.filter((item) => item.method === "qris");
        setMethods(qris);
        const first = qris[0];
        if (first && !qris.some((item) => item.code === value))
          onChange(first.code);
      })
      .catch((error) => {
        if (active)
          setMessage(
            neutralPaymentMessage(
              error,
              "Metode pembayaran belum dapat dimuat",
            ),
          );
      });
    return () => {
      active = false;
    };
  }, [onChange, value]);
  return (
    <fieldset className="qris-methods" disabled={disabled}>
      <legend>Metode pembayaran</legend>
      {methods.length ? (
        <div>
          {methods.map((method) => (
            <button
              type="button"
              className={method.code === value ? "active" : ""}
              onClick={() => onChange(method.code)}
              key={method.code}
            >
              <span>▦</span>
              <p>
                <b>QRIS</b>
                <small>
                  Pindai kode QR dengan aplikasi pembayaran pilihan Anda.
                </small>
              </p>
              <i>{method.code === value ? "✓" : ""}</i>
            </button>
          ))}
        </div>
      ) : (
        <p className="qris-method-message">
          {message || "Memuat metode pembayaran…"}
        </p>
      )}
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
        <span>✓</span>
        <h3>Pembayaran berhasil</h3>
        <p>Transaksi sudah tercatat dan layanan sedang diproses.</p>
        {onOpenActivity && (
          <button
            type="button"
            className="primary-button full"
            onClick={onOpenActivity}
          >
            Lihat di Aktivitas
          </button>
        )}
        {onClose && (
          <button
            type="button"
            className="primary-button full"
            onClick={onClose}
          >
            Selesai
          </button>
        )}
      </section>
    );
  if (current.status === "refund_pending")
    return (
      <section className="qris-result pending" role="status">
        <h3>Menunggu pengembalian dana</h3>
        <p>
          Pembayaran diterima setelah transaksi ditutup. Dana akan
          dikembalikan setelah diverifikasi.
        </p>
        <p>{current.order_id}</p>
        {message && <p className="form-message">{message}</p>}
        {onClose && (
          <button
            type="button"
            className="secondary-button full"
            onClick={onClose}
          >
            Tutup
          </button>
        )}
      </section>
    );
  if (
    current.status === "failed" ||
    current.status === "expired" ||
    current.status === "refunded"
  )
    return (
      <section className="qris-result failed">
        <span>!</span>
        <h3>
          {current.status === "refunded"
            ? "Dana sudah dikembalikan"
            : current.status === "expired"
              ? "QR kedaluwarsa"
              : "Pembayaran gagal"}
        </h3>
        <p>
          {current.status === "refunded"
            ? "Dana sudah dikembalikan."
            : current.status === "expired"
              ? "QR kedaluwarsa. Buat pembayaran baru dari Aktivitas."
              : "Pembayaran gagal."}
        </p>
        {onClose && (
          <button
            type="button"
            className="secondary-button full"
            onClick={onClose}
          >
            Tutup
          </button>
        )}
      </section>
    );
  const copyable = current.qr_string || current.qr_url || "";
  return (
    <section className="qris-result pending">
      <small>PEMBAYARAN · QRIS</small>
      <h3>Scan QR untuk membayar</h3>
      <p>
        {current.order_id} ·{" "}
        {current.expires_at
          ? `berlaku hingga ${new Date(current.expires_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}`
          : "selesaikan dalam 15 menit"}
      </p>
      {current.qr_string ? (
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
        <div className="qris-code-placeholder">QR</div>
      )}
      <strong>
        {new Intl.NumberFormat("id-ID", {
          style: "currency",
          currency: "IDR",
          maximumFractionDigits: 0,
        }).format(current.amount)}
      </strong>
      <em>
        <i /> Menunggu konfirmasi pembayaran…
      </em>
      {copyable && (
        <button
          type="button"
          className="secondary-button"
          onClick={() => void copy(copyable, "Kode QRIS")}
        >
          Salin kode QRIS
        </button>
      )}
      {message && <p className="form-message">{message}</p>}
    </section>
  );
}
