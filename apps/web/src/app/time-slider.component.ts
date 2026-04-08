import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ITimeBucket } from './types';

@Component({
  selector: 'app-time-slider',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="flex items-center gap-3 w-full">
      <span class="text-xs text-gray-600">Week:</span>
      <span class="font-mono text-gray-600">{{ currentName() }}</span>
      <input
        type="range"
        min="0"
        [max]="maxIndex()"
        [ngModel]="index"
        (ngModelChange)="onChange($event)"
        class="flex-1"
      />
      <span class="text-xs text-gray-500">{{ index + 1 }} / {{ buckets.length }}</span>
    </div>
  `,
})
export class TimeSliderComponent {
  @Input() buckets: ITimeBucket[] = [];
  @Input() index = 0;
  @Output() indexChange = new EventEmitter<number>();

  maxIndex(): number {
    return Math.max(0, this.buckets.length - 1);
  }

  currentName(): string {
    return this.buckets[this.index]?.name ?? 'N/A';
  }

  onChange(v: number | string): void {
    const idx = Number(v);
    this.index = idx;
    this.indexChange.emit(idx);
  }
}
