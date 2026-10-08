"use client";
import { useEffect, useRef } from "react";
import { alignMobileTab } from "./HorizontalTabPositioning";
import { LocalizedCopy, LocalizedButton } from "./LocalizedCopy";

import { worldFeatures, type PetOwnerWorldMode } from "../../shared/petowner-flow";
import { usePetOwnerI18n } from "./PetOwnerI18n";
import { WorldExplorer } from "./WorldExplorer";

export function WorldNavigation({ active, onSelect, embedded = false }: {
  active: PetOwnerWorldMode;
  onSelect: (mode: PetOwnerWorldMode) => void;
  embedded?: boolean;
}) {
  const rail = useRef<HTMLElement>(null);
  useEffect(() => {
    const tab = rail.current?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!tab || !rail.current) return;
    alignMobileTab(tab);
    const observer = new ResizeObserver(() => alignMobileTab(tab));
    observer.observe(rail.current);
    observer.observe(tab);
    return () => observer.disconnect();
  }, [active]);
  const { t } = usePetOwnerI18n();
  const navigation = (
    <nav ref={rail} className="petowner-world-nav" aria-label="Sliva World">
      <LocalizedCopy>{worldFeatures.map((feature) => (
        <LocalizedButton type="button" key={feature.mode}
          aria-current={active === feature.mode ? "page" : undefined}
          className={active === feature.mode ? "active" : ""}
          onClick={() => onSelect(feature.mode)}>
          <LocalizedCopy>{t(feature.label)}</LocalizedCopy>
        </LocalizedButton>
      ))}</LocalizedCopy>
    </nav>
  );
  return embedded ? navigation : <WorldExplorer compact>{navigation}</WorldExplorer>;
}
