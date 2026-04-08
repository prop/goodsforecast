import { test, expect } from './fixtures';
import { waitForMap, selectCsku, clickWarehouseMarker, isDetailCardVisible } from './helpers';

test.describe('Warehouse detail card', () => {
  test.beforeEach(async ({ page }) => {
    await Promise.all([
      page.waitForResponse((r) => r.url().includes('/api/time-buckets') && r.status() === 200),
      page.goto('/'),
    ]);
    await waitForMap(page);
    await page.waitForTimeout(500);
    await selectCsku(page, 'CSKU90008778');
    await page.waitForTimeout(1000);
  });

  test('clicking a warehouse marker opens detail card with Resource Balance tab', async ({ page }) => {
    const clicked = await clickWarehouseMarker(page);
    expect(clicked).toBe(true);
    expect(await isDetailCardVisible(page)).toBe(true);
    await expect(page.locator('button:has-text("Resource Balance")')).toBeVisible();
    await expect(page.locator('button:has-text("Productions")')).toHaveCount(0);
    await expect(page.locator('button:has-text("Workcenter Load")')).toHaveCount(0);
  });

  test('warehouse Resource Balance tab shows data', async ({ page }) => {
    const clicked = await clickWarehouseMarker(page);
    if (!clicked) { test.skip(); return; }
    await page.waitForTimeout(3000);

    const detailRows = page.locator('table').last().locator('tbody tr');
    const count = await detailRows.count();
    expect(count).toBeGreaterThan(0);

    const tableText = await page.locator('table').last().locator('tbody').textContent();
    expect(tableText).toContain('BEGIN');
    expect(tableText).toContain('END');
  });

  test('warehouse card shows end stock next to warehouse marker', async ({ page }) => {
    // Stock labels are inside DivIcon markers
    const markers = page.locator('.leaflet-marker-icon');
    const allTexts = await markers.allInnerTexts();
    const hasStockLabel = allTexts.some((t) => t.includes('Stock:'));
    expect(hasStockLabel).toBe(true);
  });
});
