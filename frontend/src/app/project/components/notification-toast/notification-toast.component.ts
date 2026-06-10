import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { NotificationService, AppNotification } from '@trungk18/core/services/notification.service';

interface Toast extends AppNotification {
  _timerId?: ReturnType<typeof setTimeout>;
}

@UntilDestroy()
@Component({
  selector: 'app-notification-toast',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notification-toast.component.html',
  styleUrls: ['./notification-toast.component.scss'],
})
export class NotificationToastComponent implements OnInit, OnDestroy {
  toasts: Toast[] = [];

  constructor(private _notifService: NotificationService) {}

  ngOnInit(): void {
    this._notifService.toast$.pipe(untilDestroyed(this)).subscribe((notif) => {
      const toast: Toast = { ...notif };
      this.toasts.unshift(toast);
      toast._timerId = setTimeout(() => this.remove(toast), 4000);
    });
  }

  ngOnDestroy(): void {
    this.toasts.forEach(t => { if (t._timerId) clearTimeout(t._timerId); });
  }

  remove(toast: Toast): void {
    if (toast._timerId) clearTimeout(toast._timerId);
    this.toasts = this.toasts.filter(t => t !== toast);
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
      task_deleted:   '🗑️',
    };
    return map[type] ?? '🔔';
  }
}
