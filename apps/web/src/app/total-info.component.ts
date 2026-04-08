import { Component, Input, signal } from '@angular/core';
import { ITotalInfoRow } from './types';

@Component({
  selector: 'app-total-info',
  standalone: true,
  template: `
    <div class="bg-white border border-gray-200 rounded shadow-sm">
      <button
        type="button"
        (click)="toggle()"
        class="w-full text-left px-3 py-2 text-sm font-semibold text-gray-800 border-b border-gray-200 hover:bg-gray-50"
      >
        {{ expanded() ? 'Total Info' : 'Show Info' }}
      </button>
      @if (expanded()) {
        <div class="max-h-96 overflow-y-auto">
          <table class="text-xs w-full">
            <tbody>
              @for (section of sections(); track section.name) {
                <tr class="bg-gray-50">
                  <td colspan="2" class="px-3 py-1 font-semibold text-gray-700">{{ section.name }}</td>
                </tr>
                @for (row of section.rows; track row.key) {
                  <tr class="border-t border-gray-100">
                    <td class="px-3 py-1 text-gray-600">{{ row.key }}</td>
                    <td class="px-3 py-1 font-mono text-right">{{ format(row.value) }}</td>
                  </tr>
                }
              }
            </tbody>
          </table>
        </div>
      }
    </div>
  `,
})
export class TotalInfoComponent {
  expanded = signal(true);
  @Input() set rows(value: ITotalInfoRow[]) {
    this._rows = value;
  }
  private _rows: ITotalInfoRow[] = [];

  toggle(): void {
    this.expanded.set(!this.expanded());
  }

  sections(): { name: string; rows: { key: string; value: string }[] }[] {
    const map = new Map<string, { key: string; value: string }[]>();
    for (const r of this._rows) {
      const name = r.section ?? '';
      const key = r.key ?? '';
      const value = r.value ?? '';
      if (!map.has(name)) map.set(name, []);
      map.get(name)!.push({ key, value });
    }
    return Array.from(map, ([name, rows]) => ({ name, rows }));
  }

  format(value: string): string {
    const n = Number(value);
    if (!Number.isFinite(n)) return value;
    if (Math.abs(n - Math.round(n)) < 1e-9) {
      return Math.round(n).toLocaleString('ru-RU');
    }
    return n.toLocaleString('ru-RU', { maximumFractionDigits: 2 });
  }
}
