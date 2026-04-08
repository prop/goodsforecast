import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:8081';

test.describe('API endpoints return correct data', () => {
  test('GET /api/locations returns 12 locations with required fields', async ({ request }) => {
    const resp = await request.get(`${BASE}/api/locations`);
    expect(resp.status()).toBe(200);
    const data = await resp.json();
    expect(data).toHaveLength(12);
    for (const loc of data) {
      expect(loc).toHaveProperty('external_id');
      expect(loc).toHaveProperty('name');
      expect(loc).toHaveProperty('location_type');
      expect(loc).toHaveProperty('city');
      expect(loc).toHaveProperty('lat');
      expect(loc).toHaveProperty('lon');
      expect(['Склад', 'Завод']).toContain(loc.location_type);
      expect(typeof loc.lat).toBe('number');
      expect(typeof loc.lon).toBe('number');
    }
  });

  test('GET /api/time-buckets returns sorted weekly buckets', async ({ request }) => {
    const resp = await request.get(`${BASE}/api/time-buckets`);
    expect(resp.status()).toBe(200);
    const data = await resp.json();
    expect(data.length).toBeGreaterThan(0);
    // Should be sorted by sort_order
    for (let i = 1; i < data.length; i++) {
      expect(data[i].sort_order).toBeGreaterThanOrEqual(data[i - 1].sort_order);
    }
    // Names should match W.XX.YYYY pattern
    for (const tb of data) {
      expect(tb.name).toMatch(/^W\.\d+\.\d{4}$/);
    }
  });

  test('GET /api/cskus returns distinct CSKUs', async ({ request }) => {
    const resp = await request.get(`${BASE}/api/cskus`);
    expect(resp.status()).toBe(200);
    const data = await resp.json();
    expect(data.length).toBeGreaterThan(0);
    // All should have product_group_external_id
    for (const csku of data) {
      expect(csku.product_group_external_id).toBeTruthy();
      expect(csku.product_group_external_id).toMatch(/^CSKU/);
    }
    // Should be unique
    const ids = data.map((c: { product_group_external_id: string }) => c.product_group_external_id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('GET /api/total-info returns KPI rows', async ({ request }) => {
    const resp = await request.get(`${BASE}/api/total-info`);
    expect(resp.status()).toBe(200);
    const data = await resp.json();
    expect(data.length).toBeGreaterThan(0);
    const keys = data.map((r: { key: string }) => r.key);
    expect(keys).toContain('Прогноз:');
    expect(keys).toContain('Отгрузки:');
    expect(keys).toContain('% SL:');
  });

  test('GET /api/map-data returns location data and routes for a CSKU', async ({ request }) => {
    const resp = await request.get(`${BASE}/api/map-data?csku=CSKU90008778&tb=W.14.2026`);
    expect(resp.status()).toBe(200);
    const data = await resp.json();

    expect(data).toHaveProperty('locationData');
    expect(data).toHaveProperty('routes');
    expect(data.locationData.length).toBe(12);

    // Each location should have required fields
    for (const loc of data.locationData) {
      expect(loc).toHaveProperty('externalId');
      expect(loc).toHaveProperty('endStock');
      expect(loc).toHaveProperty('hasProductionForCsku');
    }

    // At least one factory should have production
    const producing = data.locationData.filter(
      (l: { hasProductionForCsku: boolean }) => l.hasProductionForCsku
    );
    expect(producing.length).toBeGreaterThan(0);

    // Should have routes
    expect(data.routes.length).toBeGreaterThan(0);
    for (const route of data.routes) {
      expect(route).toHaveProperty('fromExternalId');
      expect(route).toHaveProperty('toExternalId');
      expect(route).toHaveProperty('hasAnyMovement');
      expect(route).toHaveProperty('currentQuantity');
    }
  });

  test('GET /api/map-data requires csku and tb params', async ({ request }) => {
    const resp = await request.get(`${BASE}/api/map-data`);
    expect(resp.status()).toBe(400);
  });

  test('GET /api/resource-balance returns filtered data', async ({ request }) => {
    const resp = await request.get(
      `${BASE}/api/resource-balance?csku=CSKU90008778&warehouse=Z228&tb=W.14.2026`
    );
    expect(resp.status()).toBe(200);
    const data = await resp.json();
    expect(data.length).toBeGreaterThan(0);

    // All rows should match the filter
    for (const row of data) {
      expect(row.product_group_external_id).toBe('CSKU90008778');
      expect(row.warehouse_external_id).toBe('Z228');
      expect(row.time_bucket_name).toBe('W.14.2026');
    }

    // Should have BEGIN and END record types
    const types = data.map((r: { record_type: string }) => r.record_type);
    expect(types).toContain('BEGIN');
    expect(types).toContain('END');
  });

  test('GET /api/movements returns filtered movement data', async ({ request }) => {
    const resp = await request.get(
      `${BASE}/api/movements?csku=CSKU90008778&from=Z107&to=Z228&tb=W.14.2026`
    );
    expect(resp.status()).toBe(200);
    const data = await resp.json();
    // May or may not have data for this specific route+week combo
    for (const row of data) {
      expect(row.product_group_external_id).toBe('CSKU90008778');
      expect(row.location_from_external_id).toBe('Z107');
      expect(row.location_to_external_id).toBe('Z228');
    }
  });

  test('GET /api/final-productions returns filtered production data', async ({ request }) => {
    const resp = await request.get(
      `${BASE}/api/final-productions?csku=CSKU90008778&factory=Z007&tb=W.14.2026`
    );
    expect(resp.status()).toBe(200);
    const data = await resp.json();
    expect(data.length).toBeGreaterThan(0);
    for (const row of data) {
      expect(row.product_group_external_id).toBe('CSKU90008778');
      expect(row.time_bucket).toBe('W.14.2026');
    }
  });

  test('GET /api/factory-load returns workcenter and secondary resource data', async ({ request }) => {
    const resp = await request.get(`${BASE}/api/factory-load?factory=Z007&tb=W.14.2026`);
    expect(resp.status()).toBe(200);
    const data = await resp.json();

    expect(data).toHaveProperty('workcenterLoad');
    expect(data).toHaveProperty('secondaryResourceLoad');
    expect(data.workcenterLoad.length).toBeGreaterThan(0);

    for (const row of data.workcenterLoad) {
      expect(row.factory_external_id).toBe('Z007');
      expect(row.time_bucket).toBe('W.14.2026');
      expect(row).toHaveProperty('utilization_pct');
    }
  });
});
