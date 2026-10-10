import { expect, test } from "./fixtures";

test("registration requires both full documents, submits consent, and completes OTP", async ({page}, testInfo) => {
 let submitted:Record<string,unknown>|undefined;
 await page.route("**/api/v1/**",async route=>{
  const path=new URL(route.request().url()).pathname;
  const json=(body:unknown,status=200)=>route.fulfill({status,json:body});
  if(path==="/api/v1/auth/petowner/register") {submitted=route.request().postDataJSON();return json({user_id:"53000000-0000-4000-8000-000000000001",message:"OTP dikirim",development_otp:"123456"},201);}
  if(path==="/api/v1/public/legal/current") return json({version:"2026-10-09",terms_url:"https://slivadoc.com/terms",privacy_url:"https://slivadoc.com/privacy",effective_at:"2026-10-09"});
  if(path==="/api/v1/auth/register/verify-otp") return json({message:"Email terverifikasi"});
  if(path==="/api/v1/auth/me") return json({message:"Unauthorized"},401);
  return json({data:[],count:0});
 });
 await page.setViewportSize({width:390,height:844});
 await page.goto("/?view=profile",{waitUntil:"domcontentloaded"});
 await page.getByRole("button",{name:"Masuk / Daftar",exact:true}).click();
 await page.getByRole("button",{name:"Belum punya akun? Daftar gratis"}).click();
 const form=page.locator(".login-form");
 await form.locator('[name="full_name"]').fill("Registrasi Pet Parent");
 await form.locator('[name="email"]').fill("parent@example.test");
 await form.locator('[name="phone"]').fill("081234567890");
 await form.locator('[name="password"]').fill("PetParent#123");
 const register=page.getByRole("button",{name:"Daftar & kirim OTP"});await expect(register).toBeDisabled();
 for(const title of ["Syarat dan Ketentuan","Kebijakan Privasi"]){
  await form.getByRole("button",{name:title,exact:true}).click();
  const dialog=page.getByRole("dialog");const agree=dialog.getByRole("button",{name:"Saya sudah membaca dan menyetujui"});
  await expect(agree).toBeDisabled();
  await dialog.getByRole("button",{name:"Kembali ke registrasi"}).click();
  await expect(form.locator('input[type="checkbox"]:checked')).toHaveCount(title === "Syarat dan Ketentuan" ? 0 : 1);
  await expect(form.locator('[name="full_name"]')).toHaveValue("Registrasi Pet Parent");
  await form.getByRole("button",{name:title,exact:true}).click();
  await expect(dialog.getByText("Versi 2026-10-09", {exact:false})).toBeVisible();
  if(title === "Syarat dan Ketentuan") await page.screenshot({path:testInfo.outputPath("terms-mobile-start.png"),animations:"disabled"});
  await dialog.locator(".legal-consent-scroll").evaluate(node=>{node.scrollTop=node.scrollHeight/2;node.dispatchEvent(new Event("scroll",{bubbles:true}));});
  await expect(agree).toBeDisabled();
  await dialog.locator(".legal-consent-scroll").evaluate(node=>{node.scrollTop=node.scrollHeight;node.dispatchEvent(new Event("scroll",{bubbles:true}));});
  await expect(agree).toBeEnabled();
  if(title === "Syarat dan Ketentuan") await page.screenshot({path:testInfo.outputPath("terms-mobile-end.png"),animations:"disabled"});
  await dialog.getByRole("button",{name:"English",exact:true}).click();
  const englishAgree=dialog.getByRole("button",{name:"I have read and agree"});
  await expect(englishAgree).toBeDisabled();
  await expect(dialog.getByRole("heading",{name:title === "Syarat dan Ketentuan" ? "Slivadoc Terms and Conditions" : "Slivadoc Privacy Policy",exact:true})).toBeVisible();
  await expect(dialog.locator(".legal-clause-number")).toHaveCount(title === "Syarat dan Ketentuan" ? 129 : 119);
  await expect(dialog.locator(".legal-consent-scroll")).toHaveJSProperty("scrollTop",0);
  await page.screenshot({path:testInfo.outputPath(title === "Syarat dan Ketentuan" ? "terms-english.png" : "privacy-english.png"),animations:"disabled"});
  await dialog.locator(".legal-consent-scroll").evaluate(node=>{node.scrollTop=node.scrollHeight;node.dispatchEvent(new Event("scroll",{bubbles:true}));});
  await expect(englishAgree).toBeEnabled();
  await dialog.getByRole("button",{name:"Bahasa Indonesia",exact:true}).click();
  await expect(agree).toBeDisabled();
  await dialog.locator(".legal-consent-scroll").evaluate(node=>{node.scrollTop=node.scrollHeight;node.dispatchEvent(new Event("scroll",{bubbles:true}));});
  await agree.click();
 }
 await expect(form.locator('input[type="checkbox"]:checked')).toHaveCount(2);
 await expect(register).toBeEnabled();await register.click();
 await expect.poll(()=>submitted).toMatchObject({terms_accepted:true,privacy_accepted:true,legal_version:"2026-10-09",phone:"081234567890"});
 await expect(page.getByRole("heading",{name:"Verifikasi email kamu"})).toBeVisible();
 await page.getByRole("button",{name:"Verifikasi & aktifkan akun"}).click();
 await expect(page.getByText("Email berhasil diverifikasi. Silakan login.")).toBeVisible();
});

