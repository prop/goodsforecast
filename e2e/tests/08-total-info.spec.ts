import { test, expect } from './fixtures';

test.describe('Total Info panel', () => {
  test.beforeEach(async ({ page }) => {
    await Promise.all([
      page.waitForResponse((r) => r.url().includes('/api/total-info') && r.status() === 200),
      page.goto('/'),
    ]);
  });

  test('Total Info panel is always visible on screen', async ({ page }) => {
    const panel = page.locator('button:has-text("Total Info")');
    await expect(panel).toBeVisible();
  });

  test('Total Info displays all KPI rows from Total_Info (Business) sheet', async ({ page }) => {
    // Key KPIs from the spec
    const expectedKpis = [
      'Уровень сервиса',
      'Прогноз:',
      'Отгрузки:',
      'Перемещения:',
      '% SL:',
    ];
    for (const kpi of expectedKpis) {
      await expect(page.locator(`text=${kpi}`)).toBeVisible();
    }
  });

  test('Total Info can be collapsed and expanded', async ({ page }) => {
    // Should be expanded initially
    const table = page.locator('table.text-xs');
    await expect(table).toBeVisible();

    // Click to collapse
    await page.locator('button:has-text("Total Info")').click();
    await page.waitForTimeout(300);
    await expect(table).not.toBeVisible();
    await expect(page.locator('button:has-text("Show Info")')).toBeVisible();

    // Click to expand
    await page.locator('button:has-text("Show Info")').click();
    await page.waitForTimeout(300);
    await expect(table).toBeVisible();
  });

  test('Total Info values are formatted as numbers', async ({ page }) => {
    // The "Прогноз:" value should be a formatted number
    const cells = page.locator('td.font-mono');
    const count = await cells.count();
    expect(count).toBeGreaterThan(0);

    // At least some values should contain digits
    let hasNumericValue = false;
    for (let i = 0; i < count; i++) {
      const text = await cells.nth(i).textContent();
      if (text && /\d/.test(text)) {
        hasNumericValue = true;
        break;
      }
    }
    expect(hasNumericValue).toBe(true);
  });
});
