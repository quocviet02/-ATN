import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { arrayRemove, arrayUpsert } from '@datorama/akita';
import { JComment } from '@trungk18/interface/comment';
import { IssueStatus, IssuePriority, IssueType, JIssue } from '@trungk18/interface/issue';
import { JProject, ProjectCategory } from '@trungk18/interface/project';
import { JUser } from '@trungk18/interface/user';
import { forkJoin, of, Observable, Subject } from 'rxjs';
import { catchError, switchMap, tap, concatMap } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { MyPermissions, ProjectColumn, ProjectStore } from './project.store';

// Column position (0-based) → IssueStatus
const POSITION_STATUS: IssueStatus[] = [
  IssueStatus.BACKLOG,
  IssueStatus.SELECTED,
  IssueStatus.IN_PROGRESS,
  IssueStatus.DONE
];

function positionToStatus(pos: number): IssueStatus {
  return POSITION_STATUS[pos] ?? IssueStatus.DONE;
}

function mapPriority(p: string): IssuePriority {
  const map: Record<string, IssuePriority> = {
    low:      IssuePriority.LOW,
    medium:   IssuePriority.MEDIUM,
    high:     IssuePriority.HIGH,
    critical: IssuePriority.HIGHEST
  };
  return map[p] ?? IssuePriority.MEDIUM;
}

