"use client";

import { useParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { PublicPage } from "../../components/seo/PublicSite";
import { PLATFORM_API_URL } from "../../lib/platform-api";
import { getAccessToken } from "../../lib/session";

type ReviewRequest = {
  spot_name: string;
  recipient_name: string;
  status: string;
};

type Stage =
  | { name: "loading" }
  | { name: "form"; request: ReviewRequest }
  | { name: "done"; message: string }
  | { name: "invalid" }
  | { name: "already" }
  | { name: "error"; message: string };

// The review link carries no session: the token in the URL is the credential.
// A signed-in owner's token is still sent so the review is attributed to them.
async function reviewFetch(token: string, init?: RequestInit) {
  const access = getAccessToken();
  return fetch(
    `${PLATFORM_API_URL}/api/v1/public/petspot-reviews/${encodeURIComponent(token)}`,
    {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(access ? { Authorization: `Bearer ${access}` } : {}),
      },
    },
  );
}

export default function PetSpotReviewPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const [stage, setStage] = useState<Stage>({ name: "loading" });
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    void reviewFetch(token)
      .then(async (response) => {
        if (!active) return;
        if (response.status === 404) return setStage({ name: "invalid" });
        if (!response.ok) throw new Error();
        const request = (await response.json()) as ReviewRequest;
        setStage(
          request.status === "completed"
            ? { name: "already" }
            : { name: "form", request },
        );
      })
      .catch(() => {
        if (active)
          setStage({
            name: "error",
            message: "Link ulasan belum dapat dibuka. Coba lagi sebentar.",
          });
      });
    return () => {
      active = false;
    };
  }, [token]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (rating < 1 || busy) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await reviewFetch(token, {
        method: "POST",
        body: JSON.stringify({ rating, comment: comment.trim() }),
      });
      if (response.status === 404) return setStage({ name: "invalid" });
      if (response.status === 409) return setStage({ name: "already" });
      const payload = (await response.json().catch(() => ({}))) as {
        message?: string;
      };
      if (!response.ok)
        throw new Error(payload.message ?? "Ulasan belum dapat dikirim");
      setStage({
        name: "done",
        message: payload.message ?? "Terima kasih atas ulasanmu.",
      });
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Ulasan belum dapat dikirim",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <PublicPage>
      <section className="seo-main-section">
        <div className="seo-empty petspot-review">
          {stage.name === "loading" && <p role="status">Memuat ulasan…</p>}
          {stage.name === "invalid" && (
            <>
              <span className="seo-eyebrow">ULASAN</span>
              <h1>Link ulasan tidak valid</h1>
              <p>Minta tempat terkait untuk mengirim link ulasan yang baru.</p>
            </>
          )}
          {stage.name === "already" && (
            <>
              <span className="seo-eyebrow">ULASAN</span>
              <h1>Ulasan sudah dikirim</h1>
              <p>Terima kasih, ulasan untuk link ini sudah kami terima.</p>
            </>
          )}
          {stage.name === "error" && (
            <>
              <span className="seo-eyebrow">ULASAN</span>
              <h1>Terjadi kendala</h1>
              <p role="alert">{stage.message}</p>
            </>
          )}
          {stage.name === "done" && (
            <>
              <span className="seo-eyebrow">TERIMA KASIH</span>
              <h1>Ulasanmu sudah terkirim</h1>
              <p>{stage.message}</p>
            </>
          )}
          {stage.name === "form" && (
            <form className="world-form" onSubmit={submit}>
              <span className="seo-eyebrow">ULASAN PETSPOT</span>
              <h1>Bagaimana pengalamanmu di {stage.request.spot_name}?</h1>
              {stage.request.recipient_name && (
                <p>Halo {stage.request.recipient_name}, ceritakan kunjunganmu.</p>
              )}
              <div
                className="petspot-review-stars"
                role="radiogroup"
                aria-label="Penilaian"
              >
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={rating === value}
                    aria-label={`${value} bintang`}
                    className={value <= rating ? "active" : ""}
                    onClick={() => setRating(value)}
                  >
                    ★
                  </button>
                ))}
              </div>
              <label>
                <span>Komentar (opsional)</span>
                <textarea
                  value={comment}
                  maxLength={1000}
                  onChange={(event) => setComment(event.target.value)}
                  placeholder="Ceritakan pelayanan, suasana, dan hal yang kamu suka."
                />
              </label>
              {message && (
                <div className="form-message" role="alert">
                  {message}
                </div>
              )}
              <button className="primary-button full" disabled={busy || rating < 1}>
                {busy ? "Mengirim…" : "Kirim ulasan"}
              </button>
            </form>
          )}
        </div>
      </section>
    </PublicPage>
  );
}
