import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createTranslationService, translationRequest } from "../src/translation.js";

test("translation cache persists across restarts and invalidates when source changes",async t=>{
  const cacheDir=await mkdtemp(join(tmpdir(),"sliva-translation-test-"));
  t.after(()=>rm(cacheDir,{recursive:true,force:true}));
  let calls=0;
  const fetchImpl=async(url,init)=>{calls++;assert.equal(url,"http://translation:5000/translate");const input=JSON.parse(init.body);assert.equal(input.source,"id");assert.equal(input.target,"en");assert.equal(input.format,"text");return new Response(JSON.stringify({translatedText:input.q.map(source=>source==="Makanan kucing"?"Cat food":"Dog food")}));};
  const service=createTranslationService({baseURL:"http://translation:5000",cacheDir,fetchImpl});
  const input={target:"en",sources:["Makanan kucing","Makanan kucing"]};
  assert.equal((await service(input))["Makanan kucing"],"Cat food");
  assert.equal((await service(input))["Makanan kucing"],"Cat food");
  assert.equal(calls,1);
  const restarted=createTranslationService({cacheDir});
  assert.equal((await restarted(input))["Makanan kucing"],"Cat food");
  assert.equal((await service({target:"en",sources:["Makanan anjing"]}))["Makanan anjing"],"Dog food");
  assert.equal(calls,2);
});
test("upstream failures are never persisted as successful translations",async t=>{
  const cacheDir=await mkdtemp(join(tmpdir(),"sliva-translation-failure-"));t.after(()=>rm(cacheDir,{recursive:true,force:true}));
  let calls=0;
  const service=createTranslationService({baseURL:"http://translation:5000",cacheDir,fetchImpl:async()=>{calls++;return calls===1?new Response("Unavailable",{status:503}):new Response(JSON.stringify({translatedText:["Cat grooming"]}));}});
  const input={target:"en",sources:["Grooming kucing"]};
  await assert.rejects(service(input),/translation_unavailable/);
  assert.equal((await service(input))["Grooming kucing"],"Cat grooming");assert.equal(calls,2);
});
test("identical concurrent requests share inference and malformed batches are rejected",async t=>{
  const cacheDir=await mkdtemp(join(tmpdir(),"sliva-translation-concurrent-"));t.after(()=>rm(cacheDir,{recursive:true,force:true}));let calls=0;
  const service=createTranslationService({baseURL:"http://translation:5000",cacheDir,fetchImpl:async()=>{calls++;return new Response(JSON.stringify({translatedText:["Veterinary service"]}));}});
  const input={target:"en",sources:["Layanan dokter hewan"]};
  const [first,second]=await Promise.all([service(input),service(input)]);assert.deepEqual(first,second);assert.equal(calls,1);
  assert.equal(translationRequest.safeParse({target:"id",sources:["text"]}).success,false);
  assert.equal(translationRequest.safeParse({target:"en",sources:[" "]}).success,false);
  assert.equal(translationRequest.safeParse({target:"en",sources:["x".repeat(12001)]}).success,false);
  assert.equal(translationRequest.safeParse({target:"en",sources:Array(50).fill("x".repeat(1000))}).success,false);
});
