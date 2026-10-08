import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const webChat = await readFile(
  new URL("../app/components/marketplace/ShopMarketplace.tsx", import.meta.url),
  "utf8",
);
const webStyles = await readFile(
  new URL("../app/marketplace.css", import.meta.url),
  "utf8",
);
const globalStyles = await readFile(
  new URL("../app/globals.css", import.meta.url),
  "utf8",
);
const nativeChat = await readFile(
  new URL("../mobile/src/screens/MarketplaceScreen.tsx", import.meta.url),
  "utf8",
);
const nativeApp = await readFile(
  new URL("../mobile/App.tsx", import.meta.url),
  "utf8",
);

test("store chat keeps a bounded independently scrollable message history", () => {
  assert.match(webChat, /ref=\{messageList\}[\s\S]*?className="market-chat-messages"/);
  assert.match(webChat, /list\.scrollHeight - list\.scrollTop - list\.clientHeight < 72/);
  assert.match(webStyles, /\.market-chat-messages \{[^}]*flex:\s*1 1 auto[^}]*overflow-y:\s*auto/);
  assert.match(nativeChat, /ref=\{messageList\}[\s\S]*?style=\{styles\.chatMessageScroller\}/);
  assert.match(nativeChat, /chatMessageScroller:\s*\{[^}]*minHeight:\s*0[^}]*flex:\s*1/);
  assert.match(nativeChat, /<SheetFrame[^>]*fill/);
});

test("chat composer swaps emoji for icon-only send and exposes four labeled shortcuts", () => {
  assert.match(webChat, /hasDraft \? \([\s\S]*?<Icon name="send"/);
  assert.match(webChat, /aria-label="Buka pilihan emoji"/);
  for (const label of ["Produk", "Layanan", "Pet Hotel", "Pesanan"])
    assert.match(webChat, new RegExp(`label: "${label}"`));
  assert.match(webStyles, /grid-template-columns:\s*42px minmax\(0, 1fr\) 42px/);
  assert.match(webStyles, /\.market-chat-panel textarea \{[^}]*height:\s*42px[^}]*max-height:\s*42px/);

  assert.match(nativeChat, /hasDraft \? \([\s\S]*?name="send"/);
  assert.match(nativeChat, /accessibilityLabel=\{hasDraft \? "Kirim pesan" : "Buka pilihan emoji"\}/);
  assert.match(nativeChat, /MARKETPLACE_CHAT_SHORTCUTS/);
  assert.match(nativeChat, /chatInput:\s*\{[^}]*height:\s*44/);
  assert.match(nativeChat, /chatComposerButton:\s*\{[^}]*width:\s*44[^}]*height:\s*44/);
});

test("chat shortcuts preserve filtered navigation on web and native", () => {
  assert.match(webChat, /shortcut === "pet_hotel"[\s\S]*?service_type", "Pet Hotel"/);
  assert.match(webChat, /activity_type", "order"/);
  assert.match(webChat, /openStore\(businessId, shortcut === "services" \? "services" : "products"\)/);
  assert.match(nativeChat, /shortcut === "products" \|\| shortcut === "services"/);
  assert.match(nativeChat, /onExploreServices\("Pet Hotel"\)/);
  assert.match(nativeChat, /onOpenOrders\(\)/);
  assert.match(nativeApp, /type:\s*"order"/);
});

test("modal backdrops lock document scrolling while their own content remains scrollable", () => {
  assert.match(globalStyles, /html:has\(\s*:is\([\s\S]*?\.market-chat-layer[\s\S]*?overflow:\s*hidden\s*!important/);
  assert.match(globalStyles, /body:has\(\s*:is\([\s\S]*?\.modal-overlay/);
  assert.match(globalStyles, /\.market-image-viewer/);
  assert.match(globalStyles, /\.paw-modal-backdrop/);
});
