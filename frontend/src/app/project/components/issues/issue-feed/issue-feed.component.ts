import {
  Component, Input, OnInit, OnChanges, SimpleChanges,
  ViewChild, ElementRef, AfterViewChecked
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { JIssue } from '@trungk18/interface/issue';
import { JComment } from '@trungk18/interface/comment';
import { JUser } from '@trungk18/interface/user';
import { ProjectQuery } from '@trungk18/project/state/project/project.query';
import { ProjectService } from '@trungk18/project/state/project/project.service';
import { AuthQuery } from '@trungk18/project/auth/auth.query';
import { AvatarComponent } from '../../../../jira-control/avatar/avatar.component';
import { environment } from 'src/environments/environment';

export interface ActivityItem {
  id: string;
  action: string;
  oldValue: any;
  newValue: any;
  createdAt: string;
  user: { id: string; name: string; avatar?: string; avatarUrl?: string };
}

export interface FeedItem {
  feedType: 'comment' | 'activity';
  id: string;
  createdAt: string;
  updatedAt?: string;
  user: any;
  content?: string;
  action?: string;
  oldValue?: any;
  newValue?: any;
}

type Tab = 'all' | 'activity' | 'comments';

@UntilDestroy()
@Component({
  selector: 'issue-feed',
  standalone: true,
  imports: [CommonModule, FormsModule, AvatarComponent],
  templateUrl: './issue-feed.component.html',
  styleUrls: ['./issue-feed.component.scss'],
})
export class IssueFeedComponent implements OnInit, OnChanges, AfterViewChecked {
  @Input() issue: JIssue;
  @ViewChild('feedBody') feedBodyRef: ElementRef;

  tab: Tab = 'all';
  activities: ActivityItem[] = [];
  loadingActivities = false;

  currentUser: JUser | null = null;
  currentRole = '';

  newCommentText = '';
  commentFocused = false;
  submitting = false;

  editingId: string | null = null;
  editText = '';

  private _shouldScroll = false;

  constructor(
    private _http: HttpClient,
    private _projectQuery: ProjectQuery,
    private _projectService: ProjectService,
    private _authQuery: AuthQuery,
  ) {}

  ngOnInit(): void {
    this._authQuery.user$.pipe(untilDestroyed(this)).subscribe(u => { this.currentUser = u; });
    this._projectQuery.myRole$.pipe(untilDestroyed(this)).subscribe(r => { this.currentRole = r; });
  }

  ngOnChanges(changes: SimpleChanges): void {
    const c = changes['issue'];
    if (c?.currentValue?.id && c.currentValue.id !== c?.previousValue?.id) {
      this.activities = [];
      this.tab = 'all';
      this.loadActivities();
    }
  }

  ngAfterViewChecked(): void {
    if (this._shouldScroll) {
      this._shouldScroll = false;
      this.scrollToBottom();
    }
  }

  get comments(): JComment[] {
    return this.issue?.comments || [];
  }

  get allItems(): FeedItem[] {
    const acts: FeedItem[] = this.activities.map(a => ({
      feedType: 'activity' as const,
      id: a.id, createdAt: a.createdAt,
      user: a.user, action: a.action,
      oldValue: a.oldValue, newValue: a.newValue,
    }));
    const cmts: FeedItem[] = this.comments.map(c => ({
      feedType: 'comment' as const,
      id: c.id, createdAt: c.createdAt, updatedAt: c.updatedAt,
      user: c.user, content: c.body,
    }));
    return [...acts, ...cmts].sort((a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  }

  get commentsAsFeed(): FeedItem[] {
    return this.comments.map(c => ({
      feedType: 'comment' as const,
      id: c.id, createdAt: c.createdAt, updatedAt: c.updatedAt,
      user: c.user, content: c.body,
    }));
  }

  loadActivities(): void {
    if (!this.issue?.id) return;
    this.loadingActivities = true;
    this._http.get<{ activities: ActivityItem[] }>(`${environment.apiUrl}/tasks/${this.issue.id}/activities`)
      .pipe(untilDestroyed(this))
      .subscribe({
        next: ({ activities }) => { this.activities = activities; this.loadingActivities = false; },
        error: () => { this.loadingActivities = false; },
      });
  }

  submitComment(): void {
    const text = this.newCommentText.trim();
    if (!text || !this.currentUser || this.submitting) return;
    this.submitting = true;
    const now = new Date();
    const tempComment: JComment = {
      id:        `${now.getTime()}`,
      body:      text,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      issueId:   this.issue.id,
      userId:    this.currentUser.id,
      user:      this.currentUser,
    };
    this._projectService.updateIssueComment(this.issue.id, tempComment);
    this.newCommentText = '';
    this.commentFocused = false;
    this.submitting = false;
    this._shouldScroll = true;
  }

  onCommentKeydown(event: KeyboardEvent): void {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      this.submitComment();
    }
    if (event.key === 'Escape') {
      this.cancelComment();
    }
  }

  cancelComment(): void {
    this.newCommentText = '';
    this.commentFocused = false;
  }

  startEdit(item: FeedItem): void {
    this.editingId = item.id;
    this.editText = item.content || '';
  }

  cancelEdit(): void { this.editingId = null; this.editText = ''; }

  saveEdit(item: FeedItem): void {
    const content = this.editText.trim();
    if (!content) return;
    this._projectService.editComment(item.id, this.issue.id, content).subscribe({
      next: () => this.cancelEdit(),
      error: () => {},
    });
  }

  deleteItem(item: FeedItem): void {
    this._projectService.deleteComment(item.id, this.issue.id).subscribe({ error: () => {} });
  }

  canEdit(item: FeedItem): boolean {
    const uid = this.currentUser?.id;
    if (!uid) return false;
    const authorId = (item.user as any)?.id || (item.user as any)?._id;
    return uid === authorId;
  }

  canDelete(item: FeedItem): boolean {
    return this.canEdit(item) || ['owner', 'admin'].includes(this.currentRole);
  }

  isEdited(item: FeedItem): boolean {
    if (!item.updatedAt || !item.createdAt) return false;
    return Math.abs(new Date(item.updatedAt).getTime() - new Date(item.createdAt).getTime()) > 2000;
  }

  avatarOf(user: any): string {
    return user?.avatarUrl || user?.avatar || '';
  }

  activityText(act: any): string {
    const name = act.user?.name || 'Ai đó';
    switch (act.action) {
      case 'created':
        return `${name} đã tạo task này`;
      case 'moved': {
        const from = this.colName(act.oldValue?.columnId);
        const to   = this.colName(act.newValue?.columnId);
        return `${name} đã chuyển task từ "${from}" → "${to}"`;
      }
      case 'assigned': {
        const newId = act.newValue?.assigneeId;
        const oldId = act.oldValue?.assigneeId;
        if (newId)  return `${name} đã giao task cho ${this.userName(newId)}`;
        if (oldId)  return `${name} đã hủy giao task của ${this.userName(oldId)}`;
        return `${name} đã thay đổi người thực hiện`;
      }
      case 'updated': {
        const nv = act.newValue || {};
        const ov = act.oldValue || {};
        if ('priority' in nv)    return `${name} đã đổi độ ưu tiên từ "${ov.priority}" → "${nv.priority}"`;
        if ('dueDate' in nv)     return `${name} đã đổi deadline từ ${this.fmtDate(ov.dueDate)} → ${this.fmtDate(nv.dueDate)}`;
        if ('title' in nv)       return `${name} đã đổi tên từ "${ov.title}" → "${nv.title}"`;
        if ('description' in nv) return `${name} đã cập nhật mô tả`;
        return `${name} đã cập nhật task`;
      }
      case 'commented':
        return `${name} đã thêm bình luận`;
      case 'deleted':
        return `${name} đã xóa task`;
      default:
        return `${name} đã thực hiện thao tác`;
    }
  }

  relTime(dateStr: string): string {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1)  return 'Vừa xong';
    if (m < 60) return `${m} phút trước`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h} giờ trước`;
    const d = Math.floor(h / 24);
    if (d === 1) return 'Hôm qua';
    if (d < 7)   return `${d} ngày trước`;
    return new Date(dateStr).toLocaleDateString('vi-VN');
  }

  private colName(colId: string): string {
    if (!colId) return '...';
    return this._projectQuery.getValue().columns.find(c => c.id === colId)?.name || colId;
  }

  private userName(userId: string): string {
    if (!userId) return '...';
    return this._projectQuery.getValue().users.find(u => u.id === userId)?.name || userId;
  }

  private fmtDate(d: string): string {
    if (!d) return 'không có';
    return new Date(d).toLocaleDateString('vi-VN');
  }

  private scrollToBottom(): void {
    try {
      const el = this.feedBodyRef?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    } catch {}
  }
}
