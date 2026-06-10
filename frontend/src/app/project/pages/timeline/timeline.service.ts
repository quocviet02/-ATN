import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

export interface TimelineTask {
  id: string;
  title: string;
  projectId: string;
  projectName: string;
  assignee: { id: string; name: string; avatar: string } | null;
  startDate: string | null;
  dueDate: string | null;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: string;
  progress: number;
  dependencies: string[];
  estimatedHours: number | null;
  actualHours: number | null;
  isDone: boolean;
}

export interface TimelineProject {
  id: string;
  name: string;
  ownerId: string;
  role: string;
  taskCount: number;
  minDate: string | null;
  maxDate: string | null;
  startDate: string | null;
  dueDate: string | null;
}

export interface ConflictData {
  overlaps: Array<{ assigneeId: string; assigneeName: string; tasks: TimelineTask[] }>;
  overdue: TimelineTask[];
  blocked: Array<{ task: TimelineTask; blockedBy: TimelineTask[] }>;
}

export interface TimelineFilters {
  search: string;
  assigneeIds: string[];
  priority: string[];
}

export type ViewMode = 'Day' | 'Week' | 'Month' | 'Year';

const SK = 'timeline_';

function saveLS(key: string, value: unknown) {
  try { localStorage.setItem(SK + key, JSON.stringify(value)); } catch {}
}

function loadLS<T>(key: string, def: T): T {
  try {
    const s = localStorage.getItem(SK + key);
    return s !== null ? (JSON.parse(s) as T) : def;
  } catch { return def; }
}

function defaultRange(): { start: string; end: string } {
  const start = new Date();
  start.setDate(1);
  const end = new Date(start);
  end.setMonth(end.getMonth() + 3);
  return { start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] };
}

@Injectable({ providedIn: 'root' })
export class TimelineService {
  private readonly _base = environment.apiUrl;

  readonly selectedProjects$ = new BehaviorSubject<string[]>(loadLS('selectedProjects', []));
  readonly viewMode$         = new BehaviorSubject<ViewMode>(loadLS('viewMode', 'Week'));
  readonly dateRange$        = new BehaviorSubject<{ start: string; end: string }>(loadLS('dateRange', defaultRange()));
  readonly tasks$            = new BehaviorSubject<TimelineTask[]>([]);
  readonly conflicts$        = new BehaviorSubject<ConflictData | null>(null);
  readonly filters$          = new BehaviorSubject<TimelineFilters>({ search: '', assigneeIds: [], priority: [] });
  readonly loading$          = new BehaviorSubject<boolean>(false);

  constructor(private _http: HttpClient) {
    this.selectedProjects$.subscribe(v => saveLS('selectedProjects', v));
    this.viewMode$.subscribe(v => saveLS('viewMode', v));
    this.dateRange$.subscribe(v => saveLS('dateRange', v));
  }

  getProjects(): Observable<TimelineProject[]> {
    return this._http.get<{ projects: TimelineProject[] }>(`${this._base}/timeline/projects`)
      .pipe(map(r => r.projects));
  }

  loadTasks(): void {
    const projectIds = this.selectedProjects$.value;
    if (!projectIds.length) { this.tasks$.next([]); return; }

    const range   = this.dateRange$.value;
    const filters = this.filters$.value;

    const params: Record<string, unknown> = {
      projectIds,
      startDate: range.start,
      endDate:   range.end,
    };
    if (filters.assigneeIds.length) params['assigneeIds'] = filters.assigneeIds;
    if (filters.priority.length)    params['priority']    = filters.priority;

    this.loading$.next(true);
    this._http.get<{ tasks: TimelineTask[] }>(`${this._base}/timeline/tasks`, { params: params as any })
      .pipe(map(r => r.tasks))
      .subscribe({
        next:  tasks => { this.tasks$.next(tasks); this.loading$.next(false); },
        error: ()    => this.loading$.next(false),
      });
  }

  rescheduleTask(taskId: string, startDate: string, dueDate: string): Observable<unknown> {
    return this._http.put(`${this._base}/timeline/tasks/${taskId}/reschedule`, { startDate, dueDate });
  }

  loadConflicts(): void {
    const projectIds = this.selectedProjects$.value;
    if (!projectIds.length) return;

    const range = this.dateRange$.value;
    this._http.get<ConflictData>(`${this._base}/timeline/conflicts`, {
      params: { projectIds, startDate: range.start, endDate: range.end } as any,
    }).subscribe({ next: data => this.conflicts$.next(data), error: () => {} });
  }

  getCriticalPath(projectId: string): Observable<{ criticalPath: unknown[]; totalDays: number }> {
    return this._http.get<{ criticalPath: unknown[]; totalDays: number }>(
      `${this._base}/timeline/critical-path/${projectId}`
    );
  }

  aiResolveConflict(conflictType: string, tasks: TimelineTask[]): Observable<{ suggestions: unknown[] }> {
    return this._http.post<{ suggestions: unknown[] }>(
      `${this._base}/timeline/ai/resolve-conflict`, { conflictType, tasks }
    );
  }

  get conflictCount(): number {
    const c = this.conflicts$.value;
    if (!c) return 0;
    return c.overdue.length + c.overlaps.length + c.blocked.length;
  }
}
