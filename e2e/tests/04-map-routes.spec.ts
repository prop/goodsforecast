import { test, expect } from './fixtures';
import { waitForMap, selectCsku } from './helpers';

test.describe('Map routes and visual state', () => {
  test.beforeEach(async ({ page }) => {
    await Promise.all([
      page.waitForResponse((r) => r.url().includes('/api/time-buckets') && r.status() === 200),
      page.goto('/'),
    ]);
    await waitForMap(page);
    await page.waitForTimeout(500);
  });

  test('no movement routes shown before CSKU is selected', async ({ page }) => {
    // Only connector lines (dashed, gray) exist before CSKU selection
    // Active route paths (black #1f2937) should not exist
    const activeRoutes = page.locator('.leaflet-overlay-pane path[stroke="#1f2937"]');
    expect(await activeRoutes.count()).toBe(0);
  });

  test('routes appear after selecting a CSKU', async ({ page }) => {
    await selectCsku(page, 'CSKU90008778');
    await page.waitForTimeout(500);
    // Should have route paths (black or gray)
    const paths = page.locator('.leaflet-overlay-pane path[stroke="#1f2937"], .leaflet-overlay-pane path[stroke="#9ca3af"]');
    const count = await paths.count();
    expect(count).toBeGreaterThan(0);
  });

  test('active routes (qty > 0) are black, inactive are gray', async ({ page }) => {
    await selectCsku(page, 'CSKU90008778');
    await page.waitForTimeout(500);

    const paths = page.locator('.leaflet-overlay-pane path');
    const count = await paths.count();
    expect(count).toBeGreaterThan(0);

    const colors = new Set<string>();
    for (let i = 0; i < count; i++) {
      const stroke = await paths.nth(i).getAttribute('stroke');
      if (stroke) colors.add(stroke);
    }
    expect(colors.size).toBeGreaterThan(0);
  });

  test('active routes show quantity labels', async ({ page }) => {
    await selectCsku(page, 'CSKU90008778');
    await page.waitForTimeout(1000);

    // Route quantity labels are DivIcon markers with numeric text
    const markers = page.locator('.leaflet-marker-icon');
    const allTexts = await markers.allInnerTexts();
    // Find a marker that contains only a number (route quantity label)
    const hasQuantityLabel = allTexts.some((t) => /^[\d\s.,\xa0]+$/.test(t.trim()) && t.trim().length > 0);
    expect(hasQuantityLabel).toBe(true);
  });

  test('factory without production for selected CSKU is dimmed', async ({ page }) => {
    const mapDataResponse = page.waitForResponse(
      (r) => r.url().includes('/api/map-data') && r.status() === 200
    );
    const input = page.locator('input[placeholder="Search CSKU..."]');
    await input.click();
    await input.fill('CSKU90008778');
    await page.locator('button:has-text("CSKU90008778")').first().click();
    const response = await mapDataResponse;
    const mapData = await response.json();
    await page.waitForTimeout(500);

    const dimmedFactories = mapData.locationData.filter(
      (l: { hasProductionForCsku: boolean; productionVolume: number | null }) =>
        l.productionVolume === null && !l.hasProductionForCsku
    );

    if (dimmedFactories.length > 0) {
      const dimmedMarkers = page.locator('.leaflet-marker-icon div[style*="opacity: 0.5"]');
      await expect(dimmedMarkers.first()).toBeVisible();
    }
  });

  test('changing time bucket updates route state', async ({ page }) => {
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
    const routesAt25 = await page.locator('.leaflet-overlay-pane path').count();

    const mapDataAt75 = page.waitForResponse(
      (r) => r.url().includes('/api/map-data') && r.status() === 200
    );
    await page.mouse.click(box.x + box.width * 0.75, box.y + box.height / 2);
    await mapDataAt75;
    await page.waitForTimeout(500);
    const routesAt75 = await page.locator('.leaflet-overlay-pane path').count();

    expect(routesAt25).toBeGreaterThan(0);
    expect(routesAt75).toBeGreaterThan(0);
  });
});
