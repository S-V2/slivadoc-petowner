"use client";
import { LocalizedCopy, LocalizedButton } from "./LocalizedCopy";

import { worldFeatures, type PetOwnerWorldMode } from "../../shared/petowner-flow";
import { usePetOwnerI18n } from "./PetOwnerI18n";
import { WorldExplorer } from "./WorldExplorer";

export function WorldNavigation({ active, onSelect, embedded = false }: {
  active: PetOwnerWorldMode;
  onSelect: (mode: PetOwnerWorldMode) => void;
  embedded?: boolean;
}) {
  const { t } = usePetOwnerI18n();
  const navigation = (
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
  return embedded ? navigation : <WorldExplorer>{navigation}</WorldExplorer>;
}
