"use client";

import Link from "next/link";
import { BrandMark } from "./BrandLogo";
import { useEffect, useRef } from "react";
import {
  careerCopy,
  careerDepartments,
  careerEmploymentTypes,
  careerLocation,
  type CareerLanguage,
  type CareerPosition,
} from "../../shared/careers";
import {
  careerDiscoveryCopy,
  careerFilterQuery,
  careerLocationKey,
  careerWorkMode,
  careerWorkModes,
  type CareerFilters,
} from "../../shared/career-discovery";
import { Icon } from "./Icon";

export function CareerLogo({
  size = 44,
  priority = false,
}: {
  size?: number;
  priority?: boolean;
}) {
  return <BrandMark className="career-logo" size={size} priority={priority} />;
}

export function CareerFilterBar({
  catalog,
  filters,
  language,
  disabled,
  onChange,
  onClear,
}: {
  catalog: CareerPosition[];
  filters: CareerFilters;
  language: CareerLanguage;
  disabled: boolean;
  onChange: (key: keyof CareerFilters, value: string) => void;
  onClear: () => void;
}) {
  const c = careerCopy[language],
    d = careerDiscoveryCopy[language];
  const locations = [...new Set(catalog.map(careerLocationKey))].sort((a, b) =>
    a.localeCompare(b, language),
  );
  const departments = [...new Set(catalog.map((p) => p.department))];
  const active = Object.entries(filters).filter(
    ([key, value]) => key !== "sort" && !!value,
  ).length;
  const fields: {
    key: keyof CareerFilters;
    label: string;
    all: string;
    options: [string, string][];
  }[] = [
    {
      key: "employment",
      label: d.employment,
      all: d.allTypes,
      options: Object.entries(careerEmploymentTypes).map(([key, value]) => [
        key,
        value[language],
      ]),
    },
    {
      key: "mode",
      label: d.mode,
      all: d.allModes,
      options: Object.entries(careerWorkModes),
    },
    {
      key: "department",
      label: d.department,
      all: c.all,
      options: departments.map((key) => [
        key,
        careerDepartments[key]?.[language] ?? key,
      ]),
    },
    {
      key: "location",
      label: d.location,
      all: d.allLocations,
      options: locations.map((key) => [
        key,
        key === "indonesia" ? d.national : `${key}, Indonesia`,
      ]),
    },
    {
      key: "status",
      label: d.status,
      all: d.allStatuses,
      options: [
        ["open", c.open],
        ["talent_pool", d.future],
      ],
    },
    {
      key: "sort",
      label: d.sort,
      all: d.recommended,
      options: [
        ["newest", d.newest],
        ["title", d.alphabet],
      ],
    },
  ];
  return (
    <section className="career-filter-panel" aria-label={d.filters}>
      <div className="career-filter-top">
        <label className="career-search">
          <Icon name="search" />
          <input
            disabled={disabled}
            type="search"
            maxLength={150}
            aria-label={c.search}
            placeholder={c.search}
            value={filters.q}
            onChange={(e) => onChange("q", e.target.value)}
          />
        </label>
        <button
          className="career-clear"
          type="button"
          disabled={disabled || !Object.values(filters).some(Boolean)}
          onClick={onClear}
        >
          {c.clear}
          {active > 0 && (
            <span aria-label={`${active} ${d.filtered}`}>{active}</span>
          )}
        </button>
      </div>
      <div className="career-filter-fields">
        {fields.map((field) => (
          <label key={field.key}>
            <span>{field.label}</span>
            <select
              disabled={disabled}
              value={filters[field.key]}
              onChange={(e) => onChange(field.key, e.target.value)}
            >
              <option value="">{field.all}</option>
              {field.options.map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
    </section>
  );
}

export function CareerEmploymentBadges({
  position,
  language,
}: {
  position: CareerPosition;
  language: CareerLanguage;
}) {
  return (
    <div className="career-meta">
      {position.employment_types?.map((type) => (
        <span className="career-badge" key={type}>
          {careerEmploymentTypes[type]?.[language] ?? type}
        </span>
      ))}
    </div>
  );
}

export function CareerJobCard({
  position: p,
  language,
  filters,
}: {
  position: CareerPosition;
  language: CareerLanguage;
  filters: CareerFilters;
}) {
  const c = careerCopy[language];
  return (
    <article className="career-job">
      <div className="career-job-top">
        <span className="career-company-mark" aria-label="Slivadoc">
          <CareerLogo />
        </span>
        <span className="career-badge career-work-mode">
          {careerWorkMode(p, language)}
        </span>
      </div>
      <span className="career-job-dept">
        {careerDepartments[p.department]?.[language] ?? p.department}
      </span>
      <h3>{p.title[language]}</h3>
      <p>{p.summary[language]}</p>
      <CareerEmploymentBadges position={p} language={language} />
      <div className="career-job-bottom">
        <span>
          <Icon name="map" size={15} />
          {careerLocation(p, language)}
        </span>
        <Link
          prefetch={false}
          href={`/career/${p.id}${careerFilterQuery(filters)}`}
          aria-label={`${c.detail}: ${p.title[language]}`}
        >
          {c.detail}
          <span aria-hidden="true">↗</span>
        </Link>
      </div>
    </article>
  );
}

export function CareerJobList({
  positions,
  selected,
  language,
  filters,
}: {
  positions: CareerPosition[];
  selected: string;
  language: CareerLanguage;
  filters: CareerFilters;
}) {
  const c = careerCopy[language],
    d = careerDiscoveryCopy[language];
  const list = useRef<HTMLElement>(null);
  useEffect(() => {
    const container = list.current;
    const active = container?.querySelector<HTMLElement>(
      '[aria-current="page"]',
    );
    if (!container || !active) return;
    // Move only the list, keeping the selected role visible without scrolling the page.
    container.scrollTop +=
      active.getBoundingClientRect().top -
      container.getBoundingClientRect().top;
  }, [selected]);
  return (
    <nav className="career-job-list" aria-label={d.list} ref={list}>
      {positions.map((p) => (
        <Link
          prefetch={false}
          scroll={false}
          className="career-list-item"
          key={p.id}
          href={`/career/${p.id}${careerFilterQuery(filters)}`}
          aria-label={`${c.detail}: ${p.title[language]}`}
          aria-current={p.id === selected ? "page" : undefined}
        >
          <span className="career-company-mark">
            <CareerLogo size={36} />
          </span>
          <div className="career-list-copy">
            <h3>{p.title[language]}</h3>
            <p className="career-list-company">
              Slivadoc ·{" "}
              {careerDepartments[p.department]?.[language] ?? p.department}
            </p>
            <p className="career-list-location">
              {careerLocation(p, language)}
            </p>
            <span className="career-badge career-work-mode">
              {careerWorkMode(p, language)}
            </span>
            <CareerEmploymentBadges position={p} language={language} />
            {p.id === selected && (
              <span className="career-selected">
                <Icon name="check" size={13} />
                {d.selected}
              </span>
            )}
          </div>
        </Link>
      ))}
    </nav>
  );
}
