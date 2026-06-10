import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { JUser } from '@trungk18/interface/user';
import { TokenService } from '@trungk18/core/services/token.service';
import { Observable, of } from 'rxjs';
import { catchError, finalize, map, tap } from 'rxjs/operators';
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

  /** Returns an Observable<boolean>: true = server confirmed, false = offline fallback.
   *  Always clears local state — even if the API call fails. */
  logout(): Observable<boolean> {
    const refreshToken = this._token.getRefreshToken();
    return this._http.post<void>(`${this.base}/auth/logout`, { refreshToken }).pipe(
      tap(() => this._clearLocalState()),
      map(() => true as boolean),
      catchError(() => {
        this._clearLocalState();
        return of(false as boolean);
      })
    );
  }

  private _clearLocalState(): void {
    this._token.clearTokens();
    this._store.reset();
    localStorage.removeItem('selectedProjectId');
  }

  navigateToLogin(): void {
    this._router.navigate(['/login']);
  }

  isLoggedIn(): boolean {
    return !!this._token.getAccessToken();
  }
}
