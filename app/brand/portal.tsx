"use client";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { CommerceWorkspace } from "../components/commerce/commerce-workspace";
import {
  apiRequest,
  saveTokens,
  logoutSession,
  hasSession,
  startAutomaticRefresh,
  type AuthTokens,
  type UserIdentity,
  ApiError,
} from "../lib/session";

export default function BrandPortal() {
  const [user, setUser] = useState<UserIdentity | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"login" | "activation" | "password">(
    "login",
  );
  const [email, setEmail] = useState("");
  const [setupToken, setSetupToken] = useState("");
  const [message, setMessage] = useState("");
  useEffect(() => {
    let current = true;
    if (hasSession())
      void apiRequest<UserIdentity>("/api/v1/auth/me")
        .then((u) => {
          if (current) setUser(u);
        })
        .catch((e) => {
          if (current) setError(e.message);
        })
        .finally(() => {
          if (current) setLoading(false);
        });
    else
      queueMicrotask(() => {
        if (current) setLoading(false);
      });
    const ended = () => {
      setUser(null);
      setError("Sesi berakhir. Silakan masuk lagi.");
    };
    window.addEventListener("slivadoc:session-ended", ended);
    const stop = startAutomaticRefresh(ended);
    return () => {
      current = false;
      stop();
      window.removeEventListener("slivadoc:session-ended", ended);
    };
  }, []);
  async function login(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const values = Object.fromEntries(new FormData(e.currentTarget));
      if (mode === "activation") {
        const result = await apiRequest<{ setup_token: string }>(
          "/api/v1/auth/activation/verify-otp",
          { method: "POST", body: JSON.stringify({ email, otp: values.otp }) },
        );
        if (!result.setup_token)
          throw new Error(
            "Sesi aktivasi belum tersedia. Coba verifikasi OTP lagi.",
          );
        setSetupToken(result.setup_token);
        setMode("password");
        setMessage("OTP terverifikasi. Atur password untuk mengaktifkan akun.");
        return;
      }
      if (mode === "password") {
        if (values.new_password !== values.confirm_password)
          throw new Error("Konfirmasi password tidak sama.");
        await apiRequest("/api/v1/auth/activation/set-password", {
          method: "POST",
          body: JSON.stringify({
            setup_token: setupToken,
            new_password: values.new_password,
          }),
        });
        setSetupToken("");
        setMode("login");
        setMessage("Akun aktif. Silakan masuk dengan password baru.");
        return;
      }
      const tokens = await apiRequest<AuthTokens>("/api/v1/auth/login", {
        method: "POST",
        body: JSON.stringify(values),
      });
      saveTokens(tokens);
      setUser(await apiRequest<UserIdentity>("/api/v1/auth/me"));
    } catch (e) {
      if (e instanceof ApiError && e.code === "password_setup_required")
        setMode("activation");
      setError(e instanceof Error ? e.message : "Login gagal");
    } finally {
      setBusy(false);
    }
  }
  async function resend() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await apiRequest("/api/v1/auth/activation/resend-otp", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setMessage("OTP aktivasi dikirim. Periksa email bisnis Anda.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "OTP belum dapat dikirim.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <main style={{ minHeight: "100vh", background: "#f5f9fc" }}>
      <div className="cw">
        <header className="cw-header">
          <Link href="/">← Slivadoc Pet Owner</Link>
          {user && (
            <div className="cw-actions">
              <span>{user.full_name}</span>
              <button
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    await logoutSession();
                    setUser(null);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Keluar
              </button>
            </div>
          )}
        </header>
        {error && (
          <p className="cw-error" role="alert">
            {error}
          </p>
        )}
        {message && (
          <p className="cw-success" role="status">
            {message}
          </p>
        )}
        {loading ? (
          <p role="status">Memeriksa sesi…</p>
        ) : !user ? (
          <section
            className="cw-card"
            style={{ maxWidth: 600, margin: "50px auto" }}
          >
            <p className="cw-eyebrow">SLIVADOC / OFFICIAL BRAND</p>
            <h1>Ruang kerja brand Anda</h1>
            <p className="cw-muted">
              Kelola produk, PO ke Slivadoc dan mitra, pembayaran, serta status
              pengiriman. Gunakan akun Official Brand yang dibuat dan diundang
              oleh SuperAdmin.
            </p>
            <form key={mode} className="cw-form" onSubmit={login}>
              <fieldset disabled={busy}>
                <label className="cw-wide">
                  Email bisnis
                  <input
                    type="email"
                    name="email"
                    autoComplete="username"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    readOnly={mode === "password"}
                    required
                  />
                </label>
                {mode === "login" && (
                  <label className="cw-wide">
                    Password
                    <input
                      type="password"
                      name="password"
                      autoComplete="current-password"
                      required
                    />
                  </label>
                )}
                {mode === "activation" && (
                  <label className="cw-wide">
                    OTP dari email
                    <input
                      name="otp"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      pattern="[0-9]{6}"
                      maxLength={6}
                      required
                    />
                  </label>
                )}
                {mode === "password" && (
                  <>
                    <label className="cw-wide">
                      Password baru (minimal 8 karakter, huruf, angka, dan
                      simbol)
                      <input
                        name="new_password"
                        type="password"
                        minLength={8}
                        autoComplete="new-password"
                        required
                      />
                    </label>
                    <label className="cw-wide">
                      Konfirmasi password
                      <input
                        name="confirm_password"
                        type="password"
                        minLength={8}
                        autoComplete="new-password"
                        required
                      />
                    </label>
                  </>
                )}
                <button className="cw-primary" type="submit">
                  {busy
                    ? "Memeriksa…"
                    : mode === "activation"
                      ? "Verifikasi OTP"
                      : mode === "password"
                        ? "Aktifkan akun"
                        : "Masuk workspace"}
                </button>
                {mode === "activation" && (
                  <button
                    type="button"
                    disabled={!email}
                    onClick={() => void resend()}
                  >
                    Kirim ulang OTP
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setMode(mode === "login" ? "activation" : "login");
                    setSetupToken("");
                    setError("");
                    setMessage("");
                  }}
                >
                  {mode === "login"
                    ? "Aktivasi akun undangan"
                    : "Kembali ke login"}
                </button>
              </fieldset>
            </form>
            <p className="cw-muted">
              Akun baru wajib menyelesaikan aktivasi OTP dari undangan email.
              Jika belum mendapat akses, hubungi administrator Slivadoc.
            </p>
          </section>
        ) : user.role !== "official_brand" ? (
          <section className="cw-card">
            <h1>Akses Official Brand diperlukan</h1>
            <p>
              Akun ini menggunakan role {user.role}. Dashboard internal tetap
              tersedia di konsol Slivadoc.
            </p>
            <Link href="/">Kembali ke aplikasi</Link>
          </section>
        ) : null}
      </div>
      {user?.role === "official_brand" && (
        <CommerceWorkspace request={apiRequest} />
      )}
    </main>
  );
}
