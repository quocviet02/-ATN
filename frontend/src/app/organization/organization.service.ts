import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { environment } from 'src/environments/environment';
import { JDepartment, JOrganization, JOrgMember, OrgRole } from '@trungk18/interface/organization';

@Injectable({ providedIn: 'root' })
export class OrganizationService {
  private base = environment.apiUrl;

  private _currentOrgId$ = new BehaviorSubject<string | null>(
    localStorage.getItem('currentOrgId')
  );
  readonly currentOrgId$ = this._currentOrgId$.asObservable();

  constructor(private _http: HttpClient) {}

  get currentOrgId(): string | null {
    return this._currentOrgId$.value;
  }

  get orgHeaders(): HttpHeaders {
    const orgId = this.currentOrgId;
    return orgId ? new HttpHeaders({ 'X-Org-Id': orgId }) : new HttpHeaders();
  }

  // ─── Organization ────────────────────────────────────────────────────────────

  getMyOrganizations(): Observable<{ organizations: JOrganization[] }> {
    return this._http.get<{ organizations: JOrganization[] }>(`${this.base}/organizations/my`);
  }

  createOrganization(data: Partial<JOrganization>): Observable<{ organization: JOrganization }> {
    return this._http.post<{ organization: JOrganization }>(`${this.base}/organizations`, data);
  }

  getOrganization(id: string): Observable<{ organization: JOrganization; myRole: OrgRole }> {
    return this._http.get<{ organization: JOrganization; myRole: OrgRole }>(
      `${this.base}/organizations/${id}`,
      { headers: this.orgHeaders }
    );
  }

  updateOrganization(id: string, data: Partial<JOrganization>): Observable<{ organization: JOrganization }> {
    return this._http.put<{ organization: JOrganization }>(
      `${this.base}/organizations/${id}`,
      data,
      { headers: this.orgHeaders }
    );
  }

  deleteOrganization(id: string): Observable<any> {
    return this._http.delete(`${this.base}/organizations/${id}`, { headers: this.orgHeaders });
  }

  switchOrganization(id: string): Observable<{ currentOrganizationId: string; orgRole: OrgRole }> {
    return this._http.post<{ currentOrganizationId: string; orgRole: OrgRole }>(
      `${this.base}/organizations/${id}/switch`,
      {}
    ).pipe(
      tap(res => {
        localStorage.setItem('currentOrgId', res.currentOrganizationId);
        this._currentOrgId$.next(res.currentOrganizationId);
      })
    );
  }

  transferOwnership(id: string, newOwnerId: string): Observable<any> {
    return this._http.post(
      `${this.base}/organizations/${id}/transfer-ownership`,
      { newOwnerId },
      { headers: this.orgHeaders }
    );
  }

  // ─── Department ──────────────────────────────────────────────────────────────

  getDepartments(orgId: string): Observable<{ departments: JDepartment[]; tree: JDepartment[] }> {
    return this._http.get<{ departments: JDepartment[]; tree: JDepartment[] }>(
      `${this.base}/organizations/${orgId}/departments`,
      { headers: this.orgHeaders }
    );
  }

  createDepartment(orgId: string, data: Partial<JDepartment>): Observable<{ department: JDepartment }> {
    return this._http.post<{ department: JDepartment }>(
      `${this.base}/organizations/${orgId}/departments`,
      data,
      { headers: this.orgHeaders }
    );
  }

  updateDepartment(id: string, data: Partial<JDepartment>): Observable<{ department: JDepartment }> {
    return this._http.put<{ department: JDepartment }>(
      `${this.base}/departments/${id}`,
      data,
      { headers: this.orgHeaders }
    );
  }

  deleteDepartment(id: string): Observable<any> {
    return this._http.delete(`${this.base}/departments/${id}`, { headers: this.orgHeaders });
  }

  getDepartmentMembers(id: string): Observable<{ members: JOrgMember[] }> {
    return this._http.get<{ members: JOrgMember[] }>(
      `${this.base}/departments/${id}/members`,
      { headers: this.orgHeaders }
    );
  }

  // ─── Members ─────────────────────────────────────────────────────────────────

  getMembers(orgId: string, params?: any): Observable<{ members: JOrgMember[]; total: number }> {
    return this._http.get<{ members: JOrgMember[]; total: number }>(
      `${this.base}/organizations/${orgId}/members`,
      { headers: this.orgHeaders, params }
    );
  }

  inviteMember(orgId: string, data: { email: string; orgRole?: OrgRole; departmentId?: string; jobTitle?: string }): Observable<{ member: JOrgMember }> {
    return this._http.post<{ member: JOrgMember }>(
      `${this.base}/organizations/${orgId}/members/invite`,
      data,
      { headers: this.orgHeaders }
    );
  }

  bulkInvite(orgId: string, members: any[]): Observable<any> {
    return this._http.post(
      `${this.base}/organizations/${orgId}/members/bulk-invite`,
      { members },
      { headers: this.orgHeaders }
    );
  }

  updateMember(orgId: string, userId: string, data: any): Observable<{ member: JOrgMember }> {
    return this._http.put<{ member: JOrgMember }>(
      `${this.base}/organizations/${orgId}/members/${userId}`,
      data,
      { headers: this.orgHeaders }
    );
  }

  removeMember(orgId: string, userId: string): Observable<any> {
    return this._http.delete(
      `${this.base}/organizations/${orgId}/members/${userId}`,
      { headers: this.orgHeaders }
    );
  }

  suspendMember(orgId: string, userId: string): Observable<any> {
    return this._http.post(
      `${this.base}/organizations/${orgId}/members/${userId}/suspend`,
      {},
      { headers: this.orgHeaders }
    );
  }

  activateMember(orgId: string, userId: string): Observable<any> {
    return this._http.post(
      `${this.base}/organizations/${orgId}/members/${userId}/activate`,
      {},
      { headers: this.orgHeaders }
    );
  }
}
