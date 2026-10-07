"use client";

import { createContext, useContext, type ReactNode } from "react";
import { usePetOwnerI18n } from "./PetOwnerI18n";
import { Icon } from "./Icon";

type Flow = {
  authenticated: boolean;
  hasPet: boolean;
  requireLogin: () => boolean;
  requirePet: () => boolean;
};
const FlowContext = createContext<Flow | null>(null);

export function PetOwnerFlowProvider({
  authenticated, hasPet, onLogin, onAddPet, children,
}: {
  authenticated: boolean;
  hasPet: boolean;
  onLogin: () => void;
  onAddPet: () => void;
  children: ReactNode;
}) {
  const requireLogin = () => {
    if (authenticated) return true;
    onLogin();
    return false;
  };
  return (
    <FlowContext.Provider value={{
      authenticated,
      hasPet,
      requireLogin,
      requirePet: () => {
        if (!requireLogin()) return false;
        if (hasPet) return true;
        onAddPet();
        return false;
      },
    }}>
      {children}
    </FlowContext.Provider>
  );
}

export function usePetOwnerFlow() {
  const flow = useContext(FlowContext);
  if (!flow) throw new Error("Pet Owner features need the flow provider");
  return flow;
}

export function PetRequiredNotice() {
  const { authenticated, hasPet, requirePet } = usePetOwnerFlow();
  const { t } = usePetOwnerI18n();
  if (!authenticated || hasPet) return null;
  return (
    <section className="pet-required-notice" aria-label={t("Mode lihat saja")}>
      <span className="pet-required-icon"><Icon name="paw" /></span>
      <div>
        <strong>{t("Mode lihat saja")}</strong>
        <p>{t("Tambahkan profil pet agar bisa booking, belanja, dan berinteraksi.")}</p>
      </div>
      <button type="button" className="primary-button small" onClick={requirePet}>
        <Icon name="plus" size={16} /> {t("Tambah pet")}
      </button>
    </section>
  );
}
