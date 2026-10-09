import type { Page } from "@playwright/test";
import { test, expect } from "./fixtures";
import {
  petOwner,
  petOwnerBootstrap,
  activityCenter,
  activityItem,
  paymentMethods,
} from "./mock-data";
import { collectionSamples } from "./world-collection-data";

const post = {
  id: "polish-post",
  author_name: "Alya & Milo",
  channel_name: "Milo Moments",
  channel_handle: "milo",
  content: "Waktu bermain bersama Milo. ".repeat(8),
  media_url: "https://example.test/pet.svg",
  post_type: "photo",
  like_count: 3,
  comment_count: 16,
  created_at: "2026-10-09T04:00:00Z",
  verified: false,
  channel_id: "polish-channel",
  channel_avatar_url: "",
  following: false,
  repost_count: 0,
};
const place = {
  id: "polish-place",
  name: "Sliva Pet Park",
  city: "DKI Jakarta",
  category: "park",
  address: "Jalan Taman 1",
  latitude: -6.2,
  longitude: 106.8,
  active_petowners: 2,
  geofence_radius_m: 100,
  distance_km: 1.5,
};
async function setup(page: Page) {
  await page.addInitScript(() => {
    if (!sessionStorage.getItem("polish-setup")) {
      localStorage.setItem("slivadoc.access_token", "polish-access");
      localStorage.setItem("slivadoc.refresh_token", "polish-refresh");
      localStorage.setItem(
        "slivadoc.access_expires_at",
        String(Date.now() + 3600000),
      );
      localStorage.setItem(
        "slivadoc.location",
        JSON.stringify({ latitude: -6.2, longitude: 106.8, label: "Jakarta" }),
      );
      sessionStorage.setItem("polish-setup", "1");
    }
  });
  await page.route("https://example.test/**", (route) =>
    route.fulfill({
      contentType: "image/svg+xml",
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="400"><rect width="800" height="400" fill="#bceaff"/></svg>',
    }),
  );
  const requests: string[] = [];
  let comments = Array.from({ length: 16 }, (_, index) => ({
    id: String(index),
    user_id: petOwner.id,
    author_name: `Pet Parent ${index}`,
    content: "Senang melihat Milo bermain dengan teman barunya!",
    created_at: "2026-10-09T04:00:00Z",
  }));
  await page.route("**/api/v1/**", (route) => {
    const request = route.request(),
      url = new URL(request.url()),
      path = url.pathname;
    requests.push(url.pathname + url.search);
    const answer = (body: unknown, status = 200) =>
      route.fulfill({ status, json: body });
    if (path === "/api/v1/public/discovery/branches") return answer({data:[],count:0,has_more:false});
    if (path === "/api/v1/payment-methods") return answer(paymentMethods());
    if (path === "/api/v1/auth/me")
      return answer({ ...petOwner, role: "pet_owner" });
    if (path === "/api/v1/petowner/shipping-addresses")
      return answer({ addresses: [] });
    if (path === "/api/v1/petowner/bootstrap")
      return answer(petOwnerBootstrap({ withPet: true }));
    if (path === "/api/v1/petowner/activities")
      return answer(
        activityCenter([
          activityItem({
            id: "event-one",
            type: "event",
            title: "Pet Festival",
            pet_name: "Milo",
            scheduled_at: "2027-10-19T04:00:00Z",
            latitude: -6.2,
            longitude: 106.8,
          }),
        ]),
      );
    if (path === "/api/v1/public/petspots")
      return answer({
        data: [
          {
            ...collectionSamples.petspots,
            id: "far-spot",
            name: "Pet Cafe Lebih Jauh",
            distance_km: 8,
          },
          {
            ...collectionSamples.petspots,
            id: "near-spot",
            name: "Pet Cafe Terdekat",
            distance_km: 1.2,
          },
        ],
        count: 2,
      });
    if (path === "/api/v1/public/pethub/feed")
      return answer({ data: [post], count: 1 });
    if (path.endsWith(`/pethub/posts/${post.id}/comments`)) {
      if (request.method() === "POST") {
        comments = [
          ...comments,
          {
            id: "new",
            user_id: petOwner.id,
            author_name: petOwner.full_name,
            content: request.postDataJSON().content,
            created_at: new Date().toISOString(),
          },
        ];
        return answer({ id: "new" }, 201);
      }
      return answer({ data: comments, count: comments.length });
    }
    if (path === "/api/v1/public/petship/places")
      return answer({ data: [place], count: 1, privacy: "Only public venue positions are shared." });
    if (path.endsWith("/presences"))
      return answer({
        data: [
          {
            id: "presence-one",
            pet_name: "Luna",
            owner_first_name: "Bima",
            message: "Siap bermain",
            breed: "British Shorthair",
            species: "cat",
            photo_url: "",
            checked_in_at: "2026-10-09T04:00:00Z",
            last_seen_at: "2026-10-09T04:00:00Z",
          },
        ],
        count: 1,
      });
    if (path === "/api/v1/public/academy/trainers")
      return answer({
        data: Array.from({ length: 8 }, (_, i) => ({
          id: String(i),
          full_name: `Trainer ${i}`,
          academy_name: "Sliva Academy",
          specialties: ["Behavior"],
          rating: 4.9,
          experience_years: 5,
          pet_types: ["dog"],
          academy_id: "polish-academy",
          bio: "Trainer berpengalaman",
          certification: "Certified",
          status: "active",
          photo_url: "",
        })),
        count: 8,
      });
    const sample =
      collectionSamples[
        path.replace("/api/v1/public/", "") as keyof typeof collectionSamples
      ];
    if (sample) return answer({ data: [sample], count: 1 });
    return answer({ data: [], count: 0 });
  });
  return requests;
}

