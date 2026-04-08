import { test, expect } from '@playwright/test';

test.describe('Authentication gate', () => {
  test.beforeEach(async ({ context }) => {
    // Ensure no token is present so the login screen is shown.
    await context.clearCookies();
  });

  test('login screen is shown when no token is present', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button:has-text("Sign in")')).toBeVisible();
  });

  test('submitting credentials enters the app', async ({ page }) => {
    await page.goto('/');
    await page.locator('input[type="email"]').fill('user@example.com');
    await page.locator('input[type="password"]').fill('secret');
    const loginRequest = page.waitForResponse(
      (r) => r.url().includes('/api/auth/login') && r.status() === 200
    );
    await page.locator('button:has-text("Sign in")').click();
    await loginRequest;
    await expect(page.locator('input[placeholder="Search CSKU..."]')).toBeVisible({
      timeout: 10000,
    });
  });

  test('logout returns to the login screen', async ({ page }) => {
    await page.goto('/');
    await page.locator('input[type="email"]').fill('user@example.com');
    await page.locator('input[type="password"]').fill('secret');
    await page.locator('button:has-text("Sign in")').click();
    await expect(page.locator('input[placeholder="Search CSKU..."]')).toBeVisible({
      timeout: 10000,
    });
    await page.locator('button:has-text("Log out")').click();
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });
});
