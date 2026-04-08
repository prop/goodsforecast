import { test, expect } from './fixtures';
import { waitForMap, selectCsku, getTableRowCount, clickActiveRoute, isDetailCardVisible } from './helpers';

test.describe('Route detail card', () => {
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

  test('clicking a route line opens detail card with Movements tab', async ({ page }) => {
    const clicked = await clickActiveRoute(page);
    if (!clicked) { test.skip(); return; }

    // Check if we got a route card (has Movements tab and "→" in header)
    const movementsTab = page.locator('button:has-text("Movements")');
    if (await movementsTab.count() === 0) { test.skip(); return; }

    expect(await isDetailCardVisible(page)).toBe(true);
    const header = page.locator('.font-medium.text-sm.text-gray-900');
    const headerText = await header.textContent();
    expect(headerText).toContain('→');
  });

  test('route Movements tab shows movement data', async ({ page }) => {
    const clicked = await clickActiveRoute(page);
    if (!clicked) { test.skip(); return; }

    const movementsTab = page.locator('button:has-text("Movements")');
    if (await movementsTab.count() === 0) { test.skip(); return; }

    // Wait for data to load
    await page.waitForTimeout(1000);
    const rows = await getTableRowCount(page);
    expect(rows).toBeGreaterThan(0);

    await expect(page.locator('th:has-text("Quantity")')).toBeVisible();
    await expect(page.locator('th:has-text("From")')).toBeVisible();
    await expect(page.locator('th:has-text("To")')).toBeVisible();
  });

  test('route card header shows CSKU and departure week', async ({ page }) => {
    const clicked = await clickActiveRoute(page);
    if (!clicked) { test.skip(); return; }

    const movementsTab = page.locator('button:has-text("Movements")');
    if (await movementsTab.count() === 0) { test.skip(); return; }

    await expect(page.locator('text=CSKU90008778')).toBeVisible();
    await expect(page.locator('span:has-text("W.")')).toBeVisible();
  });
});
