import type { Page } from '@playwright/test';

/** Wait for the map tiles to load */
export async function waitForMap(page: Page): Promise<void> {
  await page.waitForSelector('.leaflet-container', { state: 'visible' });
  await page.waitForSelector('.leaflet-tile-loaded', { state: 'attached' });
}

/** Wait for API response to complete */
export async function waitForApi(page: Page, urlPart: string): Promise<void> {
  await page.waitForResponse((resp) => resp.url().includes(urlPart) && resp.status() === 200);
}

/** Select a CSKU from the dropdown and wait for map-data response */
export async function selectCsku(page: Page, csku: string): Promise<void> {
  const mapDataResponse = page.waitForResponse(
    (r) => r.url().includes('/api/map-data') && r.status() === 200
  );
  const input = page.locator('input[placeholder="Search CSKU..."]');
  await input.click();
  await input.fill(csku);
  await page.locator(`button:has-text("${csku}")`).first().click();
  await mapDataResponse;
}

/** Get the currently selected CSKU badge text */
export async function getSelectedCsku(page: Page): Promise<string | null> {
  const badge = page.locator('span.font-mono.bg-blue-100');
  if (await badge.count() === 0) return null;
  return badge.textContent();
}

/** Get the current time bucket label */
export async function getCurrentTimeBucket(page: Page): Promise<string> {
  const label = page.locator('span.font-mono.text-gray-600');
  return (await label.textContent()) ?? '';
}

/** Move the time bucket slider to a specific position (0-based index) */
export async function setTimeBucketIndex(page: Page, index: number): Promise<void> {
  const slider = page.locator('input[type="range"]');
  // Use the native input setter + React's synthetic event via prototype setter
  await slider.evaluate((el, idx) => {
    const input = el as HTMLInputElement;
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype, 'value'
    )?.set;
    nativeInputValueSetter?.call(input, String(idx));
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }, index);
}

/** Count markers on the map */
export async function countMarkers(page: Page): Promise<number> {
  return page.locator('.leaflet-marker-icon').count();
}

/** Click a factory marker by finding a blue-background marker icon */
export async function clickFactoryMarker(page: Page): Promise<boolean> {
  // Factory markers have blue background (#3b82f6) in the inner div
  const markers = page.locator('.leaflet-marker-icon');
  const count = await markers.count();
  for (let i = 0; i < count; i++) {
    const marker = markers.nth(i);
    const html = await marker.innerHTML();
    if (html.includes('#3b82f6')) {
      const box = await marker.boundingBox();
      if (box) {
        await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
        await page.waitForTimeout(500);
        // Verify it opened a factory card (has Productions tab)
        const prodTab = page.locator('button:has-text("Productions")');
        if (await prodTab.count() > 0) return true;
      }
    }
  }
  return false;
}

/** Click a warehouse marker (green, with "Stock:" label) */
export async function clickWarehouseMarker(page: Page): Promise<boolean> {
  const markers = page.locator('.leaflet-marker-icon');
  const count = await markers.count();
  for (let i = 0; i < count; i++) {
    const marker = markers.nth(i);
    const text = await marker.innerText();
    const html = await marker.innerHTML();
    // Green warehouse markers have #10b981 background and "Stock:" label
    if (html.includes('#10b981') && text.includes('Stock:')) {
      const box = await marker.boundingBox();
      if (!box) continue;
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
      await page.waitForTimeout(500);
      const rbTab = page.locator('button:has-text("Resource Balance")');
      const prodTab = page.locator('button:has-text("Productions")');
      if (await rbTab.count() > 0 && await prodTab.count() === 0) return true;
    }
  }
  return false;
}

/** Get the detail card header text */
export async function getDetailCardHeader(page: Page): Promise<string | null> {
  const header = page.locator('.font-medium.text-sm.text-gray-900');
  if (await header.count() === 0) return null;
  return header.textContent();
}

/** Check if detail card is visible */
export async function isDetailCardVisible(page: Page): Promise<boolean> {
  const closeBtn = page.locator('button:has-text("×")');
  return (await closeBtn.count()) > 0;
}

/** Close the detail card */
export async function closeDetailCard(page: Page): Promise<void> {
  const closeBtn = page.locator('button:has-text("×")');
  if (await closeBtn.count() > 0) {
    await closeBtn.click();
  }
}

/** Click a tab in the detail card */
export async function clickTab(page: Page, tabName: string): Promise<void> {
  await page.locator(`button:has-text("${tabName}")`).click();
}

/** Get the number of rows in the data table */
export async function getTableRowCount(page: Page): Promise<number> {
  return page.locator('tbody tr').count();
}

/** Count route lines on the map */
export async function countRouteLines(page: Page): Promise<number> {
  return page.locator('.leaflet-overlay-pane path').count();
}

/** Click an active route (black colored path) using coordinates */
export async function clickActiveRoute(page: Page): Promise<boolean> {
  const paths = page.locator('.leaflet-overlay-pane path[stroke="#1f2937"]');
  const count = await paths.count();
  if (count === 0) return false;
  const box = await paths.first().boundingBox();
  if (!box) return false;
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await page.waitForTimeout(300);
  return true;
}
