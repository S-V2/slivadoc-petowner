"use client";
import Link from "next/link";
import { getLegalDocument, legalCopy } from "../../shared/legal-localization";
import type { LegalPolicy } from "../../shared/legal";
import { PublicPage } from "./seo/PublicSite";
import { LegalDocumentContent } from "./LegalDocumentContent";
import { LegalDocumentHeader, LegalLanguageSelector } from "./LegalDocumentHeader";
import { usePetOwnerI18n } from "./PetOwnerI18n";

export function LegalPublicPage({policy}:{policy:LegalPolicy}) {
  const {language,setLanguage}=usePetOwnerI18n();const document=getLegalDocument(policy,language);const copy=legalCopy[language];
  return <PublicPage><div className={`legal-public-body legal-tone-${policy}`} lang={language}>
    <div className="legal-toolbar"><Link className="legal-back-button" href="/" aria-label={copy.backHome}><span aria-hidden="true">←</span>{copy.home}</Link><LegalLanguageSelector language={language} onChange={setLanguage}/></div>
    <LegalDocumentHeader policy={policy} language={language} publicPage/>
    <nav className="legal-contents" aria-label={copy.contentsLabel}>
      <h2>{copy.contents} ({document.sections.length} {copy.sections})</h2>
      <div className="legal-contents-scroll" tabIndex={0} role="region" aria-label={copy.sectionsLabel}>
        <ol>{document.sections.map((section,index)=><li key={section.heading}><a href={`#${policy}-section-${index+1}`}>{section.heading}</a></li>)}</ol>
      </div>
    </nav>
    <LegalDocumentContent policy={policy} language={language} headingLevel={2}/>
    <Link className="legal-related" href={policy==="privacy"?"/syarat-ketentuan":"/privasi"}>{policy==="privacy"?copy.otherTerms:copy.otherPrivacy}<span aria-hidden="true">→</span></Link>
  </div></PublicPage>;
}
