"use client";
import { LocalizedCopy, LocalizedButton } from "./LocalizedCopy";

import { worldFeatures, type PetOwnerWorldMode } from "../../shared/petowner-flow";
import { usePetOwnerI18n } from "./PetOwnerI18n";

export function WorldNavigation({ active, onSelect }: {
  active: PetOwnerWorldMode;
  onSelect: (mode: PetOwnerWorldMode) => void;
}) {
  const { t } = usePetOwnerI18n();
  return (
    <nav className="petowner-world-nav" aria-label="Sliva World">
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
}
