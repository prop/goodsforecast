import { Injectable, signal } from '@angular/core';

const TOKEN_KEY = 'auth-token';
const EMAIL_KEY = 'auth-email';

@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly token = signal<string | null>(this.read(TOKEN_KEY));
  readonly email = signal<string | null>(this.read(EMAIL_KEY));

  isAuthenticated(): boolean {
    return !!this.token();
  }

  setSession(token: string, email: string): void {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(EMAIL_KEY, email);
    this.token.set(token);
    this.email.set(email);
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(EMAIL_KEY);
    this.token.set(null);
    this.email.set(null);
  }

  private read(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }
}
