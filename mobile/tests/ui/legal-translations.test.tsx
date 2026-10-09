import { expect, test } from "@jest/globals";
import { legalDocuments, legalParagraphs } from "../../../shared/legal";
import { englishLegalDocuments } from "../../../shared/legal-en";
import { getLegalSources } from "../../../shared/legal-localization";

test.each(["terms","privacy"] as const)("%s English translation preserves every numbered clause",policy=>{
 const source=legalDocuments[policy];const translated=englishLegalDocuments[policy];
 expect(translated.sections).toHaveLength(source.sections.length);
 for(let index=0;index<source.sections.length;index++){
  const original=source.sections[index];const english=translated.sections[index];
  if(!original || !english)throw new Error(`Missing ${policy} section ${index+1}`);
  expect(english.heading).not.toBe(original.heading);
  const clauses=legalParagraphs(english);expect(clauses).toHaveLength(legalParagraphs(original).length);
  for(const clause of clauses){expect(clause.trim().length).toBeGreaterThan(100);expect(legalParagraphs(original)).not.toContain(clause);}
 }
 expect(getLegalSources("en").map(source=>source.url)).toEqual(getLegalSources("id").map(source=>source.url));
 expect(getLegalSources("en").every(source=>Boolean(source.title))).toBe(true);
});
