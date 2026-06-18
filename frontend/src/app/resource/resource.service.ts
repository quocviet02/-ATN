import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { OrganizationService } from '../organization/organization.service';
import {
  JSkill, JUserSkill, JWorkCapacity, JUserWorkload,
  JOrgCapacityOverview, JTimeOff, JAssignmentCandidate, JSkillMatrixRow
} from '../interface/resource';

const BASE = environment.apiUrl;

@Injectable({ providedIn: 'root' })
export class ResourceService {
  constructor(
    private _http: HttpClient,
    private _orgSvc: OrganizationService,
  ) {}

  private get h(): HttpHeaders { return this._orgSvc.orgHeaders; }

  // ── Skills ──────────────────────────────────────────────────────────────────

  listSkills(params?: { category?: string; search?: string }): Observable<JSkill[]> {
    return this._http.get<JSkill[]>(`${BASE}/skills`, { params: params as any });
  }

  seedSkills(): Observable<any> {
    return this._http.post(`${BASE}/skills/seed`, {});
  }

  getUserSkills(userId: string): Observable<JUserSkill[]> {
    return this._http.get<JUserSkill[]>(`${BASE}/skills/users/${userId}/skills`);
  }

  updateUserSkills(userId: string, skills: Partial<JUserSkill>[]): Observable<JUserSkill[]> {
    return this._http.put<JUserSkill[]>(`${BASE}/skills/users/${userId}/skills`, skills);
  }

  removeUserSkill(userId: string, skillId: string): Observable<any> {
    return this._http.delete(`${BASE}/skills/users/${userId}/skills/${skillId}`);
  }

  endorseSkill(userId: string, skillId: string): Observable<JUserSkill> {
    return this._http.post<JUserSkill>(`${BASE}/skills/users/${userId}/skills/${skillId}/endorse`, {});
  }

  getOrgSkillsMatrix(orgId: string): Observable<{ matrix: JSkillMatrixRow[]; skills: JSkill[] }> {
    return this._http.get<any>(`${BASE}/skills/organizations/${orgId}/skills-matrix`, { headers: this.h });
  }

  // ── Capacity & Workload ──────────────────────────────────────────────────────

  getUserCapacity(userId: string): Observable<{ user: any; capacity: JWorkCapacity }> {
    return this._http.get<any>(`${BASE}/users/${userId}/capacity`);
  }

  updateUserCapacity(userId: string, capacity: Partial<JWorkCapacity>): Observable<any> {
    return this._http.put(`${BASE}/users/${userId}/capacity`, capacity);
  }

  getUserWorkload(userId: string, weeks = 8): Observable<JUserWorkload> {
    return this._http.get<JUserWorkload>(`${BASE}/users/${userId}/workload?weeks=${weeks}`);
  }

  getOrgCapacityOverview(): Observable<JOrgCapacityOverview> {
    return this._http.get<JOrgCapacityOverview>(
      `${BASE}/organizations/${this._orgSvc.currentOrgId}/capacity-overview`,
      { headers: this.h }
    );
  }

  getProjectWorkload(projectId: string): Observable<any[]> {
    return this._http.get<any[]>(`${BASE}/projects/${projectId}/workload`);
  }

  // ── Time Off ────────────────────────────────────────────────────────────────

  listMyTimeOff(): Observable<JTimeOff[]> {
    return this._http.get<JTimeOff[]>(`${BASE}/timeoffs/my`);
  }

  listTimeOff(params?: any): Observable<JTimeOff[]> {
    return this._http.get<JTimeOff[]>(`${BASE}/timeoffs`, { params });
  }

  createTimeOff(data: Partial<JTimeOff>): Observable<JTimeOff> {
    return this._http.post<JTimeOff>(`${BASE}/timeoffs`, {
      ...data,
      organizationId: this._orgSvc.currentOrgId,
    });
  }

  approveTimeOff(id: string): Observable<JTimeOff> {
    return this._http.put<JTimeOff>(`${BASE}/timeoffs/${id}/approve`, {});
  }

  rejectTimeOff(id: string): Observable<JTimeOff> {
    return this._http.put<JTimeOff>(`${BASE}/timeoffs/${id}/reject`, {});
  }

  cancelTimeOff(id: string): Observable<JTimeOff> {
    return this._http.put<JTimeOff>(`${BASE}/timeoffs/${id}/cancel`, {});
  }

  getOrgTimeOffCalendar(startDate: string, endDate: string): Observable<JTimeOff[]> {
    return this._http.get<JTimeOff[]>(
      `${BASE}/timeoffs/organizations/${this._orgSvc.currentOrgId}/calendar`,
      { headers: this.h, params: { startDate, endDate } }
    );
  }

  // ── Assignments ─────────────────────────────────────────────────────────────

  getTaskAssignments(taskId: string): Observable<any[]> {
    return this._http.get<any[]>(`${BASE}/tasks/${taskId}/assignments`);
  }

  createAssignment(taskId: string, data: any): Observable<any> {
    return this._http.post(`${BASE}/tasks/${taskId}/assignments`, data);
  }

  logTime(assignmentId: string, hours: number): Observable<any> {
    return this._http.post(`${BASE}/assignments/${assignmentId}/log-time`, { hours });
  }

  // ── AI ──────────────────────────────────────────────────────────────────────

  getAiRecommendAssignee(taskId: string): Observable<{ candidates: JAssignmentCandidate[]; taskSkillsDetected: string[] }> {
    return this._http.post<any>(`${BASE}/tasks/${taskId}/ai/recommend-assignee`, {});
  }

  getAiRebalance(projectId: string): Observable<any> {
    return this._http.post(`${BASE}/projects/${projectId}/ai/rebalance`, {});
  }

  getAiBurnoutPrediction(): Observable<any> {
    return this._http.get(`${BASE}/organizations/${this._orgSvc.currentOrgId}/ai/burnout-prediction`, { headers: this.h });
  }
}
