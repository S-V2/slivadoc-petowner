"use client";
import { useState } from "react";
import NextImage from "next/image";
import { Icon, type IconName } from "./Icon";

export function WorldPhoto({ src, alt, icon = "paw", avatar = false, sizes = "(max-width:580px) 50vw, 25vw" }: { src?: string; alt: string; icon?: IconName; avatar?: boolean; sizes?: string }) {
  const [failed, setFailed] = useState("");
  const initial = alt.replace(/^drh\.?\s*/i, "").trim().slice(0, 1).toUpperCase();
  return <span className={avatar ? "world-avatar-photo" : "world-cover-photo"}>
    {src && src !== failed ? <NextImage src={src} alt={alt} fill sizes={sizes} unoptimized onError={() => setFailed(src)}/> : <span className="world-photo-fallback" role="img" aria-label={alt}>{avatar && initial ? initial : <Icon name={icon} size={30}/>}</span>}
  </span>;
}
