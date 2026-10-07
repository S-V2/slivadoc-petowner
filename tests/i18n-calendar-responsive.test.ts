import test from "node:test";
import assert from "node:assert/strict";
import { translateText } from "../shared/i18n.ts";
import { httpTranslator } from "../shared/translation-client.ts";
import { cachedTranslation, configureTranslator, subscribeTranslations } from "../shared/translation-store.ts";
import { calendarValue, dateKey, monthDays, parseCalendarDate, validCalendarValue } from "../shared/calendar.ts";
import { responsiveLayout } from "../shared/responsive.ts";

test("web and native share curated copy, plural counts and calendar language", () => {
  assert.equal(translateText("Belanja", "en"), "Shop");
  assert.equal(translateText("Kalender Slivadoc", "en"), "Slivadoc Calendar");
  assert.equal(translateText("  12 produk ditemukan  ", "en"), "  12 products found  ");
  assert.equal(translateText("Makanan kucing", "en"), "Cat food");
  assert.equal(translateText("Grooming Kucing", "en"), "Cat Grooming");
  assert.equal(translateText("Hapus alamat Kantor?", "en"), "Delete address Kantor?");
  assert.equal(translateText("Rasa ayam untuk kucing", "id"), "Rasa ayam untuk kucing");
});

test("new catalogue copy translates asynchronously and updates all subscribers", async () => {
  const source="Snack Kulit Sapi QA";
  let calls=0;
  configureTranslator(async sources=>{calls++;assert.deepEqual(sources,[source]);return {[source]:"Beef Skin Snack QA"};});
  const ready=new Promise<void>(resolve=>{const unsubscribe=subscribeTranslations(()=>{if(cachedTranslation(source)){unsubscribe();resolve();}});});
  assert.equal(translateText(source,"en",true),source);
  await ready;
  assert.equal(translateText(source,"en",true),"Beef Skin Snack QA");
  assert.equal(translateText(source,"id",true),source);
  assert.equal(calls,1);
});

test("translation client sends language and exact source copy without identity fields",async()=>{
  const fetchImpl: typeof fetch=async(url,init)=>{assert.equal(String(url),"https://petapi.example.test/api/translations");assert.deepEqual(JSON.parse(String(init?.body)),{sources:["Makanan kucing"],target:"en"});assert.ok(init?.signal);return new Response(JSON.stringify({translations:{"Makanan kucing":"Cat food"}}),{status:200});};
  assert.deepEqual(await httpTranslator("https://petapi.example.test/",fetchImpl)(["Makanan kucing"]),{"Makanan kucing":"Cat food"});
});

test("custom calendars preserve local days, leap years, times and form payloads",()=>{
  assert.equal(dateKey(parseCalendarDate("2028-02-29")!),"2028-02-29");
  assert.equal(parseCalendarDate("2027-02-29"),undefined);
  assert.equal(parseCalendarDate("2026-04-31"),undefined);
  const days=monthDays(2026,9);
  assert.equal(days.length,42);assert.equal(days[0]?.getDay(),1);
  assert.equal(calendarValue("2026-10-07","09:30","datetime-local"),"2026-10-07T09:30");
  assert.equal(calendarValue("2026-10-07","09:30","datetime-local"," "),"2026-10-07 09:30");
  assert.equal(calendarValue("2026-10-07","09:30","time"),"09:30");
  assert.equal(validCalendarValue("2026-10-07T09:30","datetime-local","2026-10-07T10:00"),false);
  assert.equal(validCalendarValue("2026-10-07T10:00","datetime-local","2026-10-07T10:00"),true);
  assert.equal(validCalendarValue("25:00","time"),false);
  assert.equal(validCalendarValue("2026-10-07","date",undefined,"2026-10-06"),false);
});

test("phone, tablet, rotation and split-screen widths yield bounded layouts",()=>{
  for(const [width,height] of [[320,700],[375,812],[768,1024],[1024,768],[1366,1024],[600,900],[2560,1440]]){
    const layout=responsiveLayout(width!,height!);
    assert.ok(layout.contentWidth<=width!);assert.ok(layout.sheetWidth<=width!);
    assert.ok(layout.contentWidth<=1120);assert.ok(layout.sheetWidth<=720);
    assert.equal(layout.landscape,width!>height!);
  }
  assert.equal(responsiveLayout(375,812).columns,2);
  assert.equal(responsiveLayout(768,1024).columns,3);
  assert.equal(responsiveLayout(1024,768).columns,4);
  assert.equal(responsiveLayout(600,900).tablet,false);
});
