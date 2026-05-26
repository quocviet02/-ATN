import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { FormsModule } from '@angular/forms';
import { AsyncPipe, DatePipe, NgClass, NgFor, NgIf, UpperCasePipe } from '@angular/common';
import { ProjectQuery } from '@trungk18/project/state/project/project.query';
import { ProjectStore } from '@trungk18/project/state/project/project.store';
import { PermissionService } from '@trungk18/core/services/permission.service';
import { AvatarComponent } from '../../../jira-control/avatar/avatar.component';
import { BreadcrumbsComponent } from '../../../jira-control/breadcrumbs/breadcrumbs.component';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { environment } from 'src/environments/environment';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

export interface InvitationItem {
  id:         string;
  email:      string;
  role:       'admin' | 'member';
  status:     string;
  expiredAt:  string;
  createdAt:  string;
}

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
  imports: [BreadcrumbsComponent, AvatarComponent, FormsModule, AsyncPipe, NgIf, NgFor, NgClass, UpperCasePipe, DatePipe, TranslateModule]
})
export class MembersComponent implements OnInit {
  readonly breadcrumbs = ['Projects', 'Members'];

  members: MemberItem[] = [];
  loading  = false;
  myRole   = '';
  projectId = '';

  // Invite form
  inviteEmail   = '';
  inviteRole: 'admin' | 'member' = 'member';
  inviteError   = '';
  inviteLoading = false;

  // Pending invitations
  pendingInvitations: InvitationItem[] = [];
  invitationsLoading = false;

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
    private _notify: NzNotificationService,
    private _translate: TranslateService
  ) {}

  ngOnInit(): void {
    this._projectQuery.all$.pipe(untilDestroyed(this)).subscribe(p => {
      if (p.id && p.id !== this.projectId) {
        this.projectId = p.id;
        this.loadMembers();
        this.loadInvitations();
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

    this._http.post<{ invitation: InvitationItem }>(
      `${environment.apiUrl}/projects/${this.projectId}/invitations`,
      { email, role: this.inviteRole }
    ).subscribe({
      next: ({ invitation }) => {
        this.pendingInvitations = [invitation, ...this.pendingInvitations];
        this.inviteEmail   = '';
        this.inviteRole    = 'member';
        this.inviteLoading = false;
        this._notify.success('Đã gửi lời mời', `Lời mời đã được gửi đến ${email}.`);
      },
      error: (err) => {
        this.inviteError   = err.error?.message || 'Không thể gửi lời mời.';
        this.inviteLoading = false;
      }
    });
  }

  loadInvitations(): void {
    this.invitationsLoading = true;
    this._http.get<{ invitations: InvitationItem[] }>(`${environment.apiUrl}/projects/${this.projectId}/invitations`)
      .pipe(untilDestroyed(this))
      .subscribe({
        next: ({ invitations }) => {
          this.pendingInvitations = invitations;
          this.invitationsLoading = false;
        },
        error: () => { this.invitationsLoading = false; }
      });
  }

  cancelInvitation(inv: InvitationItem): void {
    this._http.delete(`${environment.apiUrl}/projects/${this.projectId}/invitations/${inv.id}`)
      .subscribe({
        next: () => {
          this.pendingInvitations = this.pendingInvitations.filter(i => i.id !== inv.id);
          this._notify.success('Đã hủy', `Lời mời đến ${inv.email} đã được hủy.`);
        },
        error: (err) => this._notify.error('Lỗi', err.error?.message || 'Không thể hủy lời mời.')
      });
  }

  hoursLeft(expiredAt: string): number {
    return Math.max(0, Math.round((new Date(expiredAt).getTime() - Date.now()) / 3_600_000));
  }

  statusLabel(status: string): string {
    const key = `member.status.${status}`;
    const translated = this._translate.instant(key);
    return translated !== key ? translated : status;
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
