import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { NotificationService, AppNotification } from '@trungk18/core/services/notification.service';

@UntilDestroy()
@Component({
  selector: 'app-notifications-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notifications.component.html',
  styleUrls: ['./notifications.component.scss'],
})
export class NotificationsComponent implements OnInit {
  notifications: AppNotification[] = [];
  loading   = false;
  page      = 1;
  limit     = 20;
  total     = 0;
  unreadOnly = false;

  constructor(private _notifService: NotificationService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this._notifService.getNotifications(this.page, this.limit, this.unreadOnly)
      .pipe(untilDestroyed(this))
      .subscribe({
        next: ({ notifications, total }) => {
          this.notifications = notifications;
          this.total         = total;
          this.loading       = false;
        },
        error: () => { this.loading = false; }
      });
  }

  toggleFilter(): void {
    this.unreadOnly = !this.unreadOnly;
    this.page = 1;
    this.load();
  }

  markAllRead(): void {
    this._notifService.markAllRead();
    this.notifications.forEach(n => n.isRead = true);
  }

  markRead(notif: AppNotification): void {
    if (!notif.isRead) {
      this._notifService.markRead(notif.id);
      notif.isRead = true;
    }
  }

  remove(notif: AppNotification): void {
    this._notifService.remove(notif.id).subscribe({
      next: () => {
        this.notifications = this.notifications.filter(n => n.id !== notif.id);
        this.total--;
      }
    });
  }

  prevPage(): void {
    if (this.page > 1) { this.page--; this.load(); }
  }

  nextPage(): void {
    if (this.page * this.limit < this.total) { this.page++; this.load(); }
  }

  get totalPages(): number { return Math.ceil(this.total / this.limit); }

  typeIcon(type: string): string {
    const map: Record<string, string> = {
      task_assigned:  '👤',
      task_due_soon:  '⚠️',
      task_overdue:   '🚨',
      comment_added:  '💬',
      member_invited: '✉️',
      member_joined:  '👋',
      task_moved:     '➡️',
      task_updated:   '✏️',
    };
    return map[type] ?? '🔔';
  }

  relativeTime(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1)  return 'Vừa xong';
    if (m < 60) return `${m} phút trước`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h} giờ trước`;
    const d = Math.floor(h / 24);
    return `${d} ngày trước`;
  }
}
