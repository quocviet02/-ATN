import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import {
  JWorkflow, WorkflowStats, AvailableTransitionsResult, StateHistoryEntry
} from '@trungk18/interface/workflow';

@Injectable({ providedIn: 'root' })
export class WorkflowService {
  private readonly _base = environment.apiUrl;

  constructor(private _http: HttpClient) {}

  // ── Workflow CRUD ─────────────────────────────────────────────────────────

  listWorkflows(projectId: string): Observable<JWorkflow[]> {
    return this._http.get<{ workflows: JWorkflow[] }>(`${this._base}/projects/${projectId}/workflows`)
      .pipe(map(r => r.workflows));
  }

  createWorkflow(projectId: string, body: Partial<JWorkflow>): Observable<JWorkflow> {
    return this._http.post<{ workflow: JWorkflow }>(`${this._base}/projects/${projectId}/workflows`, body)
      .pipe(map(r => r.workflow));
  }

  getWorkflow(id: string): Observable<{ workflow: JWorkflow; stats: WorkflowStats }> {
    return this._http.get<{ workflow: JWorkflow; stats: WorkflowStats }>(`${this._base}/workflows/${id}`);
  }

  updateWorkflow(id: string, body: Partial<JWorkflow>): Observable<JWorkflow> {
    return this._http.put<{ workflow: JWorkflow }>(`${this._base}/workflows/${id}`, body)
      .pipe(map(r => r.workflow));
  }

  deleteWorkflow(id: string): Observable<void> {
    return this._http.delete<void>(`${this._base}/workflows/${id}`);
  }

  cloneWorkflow(id: string, name: string): Observable<JWorkflow> {
    return this._http.post<{ workflow: JWorkflow }>(`${this._base}/workflows/${id}/clone`, { name })
      .pipe(map(r => r.workflow));
  }

  aiAnalyze(id: string): Observable<{ analysis: any; rawStats: any[] }> {
    return this._http.post<{ analysis: any; rawStats: any[] }>(`${this._base}/workflows/${id}/ai/analyze`, {});
  }

  // ── Task workflow ─────────────────────────────────────────────────────────

  getAvailableTransitions(taskId: string): Observable<AvailableTransitionsResult> {
    return this._http.get<AvailableTransitionsResult>(`${this._base}/tasks/${taskId}/available-transitions`);
  }

  getStateHistory(taskId: string): Observable<StateHistoryEntry[]> {
    return this._http.get<{ history: StateHistoryEntry[] }>(`${this._base}/tasks/${taskId}/state-history`)
      .pipe(map(r => r.history));
  }

  executeTransition(taskId: string, transitionId: string, comment = ''): Observable<{ task: any; status: string }> {
    return this._http.post<{ task: any; status: string }>(`${this._base}/tasks/${taskId}/transitions`, { transitionId, comment });
  }

  approveTransition(taskId: string, transitionId: string, decision: 'approve' | 'reject', comment = ''): Observable<{ task: any; status: string }> {
    return this._http.post<{ task: any; status: string }>(`${this._base}/tasks/${taskId}/approve`, { transitionId, decision, comment });
  }

  assignWorkflow(taskId: string, workflowId: string): Observable<{ task: any }> {
    return this._http.post<{ task: any }>(`${this._base}/tasks/${taskId}/assign-workflow`, { workflowId });
  }
}
