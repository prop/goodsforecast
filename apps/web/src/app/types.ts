export interface ILocation {
  external_id: string;
  name: string;
  location_type: string;
  city: string;
  lat: number;
  lon: number;
}

export interface ITimeBucket {
  id: number;
  name: string;
  sort_order: number;
}

export interface ICsku {
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

export type TEntitySelection =
  | { kind: 'factory'; externalId: string; name: string }
  | { kind: 'warehouse'; externalId: string; name: string }
  | { kind: 'route'; from: string; to: string; fromName: string; toName: string };
