import type { Page } from '@playwright/test';
import { test, expect } from './fixtures';
import { activityCenter, activityItem, marketplaceProduct, petOwner, petOwnerBootstrap } from './mock-data';
import { collectionSamples } from './world-collection-data';

const spot = collectionSamples.petspots;
const post = { id: 'community-layout-post', author_name: 'Bella & Bima', user_id: petOwner.id, body: 'Bella lulus pemeriksaan kesehatan tahunan. Semua catatan masuk ke timeline medisnya.', category: 'story', created_at: new Date().toISOString(), like_count: 2, comment_count: 20, liked: false, image_url: '' };
const event = activityItem({ id: '7c000000-0000-4000-8000-000000000001', type: 'event', title: 'Cat Parent Mini Class', subtitle: 'M Bloc Space · Jakarta Selatan', pet_name: 'Milo', amount: 50000, payment_reference_type: 'event_registration', qr_token: '19e148d8-39be-4c3d-9e8f-0a1b2c3d4e5f', venue: 'M Bloc Space', address: 'Jl. Panglima Polim, Jakarta Selatan', latitude: -6.2, longitude: 106.8, scheduled_at: new Date(Date.now() + 3600000).toISOString(), ends_at: new Date(Date.now() + 7200000).toISOString(), ticket_quantity: 1 });

async function setup(page: Page) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => {
    localStorage.setItem('slivadoc.access_token', 'content-layout-token');
    localStorage.setItem('slivadoc.access_expires_at', String(Date.now() + 3600000));
  });
  const submitted: Array<{ body: string; parent_id?: string }> = [];
  await page.route('https://example.test/**', route => route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="440"><rect width="640" height="440" fill="#dff3ff"/></svg>' }));
  await page.route('**/api/v1/**', async route => {
    const path = new URL(route.request().url()).pathname;
    const json = (body: unknown) => route.fulfill({ json: body });
    if (path === '/api/v1/auth/me') return json({ ...petOwner, role: 'pet_owner' });
    if (path === '/api/v1/petowner/bootstrap') return json(petOwnerBootstrap({ withPet: true }));
    if (path === '/api/v1/petowner/shipping-addresses') return json({ addresses: [] });
    if (path === '/api/v1/petowner/activities') return json(activityCenter([event]));
    if (path.endsWith('/medical-records')) return json({ data: [{ id: 'layout-medical-record', record_type: 'laboratory', title: 'Panel darah tahunan Milo', complaint: '', diagnosis: 'CBC dan kimia darah dalam rentang normal', treatment: '', clinical_notes: '', doctor_name: 'drh. Maya', occurred_at: '2026-09-15T04:56:31Z', attachments: [], prescriptions: [] }], count: 1 });
    if (path === '/api/v1/public/discovery/products') return json({ data: Array.from({ length: 16 }, (_, i) => marketplaceProduct({ id: `52000000-0000-4000-8000-${String(i+1).padStart(12, '0')}`, name: 'Makanan sehat anabul untuk perawatan harian', image_url: 'https://example.test/product.svg' })), count: 16 });
    if (path === '/api/v1/public/community/posts') return json({ data: [post], count: 1 });
    if (path.endsWith(`/community/posts/${post.id}/comments`)) {
      if (route.request().method() === 'POST') {
        submitted.push(route.request().postDataJSON());
        return json({ id: 'new-comment', created_at: new Date().toISOString(), message: 'Komentar terkirim' });
      }
      return json({ data: Array.from({ length: 20 }, (_, i) => ({ id: `comment-${i}`, user_id: petOwner.id, author_name: 'Andi Pet Parent', body: 'Congrats ya! Semoga Bella sehat selalu. '.repeat(3), created_at: new Date().toISOString() })), count: 20 });
    }
    if (path.startsWith('/api/v1/public/petspots/')) return json(spot);
    const sample = collectionSamples[path.replace('/api/v1/public/', '') as keyof typeof collectionSamples];
    if (sample) return json({ data: [sample], count: 1 });
    return json({ data: [], count: 0 });
  });
  return submitted;
}

