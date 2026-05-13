import { Injectable } from '@angular/core';
import {
  HttpEvent, HttpHandler, HttpInterceptor, HttpRequest, HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError, filter, switchMap, take } from 'rxjs/operators';
import { Router } from '@angular/router';
import { TokenService } from '@trungk18/core/services/token.service';
import { environment } from 'src/environments/environment';

@Injectable()
export class JwtInterceptor implements HttpInterceptor {
  private refreshing = false;
  private refreshDone$ = new BehaviorSubject<string | null>(null);

  constructor(private _token: TokenService, private _router: Router) {}

  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    const token = this._token.getAccessToken();
    const authReq = token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

    return next.handle(authReq).pipe(
      catchError((err: HttpErrorResponse) => {
        if (err.status === 401 && err.error?.code === 'TOKEN_EXPIRED' && !req.url.includes('/auth/refresh-token')) {
          return this.handleExpired(req, next);
        }
        if (err.status === 401 && req.url.includes('/auth/refresh-token')) {
          this.logout();
        }
        return throwError(() => err);
      })
    );
  }

  private handleExpired(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    if (this.refreshing) {
      return this.refreshDone$.pipe(
        filter((t): t is string => t !== null),
        take(1),
        switchMap((newToken) => next.handle(req.clone({ setHeaders: { Authorization: `Bearer ${newToken}` } })))
      );
    }

    this.refreshing = true;
    this.refreshDone$.next(null);
    const refreshToken = this._token.getRefreshToken();

    return new Observable((observer) => {
      fetch(`${environment.apiUrl}/auth/refresh-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken })
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.accessToken) {
            this._token.setTokens(data.accessToken, data.refreshToken);
            this.refreshDone$.next(data.accessToken);
            this.refreshing = false;
            next.handle(req.clone({ setHeaders: { Authorization: `Bearer ${data.accessToken}` } }))
              .subscribe({ next: (e) => observer.next(e), error: (e) => observer.error(e), complete: () => observer.complete() });
          } else {
            this.logout();
            observer.error(new Error('Session expired'));
          }
        })
        .catch(() => { this.logout(); observer.error(new Error('Session expired')); });
    });
  }

  private logout(): void {
    this._token.clearTokens();
    this._router.navigate(['/login']);
  }
}
