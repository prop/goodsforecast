import { test, expect } from './fixtures';
import { waitForMap, countMarkers } from './helpers';

test.describe('Page load and initial state', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('page title is correct', async ({ page }) => {
    await expect(page).toHaveTitle('Supply Chain Heuristics');
  });

  test('map renders with tiles', async ({ page }) => {
    await waitForMap(page);
    const container = page.locator('.leaflet-container');
    await expect(container).toBeVisible();
  });

  test('all 12 location markers are visible', async ({ page }) => {
    await waitForMap(page);
    // Wait for markers to render by waiting for the expected count
    await expect(page.locator('.leaflet-marker-icon')).toHaveCount(12, { timeout: 10000 });
    const count = await countMarkers(page);
    expect(count).toBe(12);
  });

  test('CSKU search input is visible', async ({ page }) => {
    const input = page.locator('input[placeholder="Search CSKU..."]');
    await expect(input).toBeVisible();
  });

  test('time bucket slider is visible and initialized', async ({ page }) => {
    const slider = page.locator('input[type="range"]');
    await expect(slider).toBeVisible();
    // Wait for slider to be initialized by checking the label has a valid value
    const tbLabel = page.locator('span.font-mono.text-gray-600');
    await expect(tbLabel).not.toHaveText('N/A', { timeout: 10000 });
    const text = await tbLabel.textContent();
    expect(text).toBeTruthy();
    expect(text).toMatch(/^W\.\d+\.\d{4}$/);
  });

  test('Total Info panel is visible with KPI data', async ({ page }) => {
    // Wait for the panel content to appear in the DOM
    const panel = page.locator('text=Total Info');
    await expect(panel).toBeVisible({ timeout: 10000 });
    // Should contain service level and other KPIs
    await expect(page.locator('text=Уровень сервиса')).toBeVisible();
    await expect(page.locator('text=% SL:')).toBeVisible();
  });
});
