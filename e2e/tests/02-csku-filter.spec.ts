import { test, expect } from './fixtures';
import { waitForMap, selectCsku, getSelectedCsku } from './helpers';

test.describe('CSKU filter', () => {
  test.beforeEach(async ({ page }) => {
    const [, ,] = await Promise.all([
      page.waitForResponse((r) => r.url().includes('/api/cskus') && r.status() === 200),
      page.waitForResponse((r) => r.url().includes('/api/time-buckets') && r.status() === 200),
      page.goto('/'),
    ]);
    await waitForMap(page);
  });

  test('CSKU dropdown shows full list on focus (click)', async ({ page }) => {
    const input = page.locator('input[placeholder="Search CSKU..."]');
    await input.click();
    const buttons = page.locator('button.font-mono');
    await expect(buttons.first()).toBeVisible({ timeout: 5000 });
    const count = await buttons.count();
    expect(count).toBeGreaterThan(0);
    expect(count).toBeLessThanOrEqual(100);
  });

  test('CSKU dropdown shows results on typing', async ({ page }) => {
    const input = page.locator('input[placeholder="Search CSKU..."]');
    await input.click();
    await input.fill('CSKU9000');
    const dropdown = page.locator('button:has-text("CSKU9000")');
    await expect(dropdown.first()).toBeVisible({ timeout: 5000 });
    const count = await dropdown.count();
    expect(count).toBeGreaterThan(0);
    expect(count).toBeLessThanOrEqual(100);
  });

  test('selecting a CSKU updates the badge and triggers map-data request', async ({ page }) => {
    const mapDataRequest = page.waitForResponse(
      (r) => r.url().includes('/api/map-data') && r.status() === 200
    );
    const input = page.locator('input[placeholder="Search CSKU..."]');
    await input.click();
    await input.fill('CSKU90008778');
    await page.locator('button:has-text("CSKU90008778")').first().click();
    const response = await mapDataRequest;
    const badge = await getSelectedCsku(page);
    expect(badge).toBe('CSKU90008778');
    expect(response.url()).toContain('csku=CSKU90008778');
  });

  test('selecting a CSKU shows routes on the map', async ({ page }) => {
    await selectCsku(page, 'CSKU90008778');
    await page.waitForTimeout(500);
    const paths = page.locator('.leaflet-overlay-pane path');
    const count = await paths.count();
    expect(count).toBeGreaterThan(0);
  });

  test('CSKU dropdown filters correctly', async ({ page }) => {
    const input = page.locator('input[placeholder="Search CSKU..."]');
    await input.click();
    await input.fill('NONEXISTENT_CSKU_XYZ');
    await expect(page.locator('text=No results')).toBeVisible();
  });

  test('selecting a CSKU shows stock/production labels on markers', async ({ page }) => {
    await selectCsku(page, 'CSKU90008778');
    await page.waitForTimeout(1000);
    // Labels are now inside DivIcon markers, not Leaflet tooltips
    const markers = page.locator('.leaflet-marker-icon');
    const allText = await markers.allInnerTexts();
    const hasStockLabel = allText.some((t) => t.includes('Stock:'));
    expect(hasStockLabel).toBe(true);
  });
});
