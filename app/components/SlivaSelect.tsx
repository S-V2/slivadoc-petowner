"use client";
import { LocalizedButton, LocalizedCopy, LocalizedInput } from "./LocalizedCopy";
import { usePetOwnerI18n } from "./PetOwnerI18n";

import {
  Children,
  Fragment,
  isValidElement,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type FocusEventHandler,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

type Option = {
  value: string;
  label: string;
  disabled: boolean;
  group?: string;
};

type ChoiceProps = {
  children?: ReactNode;
  value?: string | number;
  label?: string;
  disabled?: boolean;
};

type SelectChange = {
  target: { value: string; name: string };
  currentTarget: { value: string; name: string };
};

type Props = {
  children: ReactNode;
  value?: string | number;
  defaultValue?: string | number;
  onChange?: (event: SelectChange) => void;
  name?: string;
  id?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  "aria-label"?: string;
  "aria-labelledby"?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
  onBlur?: FocusEventHandler<HTMLButtonElement>;
};

function textContent(node: ReactNode): string {
  return Children.toArray(node)
    .map((child) => {
      if (typeof child === "string" || typeof child === "number") return String(child);
      return isValidElement<ChoiceProps>(child) ? textContent(child.props.children) : "";
    })
    .join("")
    .replace(/\s+/g, " ")
    .trim();
}

// Option declarations stay with each form; only our custom list is rendered.
function collectOptions(children: ReactNode, group?: string, groupDisabled = false): Option[] {
  return Children.toArray(children).flatMap((child): Option[] => {
    if (!isValidElement<ChoiceProps>(child)) return [];
    if (child.type === Fragment || child.type === LocalizedCopy) return collectOptions(child.props.children, group, groupDisabled);
    if (child.type === "optgroup") {
      return collectOptions(child.props.children, child.props.label, Boolean(child.props.disabled));
    }
    if (child.type !== "option") return [];
    const label = child.props.label ?? textContent(child.props.children);
    return [{
      value: String(child.props.value ?? label),
      label,
      disabled: groupDisabled || Boolean(child.props.disabled),
      group,
    }];
  });
}

function normalize(text: string): string {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("id-ID");
}

export function SlivaSelect({
  children,
  value,
  defaultValue,
  onChange,
  name = "",
  id,
  disabled = false,
  required = false,
  className = "",
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
  onBlur,
}: Props) {
  const { t } = usePetOwnerI18n();
  const generatedID = useId();
  const selectID = id ?? `sliva-select-${generatedID}`;
  const listID = `${selectID}-list`;
  const errorID = `${selectID}-error`;
  const options = collectOptions(children).map(option => ({ ...option, label: t(option.label), group: option.group ? t(option.group) : undefined }));
  const [localValue, setLocalValue] = useState<string | undefined>(
    defaultValue === undefined ? undefined : String(defaultValue),
  );
  const selectedValue = value === undefined
    ? localValue ?? options.find((option) => !option.disabled)?.value ?? ""
    : String(value);
  const selected = options.find((option) => option.value === selectedValue);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeValue, setActiveValue] = useState<string>();
  const [invalid, setInvalid] = useState(false);
  const [position, setPosition] = useState<CSSProperties>({});
  const rootRef = useRef<HTMLSpanElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const validationRef = useRef<HTMLInputElement>(null);
  const typeaheadRef = useRef({ text: "", time: 0 });
  const searchable = options.length > 7;
  const filtered = options.filter((option) => normalize(`${option.label} ${option.group ?? ""}`).includes(normalize(query)));
  const available = filtered.filter((option) => !option.disabled);
  const active = available.find((option) => option.value === activeValue) ?? available[0];
  const activeIndex = filtered.findIndex((option) => option === active);
  const isDisabled = disabled || !options.length;

  useEffect(() => {
    const form = triggerRef.current?.form;
    if (!form) return;
    const reset = () => {
      if (value === undefined) setLocalValue(defaultValue === undefined ? undefined : String(defaultValue));
      setInvalid(false);
      setOpen(false);
      setQuery("");
    };
    form.addEventListener("reset", reset);
    return () => form.removeEventListener("reset", reset);
  }, [value, defaultValue]);

  useLayoutEffect(() => {
    if (!open || isDisabled) return;
    const place = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const viewport = window.visualViewport;
      const leftEdge = viewport?.offsetLeft ?? 0;
      const topEdge = viewport?.offsetTop ?? 0;
      const width = viewport?.width ?? window.innerWidth;
      const height = viewport?.height ?? window.innerHeight;
      const below = topEdge + height - rect.bottom - 14;
      const above = rect.top - topEdge - 14;
      const flip = below < Math.min(280, filtered.length * 44 + (searchable ? 64 : 16)) && above > below;
      const popupWidth = Math.min(Math.max(rect.width, 220), width - 24);
      setPosition({
        width: popupWidth,
        left: Math.max(leftEdge + 12, Math.min(rect.left, leftEdge + width - popupWidth - 12)),
        top: flip ? undefined : Math.max(topEdge + 12, rect.bottom + 6),
        bottom: flip ? window.innerHeight - rect.top + 6 : undefined,
        maxHeight: Math.max(100, Math.min(360, flip ? above : below)),
      });
    };
    const outside = (event: Event) => {
      const target = event.target as Node;
      if (!rootRef.current?.contains(target) && !popupRef.current?.contains(target)) setOpen(false);
    };
    place();
    if (searchable) searchRef.current?.focus({ preventScroll: true });
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    window.visualViewport?.addEventListener("resize", place);
    window.visualViewport?.addEventListener("scroll", place);
    document.addEventListener("pointerdown", outside, true);
    document.addEventListener("focusin", outside);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
      window.visualViewport?.removeEventListener("resize", place);
      window.visualViewport?.removeEventListener("scroll", place);
      document.removeEventListener("pointerdown", outside, true);
      document.removeEventListener("focusin", outside);
    };
  }, [open, isDisabled, searchable, filtered.length]);

  useEffect(() => {
    if (!open || activeIndex < 0) return;
    document.getElementById(`${listID}-option-${activeIndex}`)?.scrollIntoView({ block: "nearest" });
  }, [open, activeIndex, listID]);

  function show() {
    if (isDisabled) return;
    setQuery("");
    setActiveValue(selected && !selected.disabled ? selected.value : options.find((option) => !option.disabled)?.value);
    setOpen(true);
  }

  function dismiss() {
    setOpen(false);
    triggerRef.current?.focus({ preventScroll: true });
  }

  function choose(option: Option) {
    if (option.disabled) return;
    if (value === undefined) setLocalValue(option.value);
    setInvalid(required && !option.value);
    if (validationRef.current) validationRef.current.value = option.value;
    const target = { value: option.value, name };
    onChange?.({ target, currentTarget: target });
    dismiss();
  }

  function handleKey(event: KeyboardEvent<HTMLElement>) {
    if (isDisabled) return;
    if (event.key === "Tab") {
      if (open && event.target === searchRef.current) {
        // Restore the trigger before the browser moves to the next form field.
        triggerRef.current?.focus({ preventScroll: true });
      }
      setOpen(false);
      return;
    }
    if (event.key === "Escape" && open) {
      event.preventDefault();
      event.stopPropagation();
      dismiss();
      return;
    }
    if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
      if (!open) {
        event.preventDefault();
        show();
        return;
      }
      if ((event.key === "Home" || event.key === "End") && event.target === searchRef.current) return;
      event.preventDefault();
      const index = available.findIndex((option) => option.value === active?.value);
      const next = event.key === "Home" ? 0 : event.key === "End" ? available.length - 1
        : Math.max(0, Math.min(available.length - 1, index + (event.key === "ArrowDown" ? 1 : -1)));
      setActiveValue(available[next]?.value);
      return;
    }
    if (event.key === "Enter" || (event.key === " " && event.target !== searchRef.current)) {
      event.preventDefault();
      if (!open) show();
      else if (active) choose(active);
      return;
    }
    if (event.target !== searchRef.current && event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();
      const now = Date.now();
      const previous = now - typeaheadRef.current.time < 700 ? typeaheadRef.current.text : "";
      const text = previous + event.key;
      typeaheadRef.current = { text, time: now };
      const match = options.find((option) => !option.disabled && normalize(option.label).startsWith(normalize(text)));
      if (match) {
        if (!open) show();
        setActiveValue(match.value);
      }
    }
  }

  const expanded = open && !isDisabled;
  const accessibleName = t(ariaLabel ?? "Pilih opsi");
  const activeID = expanded && activeIndex >= 0 ? `${listID}-option-${activeIndex}` : undefined;

  return (
    <span ref={rootRef} className={`sliva-select ${className}`} data-open={expanded || undefined}>
      <LocalizedButton
        ref={triggerRef}
        id={selectID}
        type="button"
        className="sliva-select-trigger"
        role="combobox"
        aria-label={ariaLabelledBy ? undefined : accessibleName}
        aria-labelledby={ariaLabelledBy}
        aria-describedby={[ariaDescribedBy, invalid ? errorID : undefined].filter(Boolean).join(" ") || undefined}
        aria-haspopup="listbox"
        aria-expanded={expanded}
        aria-controls={expanded ? listID : undefined}
        aria-activedescendant={searchable ? undefined : activeID}
        aria-required={required || undefined}
        aria-invalid={ariaInvalid || invalid || undefined}
        onBlur={onBlur}
        disabled={isDisabled}
        onClick={() => expanded ? setOpen(false) : show()}
        onKeyDown={handleKey}
      >
        <span className="sliva-select-value"><LocalizedCopy>{selected?.label ?? t("Pilih opsi")}</LocalizedCopy></span>
        <svg className="sliva-select-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </LocalizedButton>
      <LocalizedCopy>{name && <LocalizedInput type="hidden" name={name} value={selected?.value ?? ""} disabled={disabled} />}</LocalizedCopy>
      <LocalizedCopy>{required && (
        <LocalizedInput
          ref={validationRef}
          className="sliva-select-validation"
          tabIndex={-1}
          aria-hidden="true"
          value={selected?.value ?? ""}
          required
          disabled={disabled}
          onChange={() => {}}
          onInvalid={(event) => {
            event.preventDefault();
            setInvalid(true);
            triggerRef.current?.focus({ preventScroll: true });
          }}
        />
      )}</LocalizedCopy>
      <LocalizedCopy>{invalid && <span id={errorID} className="sliva-select-error" role="alert"><LocalizedCopy>{"Pilih salah satu opsi untuk melanjutkan."}</LocalizedCopy></span>}</LocalizedCopy>
      <LocalizedCopy>{expanded && createPortal(
        <div ref={popupRef} className="sliva-select-popup" style={position} onClick={(event) => event.stopPropagation()}>
          <LocalizedCopy>{searchable && (
            <div className="sliva-select-search">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" strokeWidth="1.8" />
                <path d="m16 16 4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
              <LocalizedInput
                ref={searchRef}
                role="combobox"
                aria-label={`Cari opsi ${accessibleName}`}
                aria-expanded="true"
                aria-controls={listID}
                aria-activedescendant={activeID}
                aria-autocomplete="list"
                placeholder={t("Cari pilihan…")}
                value={query}
                autoComplete="off"
                onChange={(event) => { setQuery(event.target.value); setActiveValue(undefined); }}
                onKeyDown={handleKey}
              />
            </div>
          )}</LocalizedCopy>
          <div id={listID} className="sliva-select-options" role="listbox" aria-label={accessibleName}>
            <LocalizedCopy>{filtered.map((option, index) => (
              <Fragment key={`${option.value}-${index}`}>
                {option.group && option.group !== filtered[index - 1]?.group && (
                  <div className="sliva-select-group" role="presentation"><LocalizedCopy>{option.group}</LocalizedCopy></div>
                )}
                <div
                  id={`${listID}-option-${index}`}
                  role="option"
                  aria-selected={option.value === selectedValue}
                  aria-disabled={option.disabled || undefined}
                  className="sliva-select-option"
                  data-active={option === active || undefined}
                  onPointerMove={() => { if (!option.disabled) setActiveValue(option.value); }}
                  onPointerDown={(event) => event.preventDefault()}
                  onClick={(event) => { event.preventDefault(); event.stopPropagation(); choose(option); }}
                >
                  <span><LocalizedCopy>{option.label}</LocalizedCopy></span>
                  <LocalizedCopy>{option.value === selectedValue && (
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="m5 12 4 4L19 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}</LocalizedCopy>
                </div>
              </Fragment>
            ))}</LocalizedCopy>
            <LocalizedCopy>{!filtered.length && <p className="sliva-select-empty" role="status"><LocalizedCopy>{"Pilihan tidak ditemukan. Coba kata lain."}</LocalizedCopy></p>}</LocalizedCopy>
          </div>
        </div>, document.body,
      )}</LocalizedCopy>
    </span>
  );
}