for(const legalCase of [
 {path:"/terms",title:"Syarat dan Ketentuan Slivadoc",sections:42,englishTitle:"Slivadoc Terms and Conditions",englishLast:"Language, severability, and final statement",clauses:129,last:"Bahasa, keterpisahan klausul, dan pernyataan akhir"},
 {path:"/privacy",title:"Kebijakan Privasi Slivadoc",sections:39,englishTitle:"Slivadoc Privacy Policy",englishLast:"Practical data protection guidance and closing provisions",clauses:119,last:"Panduan praktis menjaga data dan penutup"},
]) test(`${legalCase.path} renders complete numbered clauses and official references`,async({page},testInfo)=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto(legalCase.path,{waitUntil:"domcontentloaded"});
 await expect(page.getByRole("heading",{name:legalCase.title,level:1})).toBeVisible();
 await expect(page.locator(".legal-clause-number").first()).toHaveText("1.1.");
 await expect(page.getByRole("heading",{name:`Daftar isi (${legalCase.sections} bagian)`,exact:true})).toBeVisible();
 await page.getByRole("navigation",{name:"Daftar isi dokumen"}).getByRole("link",{name:legalCase.last,exact:true}).click();
 await expect(page.getByRole("heading",{name:`${legalCase.sections}. ${legalCase.last}`,exact:true})).toBeInViewport();
 await expect(page.locator(".legal-references a")).toHaveCount(13);
 await expect(page.locator(".legal-references")).toContainText("UU 1/2024");
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth > window.innerWidth);
 expect(overflow).toBe(false);
 await page.evaluate(()=>window.scrollTo({top:0,behavior:"instant"}));
 await page.getByRole("button",{name:"English",exact:true}).click();
 await expect(page.getByRole("heading",{name:legalCase.englishTitle,level:1})).toBeVisible();
 await expect(page.locator(".legal-clause-number")).toHaveCount(legalCase.clauses);
 await expect(page.locator(".legal-references")).toContainText("Law 1/2024");
 await page.screenshot({path:testInfo.outputPath("public-english-mobile.png"),animations:"disabled"});
 await page.getByRole("navigation",{name:"Document contents"}).getByRole("link",{name:legalCase.englishLast,exact:true}).click();
 await expect(page.getByRole("heading",{name:`${legalCase.sections}. ${legalCase.englishLast}`,exact:true})).toBeInViewport();
 await page.reload();
 await expect(page.getByRole("heading",{name:legalCase.englishTitle,level:1})).toBeVisible();
 await page.setViewportSize({width:320,height:640});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
 await page.setViewportSize({width:1280,height:900});
 await page.evaluate(()=>window.scrollTo({top:0,behavior:"instant"}));
 await expect(page.getByRole("heading",{name:legalCase.englishTitle,level:1})).toBeInViewport();
 await page.screenshot({path:testInfo.outputPath("public-english-desktop.png"),animations:"disabled"});
 await page.locator(".legal-section").first().evaluate(node=>node.scrollIntoView({block:"start",behavior:"instant"}));
 await page.screenshot({path:testInfo.outputPath("public-english-clauses.png"),animations:"disabled"});
});
