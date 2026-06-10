import { Injectable } from '@angular/core';
import { combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { JIssue } from '@trungk18/interface/issue';
import { ProjectQuery } from '@trungk18/project/state/project/project.query';

@Injectable({ providedIn: 'root' })
export class PermissionService {
  readonly role$ = this._projectQuery.myRole$;

  readonly canManageBoard$   = this.role$.pipe(map(r => r === 'owner' || r === 'admin'));
  readonly canDeleteProject$ = this.role$.pipe(map(r => r === 'owner'));
  readonly canCreateTask$    = this.role$.pipe(map(r => r === 'owner' || r === 'admin'));

  readonly canEditTask$ = combineLatest([this.role$, this._projectQuery.myPermissions$]).pipe(
    map(([r, p]) => r === 'owner' || r === 'admin' || (p?.canEditTask ?? false))
  );
  readonly canDragTask$ = combineLatest([this.role$, this._projectQuery.myPermissions$]).pipe(
    map(([r, p]) => r === 'owner' || r === 'admin' || (p?.canDragTask ?? false))
  );
  readonly canAssignSelf$ = combineLatest([this.role$, this._projectQuery.myPermissions$]).pipe(
    map(([r, p]) => r === 'owner' || r === 'admin' || (p?.canAssignSelf ?? false))
  );
  readonly canAssignOthers$ = combineLatest([this.role$, this._projectQuery.myPermissions$]).pipe(
    map(([r, p]) => r === 'owner' || r === 'admin' || (p?.canAssignOthers ?? false))
  );

  constructor(private _projectQuery: ProjectQuery) {}

  canDeleteIssue(issue: JIssue, currentUserId: string | null, role: string): boolean {
    if (role === 'owner' || role === 'admin') return true;
    // Member can only delete tasks they created (reporterId = createdBy)
    return !!currentUserId && issue.reporterId === currentUserId;
  }

  canDragIssue(_issue: JIssue, _currentUserId: string | null, role: string): boolean {
    if (role === 'owner' || role === 'admin') return true;
    const perms = this._projectQuery.getValue().myPermissions;
    return perms?.canDragTask ?? false;
  }
}
