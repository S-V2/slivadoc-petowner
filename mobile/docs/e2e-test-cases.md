# Pet owner mobile end-to-end cases

## Approved scope

These cases describe the pet owner Android app's four core flows ahead of automation. The owner chose Maestro, running on an Android emulator in GitHub Actions, and wants this coverage before the app's first release. No case is automated yet; [How these will run](#how-these-will-run) describes the planned job. A case is automated by the Maestro flow whose file name starts with its case ID (`MOB-04-…yaml`), the same convention `scripts/journeys.mjs` applies to slivadoc-frontend's cases.

Every section here is **(critical)**: three of the four flows move money, and the first release cannot ship if an owner cannot sign in. Exercise the real app build against the isolated full-stack environment described below: real API, PostgreSQL, worker, strict Yokke sandbox, Lion Parcel stand-in and captured email. A mocked API does not establish end-to-end coverage. Never target production or staging, move real money, or send real notifications.

Do not redefine an expected result to match a defect. Where the app does not yet behave as a case expects, the case says so in a **Known gap** line, and the run reports it as a failure.

File references are relative to `mobile/` unless prefixed. Backend references are to slivadoc-backend `main` at `2f70e21`; slivadoc-frontend references are to `main` at `36fecae`.

### Why these four flows

The app's tabs are Beranda, Belanja, Komunitas and Aktivitas, plus Layanan, Sliva World, Kesehatan and Akun under "Lainnya" (`App.tsx:89-136`). Account features need a session (`App.tsx:443-448`). Every transaction needs a pet profile: the app (`src/api.ts:64-82`) and the backend (`petRequired`, `internal/modules/operations/handler.go:355-356,372`, and `:170` for payment intents) both refuse bookings, orders, consultations and payment intents from an owner without one. Each paid flow ends in the shared QRIS sheet (`src/components/QrisPayment.tsx:134-251`).

| Flow | Cases | Why it is core |
| --- | --- | --- |
| Sign-in and registration with email OTP | MOB-01 to MOB-03 | Every other flow requires a session. Registration is the only way a new owner gets an account in the app. |
| Clinic service booking with QRIS | MOB-04, MOB-05 | Beranda's first quick action, "Booking" (`src/screens/HomeScreen.tsx:318`), and the whole Layanan tab (`src/screens/DiscoverScreen.tsx`) lead to this flow. A partner clinic's revenue flows through it (`App.tsx:938-991`). |
| Veterinary consultation with QRIS | MOB-06, MOB-07 | Beranda's second quick action, "Tanya Dokter" (`src/screens/HomeScreen.tsx:319`), and Aktivitas' "Konsultasi" both open it (`App.tsx:493-496,708-710`). It is the paid flow the web catalog marks critical (slivadoc-frontend `docs/e2e-test-cases.md` CON-01 to CON-09). |
| Shop checkout with Lion Parcel shipping and QRIS | MOB-08, MOB-09 | The Belanja tab is a bottom tab and the app's largest screen (`src/screens/MarketplaceScreen.tsx`). The flow moves money and stock: payment commits the stock reservation (slivadoc-backend `internal/modules/operations/payments.go:458-469`). |

**Adding a pet is part of registration readiness.** `src/components/AddPetSheet.tsx` now opens from Akun and the pet-required prompts. It loads the live species catalogue, uses Slivadoc's searchable picker and calendar, validates identity/weight/birthday, calls `createMobilePet` (`POST /api/v1/petowner/pets`), and refreshes bootstrap before selecting the new pet. If creation succeeds but bootstrap refresh fails, its retry only refreshes the profile and does not create another pet. MOB-03 exercises this prerequisite before a new owner can transact.

## Current component automation

`npm run test:ui` uses the Expo Jest preset and React Native Testing Library. It covers native form validation, species loading/error/retry, English labels and searchable choices, leap-day selection and date bounds, QR expiry, and the first-pet authenticated HTTP request plus bootstrap cache refresh. Pet Owner CI runs it after the existing mobile typecheck/network tests. These tests mock native services and HTTP responses; they do not establish the Maestro/database outcomes below. Browser automation separately checks 66 web cases, including responsive controls and loading/error/empty recovery.

## Shared test data

Use slivadoc-frontend's isolated stack, `e2e-system/stack.compose.yaml`, started with `node scripts/e2e-system.mjs up`. It runs the real migrations, the full demo seed, Mailpit and the strict Yokke sandbox. It also sets `EXPOSE_DEV_OTP: "false"`, so the registration OTP is read from email, never from the API response. Every seeded account's password is that compose file's `SAMPLE_DATA_PASSWORD`. Pass it to Maestro as an environment variable. This repository is public, so do not commit it here.

| Account (slivadoc-backend `seeds/sample_data.sql`) | Name | Pets | Used by |
| --- | --- | --- | --- |
| `petowner.nala.demo@slivadoc.local` (`:453`) | Raka Nala Parent | 2: `31000000-…-007` (Oreo) and `…-008` (Nala) (`:78-79,462`) | MOB-01, MOB-02 |
| `petowner.demo@slivadoc.local` (`:451`) | Andi Pet Parent | 2: `31000000-…-001` and `…-002` (`:72-73,460`) | MOB-04, MOB-05, MOB-08, MOB-09 |
| `petowner.bella.demo@slivadoc.local` (`:452`) | Citra Bella Parent | 2: `31000000-…-003` (Coco) and `…-009` (Bella) (`:74,457,461`) | MOB-06, MOB-07 |
| A new address per run, for example `mob-<run-id>@slivadoc.local`, with a unique phone `08…` | — | none | MOB-03 |

The cases use separate owners so that one flow's failure leaves another flow's data intact. The app always acts for the owner's first pet as returned by `GET /api/v1/petowner/bootstrap` (`App.tsx:262`). Assert that it is one of that owner's pets, not a particular name.

| Fixture | Value | Source |
| --- | --- | --- |
| Clinic branch | Paws & Care Kemang, `22000000-0000-4000-8000-000000000001` | `seeds/sample_data.sql:39` |
| Paid service | Grooming Small, IDR 120,000, `34000000-0000-4000-8000-000000000003` | `seeds/sample_data.sql:112` |
| Veterinarian | drh. Maya Anindita, `97000000-0000-4000-8000-000000000001` | `seeds/sample_data.sql:379` |
| Paid chat plan | Chat Dokter, IDR 45,000, `97000000-0000-4000-8000-000000000011` | `seeds/sample_data.sql:386` |
| Shop product | Dental Chew Medium, `33000000-0000-4000-8000-000000000006`, stocked at Kemang | `seeds/sample_data.sql:93`; slivadoc-frontend `e2e-system/shop-checkout.spec.ts:23-26` |
| Shipping destination | Tebet Barat, Tebet, Kota Administrasi Jakarta Selatan, Daerah Khusus Ibukota Jakarta, 12810 | slivadoc-frontend `e2e-system/shop-checkout.spec.ts:95-123` |

Start each case with `clearState`, which also clears the session tokens in SecureStore (`src/api.ts:84-122`). The app's language defaults to Indonesian regardless of the device locale (`src/i18n.tsx:926`), so the labels below are stable on a fresh install.

## How these will run

No workflow file exists yet. The planned job:

- **Where it runs.** The owner chose GitHub Actions. The stack builds from private sibling repositories, and its logs, screenshots and recordings must stay private. This repository is public, so follow the existing `e2e-system` pattern. `.github/workflows/e2e-system.yml` here dispatches the full-stack suite into slivadoc-frontend and receives a commit status back. Add a mobile job alongside it there, reporting `e2e / mobile` on this repository's PR head. It runs when a PR changes `mobile/`, plus nightly. Make it report-only until the cases pass, then make it required.
- **Stack.** Run `node scripts/e2e-system.mjs up` exactly as the desktop suite does. The emulator reaches the host at `10.0.2.2`: API `:18080`, pet owner API `:18090`, realtime `:18091`. The Maestro scripts run on the runner, so they call Mailpit (`127.0.0.1:18025`) and the sandbox control API (`127.0.0.1:18095`, header `X-Sandbox-Token`) directly.
- **App build.** `mobile/` has no committed `android/` project. EAS `preview` and `production` builds refuse local or plain-HTTP URLs (`scripts/validate-production-env.mjs:1-48`). Build locally instead: run `npx expo prebuild --platform android`, then `./gradlew assembleRelease`, with `EXPO_PUBLIC_PLATFORM_API_URL=http://10.0.2.2:18080` and `EXPO_PUBLIC_PETOWNER_API_URL=http://10.0.2.2:18090` (care chat reaches the pet owner API socket, so no separate realtime URL). A release build has `__DEV__` false, so it requires those variables (`src/api.ts:25-29`). Android blocks cleartext HTTP by default, so this test build alone must allow it for `10.0.2.2`. Use a release build because it bundles the JavaScript, so no Metro server is needed.
- **Emulator.** Use an Ubuntu runner with KVM, `reactivecircus/android-emulator-runner`, a `google_apis` x86_64 system image at API 34 and a Pixel profile. Cache Gradle and the AVD snapshot. Install the APK with `adb install`.
- **Maestro.** Run `maestro test mobile/.maestro/ --format junit`. Use one flow per case ID, each starting with `launchApp: {clearState: true}`. Handle the location permission prompt in the flow (see the blockers below). Shared sub-flows: `login.yaml`, `otp-from-mailpit.js` (polls Mailpit's `/api/v1/messages` for the run's address) and `pay-sandbox.js`. The payment script reads the order ID that the QRIS sheet shows (`copyTextFrom`) and calls `POST /_sandbox/charges/{order_id}/pay`.
- **Database expectations.** Maestro scripts can only make HTTP calls. After each flow, a Node step runs that case's SQL checks through `docker compose exec postgres psql`, as slivadoc-frontend's `e2e-system/support.ts:119-136` does.
- **Rate limits.** `/auth/login` allows 5 requests a minute per IP (slivadoc-backend `internal/middleware/http.go:242`), and every emulator request comes from one IP. Reset the isolated Valkey counters between flows, as the desktop suite does. Never retry a login in a loop.
- **Evidence.** Upload the JUnit report, `--debug-output` screenshots and the screen recording on failure as private artifacts. Record each case ID, its result and the application identifiers it created: booking code, consultation ID, order number and payment order ID.

## Sign-in and registration (critical)

### MOB-01 — A seeded owner signs in, stays signed in and signs out

**Account:** `petowner.nala.demo@slivadoc.local`.

1. Launch the app on a fresh install. **Expected:** "Menyiapkan Slivadoc" (`App.tsx:530-555`) gives way to Beranda. The tab bar shows Beranda, Belanja, Komunitas, Aktivitas and Lainnya (`App.tsx:770-856`). Services load from `GET /api/v1/public/discovery/services` (`src/api.ts:773-786`; backend `handler.go:273`).
2. Tap "Lainnya", then "Masuk ke akun" (`App.tsx:1201-1204`), then "Masuk sebagai Pet Owner" (`src/screens/ProfileScreen.tsx:80`). **Expected:** The sheet "Senang melihatmu kembali" opens with the tabs "Masuk" and "Daftar" (`App.tsx:1395-1439`).
3. Type the email into the "petparent@email.com" field and the password into "Minimal 8 karakter", then tap "Masuk ke Slivadoc" (`App.tsx:1490-1507,1568-1610`). **Expected:** `POST /api/v1/auth/login` (`src/api.ts:685-701`; backend `internal/modules/auth/auth.go:109,342`) is followed by `GET /api/v1/petowner/bootstrap` (`src/api.ts:760-772`; backend `handler.go:331`). The sheet closes and the toast "Login berhasil" appears (`App.tsx:996-1008`). Akun shows "Raka Nala Parent", the email, "✓ AKUN AKTIF" and Hewan 2 (`src/screens/ProfileScreen.tsx:100-101`).
4. Force-stop the app and relaunch it without clearing state. **Expected:** The same owner is still signed in. The session is restored from SecureStore (`src/api.ts:84-104`; `App.tsx:315-326`), with no login sheet.
5. In Akun, tap "Keluar dari akun", then "Ya, keluar" (`src/screens/ProfileScreen.tsx:125,262`). **Expected:** `POST /api/v1/auth/logout` (`src/api.ts:741-759`; backend `auth.go:117`) runs, the toast "Sesi berhasil diakhiri" appears and Beranda opens (`App.tsx:759-765`). The backend has revoked the session.
6. Relaunch the app. **Expected:** It stays signed out. "Lainnya" offers "Masuk ke akun" again.

### MOB-02 — A wrong password does not sign in

**Account:** `petowner.nala.demo@slivadoc.local`.

1. Open the login sheet as in MOB-01. Submit the right email with a wrong password that is still valid in format, for example `Wrong-pass-123!`, which passes the check at `App.tsx:1369-1371`. **Expected:** Login fails with the backend's message as a toast (`App.tsx:1003-1004`). The sheet stays open, Akun still shows the guest card and no tokens are stored.
2. Correct the password and submit. **Expected:** Sign-in succeeds without restarting the app, as in MOB-01 step 3.

### MOB-03 — A new owner registers with the emailed OTP

**Account:** a new, unique email and phone per run.

1. Open the login sheet and tap "Daftar". Fill "Nama sesuai identitas", "08xxxxxxxxxx", "petparent@email.com" and "Minimal 8 karakter". Tick "Syarat dan Ketentuan" and "Kebijakan Privasi", then tap "Daftar & kirim OTP" (`App.tsx:1465-1576`). **Expected:** `POST /api/v1/auth/petowner/register` succeeds (`src/api.ts:702-725`; backend `auth.go:106,137`). The toast "OTP dikirim ke email. Masukkan kode untuk mengaktifkan akun." appears (`App.tsx:1009-1023`). The sheet becomes "Verifikasi email kamu" with an empty "Kode OTP" field (`App.tsx:1444-1462`). With `EXPOSE_DEV_OTP` off, nothing pre-fills it (`App.tsx:1603-1606`; backend `auth.go:1031-1035`).
2. Enter a wrong 6-digit code and tap "Verifikasi & aktifkan akun". **Expected:** `POST /api/v1/auth/register/verify-otp` (`src/api.ts:726-731`; backend `auth.go:107,275`) fails with an error toast, and the sheet stays in verification (`App.tsx:1024-1036,1588-1595`).
3. Read the code from the single Mailpit message sent to this run's address, enter it and submit. **Expected:** Verification succeeds and the toast shows the backend's message. The sheet returns to "Masuk" with the email kept and the password cleared (`App.tsx:1590-1594`).
4. Enter the password and sign in. **Expected:** Akun shows the new name and Hewan 0. Belanja shows "Mode lihat saja" with "Tambah pet" (`src/components/ui.tsx:159-183`; `src/screens/MarketplaceScreen.tsx:1010`).
5. Tap "Tambah pet". **Expected:** "Tambah profil hewan" opens. Enter a name, choose a species from the live catalogue, and save. `POST /api/v1/petowner/pets` returns 201 and bootstrap reloads; the new pet is selected, listed in Akun, and the browsing-only notice disappears. A failed save stays in the form with feedback. If saving succeeded but reloading failed, "Muat ulang profil" retries the reload without a second create request.

## Clinic service booking with QRIS (critical)

### MOB-04 — Booking a paid service opens a QRIS for its price

**Account:** `petowner.demo@slivadoc.local`. **Fixture:** Grooming Small at Paws & Care Kemang.

1. Sign in, then tap "Booking" on Beranda (`src/screens/HomeScreen.tsx:318`). **Expected:** Without a chosen service, "Booking" opens Layanan (`App.tsx:463-467`), titled "Jelajahi Layanan" (`src/screens/DiscoverScreen.tsx:26`).
2. Type "Grooming Small" into "Cari klinik atau layanan". On the card whose address starts "Paws & Care Kemang", tap "Booking" (`src/screens/DiscoverScreen.tsx:29,40-50`). **Expected:** The sheet "BOOKING LAYANAN" opens, titled "Grooming Small". Step 1, "Layanan", shows the owner's pet and Rp120.000 (`App.tsx:1721-1812`).
3. Tap "Lanjutkan". In "Jadwal", choose tomorrow's date and "10.30", and type a note in "Ceritakan keluhan atau hal penting...". Tap "Lanjutkan" (`App.tsx:1814-1891`). **Expected:** "Konfirmasi" lists Hewan, Layanan "Grooming Small", Jadwal "<date> • 10.30 WIB" and "Total pembayaran" Rp120.000 (`App.tsx:1893-1922`). "Metode pembayaran" offers QRIS only, already selected (`src/components/QrisPayment.tsx:33-112`; `GET /api/v1/payment-methods`, backend `handler.go:169`).
4. Tap "Lanjut bayar". **Expected:** `POST /api/v1/petowner/bookings` (`src/api.ts:1101-1111`; backend `handler.go:355`, `petowner.go:110`) creates one booking with status `requested` and amount 120,000, for this pet, service, branch and time. Then `POST /api/v1/payment-intents` with `reference_type` `petowner_booking` (`App.tsx:945-980`; `src/api.ts:1114-1129`; backend `handler.go:170`, `payments.go:97`). The QRIS sheet shows "PEMBAYARAN · QRIS", "Scan QR untuk membayar", "<order id> · berlaku 15 menit", a QR labelled "Kode QRIS pembayaran", Rp120.000 and "● Menunggu konfirmasi pembayaran…" (`src/components/QrisPayment.tsx:199-244`).
5. Inspect the database. **Expected:** One new `pet_owner_bookings` row exists. It has one pending payment for 120,000, whose `provider_order_id` equals the order ID on screen. The sandbox holds exactly one charge for it.

### MOB-05 — Paying the booking confirms it in Aktivitas

**Precondition:** MOB-04's pending booking, with its QRIS sheet open.

1. Pay the charge through the sandbox, recording the time. **Expected:** The sheet polls `GET /api/v1/payment-intents/{id}` every 5 seconds (`src/components/QrisPayment.tsx`; backend `handler.go:171`). On the first poll after confirmation the sheet closes, the toast "Pembayaran berhasil, booking sudah dikonfirmasi" appears, and Aktivitas opens on the booking's detail (`openActivity` in `App.tsx`). Record the delay between confirmation and that screen.
2. Close the detail, then tap the "Booking" filter in Aktivitas (`src/screens/ActivityScreen.tsx`). **Expected:** The booking appears as Grooming Small at Paws & Care Kemang, at the chosen time, confirmed (`GET /api/v1/petowner/activities?limit=100`; `getMobileActivityCenter` in `src/api.ts`; backend `petowner_activity_center.go`).
3. Inspect the database. **Expected:** The payment is paid and the booking is `confirmed` (backend `payments.go`).
4. Have the sandbox resend the same confirmation. **Expected:** No new booking or payment is created and the state is unchanged.

## Veterinary consultation with QRIS (critical)

### MOB-06 — Choosing a vet chat plan opens a QRIS for the consultation

**Account:** `petowner.bella.demo@slivadoc.local`. **Fixture:** Chat Dokter with drh. Maya Anindita.

1. Sign in and tap "Tanya Dokter" on Beranda (`src/screens/HomeScreen.tsx:319`). **Expected:** Sliva World opens in Konsultasi mode (`App.tsx:493-496`; `src/screens/WorldScreen.tsx:631-649`). Opening it triggers the location permission request (`src/screens/WorldScreen.tsx:559-564`). Deny it; the list must still load. The plans come from `GET /api/v1/public/consultation-plans` and `GET /api/v1/public/trainer-consultation-plans` (`src/api.ts:1449-1460`; backend `handler.go:281,283`).
2. Tap "Dokter Hewan" under "Jenis provider" (`src/screens/WorldScreen.tsx:1163-1199`). Then tap the "Chat Dokter" card whose note starts "drh. Maya Anindita" (`src/screens/WorldScreen.tsx:1304-1392`). **Expected:** The detail sheet shows "Metode pembayaran" with QRIS and the button "Mulai konsultasi dokter" (`src/screens/WorldScreen.tsx:2246-2292`).
3. Tap "Mulai konsultasi dokter". **Expected:** `POST /api/v1/consultations` sends the vet, plan, complaint "Konsultasi untuk <pet>" and a time one hour ahead (`src/api.ts:1568-1580`; backend `handler.go:372`, `care_social.go:216`). Then `POST /api/v1/payment-intents` with `reference_type` `consultation` (`src/screens/WorldScreen.tsx:892-921`). The QRIS sheet shows the plan's total as the amount.
4. Inspect the database. **Expected:** One consultation order exists for drh. Maya Anindita's Chat Dokter plan, linked to the owner's pet, with payment pending and one pending charge.
   **Known gap:** the app never sends `pet_id` for a vet consultation (`src/api.ts:1568-1580`), although the trainer variant does (`:1581-1600`) and the backend accepts it (`care_social.go:216`). The order is stored without a pet, so this step fails until the request includes the pet.

### MOB-07 — Paying the consultation marks it paid and lists it

**Precondition:** MOB-06's pending consultation, with its QRIS sheet open.

1. Pay the charge through the sandbox. **Expected:** On the next poll the sheet shows "Pembayaran berhasil", and the toast "Pembayaran berhasil dan transaksi sudah tercatat" appears (`src/screens/WorldScreen.tsx:2299-2305`). Record the delay.
2. Inspect the database. **Expected:** The order is `paid` and `scheduled` (backend `payments.go:414-418`). The payment is paid once and no second charge exists.
3. Open Aktivitas and tap "Konsultasi". **Expected:** The consultation appears with "Dokter hewan" drh. Maya Anindita (`src/screens/ActivityScreen.tsx:672-690`; backend `petowner_activity_center.go:276`).
4. Have the sandbox resend the same confirmation. **Expected:** No duplicate charge or consultation is created.

The app has no consultation room. The owner cannot chat or call the vet from mobile: `room_key` is only typed (`src/api.ts:444`) and never used. The web catalog's CON-01 to CON-09 cover the room on the web. Add mobile room cases when the app gains one.

## Shop checkout with Lion Parcel shipping and QRIS (critical)

### MOB-08 — The cart quotes shipping and opens a QRIS for the quoted total

**Account:** `petowner.demo@slivadoc.local`. **Fixtures:** Dental Chew Medium and the Tebet Barat destination. Lion Parcel rates come from slivadoc-frontend's stand-in (`e2e-system/stand-ins.mjs`).

1. Sign in and tap the "Belanja" tab. **Expected:** "Belanja kebutuhan pet" lists products from `GET /api/v1/public/discovery/products` (`src/api.ts:934-935`; backend `handler.go:274`).
2. Type "Dental Chew Medium" into the search field, labelled "Cari produk atau toko". Tap the product card to open its detail, then tap "+ Keranjang". **Expected:** The product enters the cart and the cart button reads "Buka keranjang, 1 produk". Product-list cards themselves do not show a cart button.
3. Open the cart. **Expected:** "Keranjang (1)" opens with "CHECKOUT AMAN" (`src/screens/MarketplaceScreen.tsx:1699-1700`). Provinces load from `GET /api/v1/regions/provinces` (`src/api.ts:993`; backend `handler.go:299`).
4. Fill "Nama penerima", "Nomor telepon penerima" and "Nama jalan, nomor rumah, RT/RW, dan patokan" (`src/screens/MarketplaceScreen.tsx:1786-1808`). For each field from "Pilih provinsi" to "Pilih kelurahan atau desa" (`:1815-1837`), search the sheet and tap "Pilih <name>" (`src/components/RegionSelectSheet.tsx:143,245`): Daerah Khusus Ibukota Jakarta, Kota Administrasi Jakarta Selatan, Tebet, Tebet Barat. Enter 12810 in "5 digit kode pos". **Expected:** "Menghitung ongkir otomatis…" is followed by "Ongkir terbaru sudah dihitung otomatis." (`src/screens/MarketplaceScreen.tsx:1856-1917`), from `POST /api/v1/petowner/orders/quote` (`src/api.ts:1010-1018`; backend `rewards.go:535`, `petowner_orders.go:149`). One shipment, "DIKIRIM OTOMATIS DARI Paws & Care Kemang · …", lists each Lion Parcel service with its fee (`src/screens/MarketplaceScreen.tsx:1919-1973`).
5. Choose REGPACK. **Expected:** The quote refreshes, and Subtotal, "Biaya platform" and "Ongkir Lion Parcel" add up to "Total pembayaran" (`src/screens/MarketplaceScreen.tsx:2017-2058`). The button reads "Bayar pesanan" (`:2060-2075`).
6. Tap "Bayar pesanan". **Expected:** `POST /api/v1/petowner/orders` (`src/api.ts:1020-1032`; backend `handler.go:356`, `petowner_orders.go:205`) is followed by `POST /api/v1/payment-intents` with `reference_type` `shop_order` (`src/screens/MarketplaceScreen.tsx:903-938`). The toast "Pesanan <order number> siap dibayar" appears. The QRIS sheet shows the quoted total.
7. Inspect the database. **Expected:** One order exists in `pending_payment`, with the quoted amounts. Kemang reserves one unit of the product without selling it, and the sandbox holds one charge.

### MOB-09 — Paying the order completes it and takes the stock

**Precondition:** MOB-08's pending order, with its QRIS sheet open.

1. Pay the charge through the sandbox. **Expected:** On the next poll the sheet shows "Pembayaran berhasil". The toast "Pembayaran berhasil, pesanan sedang disiapkan toko" appears and the cart empties (`src/screens/MarketplaceScreen.tsx:1319-1328`). Record the delay.
2. Inspect the database. **Expected:** The order is paid and `processing`, and so is its Kemang fulfilment. One unit leaves Kemang's stock and its reservation, recorded as one sale movement (backend `payments.go:458-469`).
3. In Aktivitas, tap the "Belanja" filter. **Expected:** The order appears with its order number, paid (backend `petowner_activity_center.go:204`).
4. Have the sandbox resend the same confirmation. **Expected:** There is no second stock deduction, sale movement or charge.

## Automation blockers and gaps

These were found while writing the cases. All are in `mobile/` unless prefixed. Fixing them is product work for separate PRs; this PR changes no app code.

**Blocks stable automation:**

1. **No `testID` anywhere in the app.** No component in `App.tsx` or `src/` sets one. Maestro maps `testID` to its `id` selector, the stable choice for icons, repeated items and translated text. Without it, every step must match visible Indonesian text. The text changes if an owner switches language (`src/screens/ProfileScreen.tsx:114,133-140`).
2. **The same text appears more than once on one screen.** Each product card has "Tambah" (`src/screens/MarketplaceScreen.tsx:268-283`) and each service card has "Booking" (`src/screens/DiscoverScreen.tsx:49`). Plan cards have no label, and a plan name such as "Chat Dokter" can repeat across vets (`src/screens/WorldScreen.tsx:1305-1309`). Aktivitas has "Semua" twice (`src/screens/ActivityScreen.tsx:65,72`) and a "Belanja" filter that matches the "Belanja" tab (`App.tsx:93`, `src/screens/ActivityScreen.tsx:67`). Flows would need fragile relative selectors. Add per-entity IDs such as `product-<id>-add`, `service-<id>-book` and `plan-<id>`.
3. **Text fields have no label or ID:** every login and registration field (`App.tsx:1450-1507`), the booking note (`App.tsx:1882-1890`) and every shipping-address field (`src/screens/MarketplaceScreen.tsx:1786-1853`). Maestro can only find them by placeholder text, which disappears once the field has text. Clearing and retyping a filled field (MOB-02 step 2) therefore has no selector.
4. **Some controls have only an icon and no label:** the password visibility toggle (`App.tsx:1508-1517`) and the service favourite heart (`src/screens/DiscoverScreen.tsx:43`). The booking date chips are a weekday, a bare day number and a month (`App.tsx:1821-1853`), so they cannot be targeted reliably.
5. **Outcomes are reported mainly through a toast that disappears after 2.4 seconds** (`App.tsx:266-271,1051-1058`): login, registration, booking, checkout and errors. An assertion must land within that window or check persistent state. Persistent status text or a `testID` on the toast would remove the race.
6. **The login button's disabled state is not exposed.** `LoginModal` never disables its submit button; it only fades it (`App.tsx:1585-1609`). A tap on an invalid form silently does nothing, and Maestro cannot assert that the button is disabled.

**Must be handled in the job (not app defects):**

7. Opening Sliva World asks for the location permission (`src/screens/WorldScreen.tsx:559-564`). Set permissions on `launchApp` or dismiss the dialog in the flow.
8. Use a local release build with cleartext allowed for `10.0.2.2`, as described above. EAS profiles reject local URLs (`scripts/validate-production-env.mjs:1-48`).
9. Paying the QRIS needs the provider order ID. The app shows it only as text, "<order id> · berlaku 15 menit" (`src/components/QrisPayment.tsx:203-205`). Read it with `copyTextFrom`, or add a `testID` to that text.

**Product gaps the cases record as failures:**

10. The native add-pet form is implemented; MOB-03 still needs the isolated emulator/stack run to establish end-to-end coverage. Component and HTTP-client tests cover validation, taxonomy selection, create/bootstrap, and retry without duplicate creation.
11. A vet consultation is created without the pet (MOB-06 step 4; `src/api.ts:1568-1580`).
12. The active pet is always the first one returned (`App.tsx:262`). "Ganti profil pet aktif" only shows a toast (`src/screens/HomeScreen.tsx:415`), so a multi-pet owner cannot book or consult for their second pet.
13. A paid consultation cannot be attended in the app, because there is no consultation room ([MOB-07](#mob-07--paying-the-consultation-marks-it-paid-and-lists-it)).

## Execution reporting

Record actual results separately from this specification. A case passes only after all of its observable outcomes have been exercised, including the database checks. Report application defects, including every **Known gap** step, as failures. Report missing infrastructure, such as no emulator, stack or KVM, as blocked, never as passed or skipped. Do not stub API responses to make the job green.
