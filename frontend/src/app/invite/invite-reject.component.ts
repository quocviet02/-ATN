import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-invite-reject',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="invite-page">
      <div class="invite-card">
        <div class="invite-logo">📋 Project Manager</div>
        <div class="invite-center">
          @if (state === 'loading') {
            <div class="spinner"></div>
            <p class="invite-sub">Đang xử lý...</p>
          }
          @if (state === 'rejected') {
            <div class="state-icon neutral">✕</div>
            <h2 class="invite-title">Bạn đã từ chối lời mời</h2>
            <p class="invite-sub">Cảm ơn bạn đã phản hồi.</p>
            <button class="btn-home" (click)="goHome()">Về trang chủ</button>
          }
          @if (state === 'already_processed') {
            <div class="state-icon neutral">ℹ</div>
            <h2 class="invite-title">Lời mời này đã được xử lý</h2>
            <p class="invite-sub">Lời mời đã ở trạng thái: <strong>{{ status }}</strong></p>
            <button class="btn-home" (click)="goHome()">Về trang chủ</button>
          }
          @if (state === 'error') {
            <div class="state-icon error">✕</div>
            <h2 class="invite-title">Không tìm thấy lời mời</h2>
            <p class="invite-sub">{{ errorMsg }}</p>
            <button class="btn-home" (click)="goHome()">Về trang chủ</button>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .invite-page { min-height:100vh; background:linear-gradient(135deg,#f4f5f7 0%,#e8ecf4 100%); display:flex; align-items:center; justify-content:center; padding:24px; }
    .invite-card { background:#fff; border-radius:8px; box-shadow:0 4px 24px rgba(9,30,66,.15); padding:40px 44px; max-width:480px; width:100%; text-align:center; }
    .invite-logo { font-size:16px; font-weight:700; color:#0052cc; margin-bottom:28px; letter-spacing:-.2px; }
    .invite-center { display:flex; flex-direction:column; align-items:center; gap:10px; }
    .invite-title { font-size:20px; font-weight:700; color:#172b4d; margin:0 0 8px; }
    .invite-sub { font-size:14px; color:#42526e; margin:0; line-height:1.6; }
    .state-icon { width:56px; height:56px; border-radius:50%; font-size:22px; font-weight:700; display:flex; align-items:center; justify-content:center; margin-bottom:4px; }
    .neutral { background:#f4f5f7; color:#42526e; }
    .error { background:#ffebe6; color:#bf2600; }
    .btn-home { margin-top:16px; padding:10px 24px; background:#f4f5f7; color:#172b4d; border:none; border-radius:4px; font-size:14px; cursor:pointer; }
    .btn-home:hover { background:#dfe1e6; }
    .spinner { width:40px; height:40px; border:3px solid #dfe1e6; border-top-color:#0052cc; border-radius:50%; animation:spin .8s linear infinite; margin-bottom:8px; }
    @keyframes spin { to { transform:rotate(360deg); } }
  `]
})
export class InviteRejectComponent implements OnInit {
  state: 'loading' | 'rejected' | 'already_processed' | 'error' = 'loading';
  status   = '';
  errorMsg = '';
  token    = '';

  constructor(
    private _route: ActivatedRoute,
    private _router: Router,
    private _http: HttpClient
  ) {}

  ngOnInit(): void {
    this.token = this._route.snapshot.paramMap.get('token') ?? '';
    this._http.post(`${environment.apiUrl.replace('/api', '')}/api/invite/${this.token}/reject`, {})
      .subscribe({
        next: () => { this.state = 'rejected'; },
        error: (e) => {
          if (e.status === 409 || e.status === 410) {
            this.status = e.error?.status || 'đã xử lý';
            this.state = 'already_processed';
          } else {
            this.errorMsg = e.error?.message || 'Lời mời không tồn tại hoặc đã bị xóa.';
            this.state = 'error';
          }
        }
      });
  }

  goHome(): void {
    this._router.navigate(['/project']);
  }
}
