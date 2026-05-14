import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { TokenService } from '@trungk18/core/services/token.service';
import { environment } from 'src/environments/environment';

interface InvitationInfo {
  id: string;
  email: string;
  role: 'admin' | 'member';
  status: string;
  expiredAt: string;
  project: { id: string; name: string };
  invitedBy: { name: string; avatarUrl: string };
}

type PageState = 'loading' | 'idle' | 'accepting' | 'accepted' | 'rejected'
               | 'expired' | 'email_mismatch' | 'already_processed' | 'error';

@Component({
  selector: 'app-invite-accept',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './invite-accept.component.html',
  styleUrls: ['./invite-accept.component.scss']
})
export class InviteAcceptComponent implements OnInit {
  state: PageState = 'loading';
  invitation: InvitationInfo | null = null;
  projectId = '';
  errorMsg  = '';
  token     = '';

  constructor(
    private _route: ActivatedRoute,
    private _router: Router,
    private _http: HttpClient,
    private _token: TokenService
  ) {}

  ngOnInit(): void {
    this.token = this._route.snapshot.paramMap.get('token') ?? '';

    // Redirect to login if not authenticated
    if (!this._token.getAccessToken()) {
      this._router.navigate(['/login'], {
        queryParams: { returnUrl: `/invite/accept/${this.token}` }
      });
      return;
    }

    this.loadInvitation();
  }

  loadInvitation(): void {
    this._http.get<{ invitation: InvitationInfo }>(`${environment.apiUrl.replace('/api', '')}/api/invite/${this.token}`)
      .subscribe({
        next: ({ invitation }) => {
          this.invitation = invitation;
          if (invitation.status === 'expired')  { this.state = 'expired'; return; }
          if (invitation.status !== 'pending')  { this.state = 'already_processed'; return; }
          this.state = 'idle';
        },
        error: (e) => {
          this.errorMsg = e.error?.message || 'Lời mời không tồn tại hoặc đã bị xóa.';
          this.state = 'error';
        }
      });
  }

  accept(): void {
    this.state = 'accepting';
    this._http.post<{ projectId: string }>(`${environment.apiUrl.replace('/api', '')}/api/invite/${this.token}/accept`, {})
      .subscribe({
        next: ({ projectId }) => {
          this.projectId = projectId;
          this.state = 'accepted';
          setTimeout(() => this._router.navigate(['/project/board']), 2500);
        },
        error: (e) => {
          const status = e.status;
          if (status === 403) { this.state = 'email_mismatch'; return; }
          if (status === 410) { this.state = 'expired'; return; }
          this.errorMsg = e.error?.message || 'Có lỗi xảy ra.';
          this.state = 'error';
        }
      });
  }

  reject(): void {
    this._http.post(`${environment.apiUrl.replace('/api', '')}/api/invite/${this.token}/reject`, {})
      .subscribe({
        next: () => this.state = 'rejected',
        error: () => this.state = 'rejected'
      });
  }

  goHome(): void {
    this._router.navigate(['/project']);
  }

  get maskedEmail(): string {
    if (!this.invitation?.email) return '';
    const [local, domain] = this.invitation.email.split('@');
    const masked = local.length <= 2
      ? local[0] + '***'
      : local[0] + '***' + local[local.length - 1];
    return `${masked}@${domain}`;
  }

  get roleLabel(): string {
    return this.invitation?.role === 'admin' ? 'Admin' : 'Member';
  }
}
