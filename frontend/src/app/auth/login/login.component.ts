import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '@trungk18/project/auth/auth.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule],
  template: `
    <div class="login-wrapper">

      <!-- ── Left branding panel ── -->
      <div class="left-panel">
        <div class="left-content">
          <div class="brand-logo">
            <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
              <rect width="56" height="56" rx="15" fill="rgba(255,255,255,0.15)"/>
              <rect x="11" y="16" width="10" height="24" rx="2.5" fill="rgba(255,255,255,0.55)"/>
              <rect x="23" y="16" width="10" height="17" rx="2.5" fill="rgba(255,255,255,0.78)"/>
              <rect x="35" y="16" width="10" height="10" rx="2.5" fill="white"/>
            </svg>
          </div>
          <h1 class="brand-title">Task Manager</h1>
          <p class="brand-sub">Quản lý dự án &amp; cộng tác nhóm hiệu quả</p>
          <div class="features">
            <div class="feature">
              <div class="feature-icon">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <rect x="1" y="1" width="5.5" height="14" rx="1.5" fill="white" opacity=".7"/>
                  <rect x="9" y="1" width="5.5" height="9.5" rx="1.5" fill="white"/>
                </svg>
              </div>
              <span>Kanban board trực quan</span>
            </div>
            <div class="feature">
              <div class="feature-icon">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="6.5" stroke="white" stroke-width="1.4"/>
                  <path d="M5.5 8l2 2 3.5-3.5" stroke="white" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </div>
              <span>Gợi ý deadline bằng AI</span>
            </div>
            <div class="feature">
              <div class="feature-icon">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <circle cx="5.5" cy="5.5" r="3" stroke="white" stroke-width="1.4"/>
                  <circle cx="10.5" cy="5.5" r="3" stroke="white" stroke-width="1.4"/>
                  <path d="M1 15c0-2.5 2-4.5 4.5-4.5h5c2.5 0 4.5 2 4.5 4.5" stroke="white" stroke-width="1.4" stroke-linecap="round"/>
                </svg>
              </div>
              <span>Cộng tác nhóm real-time</span>
            </div>
          </div>
        </div>
        <div class="deco deco-1"></div>
        <div class="deco deco-2"></div>
      </div>

      <!-- ── Right form panel ── -->
      <div class="right-panel">
        <div class="form-card">
          <div class="form-header">
            <div class="form-logo">
              <svg width="38" height="38" viewBox="0 0 38 38" fill="none">
                <rect width="38" height="38" rx="10" fill="#0052cc"/>
                <rect x="7" y="11" width="7" height="17" rx="1.8" fill="rgba(255,255,255,0.55)"/>
                <rect x="16" y="11" width="7" height="12" rx="1.8" fill="rgba(255,255,255,0.8)"/>
                <rect x="25" y="11" width="7" height="7" rx="1.8" fill="white"/>
              </svg>
            </div>
            <h2 class="form-title">{{ 'auth.signInTitle' | translate }}</h2>
            <p class="form-sub">Chào mừng trở lại! Vui lòng đăng nhập.</p>
          </div>

          <form [formGroup]="form" (ngSubmit)="submit()">
            <div class="field">
              <label>{{ 'auth.email' | translate }}</label>
              <input
                type="email"
                formControlName="email"
                placeholder="you@example.com"
                [class.input-invalid]="form.get('email')?.invalid && form.get('email')?.touched"
              />
            </div>
            <div class="field">
              <label>{{ 'auth.password' | translate }}</label>
              <input
                type="password"
                formControlName="password"
                [placeholder]="'auth.password' | translate"
                [class.input-invalid]="form.get('password')?.invalid && form.get('password')?.touched"
              />
            </div>

            <div class="error-msg" *ngIf="error">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style="flex-shrink:0;margin-top:1px">
                <circle cx="7" cy="7" r="6.5" stroke="#de350b" stroke-width="1.3"/>
                <path d="M7 4v3.5M7 9.5v.5" stroke="#de350b" stroke-width="1.4" stroke-linecap="round"/>
              </svg>
              <span>{{ error }}</span>
            </div>

            <button type="submit" [disabled]="loading">
              <span class="btn-inner" *ngIf="!loading">{{ 'auth.signIn' | translate }}</span>
              <span class="btn-inner" *ngIf="loading">
                <span class="spinner"></span>
                {{ 'auth.signingIn' | translate }}
              </span>
            </button>
          </form>
        </div>
      </div>

    </div>
  `,
  styles: [`
    :host {
      flex: 1;
      display: flex;
      min-height: 0;
    }
    .login-wrapper {
      flex: 1;
      display: flex;
    }

    /* ── Left panel ── */
    .left-panel {
      width: 42%;
      background: linear-gradient(150deg, #0747A6 0%, #0052cc 55%, #1a73e8 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 48px 44px;
      position: relative;
      overflow: hidden;
    }
    .left-content {
      position: relative;
      z-index: 1;
      color: #fff;
      max-width: 300px;
    }
    .brand-logo { margin-bottom: 22px; }
    .brand-title {
      font-size: 26px;
      font-weight: 700;
      color: #fff;
      margin: 0 0 10px;
      letter-spacing: -0.3px;
    }
    .brand-sub {
      font-size: 14px;
      color: rgba(255,255,255,0.72);
      margin: 0 0 36px;
      line-height: 1.55;
    }
    .features { display: flex; flex-direction: column; gap: 16px; }
    .feature {
      display: flex;
      align-items: center;
      gap: 13px;
      color: rgba(255,255,255,0.88);
      font-size: 14px;
    }
    .feature-icon {
      width: 34px;
      height: 34px;
      background: rgba(255,255,255,0.12);
      border-radius: 9px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .deco {
      position: absolute;
      border-radius: 50%;
      background: rgba(255,255,255,0.06);
      pointer-events: none;
    }
    .deco-1 { width: 340px; height: 340px; top: -130px; right: -110px; }
    .deco-2 { width: 220px; height: 220px; bottom: -90px; left: -70px; }

    /* ── Right panel ── */
    .right-panel {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #F4F5F7;
      padding: 40px 24px;
      overflow-y: auto;
    }
    .form-card {
      background: #fff;
      border-radius: 8px;
      padding: 40px 36px;
      width: 100%;
      max-width: 400px;
      box-shadow: 0 4px 20px rgba(9,30,66,0.10), 0 0 1px rgba(9,30,66,0.08);
    }
    .form-header {
      text-align: center;
      margin-bottom: 28px;
    }
    .form-logo { display: inline-flex; margin-bottom: 16px; }
    .form-title {
      font-size: 21px;
      font-weight: 700;
      color: #172b4d;
      margin: 0 0 6px;
    }
    .form-sub {
      font-size: 14px;
      color: #5E6C84;
      margin: 0;
    }

    /* Fields */
    .field {
      margin-bottom: 18px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    label {
      font-size: 12px;
      font-weight: 600;
      color: #42526E;
      text-transform: uppercase;
      letter-spacing: 0.4px;
    }
    input {
      padding: 9px 12px;
      border: 2px solid #DFE1E6;
      border-radius: 4px;
      font-size: 14px;
      color: #172b4d;
      background: #FAFBFC;
      transition: border-color .15s, background .15s, box-shadow .15s;
      outline: none;
    }
    input:focus {
      border-color: #4c9aff;
      background: #fff;
      box-shadow: 0 0 0 2px rgba(76,154,255,0.2);
    }
    input.input-invalid {
      border-color: #FF5630;
    }
    input::placeholder { color: #8993a4; }

    /* Error */
    .error-msg {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      color: #de350b;
      font-size: 13px;
      margin-bottom: 14px;
      padding: 9px 12px;
      background: #FFEBE6;
      border-radius: 4px;
      border-left: 3px solid #FF5630;
    }

    /* Button */
    button[type="submit"] {
      width: 100%;
      padding: 10px;
      background: #0052cc;
      color: #fff;
      border: none;
      border-radius: 4px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: background .15s, box-shadow .15s;
      margin-top: 4px;
    }
    button[type="submit"]:hover:not(:disabled) {
      background: #0747A6;
      box-shadow: 0 2px 8px rgba(7,71,166,0.28);
    }
    button[type="submit"]:active:not(:disabled) { background: #0535A0; }
    button[type="submit"]:disabled { opacity: .65; cursor: not-allowed; }

    .btn-inner {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }
    .spinner {
      width: 14px;
      height: 14px;
      border: 2px solid rgba(255,255,255,0.35);
      border-top-color: #fff;
      border-radius: 50%;
      animation: spin .7s linear infinite;
      flex-shrink: 0;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  `]
})
export class LoginComponent {
  form: FormGroup;
  loading = false;
  error = '';

  constructor(
    private _fb: FormBuilder,
    private _auth: AuthService,
    private _router: Router,
    private _route: ActivatedRoute,
    private _translate: TranslateService
  ) {
    this.form = this._fb.group({
      email:    ['', [Validators.required, Validators.email]],
      password: ['', Validators.required]
    });
  }

  submit(): void {
    if (this.form.invalid) return;
    this.loading = true;
    this.error = '';
    const { email, password } = this.form.value;
    const returnUrl = this._route.snapshot.queryParams['returnUrl'] || '/project';
    this._auth.login(email, password).subscribe({
      next: () => this._router.navigateByUrl(returnUrl),
      error: (err) => {
        this.error = err.error?.message || this._translate.instant('auth.loginFailed');
        this.loading = false;
      }
    });
  }
}
