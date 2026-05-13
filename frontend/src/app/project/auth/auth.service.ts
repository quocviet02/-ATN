import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { JUser } from '@trungk18/interface/user';
import { TokenService } from '@trungk18/core/services/token.service';
import { finalize, tap } from 'rxjs/operators';
import { AuthStore } from './auth.store';
import { environment } from 'src/environments/environment';

interface LoginResponse {
  user: any;
  accessToken: string;
  refreshToken: string;
}

interface MeResponse {
  user: any;
}

function mapBackendUser(u: any): JUser {
  return {
    id:        u.id,
    name:      u.name,
    email:     u.email,
    avatarUrl: u.avatar || '',
    createdAt: u.createdAt || '',
    updatedAt: u.updatedAt || '',
    issueIds:  []
  };
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private base: string;

  constructor(
    private _http: HttpClient,
    private _store: AuthStore,
    private _token: TokenService,
    private _router: Router
  ) {
    this.base = environment.apiUrl;
  }

  login(email: string, password: string) {
    this._store.setLoading(true);
    return this._http.post<LoginResponse>(`${this.base}/auth/login`, { email, password }).pipe(
      tap(({ user, accessToken, refreshToken }) => {
        this._token.setTokens(accessToken, refreshToken);
        this._store.update({ ...mapBackendUser(user), accessToken, refreshToken });
      }),
      finalize(() => this._store.setLoading(false))
    );
  }

  register(name: string, email: string, password: string) {
    this._store.setLoading(true);
    return this._http.post<LoginResponse>(`${this.base}/auth/register`, { name, email, password }).pipe(
      tap(({ user, accessToken, refreshToken }) => {
        this._token.setTokens(accessToken, refreshToken);
        this._store.update({ ...mapBackendUser(user), accessToken, refreshToken });
      }),
      finalize(() => this._store.setLoading(false))
    );
  }

  loadMe() {
    return this._http.get<MeResponse>(`${this.base}/auth/me`).pipe(
      tap(({ user }) => this._store.update(mapBackendUser(user)))
    );
  }

  logout() {
    const refreshToken = this._token.getRefreshToken();
    this._http.post(`${this.base}/auth/logout`, { refreshToken }).subscribe();
    this._token.clearTokens();
    this._store.reset();
    this._router.navigate(['/login']);
  }

  isLoggedIn(): boolean {
    return !!this._token.getAccessToken();
  }
}
