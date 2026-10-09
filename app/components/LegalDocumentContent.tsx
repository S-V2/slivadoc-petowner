import { memo } from "react";
import { legalParagraphs, type LegalPolicy } from "../../shared/legal";
import { getLegalDocument, getLegalSources, legalCopy, type LegalLanguage } from "../../shared/legal-localization";

export const LegalDocumentContent = memo(function LegalDocumentContent({ policy, language = "id", headingLevel = 3 }: { policy: LegalPolicy; language?: LegalLanguage; headingLevel?: 2 | 3 }) {
  const document = getLegalDocument(policy, language);
  const copy = legalCopy[language];
  const Heading = headingLevel === 2 ? "h2" : "h3";
  return <div className={`legal-document-content legal-tone-${policy}`} lang={language}>
    <aside className="legal-introduction"><span className="legal-eyebrow">{copy.intro}</span><p>{document.introduction}</p><small>{copy.translationNote}</small></aside>
    {document.sections.map((section, sectionIndex) => (
      <article id={`${policy}-section-${sectionIndex + 1}`} key={section.heading} className="legal-section">
        <div className="legal-section-header"><span className="legal-section-index" aria-hidden="true">{String(sectionIndex + 1).padStart(2,"0")}</span><div><span className="legal-eyebrow" aria-hidden="true">{copy.section} {sectionIndex + 1}</span><Heading><span className="sr-only">{sectionIndex + 1}. </span>{section.heading}</Heading></div></div>
        {legalParagraphs(section).map((paragraph, paragraphIndex) => (
          <p key={paragraphIndex} className="legal-clause"><strong className="legal-clause-number">{sectionIndex + 1}.{paragraphIndex + 1}.</strong><span>{paragraph}</span></p>
        ))}
      </article>
    ))}
    <article className="legal-section legal-references">
      <span className="legal-eyebrow">SLIVADOC · {language === "en" ? "REFERENCES" : "REFERENSI"}</span>
      <Heading>{copy.sources}</Heading><p>{copy.sourcesNote}</p>
      <ul>{getLegalSources(language).map(source => <li key={source.url}><a href={source.url} target="_blank" rel="noopener noreferrer"><span>{source.title}</span><span aria-hidden="true">↗</span></a></li>)}</ul>
    </article>
    <div className="legal-end"><span className="legal-end-icon" aria-hidden="true">✓</span><strong>{copy.end}</strong><p>{copy.endNote}</p></div>
  </div>;
});
