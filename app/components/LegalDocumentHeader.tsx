import { useSyncExternalStore } from "react";
import { LEGAL_VERSION, legalParagraphs, type LegalPolicy } from "../../shared/legal";
import { getLegalDocument, legalCopy, type LegalLanguage } from "../../shared/legal-localization";

const subscribe = () => () => {};
export function LegalLanguageSelector({language,onChange}:{language:LegalLanguage;onChange:(language:LegalLanguage)=>void}) {
  const hydrated = useSyncExternalStore(subscribe, () => true, () => false);
  return <div className="legal-language" role="group" aria-label={legalCopy[language].language}>
    {(["id","en"] as const).map(code=><button key={code} type="button" lang={code} disabled={!hydrated} aria-label={code === "id" ? "Bahasa Indonesia" : "English"} aria-pressed={language===code} onClick={()=>onChange(code)}>{code.toUpperCase()}</button>)}
  </div>;
}

export function LegalDocumentHeader({policy,language,publicPage=false}:{policy:LegalPolicy;language:LegalLanguage;publicPage?:boolean}) {
  const document=getLegalDocument(policy,language);const copy=legalCopy[language];const Heading=publicPage?"h1":"h2";
  return <header className={`legal-hero legal-tone-${policy}`}>
    <div className="legal-hero-symbol" aria-hidden="true">{policy === "privacy" ? <svg viewBox="0 0 24 24" fill="none"><path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z"/><path d="m8 12 3 3 5-6"/></svg> : <svg viewBox="0 0 24 24" fill="none"><path d="M6 3h9l4 4v14H6V3Z"/><path d="M14 3v5h5M9 12h7M9 16h5"/></svg>}</div>
    <span className="legal-eyebrow">{policy === "privacy" ? copy.privacyKicker : copy.termsKicker}</span>
    <Heading id={publicPage ? undefined : "legal-document-title"}>{document.title}</Heading>
    <p className="legal-metadata">{copy.version} {LEGAL_VERSION} <span aria-hidden="true">·</span> {copy.effective} {copy.date}</p>
    <div className="legal-document-stats"><span>{document.sections.length} {copy.sections}</span><span>{document.sections.reduce((sum,section)=>sum+legalParagraphs(section).length,0)} {copy.clauses}</span></div>
  </header>;
}
