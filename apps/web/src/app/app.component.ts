import { Component, computed, effect, inject, signal } from '@angular/core';
import { ApiService } from './api.service';
import { AuthService } from './auth.service';
import { LoginComponent } from './login.component';
import { MapComponent } from './map.component';
import { CskuPickerComponent } from './csku-picker.component';
import { TimeSliderComponent } from './time-slider.component';
import { TotalInfoComponent } from './total-info.component';
import { DetailCardComponent } from './detail-card.component';
import {
  ICsku,
  ILocation,
  IMapDataResponse,
  ITimeBucket,
  ITotalInfoRow,
  TEntitySelection,
} from './types';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    LoginComponent,
    MapComponent,
    CskuPickerComponent,
    TimeSliderComponent,
    TotalInfoComponent,
    DetailCardComponent,
  ],
  template: `
    @if (!auth.isAuthenticated()) {
      <app-login />
    } @else {
      <div class="h-screen w-screen flex flex-col">
        <header class="flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-white shadow-sm">
          <div class="flex items-center gap-4">
            <h1 class="text-sm font-semibold text-gray-800">Supply Chain Heuristics</h1>
            <app-csku-picker
              [cskus]="cskus()"
              [selected]="selectedCsku()"
              [hideBadge]="!!selectedEntity()"
              (selectedChange)="onCskuChange($event)"
            />
          </div>
          <div class="flex items-center gap-3">
            <span class="text-xs text-gray-500">{{ auth.email() }}</span>
            <button
              type="button"
              (click)="auth.logout()"
              class="text-xs text-gray-600 hover:text-gray-900 border border-gray-300 rounded px-2 py-1"
            >
              Log out
            </button>
          </div>
        </header>

        <div class="flex-1 flex min-h-0 relative">
          <div class="flex-1 relative">
            <app-map
              [locations]="locations()"
              [mapData]="mapData()"
              [selectedCsku]="selectedCsku()"
              (entitySelected)="onEntitySelected($event)"
            />
          </div>
          <aside class="w-80 border-l border-gray-200 bg-gray-50 overflow-y-auto p-2">
            <app-total-info [rows]="totalInfo()" />
          </aside>
          @if (selectedEntity()) {
            <div class="absolute top-2 right-[21rem] z-[1000]">
              <app-detail-card
                [entity]="selectedEntity()"
                [csku]="selectedCsku()"
                [tb]="selectedTbName()"
                (close)="selectedEntity.set(null)"
              />
            </div>
          }
        </div>

        <footer class="border-t border-gray-200 bg-white px-4 py-2">
          <app-time-slider
            [buckets]="timeBuckets()"
            [index]="selectedTbIndex()"
            (indexChange)="selectedTbIndex.set($event)"
          />
        </footer>
      </div>
    }
  `,
})
export class AppComponent {
  private api = inject(ApiService);
  auth = inject(AuthService);

  locations = signal<ILocation[]>([]);
  timeBuckets = signal<ITimeBucket[]>([]);
  cskus = signal<ICsku[]>([]);
  totalInfo = signal<ITotalInfoRow[]>([]);

  selectedCsku = signal<string | null>(null);
  selectedTbIndex = signal<number>(0);
  selectedTbName = computed<string | null>(() => {
    const buckets = this.timeBuckets();
    const idx = this.selectedTbIndex();
    return buckets[idx]?.name ?? null;
  });

  mapData = signal<IMapDataResponse | null>(null);
  selectedEntity = signal<TEntitySelection | null>(null);

  private bootstrapped = false;

  constructor() {
    // Bootstrap as soon as authenticated (covers page load and post-login).
    effect(() => {
      if (this.auth.isAuthenticated() && !this.bootstrapped) {
        this.bootstrapped = true;
        this.bootstrap();
      }
    });

    // Refetch map-data when csku+tb both present.
    effect(() => {
      const csku = this.selectedCsku();
      const tb = this.selectedTbName();
      if (!csku || !tb) {
        this.mapData.set(null);
        return;
      }
      this.api.getMapData(csku, tb).subscribe({
        next: (d) => this.mapData.set(d),
        error: () => this.mapData.set(null),
      });
    });
  }

  private bootstrap(): void {
    this.api.getLocations().subscribe((d) => this.locations.set(d));
    this.api.getTimeBuckets().subscribe((d) => {
      this.timeBuckets.set(d);
      if (d.length > 0) this.selectedTbIndex.set(0);
    });
    this.api.getCskus().subscribe((d) => this.cskus.set(d));
    this.api.getTotalInfo().subscribe((d) => this.totalInfo.set(d));
  }

  onCskuChange(csku: string): void {
    this.selectedCsku.set(csku);
    this.selectedEntity.set(null);
  }

  onEntitySelected(e: TEntitySelection): void {
    this.selectedEntity.set(e);
  }
}
