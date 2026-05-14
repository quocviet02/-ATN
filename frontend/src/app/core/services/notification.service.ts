import { Injectable, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Subject } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { environment } from 'src/environments/environment';
import { TokenService } from './token.service';

export interface AppNotification {
  id:        string;
  type:      string;
  title:     string;
  body:      string;
  link:      string;
  isRead:    boolean;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class NotificationService implements OnDestroy {
  private _socket: Socket | null = null;

  readonly unreadCount$ = new BehaviorSubject<number>(0);
  readonly toast$       = new Subject<AppNotification>();

  private _baseUrl = environment.apiUrl;

  constructor(private _http: HttpClient, private _token: TokenService) {}

  connect(): void {
    if (this._socket?.connected) return;
    const token = this._token.getAccessToken();
    if (!token) return;

    const wsUrl = this._baseUrl.replace('/api', '');
    this._socket = io(wsUrl, {
      auth:              { token },
      transports:        ['websocket'],
      reconnection:      true,
      reconnectionDelay: 2000,
    });

    this._socket.on('notification', (notif: AppNotification) => {
      this.unreadCount$.next(this.unreadCount$.value + 1);
      this.toast$.next(notif);
    });

    this.fetchUnreadCount();
  }

  disconnect(): void {
    this._socket?.disconnect();
    this._socket = null;
  }

  fetchUnreadCount(): void {
    this._http.get<{ count: number }>(`${this._baseUrl}/notifications/unread-count`)
      .subscribe({ next: ({ count }) => this.unreadCount$.next(count), error: () => {} });
  }

  getNotifications(page = 1, limit = 20, unreadOnly = false) {
    const params: any = { page, limit };
    if (unreadOnly) params.unread = 'true';
    return this._http.get<{ notifications: AppNotification[]; total: number; page: number; limit: number }>(
      `${this._baseUrl}/notifications`, { params }
    );
  }

  markRead(id: string) {
    return this._http.put(`${this._baseUrl}/notifications/${id}/read`, {}).subscribe({
      next: () => {
        const current = this.unreadCount$.value;
        if (current > 0) this.unreadCount$.next(current - 1);
      },
      error: () => {}
    });
  }

  markAllRead() {
    return this._http.put(`${this._baseUrl}/notifications/read-all`, {}).subscribe({
      next: () => this.unreadCount$.next(0),
      error: () => {}
    });
  }

  remove(id: string) {
    return this._http.delete(`${this._baseUrl}/notifications/${id}`);
  }

  ngOnDestroy(): void {
    this.disconnect();
  }
}
