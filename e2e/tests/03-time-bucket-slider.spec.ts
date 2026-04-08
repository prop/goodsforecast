import { test, expect } from './fixtures';
import { waitForMap, selectCsku, getCurrentTimeBucket } from './helpers';

test.describe('Time bucket slider', () => {
  test.beforeEach(async ({ page }) => {
    await Promise.all([
      page.waitForResponse((r) => r.url().includes('/api/time-buckets') && r.status() === 200),
      page.goto('/'),
    ]);
    await waitForMap(page);
    await page.waitForTimeout(500);
  });

  test('slider auto-initializes to first time bucket', async ({ page }) => {
    const tb = await getCurrentTimeBucket(page);
    expect(tb).toMatch(/^W\.\d+\.\d{4}$/);
  });

  test('moving slider updates the displayed week', async ({ page }) => {
    const initialTb = await getCurrentTimeBucket(page);
    const slider = page.locator('input[type="range"]');
    const box = await slider.boundingBox();
    if (box) {
      await page.mouse.click(box.x + box.width * 0.5, box.y + box.height / 2);
    }
    await page.waitForTimeout(500);
    const newTb = await getCurrentTimeBucket(page);
    expect(newTb).toMatch(/^W\.\d+\.\d{4}$/);
    expect(newTb).not.toBe(initialTb);
  });

  test('moving slider with CSKU selected triggers new map-data request', async ({ page }) => {
    await selectCsku(page, 'CSKU90008778');

    const mapDataRequest = page.waitForResponse(
      (r) => r.url().includes('/api/map-data') && r.status() === 200
    );
    const slider = page.locator('input[type="range"]');
    const box = await slider.boundingBox();
    if (box) {
      await page.mouse.click(box.x + box.width * 0.75, box.y + box.height / 2);
    }
    const response = await mapDataRequest;
    expect(response.url()).toContain('csku=CSKU90008778');
  });

  test('moving slider changes tb param in map-data request and updates marker labels', async ({ page }) => {
    await selectCsku(page, 'CSKU90008778');
    await page.waitForTimeout(500);

    const initialTb = await getCurrentTimeBucket(page);
    const slider = page.locator('input[type="range"]');
    const box = await slider.boundingBox();
    if (!box) return;

    const mapDataResponse = page.waitForResponse(
      (r) => r.url().includes('/api/map-data') && r.status() === 200
    );
    await page.mouse.click(box.x + box.width * 0.75, box.y + box.height / 2);
    const response = await mapDataResponse;
    const newTb = await getCurrentTimeBucket(page);

    expect(newTb).not.toBe(initialTb);
    expect(response.url()).toContain(`tb=${encodeURIComponent(newTb)}`);

    const data = await response.json();
    expect(data.locationData.length).toBe(12);

    await page.waitForTimeout(1000);

    // Labels are inside DivIcon markers
    const markers = page.locator('.leaflet-marker-icon');
    const allTexts = await markers.allInnerTexts();
    const endStocks = data.locationData
      .filter((l: { endStock: number | null }) => l.endStock !== null && l.endStock > 0)
      .map((l: { endStock: number }) => Math.round(l.endStock));
    const markerText = allTexts.join(' ');
    const hasMatchingValue = endStocks.some((stock: number) =>
      markerText.includes(stock.toLocaleString('ru-RU')) || markerText.includes(String(stock))
    );
    expect(hasMatchingValue).toBe(true);
  });

  test('playing through time buckets updates marker labels', async ({ page }) => {
    await selectCsku(page, 'CSKU90008778');
    await page.waitForTimeout(500);

    const slider = page.locator('input[type="range"]');
    const box = await slider.boundingBox();
    if (!box) return;

    const mapDataAt25 = page.waitForResponse(
      (r) => r.url().includes('/api/map-data') && r.status() === 200
    );
    await page.mouse.click(box.x + box.width * 0.25, box.y + box.height / 2);
    await mapDataAt25;
    await page.waitForTimeout(500);
    const textsAt25 = await page.locator('.leaflet-marker-icon').allInnerTexts();

    const mapDataAt75 = page.waitForResponse(
      (r) => r.url().includes('/api/map-data') && r.status() === 200
    );
    await page.mouse.click(box.x + box.width * 0.75, box.y + box.height / 2);
    await mapDataAt75;
    await page.waitForTimeout(500);
    const textsAt75 = await page.locator('.leaflet-marker-icon').allInnerTexts();

    expect(textsAt25.join('|')).not.toBe(textsAt75.join('|'));
  });
});
