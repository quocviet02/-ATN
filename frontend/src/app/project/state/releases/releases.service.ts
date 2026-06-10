import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import {
  JRelease, OverviewResponse, ReleaseStatistics, ProjectStatus, ReleaseType,
} from '@trungk18/interface/release';

@Injectable({ providedIn: 'root' })
export class ReleasesService {
  private readonly _base = environment.apiUrl;

  constructor(private _http: HttpClient) {}

  getOverview(params?: { status?: ProjectStatus; role?: string; sortBy?: string }): Observable<OverviewResponse> {
    let p = new HttpParams();
    if (params?.status) p = p.set('status', params.status);
    if (params?.role)   p = p.set('role',   params.role);
    if (params?.sortBy) p = p.set('sortBy', params.sortBy);
    return this._http.get<OverviewResponse>(`${this._base}/releases/overview`, { params: p });
  }

  getTimeline(): Observable<{ releases: JRelease[] }> {
    return this._http.get<{ releases: JRelease[] }>(`${this._base}/releases/timeline`);
  }

  getStatistics(): Observable<ReleaseStatistics> {
    return this._http.get<ReleaseStatistics>(`${this._base}/releases/statistics`);
  }

  getProjectReleases(projectId: string, page = 1, limit = 20): Observable<{ releases: JRelease[]; total: number }> {
    const params = new HttpParams().set('page', page).set('limit', limit);
    return this._http.get<{ releases: JRelease[]; total: number }>(`${this._base}/projects/${projectId}/releases`, { params });
  }

  createRelease(projectId: string, body: {
    version: string;
    releaseDate: string;
    releaseNotes?: string;
    type?: ReleaseType;
    tasks?: string[];
  }): Observable<{ release: JRelease }> {
    return this._http.post<{ release: JRelease }>(`${this._base}/projects/${projectId}/releases`, body);
  }

  updateRelease(id: string, body: { releaseNotes?: string; status?: string }): Observable<{ release: JRelease }> {
    return this._http.put<{ release: JRelease }>(`${this._base}/releases/${id}`, body);
  }

  changeProjectStatus(projectId: string, status: ProjectStatus, note = ''): Observable<{ project: any }> {
    return this._http.post<{ project: any }>(`${this._base}/projects/${projectId}/status`, { status, note });
  }

  suggestVersion(projectId: string, type: ReleaseType = 'minor'): Observable<{ suggested: string }> {
    const params = new HttpParams().set('type', type);
    return this._http.get<{ suggested: string }>(`${this._base}/projects/${projectId}/suggest-version`, { params });
  }

  getDoneTasks(projectId: string): Observable<{ tasks: { id: string; title: string }[] }> {
    return this._http.get<{ tasks: { id: string; title: string }[] }>(`${this._base}/projects/${projectId}/done-tasks`);
  }
}
