import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from './api.service';
import { AuthService } from './auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-gray-100">
      <form
        (ngSubmit)="submit()"
        class="bg-white shadow-md rounded px-8 py-8 w-96 border border-gray-200"
      >
        <h1 class="text-xl font-semibold text-gray-900 mb-6">Supply Chain Heuristics</h1>
        <label class="block text-sm text-gray-700 mb-1">Email</label>
        <input
          type="email"
          name="email"
          [(ngModel)]="email"
          class="w-full border border-gray-300 rounded px-3 py-2 mb-4 text-sm"
          placeholder="user@example.com"
          required
        />
        <label class="block text-sm text-gray-700 mb-1">Password</label>
        <input
          type="password"
          name="password"
          [(ngModel)]="password"
          class="w-full border border-gray-300 rounded px-3 py-2 mb-4 text-sm"
          placeholder="••••••••"
          required
        />
        @if (error()) {
          <div class="text-red-600 text-xs mb-3">{{ error() }}</div>
        }
        <button
          type="submit"
          [disabled]="loading()"
          class="w-full bg-blue-600 hover:bg-blue-700 text-white rounded py-2 text-sm font-medium disabled:opacity-50"
        >
          {{ loading() ? 'Signing in…' : 'Sign in' }}
        </button>
        <p class="text-xs text-gray-500 mt-4">Any non-empty credentials will work (demo mode).</p>
      </form>
    </div>
  `,
})
export class LoginComponent {
  private api = inject(ApiService);
  private auth = inject(AuthService);

  email = '';
  password = '';
  loading = signal(false);
  error = signal<string | null>(null);

  submit(): void {
    const email = this.email.trim();
    const password = this.password.trim();
    if (!email || !password) {
      this.error.set('Email and password are required');
      return;
    }
    this.loading.set(true);
    this.error.set(null);
    this.api.login(email, password).subscribe({
      next: (res) => {
        this.auth.setSession(res.token, res.email);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Login failed');
        this.loading.set(false);
      },
    });
  }
}
