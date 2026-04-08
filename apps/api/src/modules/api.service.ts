import { Injectable } from '@nestjs/common';
import { DbService } from '../db/db.service';

export interface ILocationRow {
  external_id: string;
  name: string;
  location_type: string;
  city: string;
  lat: number;
  lon: number;
}

export interface ITimeBucketRow {
  id: number;
  name: string;
  sort_order: number;
}

export interface ICskuRow {
  product_group_external_id: string;
}

export interface ITotalInfoRow {
  section: string | null;
  key: string | null;
  value: string | null;
}

export interface IMapLocationData {
  externalId: string;
  name: string;
  locationType: string;
  city: string;
  lat: number;
  lon: number;
  endStock: number | null;
  productionVolume: number | null;
  hasProductionForCsku: boolean;
}

export interface IMapRoute {
  fromExternalId: string;
  toExternalId: string;
  hasAnyMovement: boolean;
  currentQuantity: number;
}

export interface IMapDataResponse {
  locationData: IMapLocationData[];
  routes: IMapRoute[];
}

@Injectable()
export class ApiService {
  constructor(private readonly db: DbService) {}

  getLocations(): Promise<ILocationRow[]> {
    return this.db.query<ILocationRow>(
      `SELECT external_id, name, location_type, city, lat, lon FROM locations ORDER BY id`
    );
  }

  getTimeBuckets(): Promise<ITimeBucketRow[]> {
    return this.db.query<ITimeBucketRow>(
      `SELECT id, name, sort_order FROM time_buckets ORDER BY sort_order ASC`
    );
  }

  getCskus(): Promise<ICskuRow[]> {
    return this.db.query<ICskuRow>(
      `SELECT DISTINCT product_group_external_id
       FROM resource_balance
       WHERE product_group_external_id IS NOT NULL
         AND product_group_external_id LIKE 'CSKU%'
       ORDER BY product_group_external_id ASC`
    );
  }

  getTotalInfo(): Promise<ITotalInfoRow[]> {
    return this.db.query<ITotalInfoRow>(
      `SELECT section, key, value FROM total_info ORDER BY id ASC`
    );
  }

  async getMapData(csku: string, tb: string): Promise<IMapDataResponse> {
    const locations = await this.getLocations();

    const endStockRows = await this.db.query<{
      warehouse_external_id: string;
      quantity: number | null;
    }>(
      `SELECT warehouse_external_id, SUM(quantity)::float8 AS quantity
       FROM resource_balance
       WHERE product_group_external_id = $1
         AND time_bucket_name = $2
         AND record_type = 'END'
       GROUP BY warehouse_external_id`,
      [csku, tb]
    );
    const endStockMap = new Map<string, number>(
      endStockRows.map((r) => [r.warehouse_external_id, Number(r.quantity ?? 0)])
    );

    const prodRows = await this.db.query<{
      factory_external_id: string;
      production_volume: number | null;
    }>(
      `SELECT factory_external_id, SUM(production_volume)::float8 AS production_volume
       FROM final_productions
       WHERE product_group_external_id = $1
         AND time_bucket = $2
       GROUP BY factory_external_id`,
      [csku, tb]
    );
    const prodMap = new Map<string, number>(
      prodRows.map((r) => [r.factory_external_id, Number(r.production_volume ?? 0)])
    );

    const anyProdRows = await this.db.query<{ factory_external_id: string }>(
      `SELECT DISTINCT factory_external_id
       FROM final_productions
       WHERE product_group_external_id = $1`,
      [csku]
    );
    const anyProdSet = new Set<string>(anyProdRows.map((r) => r.factory_external_id));

    const locationData: IMapLocationData[] = locations.map((loc) => {
      const isFactory = loc.location_type === 'Завод';
      const endStock = endStockMap.has(loc.external_id)
        ? endStockMap.get(loc.external_id) ?? null
        : null;
      const productionVolume = isFactory
        ? prodMap.has(loc.external_id)
          ? prodMap.get(loc.external_id) ?? null
          : null
        : null;
      const hasProductionForCsku = isFactory ? anyProdSet.has(loc.external_id) : false;
      return {
        externalId: loc.external_id,
        name: loc.name,
        locationType: loc.location_type,
        city: loc.city,
        lat: Number(loc.lat),
        lon: Number(loc.lon),
        endStock,
        productionVolume,
        hasProductionForCsku,
      };
    });

    const routeRows = await this.db.query<{
      location_from_external_id: string;
      location_to_external_id: string;
      has_any: boolean;
      current_qty: number | null;
    }>(
      `SELECT location_from_external_id,
              location_to_external_id,
              TRUE AS has_any,
              COALESCE(SUM(CASE WHEN departure_bucket = $2 THEN quantity ELSE 0 END), 0)::float8 AS current_qty
       FROM movements
       WHERE product_group_external_id = $1
         AND location_from_external_id IS NOT NULL
         AND location_to_external_id IS NOT NULL
       GROUP BY location_from_external_id, location_to_external_id`,
      [csku, tb]
    );

    const routes: IMapRoute[] = routeRows.map((r) => ({
      fromExternalId: r.location_from_external_id,
      toExternalId: r.location_to_external_id,
      hasAnyMovement: true,
      currentQuantity: Number(r.current_qty ?? 0),
    }));

    return { locationData, routes };
  }

  getResourceBalance(csku: string, warehouse: string, tb: string): Promise<Record<string, unknown>[]> {
    return this.db.query<Record<string, unknown>>(
      `SELECT * FROM resource_balance
       WHERE product_group_external_id = $1
         AND warehouse_external_id = $2
         AND time_bucket_name = $3
       ORDER BY id ASC`,
      [csku, warehouse, tb]
    );
  }

  getMovements(csku: string, from: string, to: string, tb: string): Promise<Record<string, unknown>[]> {
    return this.db.query<Record<string, unknown>>(
      `SELECT * FROM movements
       WHERE product_group_external_id = $1
         AND location_from_external_id = $2
         AND location_to_external_id = $3
         AND departure_bucket = $4
       ORDER BY id ASC`,
      [csku, from, to, tb]
    );
  }

  getFinalProductions(csku: string, factory: string, tb: string): Promise<Record<string, unknown>[]> {
    return this.db.query<Record<string, unknown>>(
      `SELECT * FROM final_productions
       WHERE product_group_external_id = $1
         AND factory_external_id = $2
         AND time_bucket = $3
       ORDER BY id ASC`,
      [csku, factory, tb]
    );
  }

  async getFactoryLoad(
    factory: string,
    tb: string
  ): Promise<{
    workcenterLoad: Record<string, unknown>[];
    secondaryResourceLoad: Record<string, unknown>[];
  }> {
    const workcenterLoad = await this.db.query<Record<string, unknown>>(
      `SELECT * FROM group_workcenter_load
       WHERE factory_external_id = $1 AND time_bucket = $2
       ORDER BY id ASC`,
      [factory, tb]
    );
    const secondaryResourceLoad = await this.db.query<Record<string, unknown>>(
      `SELECT * FROM secondary_resource_load
       WHERE factory_external_id = $1 AND time_bucket = $2
       ORDER BY id ASC`,
      [factory, tb]
    );
    return { workcenterLoad, secondaryResourceLoad };
  }
}