for (const width of [390, 768, 1440]) {
  test(`account content and marketplace columns at ${width}px`, async ({ page }) => {
    test.setTimeout(90000);
    await setup(page);
    await page.setViewportSize({ width, height: 1000 });
    for (const view of ['home', 'pets', 'health', 'bookings', 'profile', 'favorites', 'notifications', 'messages', 'support']) {
      await page.goto(`/?view=${view}`);
      await expect(page.locator('.app-shell')).toBeVisible();
      await expect(page.locator('.marketplace-loading')).toHaveCount(0);
      await expect(page.locator('.main-shell')).toHaveCSS('min-height', '0px');
      if (view === 'health') {
        await page.getByRole('tab', { name: /^Rekam Medis/ }).click();
        await expect(page.getByText('Panel darah tahunan Milo')).toBeVisible();
        await page.getByRole('tab', { name: 'Vaksin', exact: true }).click();
        await expect(page.locator('.health-native-record-empty')).toBeVisible();
      }
      const gap = await page.locator('.main-shell').evaluate(el => {
        const content = el.querySelector('.page-content')!;
        const last = [...content.children].filter(child => child.getBoundingClientRect().height > 0).at(-1)!;
        return el.getBoundingClientRect().bottom - last.getBoundingClientRect().bottom;
      });
      expect(gap, view).toBeLessThanOrEqual(48);
    }
    await page.goto('/?view=shop');
    await expect(page.locator('.market-product-card')).toHaveCount(16);
    const cols = await page.locator('.market-product-grid').evaluate(el => getComputedStyle(el).gridTemplateColumns.split(' ').length);
    expect(cols).toBe(width <= 600 ? 2 : width >= 1440 ? 8 : 4);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  });

  test(`long activity detail scrolls with visible automatic-width actions at ${width}px`, async ({ page }) => {
    await setup(page);
    await page.setViewportSize({ width, height: 650 });
    await page.goto("/?view=bookings");
    await page.getByRole("button", { name: /Event Terkonfirmasi Cat Parent Mini Class/ }).click();
    const dialog = page.locator('.activity-transaction-dialog');
    await expect(dialog).toBeVisible();
    const scroll = dialog.locator('.activity-detail-body');
    const heights = await scroll.evaluate(el => ({ content: el.scrollHeight, visible: el.clientHeight }));
    expect(heights.content).toBeGreaterThan(heights.visible);
    await scroll.evaluate(el => { el.scrollTop = el.scrollHeight; });
    await expect(dialog.getByText('Status pembayaran')).toBeVisible();
    const actions = await dialog.locator('footer').boundingBox();
    expect(actions!.y + actions!.height).toBeLessThanOrEqual(650);
    await expect(dialog.getByRole('button', { name: 'Selesai', exact: true })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
  });

  test(`community comments contain long threads and can send a reply at ${width}px`, async ({ page }) => {
    const submitted = await setup(page);
    await page.setViewportSize({ width, height: 650 });
    await page.goto('/?view=community');
    await page.locator('.community-post footer button').filter({ hasText: '20' }).click();
    const dialog = page.locator('.community-comments-dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('.community-comment')).toHaveCount(20);
    const heading = await dialog.locator('h2').boundingBox();
    const box = await dialog.boundingBox();
    expect(heading!.x - box!.x).toBeGreaterThanOrEqual(16);
    const list = dialog.locator('.community-comments-list');
    expect(await list.evaluate(el => el.scrollHeight > el.clientHeight)).toBe(true);
    await dialog.getByRole('button', { name: 'Balas', exact: true }).first().click();
    await dialog.getByRole('textbox', { name: 'Tulis komentar' }).fill('Sehat selalu, Bella!');
    await dialog.getByRole('button', { name: 'Kirim komentar' }).click();
    await expect.poll(() => submitted.length).toBe(1);
    expect(submitted[0]).toEqual({ body: 'Sehat selalu, Bella!', parent_id: 'comment-0' });
    const composer = await dialog.locator('.community-comment-composer').boundingBox();
    expect(composer!.y + composer!.height).toBeLessThanOrEqual(650);
    await page.screenshot({ path: `/private/tmp/sliva-ui-audit/comments-fixed-${width}.png` });
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
  });
}

test('PetSpot details use a shareable page and preserve browser Back and reload', async ({ page }) => {
  await setup(page);
  await page.goto('/?view=world&world_mode=petspot');
  await page.locator('.petspot-card-content').first().click();
  await expect(page).toHaveURL(new RegExp(`world_item=${spot.id}`));
  await expect(page.locator('.petspot-detail-page')).toBeVisible();
  await expect(page.locator('.modal-overlay')).toHaveCount(0);
  await page.reload();
  await expect(page.locator('.petspot-detail-page')).toBeVisible();
  await page.goBack();
  await expect(page.locator('.petspot-card-content').first()).toBeVisible();
  await page.goForward();
  await expect(page.locator('.petspot-detail-page')).toBeVisible();
  await page.getByRole('button', { name: 'Kembali ke PetSpot' }).click();
  await expect(page).not.toHaveURL(/world_item=/);
  await expect(page.locator('.petspot-card-content').first()).toBeVisible();
});
