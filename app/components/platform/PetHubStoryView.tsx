"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
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
        <small>{Math.ceil((30_000 - elapsed) / 1000)} detik</small>
        <button
          type="button"
          onClick={() => setPaused((value) => !value)}
          aria-label={paused ? "Lanjutkan story" : "Jeda story"}
        >
          {paused ? "▶" : "Ⅱ"}
        </button>
      </div>
      <h2>{story.author_name}</h2>
      <div
        className="hub-story-media"
        onPointerDown={() => setHeld(true)}
        onPointerUp={() => setHeld(false)}
        onPointerCancel={() => setHeld(false)}
        onPointerLeave={() => setHeld(false)}
      >
        {story.media_type === "video" ? (
          <video
            ref={videoRef}
            src={url}
            controls
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
        )}
      </div>
      {failed ? (
        <p role="alert">
          Media belum dapat dimuat. Kamu bisa lanjut ke story berikutnya.
        </p>
      ) : !ready ? (
        <p role="status">Memuat story…</p>
      ) : null}
      <div className="hub-story-navigation">
        <button type="button" onClick={previous} disabled={!previous}>
          ‹ Sebelumnya
        </button>
        <small>Tahan foto untuk jeda</small>
        <button type="button" onClick={next}>
          Berikutnya ›
        </button>
      </div>
      <p>{story.caption}</p>
      <small>
        {views} penonton · Tayang sampai{" "}
        {new Date(story.expires_at).toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
        })}
      </small>
    </div>
  );
}
