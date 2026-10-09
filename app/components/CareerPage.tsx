"use client";
import { getAccessToken, refreshSession } from "../lib/session";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type FormEvent,
} from "react";
import {
  careerBasicFields,
  careerEmploymentTypes,
  careerLocation,
  careerCopy,
  careerDepartments,
  careerErrors,
  careerSubmitError,
  emptyCareerDraft,
  getCareerCatalog,
  sendCareerApplication,
  type CareerCatalog,
  type CareerDraft,
  type CareerPosition,
} from "../../shared/careers";
import { PLATFORM_API_URL } from "../lib/platform-api";
import { usePetOwnerI18n } from "./PetOwnerI18n";
import { LegalConsentDialog } from "./LegalConsentDialog";
import { Icon } from "./Icon";
import { BrandLogo } from "./BrandLogo";

import {
  careerDiscoveryCopy,
  careerFilterQuery,
  careerWorkMode,
  discoverCareerPositions,
  readCareerFilters,
  type CareerFilters,
} from "../../shared/career-discovery";
import {
  CareerEmploymentBadges,
  CareerFilterBar,
  CareerJobCard,
  CareerJobList,
  CareerLogo,
} from "./CareerDiscovery";

const subscribeHydration = () => () => {};
const clientReady = () => true;
const serverReady = () => false;

