import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot } from '@angular/router';
import { Observable, of, combineLatest } from 'rxjs';
import { catchError, filter, switchMap, take, map } from 'rxjs/operators';
import { TokenService } from '@trungk18/core/services/token.service';
import { ProjectQuery } from './state/project/project.query';
import { ProjectService } from './state/project/project.service';
import { ProjectState } from './state/project/project.store';

@Injectable({ providedIn: 'root' })
export class ProjectGuard implements CanActivate {
  constructor(
    private _projectQuery: ProjectQuery,
    private _projectService: ProjectService,
    private _token: TokenService,
    private _router: Router
  ) {}

  canActivate(next: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean> {
    if (!this._token.getAccessToken()) {
      this._router.navigate(['/login']);
      return of(false);
    }
    return this.getFromStoreOrApi().pipe(
      switchMap(() => of(true)),
      catchError(() => of(false))
    );
  }

  getFromStoreOrApi(): Observable<ProjectState> {
    return combineLatest([this._projectQuery.all$, this._projectQuery.isLoading$]).pipe(
      map(([state, loading]) => {
        if (!loading && !state.id) {
          this._projectService.getProject();
        }
        return state;
      }),
      filter((state) => !!state.id),
      take(1),
      catchError((error) => of(error))
    );
  }
}
