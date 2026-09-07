import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("Official Brand portal uses shared session and OTP activation, never public role registration",()=>{
 const portal=readFileSync("app/brand/portal.tsx","utf8");
 const page=readFileSync("app/brand/page.tsx","utf8");
 const app=readFileSync("app/components/PetOwnerApp.tsx","utf8");
 for(const path of ["/api/v1/auth/me", "/api/v1/auth/login", "/api/v1/auth/activation/verify-otp", "/api/v1/auth/activation/set-password", "/api/v1/auth/activation/resend-otp"]){assert.ok(portal.includes(path),path);}
 assert.ok(portal.includes('user?.role === "official_brand"'));
 assert.ok(portal.includes('<CommerceWorkspace request={apiRequest} />'));
 assert.ok(page.includes("index: false"));
 assert.ok(app.includes('window.location.assign("/brand")'));
 assert.ok(!portal.includes("/auth/register"));
});
