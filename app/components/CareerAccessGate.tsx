"use client";
import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ApiError, apiRequest, hasSession } from "../lib/session";
import { careerLoginURL } from "../../shared/career-auth";
import { usePetOwnerI18n } from "./PetOwnerI18n";

export function CareerAccessGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { language } = usePetOwnerI18n();
  const en = language === "en";
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    const login = () => {
      setReady(false);
      router.replace(
        careerLoginURL(location.pathname + location.search + location.hash),
      );
    };
    const check = async () => {
      if (!hasSession()) {
        login();
        return;
      }
      try {
        await apiRequest("/api/v1/auth/me", { cache: "no-store" });
        if (active) {
          setReady(true);
          setError(false);
        }
      } catch (cause) {
        if (!active) return;
        setReady(false);
        if (cause instanceof ApiError && cause.status === 401) login();
        else setError(true);
      }
    };
    void check();
    window.addEventListener("slivadoc:session-ended", login);
    window.addEventListener("focus", check);
    window.addEventListener("storage", check);
    return () => {
      active = false;
      window.removeEventListener("slivadoc:session-ended", login);
      window.removeEventListener("focus", check);
      window.removeEventListener("storage", check);
    };
  }, [attempt, router]);
  if (!ready)
    return (
      <main className="career-access" aria-live="polite">
        <h1>Slivadoc Career</h1>
        <p>
          {error
            ? en
              ? "Unable to verify your session. Please try again."
              : "Sesi belum dapat diperiksa. Silakan coba lagi."
            : en
              ? "Checking your account…"
              : "Memeriksa akunmu…"}
        </p>
        {error && (
          <button
            className="career-primary"
            onClick={() => setAttempt((v) => v + 1)}
          >
            {en ? "Try again" : "Coba lagi"}
          </button>
        )}
      </main>
    );
  return children;
}
