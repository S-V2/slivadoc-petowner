"use client";
import type { ReactNode } from "react";
import { worldCollections, type WorldCollectionMode } from "../../shared/world-collections";
import { Icon, type IconName } from "./Icon";
import { LocalizedCopy } from "./LocalizedCopy";
import "../world-collections.css";

const icons: Record<WorldCollectionMode, IconName> = { academy: "sparkle", events: "calendar", consult: "video", adoption: "heart", documents: "shield" };

export function WorldCollectionHeader({ mode, children }: { mode: WorldCollectionMode; children?: ReactNode }) {
  const copy = worldCollections[mode];
  return <header className={`world-collection-header world-collection-header--${mode}`}>
    <span className="world-collection-symbol" aria-hidden="true"><Icon name={icons[mode]} size={25}/></span>
    <div className="world-collection-intro"><small><LocalizedCopy>{copy.label}</LocalizedCopy></small><h2><LocalizedCopy>{copy.title}</LocalizedCopy></h2><p><LocalizedCopy>{copy.note}</LocalizedCopy></p></div>
    {children && <div className="world-collection-actions">{children}</div>}
  </header>;
}
