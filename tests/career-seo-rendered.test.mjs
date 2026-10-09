import assert from "node:assert/strict";
import test from "node:test";
import { petCareKeywords, matchPetCareKeywords } from "../shared/pet-care-keywords.ts";

test("2000 unique keyword targets support service synonyms and job intent without city doorway pages", () => {
  assert.equal(petCareKeywords.length,2000);
  assert.equal(new Set(petCareKeywords.map(k=>k.keyword)).size,2000);
  assert.equal(matchPetCareKeywords("petsitter jakarta")[0].href,"/pet-sitter");
  assert.equal(matchPetCareKeywords("pet grooming bandung")[0].href,"/services/grooming-hewan");
  assert.equal(matchPetCareKeywords("lowongan part-time pet sitter Jakarta")[0].href,"/career");
  assert.equal(matchPetCareKeywords("freelance pet taxi Surabaya")[0].href,"/career");
});
test("career metadata stays available behind the required login gate; pet sitter remains indexable", async (t) => {
  const original = globalThis.fetch; t.after(()=>{globalThis.fetch=original;});
  const text={id:"Rawat pet di rumah dengan penuh perhatian.",en:"Care for pets at home with attention."};
  const job={id:"pet-sitter",title:{id:"Pet Sitter",en:"Pet Sitter"},department:"pet_services",summary:text,responsibilities:[text],requirements:[text],fields:[],employment_types:["PART_TIME","CONTRACTOR"],work_mode:"on_site",city:"Jakarta",region:"DKI Jakarta",status:"open",revision:1,published_at:"2026-01-01T00:00:00Z",closes_at:null,updated_at:"2026-01-01T00:00:00Z"};
  let available=true;
  globalThis.fetch=async(input)=>{
    const path=new URL(String(input)).pathname;
    if(path==="/api/v1/public/careers")return Response.json({data:available?[job]:[],consent_version:"2026-10-09"});
    if(path==="/api/v1/public/careers/pet-sitter")return available?Response.json({data:job,consent_version:"2026-10-09"}):new Response(null,{status:404});
    return Response.json({data:[],has_more:false});
  };
  const {default:worker}=await import("../dist/server/index.js");
  const render=async(path)=>{const r=await worker.fetch(new Request(`http://localhost${path}`,{headers:{accept:"text/html"}}),{ASSETS:{fetch:async()=>new Response("Not found",{status:404})}},{waitUntil(){},passThroughOnException(){}});return {status:r.status,text:await r.text()};};
  const catalog=await render("/career");assert.equal(catalog.status,200);assert.match(catalog.text,/class="career-access"/);assert.match(catalog.text,/<h1>Slivadoc Career<\/h1>/);assert.doesNotMatch(catalog.text,/"@type":"JobPosting"/);
  const detail=await render("/career/pet-sitter");assert.equal(detail.status,200);assert.match(detail.text,/class="career-access"/);assert.doesNotMatch(detail.text,/<form[^>]*class="career-form"/);assert.match(detail.text,/rel="canonical"[^>]*\/career\/pet-sitter/);assert.match(detail.text,/<title>Pet Sitter/);
  job.status="talent_pool";assert.doesNotMatch((await render("/career/pet-sitter")).text,/"@type":"JobPosting"/);
  job.status="open";job.city="";assert.doesNotMatch((await render("/career/pet-sitter")).text,/"@type":"JobPosting"/);
  const sitter=await render("/pet-sitter");assert.equal(sitter.status,200);assert.match(sitter.text,/Apa itu pet sitter/);assert.match(sitter.text,/rel="canonical"[^>]*\/pet-sitter/);assert.match(sitter.text,/href="\/career"/);
  const sitemap=await render("/sitemap.xml");assert.match(sitemap.text,/\/career\/pet-sitter/);assert.match(sitemap.text,/\/pet-sitter/);
  available=false;assert.equal((await render("/career/pet-sitter")).status,404);assert.doesNotMatch((await render("/sitemap.xml")).text,/\/career\/pet-sitter/);
  const home=await render("/");assert.match(home.text,/<footer[^>]*class="sliva-site-footer/);assert.match(home.text,/href="\/career"/);
});