test("account navigation stays authenticated on repeated clicks and history, with one desktop logo and one help entry", async ({
  page,
}) => {
  await setup(page);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/?view=home");
  const account = page.locator(".side-profile");
  await expect(account).toBeVisible();
  await expect(page.locator(".topbar .mobile-brand")).toBeHidden();
  await expect(page.locator(".sidebar .brand-mark")).toBeVisible();
  await expect(
    page.locator(".sidebar").getByRole("button", { name: /Pusat Bantuan/ }),
  ).toHaveCount(1);
  for (let i = 0; i < 12; i++) await account.click();
  await expect(page).toHaveURL(/view=profile/);
  await expect(page.locator(".petowner-login")).toHaveCount(0);
  await page.goBack();
  await expect(page).toHaveURL(/view=home/);
  await page.goto("/?view=home&login=1");
  await expect(account).toBeVisible();
  await expect(page.locator(".petowner-login")).toHaveCount(0);
  await expect(page).not.toHaveURL(/login=1/);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator(".topbar .brand-mark")).toBeVisible();
});

test("home PetSpot recommendations use coordinates, sort by distance and open the selected spot", async ({
  page,
}) => {
  const requests = await setup(page);
  await page.goto("/?view=home");
  const spots = page.locator(".home-petspot-card");
  await expect(spots).toHaveCount(2);
  await expect(spots.first()).toContainText("Pet Cafe Terdekat");
  expect(
    requests.some((path) =>
      path.includes("petspots?latitude=-6.2&longitude=106.8"),
    ),
  ).toBe(true);
  await spots.first().getByRole("button", { name: "Lihat tempat" }).click();
  await expect(page).toHaveURL(/world_mode=petspot&world_item=near-spot/);
});

