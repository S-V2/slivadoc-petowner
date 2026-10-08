import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) =>
  readFileSync(new URL(`../mobile/${path}`, import.meta.url), "utf8");
const app = read("App.tsx");
const api = read("src/api.ts");
const ui = read("src/components/ui.tsx");
const activity = read("src/screens/ActivityScreen.tsx");
const invoices = read("src/screens/InvoicesScreen.tsx");
const profile = read("src/screens/ProfileScreen.tsx");

test("M4: chat unread badge sums thread unread counts and opens the notification thread", () => {
  assert.match(app, /unread_count, 0/);
  assert.match(app, /chatUnread=\{signedIn \? chatUnread : 0\}/);
  assert.match(ui, /if \(chatUnread <= 0\) return null/);
  assert.match(app, /item\.metadata\?\.thread_id/);
  assert.match(app, /find\(\(item\) => item\.id === threadId\)[\s\S]*setInboxChatThread\(thread\)[\s\S]*navigateTo\("messages"\)/);
});

test("M5: order cancel and return request hit the documented endpoints", () => {
  assert.match(api, /petowner\/orders\/\$\{encodeURIComponent\(orderId\)\}\/cancel/);
  assert.match(api, /fulfillments\/\$\{encodeURIComponent\(fulfillmentId\)\}\/return-request/);
  assert.match(activity, /item\.cancellable \?/);
  assert.match(activity, /Pesanan dibatalkan\. Dana akan dikembalikan setelah diverifikasi tim finance\./);
  assert.match(activity, /text\.length < 10 \|\| text\.length > 1000/);
  assert.match(activity, /Permintaan retur terkirim \(\$\{result\.ticket_number\}\)/);
  assert.match(activity, /fulfillment\.status !== "delivered"/);
});

test("M14: invoices list and detail use the owner invoice endpoints", () => {
  assert.match(api, /\/api\/v1\/petowner\/invoices\?limit=/);
  assert.match(api, /\/api\/v1\/petowner\/invoices\/\$\{encodeURIComponent\(invoiceId\)\}/);
  assert.match(invoices, /Belum ada invoice tertaut\. Tautkan kode pet owner di klinik agar invoice muncul di sini\./);
  assert.match(profile, /setPage\("invoices"\)/);
});

test("M19: activities page by cursor and render Muat lebih banyak only with a next cursor", () => {
  assert.match(api, /&cursor=\$\{encodeURIComponent\(cursor\)\}/);
  assert.match(app, /hasMore=\{Boolean\(activityCenter\?\.next_cursor\)\}/);
  assert.match(activity, /\{hasMore \? \([\s\S]*Muat lebih banyak/);
  assert.match(app, /uniqueById\(\[\.\.\.current\.data, \.\.\.page\.data\]\)/);
});

test("review_hidden 409 surfaces the moderator message", () => {
  assert.match(api, /code: string;/);
  assert.match(api, /cause\.code === "review_hidden"/);
  assert.match(api, /Ulasanmu disembunyikan moderator dan tidak bisa diubah\. Hubungi dukungan jika ada keberatan\./);
});

test("M18: no fake-success toasts remain on controls", () => {
  const all = [app, activity, profile, read("src/screens/DiscoverScreen.tsx"), read("src/screens/HealthScreen.tsx"), read("src/screens/WorldScreen.tsx"), read("src/components/SlivaCareModal.tsx")].join("\n");
  for (const fake of [
    "Urutan layanan diubah",
    "Pengingat PetHub diaktifkan",
    "Filter dibuka",
    "Lokasi perangkat digunakan untuk mengurutkan PetSpot",
    "Notifikasi keamanan diaktifkan",
    "Pilih foto pendukung dari perangkat",
    "tersimpan aman di akun ${petView.name}",
  ])
    assert.ok(!all.includes(fake), `${fake} must not be a bare toast`);
});

test("L8: removed realtime events have no mobile listeners", () => {
  const all = [app, api, read("src/components/SlivaCareModal.tsx")].join("\n");
  assert.doesNotMatch(all, /session:revoked|consultation:presence|consultation:typing/);
});
