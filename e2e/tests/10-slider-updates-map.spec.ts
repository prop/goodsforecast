import { test, expect } from './fixtures';
import { waitForMap, selectCsku, getCurrentTimeBucket } from './helpers';

test.describe('Slider changes propagate to map', () => {
  test.beforeEach(async ({ page }) => {
    await Promise.all([
      page.waitForResponse((r) => r.url().includes('/api/time-buckets') && r.status() === 200),
      page.goto('/'),
    ]);
    await waitForMap(page);
    await page.waitForTimeout(500);
  });

  test('moving slider updates stock labels on markers', async ({ page }) => {
    // 1. Select CSKU
    await selectCsku(page, 'CSKU90008778');
    await page.waitForTimeout(1500);

    // 2. Take screenshot of initial state
    await page.screenshot({ path: 'test-results/slider-before.png' });

    // 3. Read all marker label text (inside .leaflet-marker-icon divs)
    const getMarkerTexts = async () => {
      const markers = page.locator('.leaflet-marker-icon');
      const count = await markers.count();
      const texts: string[] = [];
      for (let i = 0; i < count; i++) {
        const text = await markers.nth(i).innerText();
        if (text.trim()) texts.push(text.trim());
      }
      return texts;
    };

    const initialTexts = await getMarkerTexts();
    const initialTb = await getCurrentTimeBucket(page);
    console.log('Initial TB:', initialTb);
    console.log('Initial marker texts:', initialTexts);

    // 4. Move slider to 75%
    const slider = page.locator('input[type="range"]');
    const box = await slider.boundingBox();
    expect(box).toBeTruthy();

    const mapDataResponse = page.waitForResponse(
      (r) => r.url().includes('/api/map-data') && r.status() === 200
    );
    await page.mouse.click(box!.x + box!.width * 0.75, box!.y + box!.height / 2);
    await mapDataResponse;
    await page.waitForTimeout(1500);

    // 5. Take screenshot of new state
    await page.screenshot({ path: 'test-results/slider-after.png' });

    const newTexts = await getMarkerTexts();
    const newTb = await getCurrentTimeBucket(page);
    console.log('New TB:', newTb);
    console.log('New marker texts:', newTexts);

    // 6. Verify time bucket changed
    expect(newTb).not.toBe(initialTb);

    // 7. Verify marker texts changed
    expect(newTexts.length).toBeGreaterThan(0);
    expect(initialTexts.length).toBeGreaterThan(0);
    expect(newTexts.join('|')).not.toBe(initialTexts.join('|'));
  });

  test('each slider position fires map-data with correct tb param', async ({ page }) => {
    await selectCsku(page, 'CSKU90008778');
    await page.waitForTimeout(1000);

    const slider = page.locator('input[type="range"]');
    const box = await slider.boundingBox();
    expect(box).toBeTruthy();

    // Move to 25%
    const req1 = page.waitForResponse(
      (r) => r.url().includes('/api/map-data') && r.status() === 200
    );
    await page.mouse.click(box!.x + box!.width * 0.25, box!.y + box!.height / 2);
    const resp1 = await req1;
    const tb1 = await getCurrentTimeBucket(page);

    // Move to 50%
    const req2 = page.waitForResponse(
      (r) => r.url().includes('/api/map-data') && r.status() === 200
    );
    await page.mouse.click(box!.x + box!.width * 0.5, box!.y + box!.height / 2);
    const resp2 = await req2;
    const tb2 = await getCurrentTimeBucket(page);

    // Move to 75%
    const req3 = page.waitForResponse(
      (r) => r.url().includes('/api/map-data') && r.status() === 200
    );
    await page.mouse.click(box!.x + box!.width * 0.75, box!.y + box!.height / 2);
    const resp3 = await req3;
    const tb3 = await getCurrentTimeBucket(page);

    console.log(`25%: ${tb1} (${resp1.url()})`);
    console.log(`50%: ${tb2} (${resp2.url()})`);
    console.log(`75%: ${tb3} (${resp3.url()})`);

    expect(tb1).not.toBe(tb2);
    expect(tb2).not.toBe(tb3);
    expect(resp1.url()).toContain(`tb=${encodeURIComponent(tb1)}`);
    expect(resp2.url()).toContain(`tb=${encodeURIComponent(tb2)}`);
    expect(resp3.url()).toContain(`tb=${encodeURIComponent(tb3)}`);
  });
});
