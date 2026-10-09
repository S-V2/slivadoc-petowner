"use client";
import { useState } from "react";
import type { LegalPolicy } from "../../shared/legal";
import { legalCopy, legalReadingProgress, type LegalLanguage } from "../../shared/legal-localization";
import { LegalDocumentContent } from "./LegalDocumentContent";
import { LegalDocumentHeader, LegalLanguageSelector } from "./LegalDocumentHeader";
import { usePetOwnerI18n } from "./PetOwnerI18n";
import { useDialogFocus } from "./useDialogFocus";

type Props={policy:LegalPolicy;onClose:()=>void;onAccept:()=>void};
export function LegalConsentDialog(props:Props) {
  const {language,setLanguage}=usePetOwnerI18n();
  return <LegalConsentReader key={`${props.policy}-${language}`} {...props} language={language} onLanguageChange={setLanguage}/>;
}
function LegalConsentReader({policy,onClose,onAccept,language,onLanguageChange}:Props & {language:LegalLanguage;onLanguageChange:(language:LegalLanguage)=>void}) {
  const [read,setRead]=useState(false);const [progress,setProgress]=useState(0);
  const dialog=useDialogFocus<HTMLElement>(true,onClose);const copy=legalCopy[language];
  const updateProgress=(node:HTMLDivElement)=>{
    const next=legalReadingProgress(node.scrollTop,node.clientHeight,node.scrollHeight);
    setProgress(next);if(next===100)setRead(true);
  };
  return <div className="modal-overlay legal-overlay" onMouseDown={onClose}>
    <section ref={dialog} role="dialog" aria-modal="true" aria-labelledby="legal-document-title" tabIndex={-1} lang={language} className={`modal legal-consent-dialog legal-tone-${policy}`} onMouseDown={event=>event.stopPropagation()}>
      <div className="legal-toolbar"><button type="button" className="legal-back-button" aria-label={copy.backRegistration} onClick={onClose}><span aria-hidden="true">←</span>{copy.back}</button><LegalLanguageSelector language={language} onChange={onLanguageChange}/></div>
      <div className="legal-consent-scroll" tabIndex={0} aria-label={copy.content} onScroll={event=>updateProgress(event.currentTarget)} ref={node=>{if(node && node.clientHeight>0 && node.scrollHeight<=node.clientHeight+8)updateProgress(node);}}>
        <LegalDocumentHeader policy={policy} language={language}/>
        <LegalDocumentContent policy={policy} language={language}/>
      </div>
      <div className="legal-consent-footer">
        <div className="legal-progress-caption"><span>{copy.readProgress}</span><strong>{progress}%</strong></div>
        <div className="legal-progress" role="progressbar" aria-label={copy.readProgress} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}><span style={{width:`${progress}%`}}/></div>
        <p>{read?copy.ready:copy.scrollHint}</p>
        <button type="button" className="legal-agree-button" disabled={!read} onClick={()=>{if(read)onAccept();}}><span aria-hidden="true">{read?"✓":"↓"}</span>{copy.agree}</button>
      </div>
    </section>
  </div>;
}
