"use client";

import { worldFeatures, type PetOwnerWorldMode } from "../../mobile/src/petowner-flow";
import { usePetOwnerI18n } from "./PetOwnerI18n";

export function WorldNavigation({ active, onSelect }: {
  active: PetOwnerWorldMode;
  onSelect: (mode: PetOwnerWorldMode) => void;
}) {
  const { t } = usePetOwnerI18n();
  return (
    <nav className="petowner-world-nav" aria-label="Sliva World">
      {worldFeatures.map((feature) => (
        <button type="button" key={feature.mode}
          aria-current={active === feature.mode ? "page" : undefined}
          className={active === feature.mode ? "active" : ""}
          onClick={() => onSelect(feature.mode)}>
          {t(feature.label)}
        </button>
      ))}
    </nav>
  );
}
