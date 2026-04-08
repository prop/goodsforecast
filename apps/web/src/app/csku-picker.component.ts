import { Component, EventEmitter, Input, Output, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ICsku } from './types';

@Component({
  selector: 'app-csku-picker',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="relative">
      <div class="flex items-center gap-2">
        <input
          type="text"
          placeholder="Search CSKU..."
          [ngModel]="query()"
          (ngModelChange)="onQueryChange($event)"
          (focus)="open.set(true)"
          (click)="open.set(true)"
          class="border border-gray-300 rounded px-3 py-1.5 text-sm w-56 focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        @if (selected && !hideBadge) {
          <span class="font-mono bg-blue-100 text-blue-900 px-2 py-1 rounded text-xs">{{ selected }}</span>
        }
      </div>
      @if (open()) {
        <div
          class="absolute z-[1000] bg-white border border-gray-200 rounded shadow-lg mt-1 max-h-64 overflow-y-auto w-56"
        >
          @if (filtered().length === 0) {
            <div class="px-3 py-2 text-xs text-gray-500">No results</div>
          } @else {
            @for (c of filtered(); track c) {
              <button
                type="button"
                class="font-mono block w-full text-left px-3 py-1.5 text-xs hover:bg-blue-50"
                (click)="choose(c)"
              >
                {{ c }}
              </button>
            }
          }
        </div>
      }
    </div>
  `,
})
export class CskuPickerComponent {
  @Input() set cskus(list: ICsku[]) {
    this.all.set(list.map((c) => c.product_group_external_id));
  }
  @Input() selected: string | null = null;
  @Input() hideBadge = false;
  @Output() selectedChange = new EventEmitter<string>();

  query = signal('');
  open = signal(false);
  private all = signal<string[]>([]);

  filtered = computed<string[]>(() => {
    const q = this.query().trim().toLowerCase();
    const base = this.all();
    const matched = q ? base.filter((c) => c.toLowerCase().includes(q)) : base;
    return matched.slice(0, 100);
  });

  onQueryChange(value: string): void {
    this.query.set(value);
    this.open.set(true);
  }

  choose(csku: string): void {
    this.selectedChange.emit(csku);
    this.query.set(csku);
    this.open.set(false);
  }
}
