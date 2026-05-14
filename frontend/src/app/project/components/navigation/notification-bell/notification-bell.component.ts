import { Component, OnInit, OnDestroy, HostListener, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { NzTooltipDirective } from 'ng-zorro-antd/tooltip';
import { NotificationService, AppNotification } from '@trungk18/core/services/notification.service';

@UntilDestroy()
@Component({
  selector: 'app-notification-bell',
  standalone: true,
  imports: [CommonModule, NzTooltipDirective],
  templateUrl: './notification-bell.component.html',
  styleUrls: ['./notification-bell.component.scss'],
})
export class NotificationBellComponent implements OnInit, OnDestroy {
  isOpen       = false;
  notifications: AppNotification[] = [];
  loading      = false;

  unreadCount$ = this._notifService.unreadCount$;

  constructor(
    private _notifService: NotificationService,
    private _router: Router,
    private _elRef: ElementRef
  ) {}

  ngOnInit(): void {}

  ngOnDestroy(): void {}

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this._elRef.nativeElement.contains(event.target)) {
      this.isOpen = false;
    }
  }

  toggleDropdown(): void {
    this.isOpen = !this.isOpen;
    if (this.isOpen && this.notifications.length === 0) {
      this.loadNotifications();
    }
  }

  loadNotifications(): void {
    this.loading = true;
    this._notifService.getNotifications(1, 15).pipe(untilDestroyed(this)).subscribe({
      next: ({ notifications }) => {
        this.notifications = notifications;
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  markRead(notif: AppNotification, event: MouseEvent): void {
    event.stopPropagation();
    if (!notif.isRead) {
      this._notifService.markRead(notif.id);
      notif.isRead = true;
    }
  }

  markAllRead(): void {
    this._notifService.markAllRead();
    this.notifications.forEach(n => n.isRead = true);
  }

  clickNotif(notif: AppNotification): void {
    if (!notif.isRead) {
      this._notifService.markRead(notif.id);
      notif.isRead = true;
    }
    if (notif.link) {
      this._router.navigateByUrl(notif.link);
    }
    this.isOpen = false;
  }

  goToAll(): void {
    this._router.navigate(['/project/notifications']);
    this.isOpen = false;
  }

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
