"use client";
import { useState } from "react";
import { LocalizedCopy } from "../components/LocalizedCopy";
import { usePetOwnerI18n } from "../components/PetOwnerI18n";

const API = (
  process.env.NEXT_PUBLIC_PLATFORM_API_URL ?? "http://localhost:8080"
).replace(/\/$/, "");

type Mode = "delete" | "cancel";

async function post<T>(path: string, body: Record<string, string>): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error("Tidak dapat terhubung ke server. Periksa koneksi Anda dan coba lagi.");
  }
  const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) {
    const detail = payload.message ?? payload.error;
    throw new Error(typeof detail === "string" ? detail : "Permintaan gagal. Periksa data Anda dan coba lagi.");
  }
  return payload as T;
}

export function DeletionRequestForm() {
  const { locale } = usePetOwnerI18n();
  const [mode, setMode] = useState<Mode>("delete");
  const [step, setStep] = useState<"email" | "otp" | "done">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [graceUntil, setGraceUntil] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const reset = (next: Mode) => {
    setMode(next);
    setStep("email");
    setOtp("");
    setError("");
    setNotice("");
  };

  const sendOtp = async () => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await post<{ otp_sent: boolean }>(
        "/api/v1/petowner/account-deletion/request-by-email",
        { email },
      );
      setNotice("Kode OTP telah dikirim ke email Anda. Periksa kotak masuk dan folder spam.");
      setStep("otp");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Permintaan gagal. Coba lagi.");
    } finally {
      setBusy(false);
    }
  };

  const confirm = async () => {
    setBusy(true);
    setError("");
    try {
      if (mode === "delete") {
        const result = await post<{ grace_until: string }>(
          "/api/v1/petowner/account-deletion/confirm-by-email",
          { email, otp },
        );
        setGraceUntil(result.grace_until);
      } else {
        await post<{ canceled: boolean }>(
          "/api/v1/petowner/account-deletion/cancel-by-email",
          { email, otp },
        );
      }
      setStep("done");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Permintaan gagal. Coba lagi.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="seo-info-box">
      <div className="seo-hero-actions" role="group" aria-label="Jenis permintaan">
        <button
          type="button"
          className={mode === "delete" ? "seo-primary" : "seo-secondary"}
          aria-pressed={mode === "delete"}
          onClick={() => reset("delete")}
        >
          <LocalizedCopy>{"Ajukan penghapusan"}</LocalizedCopy>
        </button>
        <button
          type="button"
          className={mode === "cancel" ? "seo-primary" : "seo-secondary"}
          aria-pressed={mode === "cancel"}
          onClick={() => reset("cancel")}
        >
          <LocalizedCopy>{"Batalkan penghapusan"}</LocalizedCopy>
        </button>
      </div>

      {step === "email" && (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void sendOtp();
          }}
        >
          <p>
            <LocalizedCopy>
              {mode === "delete"
                ? "Masukkan email akun Anda. Kami akan mengirim kode OTP untuk memverifikasi kepemilikan akun sebelum permintaan penghapusan dicatat."
                : "Masukkan email akun Anda. Kami akan mengirim kode OTP untuk memverifikasi bahwa Anda pemilik akun sebelum permintaan penghapusan dibatalkan."}
            </LocalizedCopy>
          </p>
          <label>
            <LocalizedCopy>{"Email akun"}</LocalizedCopy>
            <input
              type="email"
              required
              value={email}
              autoComplete="email"
              onChange={(event) => setEmail(event.currentTarget.value)}
            />
          </label>
          <button type="submit" className="seo-primary" disabled={busy}>
            <LocalizedCopy>{busy ? "Mengirim…" : "Kirim kode OTP"}</LocalizedCopy>
          </button>
        </form>
      )}

      {step === "otp" && (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void confirm();
          }}
        >
          <p><LocalizedCopy>{notice}</LocalizedCopy></p>
          <label>
            <LocalizedCopy>{"Kode OTP"}</LocalizedCopy>
            <input
              type="text"
              required
              inputMode="numeric"
              autoComplete="one-time-code"
              value={otp}
              onChange={(event) => setOtp(event.currentTarget.value)}
            />
          </label>
          <button type="submit" className="seo-primary" disabled={busy}>
            <LocalizedCopy>
              {busy
                ? "Memproses…"
                : mode === "delete"
                  ? "Konfirmasi penghapusan"
                  : "Konfirmasi pembatalan"}
            </LocalizedCopy>
          </button>
        </form>
      )}

      {step === "done" && (
        <div>
          {mode === "delete" ? (
            <>
              <p>
                <LocalizedCopy>{"Permintaan penghapusan akun telah tercatat."}</LocalizedCopy>
              </p>
              <p>
                <LocalizedCopy>{"Data pribadi Anda akan dihapus permanen setelah masa tenggang 14 hari, yaitu setelah"}</LocalizedCopy>{" "}
                <LocalizedCopy>{new Date(graceUntil).toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" })}</LocalizedCopy>
                <LocalizedCopy>{". Selama masa tenggang, Anda dapat membatalkan melalui tombol Batalkan penghapusan di halaman ini, di aplikasi, atau melalui Pusat Bantuan."}</LocalizedCopy>
              </p>
            </>
          ) : (
            <p>
              <LocalizedCopy>{"Permintaan penghapusan akun Anda telah dibatalkan. Akun Anda kembali aktif seperti sediakala."}</LocalizedCopy>
            </p>
          )}
        </div>
      )}

      {error && (
        <p role="alert">
          <LocalizedCopy>{error}</LocalizedCopy>
        </p>
      )}
    </div>
  );
}