for (const width of [390, 1440])
  test(`PetHub comments and sharing stay contained at ${width}px`, async ({
    page,
  }, testInfo) => {
    const requests = await setup(page);
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/?view=pethub");
    await page.getByRole("button", { name: "Buka komentar" }).click();
    const modal = page.locator(".comments-modal");
    await expect(modal.locator(".comment-row")).toHaveCount(16);
    const composer = modal.locator("footer"),
      box = await modal.boundingBox(),
      footer = await composer.boundingBox();
    expect(footer!.y + footer!.height).toBeLessThanOrEqual(
      box!.y + box!.height + 1,
    );
    await expect(
      composer.getByRole("button", { name: "Kirim", exact: true }),
    ).toBeInViewport();
    await composer.getByRole("textbox").fill("Komentar QA untuk preview lokal");
    await composer.getByRole("button", { name: "Kirim", exact: true }).click();
    await expect(
      modal.getByRole("heading", { name: "Komentar (17)" }),
    ).toBeVisible();
    await page.screenshot({
      path: testInfo.outputPath(`comments-${width}.png`),
    });
    await modal.getByRole("button", { name: "Tutup detail" }).click();
    await page.getByRole("button", { name: "Bagikan konten" }).click();
    const link = await page
      .getByRole("textbox", { name: "Tautan postingan" })
      .inputValue();
    expect(link).toBe(`http://127.0.0.1:4173/?view=pethub&post=${post.id}`);
    await page.goto(link);
    await expect(page.locator(".hub-shared-post")).toBeVisible();
    expect(requests.some((path) => path.includes("post_id=polish-post"))).toBe(
      true,
    );
  });

test("academy rails expose previous navigation after moving forward", async ({
  page,
}) => {
  await setup(page);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/?view=academy");
  for (const label of ["jenis pet", "pet trainer"]) {
    await page.getByRole("button", { name: `Berikutnya: ${label}` }).click();
    await expect(
      page.getByRole("button", { name: `Sebelumnya: ${label}` }),
    ).toBeVisible();
    await page.getByRole("button", { name: `Sebelumnya: ${label}` }).click();
    await expect(
      page.getByRole("button", { name: `Sebelumnya: ${label}` }),
    ).toHaveCount(0);
  }
});

test("adoption extra filters expand and reset; Petship opens inside Sliva World", async ({
  page,
}) => {
  await setup(page);
  await page.goto("/?view=adoption");
  await expect(page.locator("#adoption-extra-filters")).toBeHidden();
  await page.getByRole("button", { name: "Filter lainnya" }).click();
  await expect(page.locator("#adoption-extra-filters")).toBeVisible();
  await page
    .getByPlaceholder("Cari nama, ras, kota, atau karakter pet…")
    .fill("not-found");
  await page
    .locator(".adoption-filter-panel")
    .getByRole("button", { name: "Reset", exact: true })
    .click();
  await expect(
    page.getByPlaceholder("Cari nama, ras, kota, atau karakter pet…"),
  ).toHaveValue("");
  await page
    .getByRole("navigation", { name: "Sliva World", exact: true })
    .getByRole("button", { name: "Petship", exact: true })
    .click();
  await expect(page).toHaveURL(/world_mode=petship/);
  await expect(page.locator(".petship-places")).toContainText(place.name);
  await expect(page.locator(".petship-pawrents")).toContainText("Luna");
});

for (const width of [390, 1440])
  test(`password and activity layout at ${width}px`, async ({
    page,
  }, testInfo) => {
    await setup(page);
    await page.setViewportSize({ width, height: 950 });
    await page.goto("/?view=profile");
    const form = page.locator(".account-password-form");
    await expect(form).toBeVisible();
    await form.scrollIntoViewIfNeeded();
    await expect(
      form.getByRole("button", { name: "Ubah password" }),
    ).toBeDisabled();
    await form.screenshot({
      path: testInfo.outputPath(`password-${width}.png`),
    });
    await page.goto("/?view=bookings");
    const activity = page.locator(".activity-native");
    await expect(activity).toBeVisible();
    await expect(page.locator(".activity-native-card")).toHaveCount(1);
    const contentWidth = await page
      .locator(".page-content")
      .evaluate(
        (node) =>
          node.clientWidth -
          parseFloat(getComputedStyle(node).paddingLeft) -
          parseFloat(getComputedStyle(node).paddingRight),
      );
    expect((await activity.boundingBox())!.width).toBeGreaterThan(
      contentWidth - 2,
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth - innerWidth,
      ),
    ).toBeLessThanOrEqual(1);
    await activity.screenshot({
      path: testInfo.outputPath(`activity-${width}.png`),
    });
  });
