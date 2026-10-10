"use client";

import { LocalizedButton, LocalizedCopy } from "../LocalizedCopy";
import { usePetOwnerI18n } from "../PetOwnerI18n";

export function PlaceDetailTabs<T extends string>({ items, value, onChange, label, panelId, className = "" }: {
  items: Array<{ id: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
  label: string;
  panelId: string;
  className?: string;
}) {
  const { t } = usePetOwnerI18n();
  return (
    <div className={`place-detail-tabs ${className}`} role="tablist" aria-label={t(label)}>
      {items.map((item, index) => (
        <LocalizedButton
          key={item.id}
          id={`${panelId}-tab-${item.id}`}
          type="button"
          role="tab"
          aria-controls={panelId}
          aria-selected={value === item.id}
          tabIndex={value === item.id ? 0 : -1}
          className={value === item.id ? "active" : ""}
          onClick={() => onChange(item.id)}
          onKeyDown={event => {
            const next = event.key === "ArrowRight" ? (index + 1) % items.length
              : event.key === "ArrowLeft" ? (index - 1 + items.length) % items.length
              : event.key === "Home" ? 0 : event.key === "End" ? items.length - 1 : -1;
            if (next < 0) return;
            event.preventDefault();
            onChange(items[next].id);
            const nextTab = document.getElementById(`${panelId}-tab-${items[next].id}`);
            nextTab?.focus({ preventScroll: true });
            nextTab?.scrollIntoView({ block: "nearest", inline: "nearest" });
          }}
        ><LocalizedCopy>{item.label}</LocalizedCopy></LocalizedButton>
      ))}
    </div>
  );
}
