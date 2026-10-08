"use client";
import type { ReactNode } from "react";
import { Icon } from "./Icon";
import { LocalizedCopy } from "./LocalizedCopy";
import "../world-explorer.css";

export function WorldExplorer({ children, compact = false }: { children: ReactNode; compact?: boolean }) {
  return <section className={`world-explorer${compact ? " world-explorer--compact" : ""}`} aria-label="Jelajahi Sliva World">
    <div className="world-explorer-identity">
      <span className="world-orbit-mark" aria-hidden="true"><i/><Icon name="paw" size={25}/><b/></span>
      <div><span className="world-explorer-kicker"><LocalizedCopy>{"DUNIA PET, SATU DESTINASI"}</LocalizedCopy></span><h1>Sliva <span>World</span></h1><p><LocalizedCopy>{"Temukan tempat, pengalaman, dan teman baru untuk pet-mu."}</LocalizedCopy></p></div>
    </div>
    {children}
  </section>;
}