export function CareerPage({
  initialCatalog,
  initialPosition,
}: {
  initialCatalog?: CareerCatalog;
  initialPosition?: CareerPosition;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const hydrated = useSyncExternalStore(
    subscribeHydration,
    clientReady,
    serverReady,
  );
  const { language, setLanguage } = usePetOwnerI18n();
  const c = careerCopy[language],
    d = careerDiscoveryCopy[language];
  const [loadedCatalog, setCatalog] = useState<CareerCatalog>();
  const catalog = initialCatalog ?? loadedCatalog;
  const [loading, setLoading] = useState(!initialCatalog);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const position = initialPosition;
  const filters = readCareerFilters(searchParams);
  const positions = discoverCareerPositions(
    catalog?.data ?? [],
    filters,
    language,
  );
  const backHref = `/career${careerFilterQuery(filters)}#career-positions`;
  const title = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (position) title.current?.focus({ preventScroll: true });
  }, [position]);
  useEffect(() => {
    if (initialCatalog && attempt === 0) return;
    const controller = new AbortController();
    getCareerCatalog(PLATFORM_API_URL, controller.signal)
      .then((data) => {
        setCatalog(data);
        setLoading(false);
        setFailed(false);
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
          setFailed(true);
        }
      });
    return () => controller.abort();
  }, [attempt, initialCatalog]);
  function updateFilters(next: CareerFilters) {
    // Shallow URL updates preserve form answers and keep browser back/reload shareable.
    window.history.replaceState(
      null,
      "",
      `${pathname}${careerFilterQuery(next)}${window.location.hash}`,
    );
  }
  function clearFilters() {
    updateFilters(readCareerFilters(new URLSearchParams()));
  }
  const filterBar = (
    <CareerFilterBar
      catalog={catalog?.data ?? []}
      filters={filters}
      language={language}
      disabled={!hydrated}
      onChange={(key, value) => updateFilters({ ...filters, [key]: value })}
      onClear={clearFilters}
    />
  );
  const empty = (
    <div className="career-empty">
      <Icon name="search" size={30} />
      <p>{c.empty}</p>
      <button
        disabled={!hydrated}
        className="career-secondary"
        onClick={clearFilters}
      >
        {c.clear}
      </button>
    </div>
  );
  return (
    <div
      className={`career-page${position ? " career-page--detail" : ""}`}
      lang={language}
    >
      <header className="career-header">
        <Link className="career-brand" href="/" aria-label="Slivadoc">
          <BrandLogo priority />
          <span className="career-brand-divider" />
          <span>Career</span>
        </Link>
        <div className="career-language" role="group" aria-label={c.language}>
          {(["id", "en"] as const).map((lang) => (
            <button
              disabled={!hydrated}
              type="button"
              key={lang}
              aria-pressed={language === lang}
              onClick={() => setLanguage(lang)}
            >
              {lang.toUpperCase()}
            </button>
          ))}
        </div>
      </header>
      <main>
        <nav className="career-breadcrumb">
          <Link className="career-back" href={position ? backHref : "/"}>
            <span aria-hidden="true">←</span>
            {position ? c.backPositions : c.home}
          </Link>
          <span>
            Slivadoc Career{position ? ` / ${position.title[language]}` : ""}
          </span>
        </nav>
        {position && catalog ? (
          <>
            <section className="career-discovery-heading">
              <span className="career-eyebrow">GROW WITH SLIVADOC</span>
              <h2>{d.heading}</h2>
              <p>{d.intro}</p>
            </section>
            {filterBar}
            <div className="career-workspace">
              <aside className="career-results-panel">
                <div className="career-results-heading">
                  <strong aria-live="polite">
                    {positions.length} {c.results}
                  </strong>
                  <p>{d.resultNote}</p>
                </div>
                {positions.length ? (
                  <CareerJobList
                    positions={positions}
                    selected={position.id}
                    language={language}
                    filters={filters}
                  />
                ) : (
                  empty
                )}
              </aside>
              <article
                className="career-selected-position"
                aria-labelledby="career-role-title"
              >
                {!positions.some((p) => p.id === position.id) && (
                  <p className="career-notice" role="status">
                    {d.outside}
                  </p>
                )}
                <section className="career-role-hero">
                  <div className="career-employer">
                    <span className="career-company-mark">
                      <CareerLogo size={54} />
                    </span>
                    <div>
                      <strong>Slivadoc</strong>
                      <span>
                        {careerDepartments[position.department]?.[language] ??
                          position.department}
                      </span>
                    </div>
                  </div>
                  <h1 id="career-role-title" ref={title} tabIndex={-1}>
                    {position.title[language]}
                  </h1>
                  <span className="career-location">
                    <Icon name="map" size={16} />
                    {careerLocation(position, language)}
                  </span>
                  <div className="career-role-labels">
                    <span className="career-badge career-work-mode">
                      {careerWorkMode(position, language)}
                    </span>
                    <CareerEmploymentBadges
                      position={position}
                      language={language}
                    />
                  </div>
                  <a className="career-primary" href="#career-application">
                    {position.status === "talent_pool" ? d.interest : d.apply}
                    <span aria-hidden="true">↗</span>
                  </a>
                  {position.status === "talent_pool" && (
                    <p className="career-notice">
                      <Icon name="clock" />
                      {c.talentNote}
                    </p>
                  )}
                </section>
                <div className="career-role-details">
                  <section>
                    <h2>{c.about}</h2>
                    <p>{position.summary[language]}</p>
                  </section>
                  <section>
                    <h2>{c.responsibilities}</h2>
                    <ul>
                      {position.responsibilities.map((v) => (
                        <li key={v.id}>{v[language]}</li>
                      ))}
                    </ul>
                  </section>
                  <section>
                    <h2>{c.requirements}</h2>
                    <ul>
                      {position.requirements.map((v) => (
                        <li key={v.id}>{v[language]}</li>
                      ))}
                    </ul>
                  </section>
                  <div className="career-security">
                    <Icon name="shield" size={24} />
                    <div>
                      <strong>{c.noFee}</strong>
                      <p>{c.noFeeNote}</p>
                    </div>
                  </div>
                </div>
                <div id="career-application" className="career-application">
                  <CareerForm
                    key={position.id}
                    position={position}
                    version={catalog.consent_version}
                    onDone={() => router.push(backHref)}
                  />
                </div>
              </article>
            </div>
          </>
        ) : (
          <>
            <section className="career-hero">
              <div className="career-hero-copy">
                <span className="career-eyebrow">
                  <span /> {c.eyebrow}
                </span>
                <h1 ref={title} tabIndex={-1}>
                  {c.title}
                  <br />
                  <em>{c.titleAccent}</em>
                </h1>
                <p>{c.intro}</p>
                <a className="career-primary" href="#career-positions">
                  {c.explore}
                  <span aria-hidden="true">↗</span>
                </a>
                <div className="career-hero-foot">
                  <Icon name="heart" size={18} />
                  <span>One Platform. Every Animal.</span>
                </div>
              </div>
              <div className="career-hero-art" aria-hidden="true">
                <div className="career-orbit career-orbit-one" />
                <div className="career-orbit career-orbit-two" />
                <div className="career-art-paw">
                  <Icon name="paw" size={96} />
                </div>
                <div className="career-art-card career-art-card-one">
                  <Icon name="users" size={23} />
                  <span>Better, together.</span>
                </div>
                <div className="career-art-card career-art-card-two">
                  <Icon name="sparkle" size={22} />
                  <span>Make an impact.</span>
                </div>
                <div className="career-art-dot" />
              </div>
            </section>
            <section className="career-values">
              {c.values.map((value, i) => (
                <article key={value}>
                  <span>
                    <Icon
                      name={i === 0 ? "heart" : i === 1 ? "users" : "sparkle"}
                      size={22}
                    />
                  </span>
                  <div>
                    <h2>{value}</h2>
                    <p>{c.valueNotes[i]}</p>
                  </div>
                </article>
              ))}
            </section>

            <section id="career-positions" className="career-opportunities">
              <div className="career-section-heading">
                <div>
                  <span className="career-eyebrow">YOUR NEXT CHAPTER</span>
                  <h2>{c.positions}</h2>
                  <p>{c.positionsNote}</p>
                </div>
                <span className="career-count" aria-live="polite">
                  {positions.length} {c.results}
                </span>
              </div>
              {filterBar}
              {loading ? (
                <div className="career-loading" role="status">
                  {language === "id"
                    ? "Memuat peluang karier…"
                    : "Loading opportunities…"}
                </div>
              ) : failed ? (
                <div className="career-empty" role="alert">
                  <Icon name="bag" size={36} />
                  <p>{c.loadError}</p>
                  <button
                    disabled={!hydrated}
                    className="career-primary"
                    onClick={() => {
                      setLoading(true);
                      setFailed(false);
                      setAttempt((v) => v + 1);
                    }}
                  >
                    {c.retry}
                  </button>
                </div>
              ) : !positions.length ? (
                empty
              ) : (
                <div className="career-jobs">
                  {positions.map((p) => (
                    <CareerJobCard
                      key={p.id}
                      position={p}
                      language={language}
                      filters={filters}
                    />
                  ))}
                </div>
              )}
            </section>
            <section className="career-process">
              <span className="career-eyebrow">HOW IT WORKS</span>
              <h2>{c.process}</h2>
              <div>
                {c.steps.map((step, i) => (
                  <article key={step}>
                    <b>0{i + 1}</b>
                    <h3>{step}</h3>
                    <p>{c.stepNotes[i]}</p>
                  </article>
                ))}
              </div>
            </section>
            <div className="career-security career-security-wide">
              <Icon name="shield" size={26} />
              <div>
                <strong>{c.noFee}</strong>
                <p>{c.noFeeNote}</p>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function CareerForm({
  position,
  version,
  onDone,
}: {
  position: CareerPosition;
  version: string;
  onDone: () => void;
}) {
  const { language } = usePetOwnerI18n(),
    c = careerCopy[language];
  const hydrated = useSyncExternalStore(
    subscribeHydration,
    clientReady,
    serverReady,
  );
  const [draft, setDraft] = useState(emptyCareerDraft);
  const [file, setFile] = useState<File | null>(null);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState("");
  const [privacy, setPrivacy] = useState(false);
  const key = useRef("");
  const sent = useRef(false);
  const success = useRef<HTMLDivElement>(null);
  const errors = careerErrors(draft, position, file, language);
  const valid = Object.keys(errors).length === 0;
  function change(id: keyof CareerDraft, value: string | boolean) {
    setDraft((v) => ({ ...v, [id]: value }));
    key.current = "";
    setError("");
  }
  function touch(id: string) {
    setTouched((v) => ({ ...v, [id]: true }));
  }
  function answer(id: string, value: string) {
    setDraft((v) => ({ ...v, answers: { ...v.answers, [id]: value } }));
    key.current = "";
    setError("");
  }
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (sent.current || !valid || !file) return;
    sent.current = true;
    setBusy(true);
    setError("");
    if (!key.current) key.current = crypto.randomUUID();
    const form = new FormData();
    form.append(
      "application",
      JSON.stringify({
        ...draft,
        position_id: position.id,
        position_revision: position.revision,
        employment_type:
          draft.employment_type || position.employment_types?.[0],
        request_key: key.current,
        language,
        consent_version: version,
      }),
    );
    form.append("resume", file);
    try {
      const result = await sendCareerApplication(PLATFORM_API_URL, form, {
        getToken: getAccessToken,
        refresh: refreshSession,
      });
      setReceipt(result.id);
      setFile(null);
      setDraft(emptyCareerDraft());
      requestAnimationFrame(() => {
        success.current?.scrollIntoView({ block: "center" });
        success.current?.focus();
      });
    } catch (cause) {
      setError(careerSubmitError(cause, language));
    } finally {
      setBusy(false);
      sent.current = false;
    }
  }
  if (receipt)
    return (
      <div className="career-success" ref={success} tabIndex={-1} role="status">
        <span className="career-success-icon">
          <Icon name="check" size={40} />
        </span>
        <span className="career-eyebrow">THANK YOU</span>
        <h2>{c.success}</h2>
        <p>{c.successNote}</p>
        <div>
          <span>{c.reference}</span>
          <code>{receipt}</code>
        </div>
        <button className="career-primary" onClick={onDone}>
          {c.browse}
          <span aria-hidden="true">→</span>
        </button>
      </div>
    );
  const showError = (id: string) =>
    touched[id] && errors[id] ? (
      <span id={`error-${id}`} className="career-field-error">
        {errors[id]}
      </span>
    ) : null;
  return (
    <form className="career-form" onSubmit={submit} noValidate>
      <header>
        <span className="career-eyebrow">YOUR APPLICATION</span>
        <h2>{c.formTitle}</h2>
        <p>{c.formIntro}</p>
      </header>
      <fieldset disabled={busy || !hydrated}>
        <legend>{c.personal}</legend>
        <div className="career-form-grid">
          {(position.employment_types?.length ?? 0) > 1 && (
            <label className="career-full" htmlFor="career-employment_type">
              <span>
                {c.employment_type} <b>*</b>
              </span>
              <select
                id="career-employment_type"
                required
                value={draft.employment_type ?? ""}
                onChange={(e) => change("employment_type", e.target.value)}
                onBlur={() => touch("employment_type")}
                aria-invalid={Boolean(
                  touched.employment_type && errors.employment_type,
                )}
              >
                <option value="">{c.chooseType}</option>
                {position.employment_types?.map((type) => (
                  <option key={type} value={type}>
                    {careerEmploymentTypes[type]?.[language] ?? type}
                  </option>
                ))}
              </select>
              {showError("employment_type")}
            </label>
          )}
          {careerBasicFields.map((f) => (
            <label
              className={f.kind === "textarea" ? "career-full" : ""}
              key={f.id}
              htmlFor={`career-${f.id}`}
            >
              <span>
                {c[f.id]} <b>*</b>
              </span>
              {f.kind === "textarea" ? (
                <textarea
                  id={`career-${f.id}`}
                  value={draft[f.id]}
                  rows={4}
                  minLength={f.min}
                  maxLength={f.max}
                  required
                  onChange={(e) => change(f.id, e.target.value)}
                  onBlur={() => touch(f.id)}
                  aria-invalid={Boolean(touched[f.id] && errors[f.id])}
                  aria-describedby={`hint-${f.id} error-${f.id}`}
                />
              ) : (
                <input
                  id={`career-${f.id}`}
                  type={f.kind === "number" ? "text" : f.kind}
                  inputMode={
                    f.kind === "number" || f.kind === "tel"
                      ? "numeric"
                      : f.kind === "email"
                        ? "email"
                        : "text"
                  }
                  autoComplete={
                    f.id === "full_name"
                      ? "name"
                      : f.id === "phone"
                        ? "tel"
                        : f.id === "email"
                          ? "email"
                          : "off"
                  }
                  value={draft[f.id]}
                  maxLength={
                    f.kind === "tel" || f.kind === "number" ? undefined : f.max
                  }
                  required
                  onChange={(e) =>
                    change(
                      f.id,
                      f.kind === "number" || f.kind === "tel"
                        ? e.target.value.replace(/\D/g, "").slice(0, f.max)
                        : e.target.value,
                    )
                  }
                  onBlur={() => touch(f.id)}
                  aria-invalid={Boolean(touched[f.id] && errors[f.id])}
                  aria-describedby={errors[f.id] ? `error-${f.id}` : undefined}
                />
              )}{" "}
              {f.id === "motivation" && (
                <small id={`hint-${f.id}`}>{c.motivationHint}</small>
              )}
              {showError(f.id)}
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset disabled={busy || !hydrated}>
        <legend>{c.role}</legend>
        <div className="career-role-tag">
          <Icon name="bag" size={16} />
          {position.title[language]}
        </div>
        <div className="career-form-grid">
          {position.fields.map((f) => (
            <label
              className="career-full"
              htmlFor={`career-answer-${f.id}`}
              key={f.id}
            >
              <span>
                {f.label[language]} {f.required && <b>*</b>}
              </span>
              {f.kind === "textarea" ? (
                <textarea
                  id={`career-answer-${f.id}`}
                  value={draft.answers[f.id] ?? ""}
                  rows={4}
                  required={f.required}
                  minLength={f.min_length}
                  maxLength={f.max_length}
                  onChange={(e) => answer(f.id, e.target.value)}
                  onBlur={() => touch(`answers.${f.id}`)}
                  aria-invalid={Boolean(
                    touched[`answers.${f.id}`] && errors[`answers.${f.id}`],
                  )}
                  aria-describedby={`error-answers.${f.id}`}
                />
              ) : (
                <input
                  id={`career-answer-${f.id}`}
                  type={f.kind}
                  value={draft.answers[f.id] ?? ""}
                  required={f.required}
                  maxLength={f.max_length}
                  placeholder={f.kind === "url" ? "https://…" : undefined}
                  onChange={(e) => answer(f.id, e.target.value)}
                  onBlur={() => touch(`answers.${f.id}`)}
                  aria-invalid={Boolean(
                    touched[`answers.${f.id}`] && errors[`answers.${f.id}`],
                  )}
                  aria-describedby={`error-answers.${f.id}`}
                />
              )}{" "}
              {f.kind === "textarea" && (
                <small>
                  {c.min} {f.min_length} {c.chars}
                </small>
              )}
              {showError(`answers.${f.id}`)}
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset disabled={busy || !hydrated}>
        <legend>{c.documents}</legend>
        <label className="career-upload">
          <Icon name="download" size={28} />
          <strong>{file?.name ?? c.upload} *</strong>
          <small>{c.uploadHint}</small>
          <input
            type="file"
            accept=".pdf,application/pdf"
            aria-label={c.resume}
            required
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
              touch("resume");
              key.current = "";
            }}
          />
        </label>
        {showError("resume")}
        <div className="career-privacy-note">
          <strong>{c.readPrivacy}</strong>
          <p>{c.privacyNote}</p>
          <button type="button" onClick={() => setPrivacy(true)}>
            {c.privacy} ↗
          </button>
        </div>
        {(["consent", "truth_declaration"] as const).map((id) => (
          <label className="career-checkbox" key={id}>
            <input
              type="checkbox"
              required
              checked={draft[id]}
              onChange={(e) =>
                id === "consent" && e.target.checked
                  ? setPrivacy(true)
                  : change(id, e.target.checked)
              }
            />
            <span>{id === "consent" ? c.consent : c.truth} *</span>
          </label>
        ))}
      </fieldset>
      {error && (
        <p className="career-submit-error" role="alert">
          {error}
        </p>
      )}
      <button
        type="submit"
        className="career-primary career-submit"
        disabled={!valid || busy}
      >
        {busy ? c.sending : c.submit}
        <Icon name="arrow" size={18} />
      </button>
      {!valid && <p className="career-form-hint">{c.check}</p>}
      {privacy && (
        <LegalConsentDialog
          policy="privacy"
          onClose={() => setPrivacy(false)}
          onAccept={() => {
            change("consent", true);
            setPrivacy(false);
          }}
        />
      )}
    </form>
  );
}
