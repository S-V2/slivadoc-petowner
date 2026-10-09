"use client";
import { LocalizedCopy, LocalizedButton, LocalizedTextarea } from "../../components/LocalizedCopy";

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
          <LocalizedCopy>{stage.name === "loading" && <p role="status"><LocalizedCopy>{"Memuat ulasan…"}</LocalizedCopy></p>}</LocalizedCopy>
          <LocalizedCopy>{stage.name === "invalid" && (
            <>
              <span className="seo-eyebrow"><LocalizedCopy>{"ULASAN"}</LocalizedCopy></span>
              <h1><LocalizedCopy>{"Link ulasan tidak valid"}</LocalizedCopy></h1>
              <p><LocalizedCopy>{"Minta tempat terkait untuk mengirim link ulasan yang baru."}</LocalizedCopy></p>
            </>
          )}</LocalizedCopy>
          <LocalizedCopy>{stage.name === "already" && (
            <>
              <span className="seo-eyebrow"><LocalizedCopy>{"ULASAN"}</LocalizedCopy></span>
              <h1><LocalizedCopy>{"Ulasan sudah dikirim"}</LocalizedCopy></h1>
              <p><LocalizedCopy>{"Terima kasih, ulasan untuk link ini sudah kami terima."}</LocalizedCopy></p>
            </>
          )}</LocalizedCopy>
          <LocalizedCopy>{stage.name === "error" && (
            <>
              <span className="seo-eyebrow"><LocalizedCopy>{"ULASAN"}</LocalizedCopy></span>
              <h1><LocalizedCopy>{"Terjadi kendala"}</LocalizedCopy></h1>
              <p role="alert"><LocalizedCopy>{stage.message}</LocalizedCopy></p>
            </>
          )}</LocalizedCopy>
          <LocalizedCopy>{stage.name === "done" && (
            <>
              <span className="seo-eyebrow"><LocalizedCopy>{"TERIMA KASIH"}</LocalizedCopy></span>
              <h1><LocalizedCopy>{"Ulasanmu sudah terkirim"}</LocalizedCopy></h1>
              <p><LocalizedCopy>{stage.message}</LocalizedCopy></p>
            </>
          )}</LocalizedCopy>
          <LocalizedCopy>{stage.name === "form" && (
            <form className="world-form" onSubmit={submit}>
              <span className="seo-eyebrow"><LocalizedCopy>{"ULASAN PETSPOT"}</LocalizedCopy></span>
              <h1><LocalizedCopy>{"Bagaimana pengalamanmu di "}</LocalizedCopy><LocalizedCopy>{stage.request.spot_name}</LocalizedCopy><LocalizedCopy>{"?"}</LocalizedCopy></h1>
              <LocalizedCopy>{stage.request.recipient_name && (
                <p><LocalizedCopy>{"Halo "}</LocalizedCopy><LocalizedCopy>{stage.request.recipient_name}</LocalizedCopy><LocalizedCopy>{", ceritakan kunjunganmu."}</LocalizedCopy></p>
              )}</LocalizedCopy>
              <div
                className="petspot-review-stars"
                role="radiogroup"
                aria-label="Penilaian"
              >
                <LocalizedCopy>{[1, 2, 3, 4, 5].map((value) => (
                  <LocalizedButton
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={rating === value}
                    aria-label={`${value} bintang`}
                    className={value <= rating ? "active" : ""}
                    onClick={() => setRating(value)}
                  ><LocalizedCopy>{"★"}</LocalizedCopy></LocalizedButton>
                ))}</LocalizedCopy>
              </div>
              <label>
                <span><LocalizedCopy>{"Komentar (opsional)"}</LocalizedCopy></span>
                <LocalizedTextarea
                  value={comment}
                  maxLength={1000}
                  onChange={(event) => setComment(event.target.value)}
                  placeholder="Ceritakan pelayanan, suasana, dan hal yang kamu suka."
                />
              </label>
              <LocalizedCopy>{message && (
                <div className="form-message" role="alert">
                  <LocalizedCopy>{message}</LocalizedCopy>
                </div>
              )}</LocalizedCopy>
              <LocalizedButton className="primary-button full" disabled={busy || rating < 1}>
                <LocalizedCopy>{busy ? "Mengirim…" : "Kirim ulasan"}</LocalizedCopy>
              </LocalizedButton>
            </form>
          )}</LocalizedCopy>
        </div>
      </section>
    </PublicPage>
  );
}
