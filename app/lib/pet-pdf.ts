import type { MedicalRecord } from "./platform-api";

type PetPDFInput = { name:string;breed:string;weight:string;microchip:string;allergies?:string;notes?:string;healthScore:number };

function clean(value:unknown){return String(value??"").normalize("NFKD").replace(/[^\x20-\x7E]/g," ").replace(/\s+/g," ").trim()}
function escapePDF(value:string){return clean(value).replace(/([\\()])/g,"\\$1")}
function wrap(value:string,width=82){const words=clean(value).split(" ");const lines:string[]=[];let line="";for(const word of words){if(!word)continue;const next=line?`${line} ${word}`:word;if(next.length>width&&line){lines.push(line);line=word}else line=next}if(line)lines.push(line);return lines.length?lines:["-"]}

export function downloadPetMedicalPDF(pet:PetPDFInput,records:MedicalRecord[]){
  const pages:string[][]=[];let lines:string[]=[];
  const flush=()=>{if(lines.length){pages.push(lines);lines=[]}};
  const push=(value:string)=>{if(lines.length>=43)flush();lines.push(value)};
  push("RINGKASAN KESEHATAN PET");push(`Nama: ${pet.name}`);push(`Ras: ${pet.breed}`);push(`Berat: ${pet.weight}   Health score: ${pet.healthScore}/100`);push(`Microchip: ${pet.microchip}`);push(`Alergi: ${pet.allergies||"Tidak tercatat"}`);push(`Catatan khusus: ${pet.notes||"Tidak ada"}`);push("");push(`RIWAYAT MEDIS (${records.length})`);
  records.forEach((record,index)=>{push("");push(`${index+1}. ${record.title}`);push(`${new Date(record.occurred_at).toLocaleDateString("id-ID")} | ${record.record_type} | ${record.doctor_name||"Dokter belum dicatat"}`);[["Keluhan",record.complaint],["Diagnosis",record.diagnosis],["Perawatan",record.treatment],["Catatan",record.clinical_notes],["Kontrol",record.next_control_at?new Date(record.next_control_at).toLocaleString("id-ID"):""]].forEach(([label,value])=>{if(value)wrap(`${label}: ${value}`).forEach(push)})});flush();
  const objects:string[]=[];const add=(value:string)=>{objects.push(value);return objects.length};
  const font=add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  const bold=add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");
  const pageRefs:number[]=[];const contents:number[]=[];
  pages.forEach((page,pageIndex)=>{let stream="q 0.18 0.62 0.91 rg 0 792 595 50 re f Q\n";stream+=`BT /F2 18 Tf 0.96 0.98 1 rg 42 812 Td (SLIVADOC) Tj ET\n`;stream+=`BT /F1 8 Tf 0.22 0.34 0.46 rg 42 775 Td (Dokumen kesehatan pet - dibuat ${escapePDF(new Date().toLocaleString("id-ID"))}) Tj ET\n`;let y=752;page.forEach((line,index)=>{const heading=index===0||line.startsWith("RIWAYAT MEDIS");stream+=`BT /${heading?"F2":"F1"} ${heading?13:9.5} Tf ${heading?"0.10 0.35 0.56":"0.18 0.24 0.30"} rg 42 ${y} Td (${escapePDF(line)}) Tj ET\n`;y-=heading?22:15});stream+=`BT /F1 8 Tf 0.42 0.50 0.58 rg 42 28 Td (Slivadoc Pet Health  |  Halaman ${pageIndex+1} dari ${pages.length}) Tj ET`;
    contents.push(add(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`));pageRefs.push(0)
  });
  const pagesObject=objects.length+pages.length+1;
  pages.forEach((_,index)=>{pageRefs[index]=add(`<< /Type /Page /Parent ${pagesObject} 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${font} 0 R /F2 ${bold} 0 R >> >> /Contents ${contents[index]} 0 R >>`)});
  add(`<< /Type /Pages /Kids [${pageRefs.map(id=>`${id} 0 R`).join(" ")}] /Count ${pageRefs.length} >>`);
  const catalog=add(`<< /Type /Catalog /Pages ${pagesObject} 0 R >>`);
  let output="%PDF-1.4\n%Slivadoc\n";const offsets=[0];objects.forEach((object,index)=>{offsets[index+1]=output.length;output+=`${index+1} 0 obj\n${object}\nendobj\n`});const xref=output.length;output+=`xref\n0 ${objects.length+1}\n0000000000 65535 f \n`;for(let index=1;index<=objects.length;index++)output+=`${String(offsets[index]).padStart(10,"0")} 00000 n \n`;output+=`trailer\n<< /Size ${objects.length+1} /Root ${catalog} 0 R >>\nstartxref\n${xref}\n%%EOF`;
  const url=URL.createObjectURL(new Blob([output],{type:"application/pdf"}));const anchor=document.createElement("a");anchor.href=url;anchor.download=`slivadoc-kesehatan-${pet.name.toLowerCase().replace(/[^a-z0-9]+/g,"-")}.pdf`;anchor.click();window.setTimeout(()=>URL.revokeObjectURL(url),1000);
}
