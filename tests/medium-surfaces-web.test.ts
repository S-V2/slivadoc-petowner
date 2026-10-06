import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = new URL("..", import.meta.url).pathname;
const read = (path: string) => readFileSync(join(root, path), "utf8");
const app = read("app/components/PetOwnerApp.tsx");
const api = read("app/lib/platform-api.ts");

function sources(directory: string): string[] {
  return readdirSync(join(root, directory), {
    withFileTypes: true,
    recursive: true,
  })
    .filter((entry) => entry.isFile() && /\.(tsx?|js)$/.test(entry.name))
    .map((entry) => readFileSync(join(entry.parentPath, entry.name), "utf8"));
}

test("Aktivitas pages by cursor and only offers more while a cursor remains", () => {
  assert.match(api, /getPetOwnerActivityCenter = \(cursor = ""\)/);
  assert.match(api, /&cursor=\$\{encodeURIComponent\(cursor\)\}/);
  assert.match(api, /next_cursor: string \| null/);
  assert.match(app, /hasMoreActivities && \(/);
  assert.match(app, /Muat lebih banyak/);
  assert.match(app, /mergeActivityPages\(current, page\.data\)/);
});

test("buyer can cancel an order and request a return through the order endpoints", () => {
  assert.match(api, /petowner\/orders\/\$\{orderId\}\/cancel/);
  assert.match(
    api,
    /petowner\/orders\/\$\{orderId\}\/fulfillments\/\$\{fulfillmentId\}\/return-request/,
  );
  assert.match(app, /item\.type === "order" && item\.cancellable/);
  assert.match(app, /Pesanan dibatalkan\. Dana akan dikembalikan setelah diverifikasi tim finance\./);
  assert.match(app, /Permintaan retur terkirim \(\$\{result\.ticket_number\}\)/);
  assert.match(app, /reason\.length < 10 \|\| reason\.length > 1000/);
  assert.match(app, /return_requested/);
});

test("owner invoices read the invoice endpoints with a retry and an empty state", () => {
  assert.match(api, /petowner\/invoices\?limit=/);
  assert.match(api, /petowner\/invoices\/\$\{encodeURIComponent\(invoiceId\)\}/);
  assert.match(
    app,
    /Belum ada invoice tertaut\.\s+Tautkan kode pet owner di klinik agar\s+invoice muncul di sini\./,
  );
  assert.match(app, /<InvoicesPanel/);
});

test("chat badge sums unread threads and a store reply notification opens its thread", () => {
  assert.match(app, /thread\.unread_count/);
  assert.match(app, /chatUnread=\{chatUnread\}/);
  assert.match(app, /chatUnread > 0/);
  assert.match(app, /route === "shop"[\s\S]{0,120}metadata\?\.thread_id/);
  assert.match(app, /openStoreChatThread\(item\.metadata\.thread_id\)/);
});

test("a hidden review shows the moderator message", () => {
  assert.match(
    read("app/components/marketplace/ShopMarketplace.tsx"),
    /cause\.code === "review_hidden"[\s\S]{0,80}Ulasanmu disembunyikan moderator/,
  );
});

test("no control only toasts a success it did not perform", () => {
  const all = sources("app/components").join("\n");
  for (const fake of [
    "Kalender event Slivadoc ditambahkan ke perangkat",
    "Posting disimpan ke koleksi",
    "Repost akan tersedia setelah moderasi",
    "Pilih foto atau dokumen pendukung",
    "Pilihan moderasi posting dibuka",
    "Halaman SlivaCare+ segera dibuka",
    "Menampilkan hasil untuk",
    "slivadoc:notice",
  ])
    assert.equal(all.includes(fake), false, fake);
  const paw = read("app/components/pawdating/PawDatingExperience.tsx");
  assert.match(paw, /togglePetOwnerFavorite\("pawdating", profile\.id\)/);
});

test("removed realtime events and the user room have no client or relay code", () => {
  const all = [
    ...sources("app"),
    ...sources("services/petowner-api/src"),
  ].join("\n");
  assert.doesNotMatch(all, /session:revoked|consultation:presence|consultation:typing/);
  assert.doesNotMatch(all, /["'`]user:/);
});
