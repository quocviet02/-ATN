import { Injectable } from '@angular/core';

const ACCESS_KEY  = 'accessToken';
const REFRESH_KEY = 'refreshToken';

@Injectable({ providedIn: 'root' })
export class TokenService {
  getAccessToken(): string | null  { return localStorage.getItem(ACCESS_KEY); }
  getRefreshToken(): string | null { return localStorage.getItem(REFRESH_KEY); }

  setTokens(accessToken: string, refreshToken: string): void {
    localStorage.setItem(ACCESS_KEY,  accessToken);
    localStorage.setItem(REFRESH_KEY, refreshToken);
  }

  setAccessToken(token: string): void { localStorage.setItem(ACCESS_KEY, token); }

  clearTokens(): void {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  }
}
