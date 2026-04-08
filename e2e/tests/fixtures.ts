import { test as base, expect } from '@playwright/test';

/**
 * Shared fixture: pre-seeds localStorage with a fake auth token so the
 * existing specs land directly on the main app and skip the login screen.
 * The login screen itself is still exercised by 00-auth.spec.ts.
 */
export const test = base.extend({
  page: async ({ page }, use) => {
    await page.addInitScript(() => {
      try {
        localStorage.setItem('auth-token', 'fake-token-e2e');
        localStorage.setItem('auth-email', 'e2e@example.com');
      } catch {
        /* noop */
      }
    });
    await use(page);
  },
});

export { expect };
