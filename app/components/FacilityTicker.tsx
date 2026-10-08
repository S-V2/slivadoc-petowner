"use client";
import { useEffect, useRef, useState } from "react";
import { usePetOwnerI18n } from "./PetOwnerI18n";
import { facilityNames } from "../../shared/world-presentation";

export function FacilityTicker({ facilities }: { facilities: ReadonlyArray<string | { name: string }> }) {
  const { t } = usePetOwnerI18n();
  const labels = facilityNames(facilities);
  const identity = labels.join("\u0000");
  const [step, setStep] = useState(0);
  const [paused, setPaused] = useState(false);
  const node = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (labels.length < 2 || paused) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let timer: number | undefined;
    let visible = true;
    const sync = () => {
      window.clearInterval(timer);
      if (!reduced.matches && !document.hidden && visible) timer = window.setInterval(() => setStep(current => current + 1), 1_000);
    };
    const observer = new IntersectionObserver(entries => { visible = entries[0]?.isIntersecting ?? false; sync(); });
    if (node.current) observer.observe(node.current);
    reduced.addEventListener("change", sync);
    document.addEventListener("visibilitychange", sync);
    sync();
    return () => { window.clearInterval(timer); observer.disconnect(); reduced.removeEventListener("change", sync); document.removeEventListener("visibilitychange", sync); };
  }, [identity, labels.length, paused]);
  if (!labels.length) return null;
  return <span ref={node} role="group" className="facility-ticker" aria-label={`${t("Fasilitas")}: ${labels.map(t).join(", ")}`} onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocusCapture={() => setPaused(true)} onBlurCapture={() => setPaused(false)}>
    <small aria-hidden="true">{t("Fasilitas")}</small>
    <span className="facility-ticker-window" aria-hidden="true"><span key={`${identity}:${step}`} className="facility-ticker-chip">{t(labels[step % labels.length]!)}</span></span>
    {labels.length > 3 && <b className="facility-ticker-more" aria-hidden="true">3+</b>}
  </span>;
}
