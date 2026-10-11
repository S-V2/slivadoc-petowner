"use client";

import Image from "next/image";
import { useState } from "react";

export function PlacePhoto({ src, alt, sizes = "(max-width: 860px) 100vw, 320px", className, fallbackSrc = "/brand/place-default.svg" }: { src?: string; alt: string; sizes?: string; className?: string; fallbackSrc?: string }) {
  const [failed, setFailed] = useState("");
  const [loaded, setLoaded] = useState("");
  const photo = src && src !== failed;
  const ready = photo && loaded === src;
  return <>
    {!ready && <Image src={fallbackSrc} alt={alt} fill sizes={sizes} className={className} unoptimized data-place-fallback />}
    {photo && <Image src={src} alt={alt} fill sizes={sizes} className={className} unoptimized
      style={{ opacity: ready ? 1 : 0 }} aria-hidden={!ready || undefined}
      onLoad={() => setLoaded(src)} onError={() => setFailed(src)} />}
  </>;
}