function backendPriority(p: IssuePriority): string {
  const map: Record<string, string> = {
    [IssuePriority.LOWEST]:  'low',
    [IssuePriority.LOW]:     'low',
    [IssuePriority.MEDIUM]:  'medium',
    [IssuePriority.HIGH]:    'high',
    [IssuePriority.HIGHEST]: 'critical'
  };
  return map[p] ?? 'medium';
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

function mapTask(task: any, columnIdToStatus: Record<string, IssueStatus>, projectId: string): JIssue {
  return {
    id:            task.id,
    title:         task.title,
    type:          IssueType.TASK,
    status:        columnIdToStatus[task.columnId] ?? IssueStatus.BACKLOG,
    priority:      mapPriority(task.priority),
    listPosition:  task.position ?? 0,
    description:   task.description || '',
    estimate:      0,
    timeSpent:     0,
    timeRemaining: 0,
    createdAt:     task.createdAt || '',
    updatedAt:     task.updatedAt || '',
    reporterId:    task.createdBy?.id || '',
    userIds:       task.assignee ? [task.assignee.id] : [],
    comments:      [],
    projectId,
    dueDate:        task.dueDate ? task.dueDate.split('T')[0] : undefined,
    workflowId:     task.workflowId     ?? null,
    currentStateId: task.currentStateId ?? null,
    slaBreached:    task.slaBreached    ?? false,
  };
}

const STORAGE_KEY = 'selectedProjectId';

@Injectable({ providedIn: 'root' })
export class ProjectService {
  baseUrl: string;

  /** Emits the issueId after a successful deletion (local or remote). */
  readonly issueDeleted$ = new Subject<string>();

  constructor(private _http: HttpClient, private _store: ProjectStore) {
    this.baseUrl = environment.apiUrl;
  }

  setLoading(isLoading: boolean) {
    this._store.setLoading(isLoading);
  }

  getProject() {
    this._store.setLoading(true);
    const savedId = localStorage.getItem(STORAGE_KEY);

    this._http.get<{ projects: any[] }>(`${this.baseUrl}/projects`).pipe(
      switchMap(({ projects }) => {
        if (!projects.length) {
          this._store.setLoading(false);
          return of(null);
        }
        const proj = (savedId ? projects.find(p => p.id === savedId) : null) ?? projects[0];
        if (!savedId) localStorage.setItem(STORAGE_KEY, proj.id);
        return this._loadProjectData(proj);
      }),
      catchError((err) => {
        this._store.setError(err);
        this._store.setLoading(false);
        return of(null);
      })
    ).subscribe(() => this._store.setLoading(false));
  }

  switchToProject(projectId: string): Observable<void> {
    localStorage.setItem(STORAGE_KEY, projectId);
    this._http.put(`${this.baseUrl}/projects/${projectId}/last-accessed`, {}).subscribe();
    this._store.setLoading(true);

    return this._http.get<{ projects: any[] }>(`${this.baseUrl}/projects`).pipe(
      switchMap(({ projects }) => {
        const proj = projects.find(p => p.id === projectId);
        if (!proj) {
          this._store.setLoading(false);
          return of(undefined as void);
        }
        return this._loadProjectData(proj).pipe(switchMap(() => of(undefined as void)));
      }),
      catchError((e) => {
        this._store.setError(e);
        this._store.setLoading(false);
        return of(undefined as void);
      }),
      tap(() => this._store.setLoading(false))
    );
  }

  private _loadProjectData(proj: any): Observable<any> {
    const myRole = proj.myRole ?? '';
    return forkJoin({
      boardsRes:  this._http.get<{ boards: any[] }>(`${this.baseUrl}/projects/${proj.id}/boards`),
      membersRes: this._http.get<{ members: any[] }>(`${this.baseUrl}/projects/${proj.id}/members`),
      myPermsRes: this._http.get<{ permissions: MyPermissions }>(`${this.baseUrl}/projects/${proj.id}/my-permissions`)
    }).pipe(
      switchMap(({ boardsRes, membersRes, myPermsRes }) => {
        const boards  = boardsRes.boards;
        const members = membersRes.members;
        const myPerms = myPermsRes.permissions;
        const users: JUser[] = members.map((m: any) => mapBackendUser(m.user));

        if (!boards.length) {
          this._applyProject(proj, myRole, '', {}, {}, [], [], users, myPerms);
          return of(null);
        }

        const boardId = boards[0].id;

        return this._http.get<{ board: any; columns: any[] }>(`${this.baseUrl}/projects/${proj.id}/boards/${boardId}`).pipe(
          tap(({ columns }) => {
            const columnIdToStatus: Record<string, IssueStatus> = {};
            const columnStatusToId: Record<string, string>      = {};
            const columnList: ProjectColumn[] = [];

            columns.forEach((col, idx) => {
              const status = positionToStatus(idx);
              columnIdToStatus[col.id] = status;
              if (!columnStatusToId[status]) columnStatusToId[status] = col.id;
              columnList.push({ id: col.id, name: col.name, status });
            });

            const issues: JIssue[] = [];
            columns.forEach((col) => {
              (col.tasks || []).forEach((t: any) => {
                issues.push(mapTask(t, columnIdToStatus, proj.id));
              });
            });

            this._applyProject(proj, myRole, boardId, columnIdToStatus, columnStatusToId, issues, columnList, users, myPerms);
          })
        );
      })
    );
  }

  private _applyProject(
    proj: any,
    myRole: string,
    boardId: string,
    columnIdToStatus: Record<string, IssueStatus>,
    columnStatusToId: Record<string, string>,
    issues: JIssue[],
    columns: ProjectColumn[],
    users: JUser[],
    myPermissions: MyPermissions
  ) {
    const project: JProject = {
      id:          proj.id,
      name:        proj.name,
      url:         '',
      description: proj.description || '',
      category:    proj.category ?? ProjectCategory.SOFTWARE,
      createdAt:   proj.createdAt,
      updateAt:    proj.updatedAt,
      background:  proj.background || '',
      startDate:   proj.startDate  || null,
      dueDate:     proj.dueDate    || null,
      issues,
      users
    };
    this._store.update({ ...project, myRole, boardId, columnIdToStatus, columnStatusToId, columns, myPermissions });
  }

  addColumn(name: string) {
    const { id: projectId, boardId } = this._store.getValue();
    if (!boardId) return;
    this._http.post<{ column: any }>(`${this.baseUrl}/projects/${projectId}/boards/${boardId}/columns`, { name }).pipe(
      tap(() => this.getProject())
    ).subscribe();
  }

  moveColumn(columnId: string, newPosition: number): void {
    const { id: projectId, boardId } = this._store.getValue();
    if (!boardId) return;
    this._http.put(
      `${this.baseUrl}/projects/${projectId}/boards/${boardId}/columns/${columnId}/move`,
      { newPosition }
    ).pipe(
      tap(() => this.getProject())
    ).subscribe();
  }

  deleteColumn(columnId: string) {
    const { id: projectId, boardId } = this._store.getValue();
    if (!boardId) return;
    this._http.delete(`${this.baseUrl}/projects/${projectId}/boards/${boardId}/columns/${columnId}`).pipe(
      tap(() => this.getProject())
    ).subscribe();
  }

  deleteProject() {
    const { id } = this._store.getValue();
    if (!id) return;
    return this._http.delete(`${this.baseUrl}/projects/${id}`);
  }

  setupNewProject(name: string, description = ''): Observable<void> {
    const DEFAULT_COLUMNS = ['Backlog', 'Selected for Development', 'In Progress', 'Done'];
    let newProjectId = '';
    return this._http.post<{ project: any }>(`${this.baseUrl}/projects`, { name, description }).pipe(
      switchMap(({ project }) => {
        newProjectId = project.id;
        localStorage.setItem(STORAGE_KEY, project.id);
        return this._http.post<{ board: any }>(`${this.baseUrl}/projects/${project.id}/boards`, { name: 'Kanban Board' }).pipe(
          switchMap(({ board }) => {
            const createCol$ = (colName: string) =>
              this._http.post(`${this.baseUrl}/projects/${project.id}/boards/${board.id}/columns`, { name: colName });
            return DEFAULT_COLUMNS.reduce(
              (acc$, colName) => acc$.pipe(concatMap(() => createCol$(colName))),
              of(null) as Observable<any>
            );
          })
        );
      }),
      switchMap(() => this.switchToProject(newProjectId))
    );
  }

  updateProject(project: Partial<JProject>) {
    const state = this._store.getValue();
    if (!state.id) return;
    this._http.put(`${this.baseUrl}/projects/${state.id}`, {
      name:        project.name,
      description: project.description,
      background:  project.background,
      startDate:   (project as any).startDate ?? undefined,
      dueDate:     (project as any).dueDate   ?? undefined,
    }).pipe(
      tap(() => this._store.update((s) => ({ ...s, ...project })))
    ).subscribe();
  }

  updateIssue(issue: JIssue) {
    const state     = this._store.getValue();
    const prevIssue = state.issues.find((x) => x.id === issue.id);

    if (!prevIssue) {
      const columnId = state.columnStatusToId[issue.status];
      if (!columnId) return;

      this._http.post<{ task: any }>(`${this.baseUrl}/columns/${columnId}/tasks`, {
        title:       issue.title,
        description: issue.description,
        priority:    backendPriority(issue.priority),
        assigneeId:  issue.userIds?.[0] ?? null
      }).pipe(
        tap(({ task }) => {
          const newIssue = mapTask(task, state.columnIdToStatus, state.id);
          this._store.update((s) => ({
            ...s,
            issues: arrayUpsert(s.issues, newIssue.id, newIssue)
          }));
        })
      ).subscribe();
      return;
    }

    const columnId     = state.columnStatusToId[issue.status];
    const prevColumnId = state.columnStatusToId[prevIssue.status];

    this._store.update((s) => ({ ...s, issues: arrayUpsert(s.issues, issue.id, issue) }));

    if (!columnId) return;

    const statusChanged   = prevColumnId && prevColumnId !== columnId;
    const positionChanged = prevIssue.listPosition !== issue.listPosition;

    if (statusChanged || positionChanged) {
      this._http.put(`${this.baseUrl}/tasks/${issue.id}/move`, {
        targetColumnId: columnId,
        newPosition:    issue.listPosition
      }).subscribe();
    } else {
      this._http.put(`${this.baseUrl}/tasks/${issue.id}`, {
        title:       issue.title,
        description: issue.description,
        priority:    backendPriority(issue.priority),
        assigneeId:  issue.userIds?.[0] ?? null,
        dueDate:     issue.dueDate || null
      }).subscribe();
    }
  }

  deleteIssue(issueId: string): Observable<{ message: string; taskId: string }> {
    return this._http.delete<{ message: string; taskId: string }>(`${this.baseUrl}/tasks/${issueId}`).pipe(
      tap(({ taskId }) => {
        this.removeIssueFromStore(taskId);
      })
    );
  }

  /** Remove task from local store and notify subscribers (e.g. open modals). */
  removeIssueFromStore(issueId: string): void {
    this._store.update((state) => ({ ...state, issues: arrayRemove(state.issues, issueId) }));
    this.issueDeleted$.next(issueId);
  }

  updateIssueComment(issueId: string, comment: JComment) {
    const allIssues = this._store.getValue().issues;
    const issue     = allIssues.find((x) => x.id === issueId);
    if (!issue) return;

    const isNew = !issue.comments?.some((c) => c.id === comment.id);

    if (isNew) {
      this._http.post<{ comment: any }>(`${this.baseUrl}/tasks/${issueId}/comments`, {
        content: comment.body
      }).pipe(
        tap(({ comment: c }) => {
          const mapped: JComment = { ...comment, id: c.id, createdAt: c.createdAt, updatedAt: c.updatedAt };
          const comments = arrayUpsert(issue.comments ?? [], mapped.id, mapped);
          this.updateIssueLocal({ ...issue, comments });
        })
      ).subscribe();
    } else {
      const comments = arrayUpsert(issue.comments ?? [], comment.id, comment);
      this.updateIssueLocal({ ...issue, comments });
    }
  }

  loadIssueComments(issueId: string): void {
    this._http.get<{ comments: any[] }>(`${this.baseUrl}/tasks/${issueId}/comments`)
      .subscribe({
        next: ({ comments }) => {
          const allIssues = this._store.getValue().issues;
          const issue     = allIssues.find((x) => x.id === issueId);
          if (!issue) return;

          const mapped: JComment[] = comments.map((c) => ({
            id:        c.id,
            body:      c.content,
            createdAt: c.createdAt,
            updatedAt: c.updatedAt,
            issueId:   c.taskId,
            userId:    c.user?.id || '',
            user:      c.user ? {
              id:        c.user.id,
              name:      c.user.name,
              email:     c.user.email,
              avatarUrl: c.user.avatar || '',
              createdAt: '',
              updatedAt: '',
              issueIds:  []
            } : null
          }));

          this.updateIssueLocal({ ...issue, comments: mapped });
        }
      });
  }

  editComment(commentId: string, issueId: string, content: string): Observable<void> {
    return this._http.put<{ comment: any }>(`${this.baseUrl}/comments/${commentId}`, { content }).pipe(
      tap(({ comment: c }) => {
        const issue = this._store.getValue().issues.find(x => x.id === issueId);
        if (!issue) return;
        const comments = (issue.comments || []).map(cm =>
          cm.id === commentId
            ? { ...cm, body: content, updatedAt: c.updatedAt || new Date().toISOString() }
            : cm
        );
        this.updateIssueLocal({ ...issue, comments });
      }),
      switchMap(() => of(undefined as void))
    );
  }

  deleteComment(commentId: string, issueId: string): Observable<void> {
    return this._http.delete(`${this.baseUrl}/comments/${commentId}`).pipe(
      tap(() => {
        const issue = this._store.getValue().issues.find(x => x.id === issueId);
        if (!issue) return;
        this.updateIssueLocal({ ...issue, comments: (issue.comments || []).filter(c => c.id !== commentId) });
      }),
      switchMap(() => of(undefined as void))
    );
  }

  private updateIssueLocal(issue: JIssue) {
    this._store.update((s) => ({ ...s, issues: arrayUpsert(s.issues, issue.id, issue) }));
  }
}
