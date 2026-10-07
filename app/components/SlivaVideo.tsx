"use client";

import { useRef, useState, type VideoHTMLAttributes, type Ref } from "react";
import { usePetOwnerI18n } from "./PetOwnerI18n";

type Props = Omit<VideoHTMLAttributes<HTMLVideoElement>, "controls"> & { ref?: Ref<HTMLVideoElement> };
const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;

/** Slivadoc playback controls. The actual video ref and events remain available to story clocks. */
export function SlivaVideo({ ref, onPlay, onPause, onTimeUpdate, onLoadedMetadata, className, ...props }: Props) {
  const video = useRef<HTMLVideoElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(Boolean(props.muted));
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [failed, setFailed] = useState(false);
  const { t } = usePetOwnerI18n();
  return <div className={`sliva-video ${className ?? ""}`}>
    <video {...props} controls={false} ref={(element) => {
      video.current = element;
      if (typeof ref === "function") ref(element);
      else if (ref) ref.current = element;
    }} onPlay={(event) => { setPlaying(true); setFailed(false); onPlay?.(event); }}
      onPause={(event) => { setPlaying(false); onPause?.(event); }}
      onTimeUpdate={(event) => { setPosition(event.currentTarget.currentTime); onTimeUpdate?.(event); }}
      onLoadedMetadata={(event) => { setDuration(Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : 0); onLoadedMetadata?.(event); }} />
    <div className="sliva-video-controls" onPointerDown={(event) => event.stopPropagation()} onPointerUp={(event) => event.stopPropagation()}>
      <button type="button" aria-label={t(playing ? "Jeda video" : "Putar video")} onClick={() => {
        if (playing) video.current?.pause();
        else void video.current?.play().catch(() => setFailed(true));
      }}>{playing ? "Ⅱ" : "▶"}</button>
      <input className="sliva-range" type="range" aria-label={t("Posisi video")} min={0} max={duration || 1} step={0.1} value={position} disabled={!duration}
        onChange={(event) => { if (video.current) video.current.currentTime = Number(event.target.value); setPosition(Number(event.target.value)); }} />
      <span>{clock(position)} / {clock(duration)}</span>
      <button type="button" aria-label={t(muted ? "Aktifkan suara" : "Bisukan video")} aria-pressed={muted} onClick={() => {
        if (video.current) { video.current.muted = !video.current.muted; setMuted(video.current.muted); }
      }}>{muted ? "♪̸" : "♪"}</button>
    </div>
    {failed && <small role="alert">{t("Video belum dapat diputar")}</small>}
  </div>;
}
