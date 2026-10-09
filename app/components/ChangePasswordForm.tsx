"use client";
import { useState, type FormEvent } from "react";
import { changePetOwnerPassword } from "../lib/platform-api";
import { validPassword } from "../../shared/account-validation";
import { Icon } from "./Icon";
import { usePetOwnerI18n } from "./PetOwnerI18n";

export function ChangePasswordForm() {
  const { t } = usePetOwnerI18n();
  const [current, setCurrent] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [visible, setVisible] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const rules = [
    { label: "Minimal 8 karakter", pass: password.length >= 8 },
    { label: "Mengandung huruf", pass: /[a-zA-Z]/.test(password) },
    { label: "Mengandung angka", pass: /\d/.test(password) },
    { label: "Mengandung simbol", pass: /[^a-zA-Z0-9\s]/.test(password) },
  ];
  const ready =
    Boolean(current) &&
    validPassword(password) &&
    current !== password &&
    password === confirmation &&
    !busy;
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!ready) return;
    setBusy(true);
    setMessage("");
    setSuccess(false);
    try {
      await changePetOwnerPassword(current, password);
      setCurrent("");
      setPassword("");
      setConfirmation("");
      setVisible({});
      setSuccess(true);
      setMessage(
        "Password berhasil diperbarui. Perangkat lain harus login kembali.",
      );
    } catch (cause) {
      setMessage(
        cause instanceof Error
          ? cause.message
          : "Password belum dapat diperbarui",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="account-password-form">
      <header className="password-heading">
        <span>
          <Icon name="shield" size={28} />
        </span>
        <div>
          <small>{t("KEAMANAN AKUN")}</small>
          <h3>{t("Ganti password")}</h3>
          <p>{t("Lindungi akun dan semua momen berharga pet-mu.")}</p>
        </div>
      </header>
      <div className="password-layout">
        <aside className="password-guide">
          <h4>{t("Password yang lebih aman")}</h4>
          <p>
            {t(
              "Gunakan kombinasi unik yang tidak kamu pakai di akun lain. Jangan bagikan password kepada siapa pun.",
            )}
          </p>
          <div>
            <Icon name="shield" />
            <p>
              {t(
                "Password lama diperiksa sebelum perubahan disimpan. Perangkat lain perlu login kembali setelah password diubah.",
              )}
            </p>
          </div>
        </aside>
        <form onSubmit={submit} className="password-fields">
          {[
            {
              id: "current-password",
              label: "Password lama",
              value: current,
              set: setCurrent,
              autoComplete: "current-password",
            },
            {
              id: "new-password",
              label: "Password baru",
              value: password,
              set: setPassword,
              autoComplete: "new-password",
            },
            {
              id: "confirm-password",
              label: "Konfirmasi password baru",
              value: confirmation,
              set: setConfirmation,
              autoComplete: "new-password",
            },
          ].map((field) => (
            <div className="password-field" key={field.id}>
              <label htmlFor={field.id}>
                {t(field.label)} <span aria-hidden="true">*</span>
              </label>
              <div className="password-input-wrap">
                <input
                  id={field.id}
                  required
                  type={visible[field.id] ? "text" : "password"}
                  autoComplete={field.autoComplete}
                  value={field.value}
                  disabled={busy}
                  onChange={(event) => field.set(event.target.value)}
                  aria-describedby={
                    field.id === "new-password" ? "password-rules" : undefined
                  }
                />
                <button
                  type="button"
                  aria-label={`${t(visible[field.id] ? "Sembunyikan" : "Tampilkan")} ${t(field.label).toLowerCase()}`}
                  aria-pressed={Boolean(visible[field.id])}
                  onClick={() =>
                    setVisible((prev) => ({
                      ...prev,
                      [field.id]: !prev[field.id],
                    }))
                  }
                >
                  {t(visible[field.id] ? "Sembunyikan" : "Tampilkan")}
                </button>
              </div>
            </div>
          ))}
          <ul id="password-rules" className="password-rules">
            {rules.map((rule) => (
              <li className={rule.pass ? "met" : ""} key={rule.label}>
                <Icon name={rule.pass ? "check" : "shield"} size={14} />
                {t(rule.label)}
              </li>
            ))}
          </ul>
          {password && current === password && (
            <p className="password-error" role="alert">
              {t("Password baru harus berbeda dari password lama.")}
            </p>
          )}
          {confirmation && confirmation !== password && (
            <p className="password-error" role="alert">
              {t("Konfirmasi password belum sama.")}
            </p>
          )}
          {message && (
            <p
              className={success ? "password-success" : "password-error"}
              role="status"
            >
              {t(message)}
            </p>
          )}
          <div className="password-submit">
            <small>{t("Semua kolom wajib diisi.")}</small>
            <button type="submit" className="primary-button" disabled={!ready}>
              <Icon name="check" size={18} />
              {t(busy ? "Menyimpan…" : "Ubah password")}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
