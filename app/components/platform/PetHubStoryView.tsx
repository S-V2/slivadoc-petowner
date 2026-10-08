"use client";
import { SlivaVideo } from "../SlivaVideo";
import { petOwnerIntlLocale } from "../../lib/petowner-locale";
import { LocalizedCopy, LocalizedButton } from "../LocalizedCopy";
import { useEffect, useRef, useState } from "react";
import { LocalizedImage as Image } from "../LocalizedCopy";
import { useStoryClock } from "../../lib/use-story-clock";
import { storyProgress } from "../../lib/pethub-interactions";
import {
  isPetOwnerAuthenticated,
  viewPetHubStory,
  type PetHubStory,
} from "../../lib/platform-api";

export function PetHubStoryView({
  story,
  notify,
  next,
  previous,
}: {
  story: PetHubStory;
  notify: (message: string) => void;
  next: () => void;
  previous?: () => void;
}) {
  const [views, setViews] = useState(story.view_count);
  const [ready, setReady] = useState(false);
  const [held, setHeld] = useState(false);
  const [paused, setPaused] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [failed, setFailed] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const visibility = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", visibility);
    return () => document.removeEventListener("visibilitychange", visibility);
  }, []);
  const elapsed = useStoryClock(
    story.id,
    !ready || held || paused || hidden || failed,
    next,
  );
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (held || paused || hidden) video.pause();
    else void video.play().catch(() => setPaused(true));
  }, [held, paused, hidden]);
  useEffect(() => {
    let active = true;
    if (isPetOwnerAuthenticated())
      void viewPetHubStory(story.id)
        .then((r) => {
          if (active) setViews(r.view_count);
        })
        .catch(() => {
          if (active) notify("Jumlah penonton story belum dapat diperbarui");
        });
    return () => {
      active = false;
    };
  }, [story.id, notify]);
  const url = story.media_url || story.photo_url;
  return (
    <div className="hub-story-view">
      <div
        className="hub-story-progress"
        role="progressbar"
        aria-label="Waktu story"
        aria-valuemin={0}
        aria-valuemax={30}
        aria-valuenow={Math.floor(elapsed / 1000)}
      >
        <span style={{ width: `${storyProgress(elapsed) * 100}%` }} />
      </div>
      <div className="hub-story-toolbar">
        <small><LocalizedCopy>{Math.ceil((30_000 - elapsed) / 1000)}</LocalizedCopy><LocalizedCopy>{" detik"}</LocalizedCopy></small>
        <LocalizedButton
          type="button"
          onClick={() => setPaused((value) => !value)}
          aria-label={paused ? "Lanjutkan story" : "Jeda story"}
        >
          <LocalizedCopy>{paused ? "▶" : "Ⅱ"}</LocalizedCopy>
        </LocalizedButton>
      </div>
      <h2><LocalizedCopy preserve>{story.author_name}</LocalizedCopy></h2>
      <div
        className="hub-story-media"
        onPointerDown={() => setHeld(true)}
        onPointerUp={() => setHeld(false)}
        onPointerCancel={() => setHeld(false)}
        onPointerLeave={() => setHeld(false)}
      >
        <LocalizedCopy>{story.media_type === "video" ? (
          <SlivaVideo
            ref={videoRef}
            src={url}
            playsInline
            preload="metadata"
            autoPlay
            muted
            loop
            onCanPlay={() => setReady(true)}
            onPlaying={() => {
              setReady(true);
              if (!held && !hidden) setPaused(false);
            }}
            onPause={() => {
              if (!held && !hidden) setPaused(true);
            }}
            onWaiting={() => setReady(false)}
            onError={() => setFailed(true)}
            aria-label={`Story video ${story.author_name}`}
          />
        ) : (
          <Image
            src={url}
            alt={story.caption || `Story ${story.author_name}`}
            width={720}
            height={1280}
            unoptimized
            onLoad={() => setReady(true)}
            onError={() => setFailed(true)}
          />
        )}</LocalizedCopy>
      </div>
      <LocalizedCopy>{failed ? (
        <p role="alert"><LocalizedCopy>{"Media belum dapat dimuat. Kamu bisa lanjut ke story berikutnya."}</LocalizedCopy></p>
      ) : !ready ? (
        <p role="status"><LocalizedCopy>{"Memuat story…"}</LocalizedCopy></p>
      ) : null}</LocalizedCopy>
      <div className="hub-story-navigation">
        <LocalizedButton type="button" onClick={previous} disabled={!previous}><LocalizedCopy>{"‹ Sebelumnya"}</LocalizedCopy></LocalizedButton>
        <small><LocalizedCopy>{"Tahan foto untuk jeda"}</LocalizedCopy></small>
        <LocalizedButton type="button" onClick={next}><LocalizedCopy>{"Berikutnya ›"}</LocalizedCopy></LocalizedButton>
      </div>
      <p><LocalizedCopy>{story.caption}</LocalizedCopy></p>
      <small>
        <LocalizedCopy>{views}</LocalizedCopy><LocalizedCopy>{" penonton · Tayang sampai"}</LocalizedCopy><LocalizedCopy>{" "}</LocalizedCopy>
        <LocalizedCopy>{new Date(story.expires_at).toLocaleTimeString(petOwnerIntlLocale(), {
          hour: "2-digit",
          minute: "2-digit",
        })}</LocalizedCopy>
      </small>
    </div>
  );
}
