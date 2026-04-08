import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import * as L from 'leaflet';
import { ILocation, IMapDataResponse, TEntitySelection } from './types';

const FACTORY_COLOR = '#3b82f6';
const WAREHOUSE_COLOR = '#10b981';
const ACTIVE_ROUTE_COLOR = '#1f2937';
const INACTIVE_ROUTE_COLOR = '#9ca3af';

function formatNumber(n: number): string {
  try {
    return Math.round(n).toLocaleString('ru-RU');
  } catch {
    return String(Math.round(n));
  }
}

@Component({
  selector: 'app-map',
  standalone: true,
  template: `<div #mapEl class="w-full h-full"></div>`,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
        height: 100%;
      }
    `,
  ],
})
export class MapComponent implements AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('mapEl', { static: true }) mapEl!: ElementRef<HTMLDivElement>;

  @Input() locations: ILocation[] = [];
  @Input() mapData: IMapDataResponse | null = null;
  @Input() selectedCsku: string | null = null;

  @Output() entitySelected = new EventEmitter<TEntitySelection>();

  private map: L.Map | null = null;
  private locationLayer: L.LayerGroup | null = null;
  private routeLayer: L.LayerGroup | null = null;
  private routeLabelLayer: L.LayerGroup | null = null;

  ngAfterViewInit(): void {
    this.map = L.map(this.mapEl.nativeElement, {
      center: [58, 75],
      zoom: 3,
      worldCopyJump: false,
      preferCanvas: false,
    });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 10,
      attribution: '&copy; OpenStreetMap',
    }).addTo(this.map);

    this.locationLayer = L.layerGroup().addTo(this.map);
    this.routeLayer = L.layerGroup().addTo(this.map);
    this.routeLabelLayer = L.layerGroup().addTo(this.map);

    this.renderAll();
  }

  ngOnChanges(_c: SimpleChanges): void {
    if (this.map) {
      this.renderAll();
    }
  }

  ngOnDestroy(): void {
    this.map?.remove();
    this.map = null;
  }

  private renderAll(): void {
    this.renderMarkers();
    this.renderRoutes();
  }

  private findLocationData(extId: string) {
    return this.mapData?.locationData.find((l) => l.externalId === extId) ?? null;
  }

  private renderMarkers(): void {
    if (!this.locationLayer) return;
    this.locationLayer.clearLayers();
    for (const loc of this.locations) {
      const data = this.findLocationData(loc.external_id);
      const isFactory = loc.location_type === 'Завод';
      const icon = isFactory
        ? this.buildFactoryIcon(loc, data)
        : this.buildWarehouseIcon(loc, data);
      const marker = L.marker([loc.lat, loc.lon], { icon });
      marker.on('click', () => {
        if (isFactory) {
          this.entitySelected.emit({
            kind: 'factory',
            externalId: loc.external_id,
            name: loc.name,
          });
        } else {
          this.entitySelected.emit({
            kind: 'warehouse',
            externalId: loc.external_id,
            name: loc.name,
          });
        }
      });
      this.locationLayer.addLayer(marker);
    }
  }

  private buildFactoryIcon(loc: ILocation, data: ReturnType<MapComponent['findLocationData']>): L.DivIcon {
    const volume = data?.productionVolume;
    const hasAny = data?.hasProductionForCsku ?? false;
    const dim = this.selectedCsku && !hasAny;
    const opacityStyle = dim ? 'opacity: 0.5;' : '';
    const volLine =
      volume !== null && volume !== undefined
        ? `<div style="font-size:11px;">${formatNumber(volume)}</div>`
        : '';
    const html = `
      <div style="background:${FACTORY_COLOR}; color:white; padding:4px 6px; border-radius:6px; border:2px solid #1e3a8a; text-align:center; white-space:nowrap; box-shadow:0 1px 3px rgba(0,0,0,0.3); ${opacityStyle}">
        <div style="font-size:11px; font-weight:600;">${loc.external_id}</div>
        ${volLine}
      </div>`;
    return L.divIcon({
      html,
      className: 'factory-div-icon',
      iconSize: [80, 40],
      iconAnchor: [40, 20],
    });
  }

  private buildWarehouseIcon(loc: ILocation, data: ReturnType<MapComponent['findLocationData']>): L.DivIcon {
    const stock = data?.endStock;
    const stockText =
      stock !== null && stock !== undefined ? formatNumber(stock) : '—';
    const html = `
      <div style="background:${WAREHOUSE_COLOR}; color:white; padding:4px 6px; border-radius:6px; border:2px solid #065f46; text-align:center; white-space:nowrap; box-shadow:0 1px 3px rgba(0,0,0,0.3);">
        <div style="font-size:11px; font-weight:600;">${loc.external_id}</div>
        <div style="font-size:11px;">Stock: ${stockText}</div>
      </div>`;
    return L.divIcon({
      html,
      className: 'warehouse-div-icon',
      iconSize: [90, 40],
      iconAnchor: [45, 20],
    });
  }

  private renderRoutes(): void {
    if (!this.routeLayer || !this.routeLabelLayer) return;
    this.routeLayer.clearLayers();
    this.routeLabelLayer.clearLayers();

    if (!this.selectedCsku || !this.mapData) return;

    const locIndex = new Map<string, ILocation>(
      this.locations.map((l) => [l.external_id, l])
    );

    for (const route of this.mapData.routes) {
      const fromLoc = locIndex.get(route.fromExternalId);
      const toLoc = locIndex.get(route.toExternalId);
      if (!fromLoc || !toLoc) continue;
      const isActive = route.currentQuantity > 0;
      const color = isActive ? ACTIVE_ROUTE_COLOR : INACTIVE_ROUTE_COLOR;
      const poly = L.polyline(
        [
          [fromLoc.lat, fromLoc.lon],
          [toLoc.lat, toLoc.lon],
        ],
        {
          color,
          weight: isActive ? 3 : 1.5,
          opacity: isActive ? 0.9 : 0.6,
          dashArray: isActive ? undefined : '4,4',
        }
      );
      poly.on('click', () => {
        this.entitySelected.emit({
          kind: 'route',
          from: route.fromExternalId,
          to: route.toExternalId,
          fromName: fromLoc.name,
          toName: toLoc.name,
        });
      });
      this.routeLayer.addLayer(poly);

      if (isActive) {
        const midLat = (fromLoc.lat + toLoc.lat) / 2;
        const midLon = (fromLoc.lon + toLoc.lon) / 2;
        const labelIcon = L.divIcon({
          html: `<div style="background:white; border:1px solid #1f2937; border-radius:3px; padding:1px 4px; font-size:10px; font-family:monospace; white-space:nowrap;">${formatNumber(route.currentQuantity)}</div>`,
          className: 'route-label-icon',
          iconSize: [60, 16],
          iconAnchor: [30, 8],
        });
        const labelMarker = L.marker([midLat, midLon], {
          icon: labelIcon,
          interactive: false,
        });
        this.routeLabelLayer.addLayer(labelMarker);
      }
    }
  }
}
