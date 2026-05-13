import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { FormsModule } from '@angular/forms';
import { AsyncPipe, NgClass, NgFor, NgIf, UpperCasePipe } from '@angular/common';
import { ProjectQuery } from '@trungk18/project/state/project/project.query';
import { ProjectStore } from '@trungk18/project/state/project/project.store';
import { PermissionService } from '@trungk18/core/services/permission.service';
import { AvatarComponent } from '../../../jira-control/avatar/avatar.component';
import { BreadcrumbsComponent } from '../../../jira-control/breadcrumbs/breadcrumbs.component';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { environment } from 'src/environments/environment';

export interface MemberItem {
  memberId:        string;
  userId:          string;
  name:            string;
  email:           string;
  avatar:          string;
  role:            'owner' | 'admin' | 'member';
  canEditTask:     boolean;
  canDragTask:     boolean;
  canAssignSelf:   boolean;
  canAssignOthers: boolean;
}

@UntilDestroy()
@Component({
  templateUrl: './members.component.html',
  styleUrls:  ['./members.component.scss'],
  standalone: true,
  imports: [BreadcrumbsComponent, AvatarComponent, FormsModule, AsyncPipe, NgIf, NgFor, NgClass, UpperCasePipe]
})
export class MembersComponent implements OnInit {
  readonly breadcrumbs = ['Projects', 'Members'];

  members: MemberItem[] = [];
  loading  = false;
  myRole   = '';
  projectId = '';

  // Add-member form
  inviteEmail = '';
  inviteRole: 'admin' | 'member' = 'member';
  inviteError  = '';
  inviteLoading = false;

  readonly roleColors: Record<string, string> = {
    owner:  'badge-owner',
    admin:  'badge-admin',
    member: 'badge-member'
  };

  constructor(
    private _http: HttpClient,
    private _projectQuery: ProjectQuery,
    private _projectStore: ProjectStore,
    public  permissionService: PermissionService,
    private _notify: NzNotificationService
  ) {}

  ngOnInit(): void {
    this._projectQuery.all$.pipe(untilDestroyed(this)).subscribe(p => {
      if (p.id && p.id !== this.projectId) {
        this.projectId = p.id;
        this.loadMembers();
      }
    });
    this._projectQuery.myRole$.pipe(untilDestroyed(this)).subscribe(r => this.myRole = r);
  }

  loadMembers(): void {
    this.loading = true;
    this._http.get<{ members: any[] }>(`${environment.apiUrl}/projects/${this.projectId}/members`)
      .pipe(untilDestroyed(this))
      .subscribe({
        next: ({ members }) => {
          this.members = members.map(m => ({
            memberId:        m.id,
            userId:          m.user.id,
            name:            m.user.name,
            email:           m.user.email,
            avatar:          m.user.avatar || '',
            role:            m.role,
            canEditTask:     m.canEditTask     ?? false,
            canDragTask:     m.canDragTask     ?? false,
            canAssignSelf:   m.canAssignSelf   ?? false,
            canAssignOthers: m.canAssignOthers ?? false
          }));
          this.loading = false;
        },
        error: () => { this.loading = false; }
      });
  }

  inviteMember(): void {
    const email = this.inviteEmail.trim();
    if (!email) return;
    this.inviteLoading = true;
    this.inviteError   = '';

    this._http.post<{ member: any }>(
      `${environment.apiUrl}/projects/${this.projectId}/members`,
      { email, role: this.inviteRole }
    ).subscribe({
      next: ({ member }) => {
        this.members.push({
          memberId:        member.id,
          userId:          member.user.id,
          name:            member.user.name,
          email:           member.user.email,
          avatar:          member.user.avatar || '',
          role:            member.role,
          canEditTask:     false,
          canDragTask:     false,
          canAssignSelf:   false,
          canAssignOthers: false
        });

        // Sync mới thành viên vào project store để dropdown Assignees cập nhật ngay
        this._projectStore.update(s => ({
          ...s,
          users: [
            ...s.users,
            {
              id:        member.user.id,
              name:      member.user.name,
              email:     member.user.email,
              avatarUrl: member.user.avatar || '',
              createdAt: member.user.createdAt || '',
              updatedAt: member.user.updatedAt || '',
              issueIds:  []
            }
          ]
        }));

        this.inviteEmail   = '';
        this.inviteRole    = 'member';
        this.inviteLoading = false;
        this._notify.success('Đã thêm thành viên', `${member.user.name} đã được thêm vào project.`);
      },
      error: (err) => {
        this.inviteError   = err.error?.message || 'Không thể thêm thành viên.';
        this.inviteLoading = false;
      }
    });
  }

  changeRole(m: MemberItem, newRole: 'admin' | 'member'): void {
    this._http.put(`${environment.apiUrl}/projects/${this.projectId}/members/${m.userId}`, { role: newRole })
      .subscribe({
        next: () => {
          m.role = newRole;
          this._notify.success('Đã cập nhật', `Role của ${m.name} đã đổi thành ${newRole}.`);
        },
        error: (err) => this._notify.error('Lỗi', err.error?.message || 'Không thể đổi role.')
      });
  }

  removeMember(m: MemberItem): void {
    if (!confirm(`Xóa ${m.name} khỏi project?`)) return;
    this._http.delete(`${environment.apiUrl}/projects/${this.projectId}/members/${m.userId}`)
      .subscribe({
        next: () => {
          this.members = this.members.filter(x => x.userId !== m.userId);
          this._notify.success('Đã xóa', `${m.name} đã được xóa khỏi project.`);
        },
        error: (err) => this._notify.error('Lỗi', err.error?.message || 'Không thể xóa thành viên.')
      });
  }

  updatePermission(m: MemberItem, perm: 'canEditTask' | 'canDragTask' | 'canAssignSelf' | 'canAssignOthers', value: boolean): void {
    m[perm] = value;
    const body: Record<string, boolean> = {};
    body[perm] = value;
    this._http.put(`${environment.apiUrl}/projects/${this.projectId}/members/${m.userId}/permissions`, body)
      .subscribe({ error: (err) => this._notify.error('Lỗi', err.error?.message || 'Không thể cập nhật quyền.') });
  }

  grantAll(m: MemberItem): void {
    m.canEditTask = m.canDragTask = m.canAssignSelf = m.canAssignOthers = true;
    this._http.put(`${environment.apiUrl}/projects/${this.projectId}/members/${m.userId}/permissions`,
      { canEditTask: true, canDragTask: true, canAssignSelf: true, canAssignOthers: true })
      .subscribe({ error: (err) => this._notify.error('Lỗi', err.error?.message || 'Không thể cấp quyền.') });
  }

  revokeAll(m: MemberItem): void {
    m.canEditTask = m.canDragTask = m.canAssignSelf = m.canAssignOthers = false;
    this._http.put(`${environment.apiUrl}/projects/${this.projectId}/members/${m.userId}/permissions`,
      { canEditTask: false, canDragTask: false, canAssignSelf: false, canAssignOthers: false })
      .subscribe({ error: (err) => this._notify.error('Lỗi', err.error?.message || 'Không thể thu hồi quyền.') });
  }

  canChangeRole(m: MemberItem): boolean {
    if (m.role === 'owner') return false;
    return this.myRole === 'owner';
  }

  canRemove(m: MemberItem): boolean {
    if (m.role === 'owner') return false;
    if (this.myRole === 'owner') return true;
    if (this.myRole === 'admin' && m.role === 'member') return true;
    return false;
  }
}
