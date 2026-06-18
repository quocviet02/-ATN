import { Component, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AbstractControl, FormBuilder, FormGroup,
  ReactiveFormsModule, ValidationErrors, Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '@trungk18/project/auth/auth.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

function passwordsMatch(g: AbstractControl): ValidationErrors | null {
  const p  = g.get('password')?.value  ?? '';
  const cp = g.get('confirmPassword')?.value ?? '';
  return p === cp ? null : { mismatch: true };
}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, TranslateModule],
  template: `
    <div class="wrap">

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
          <p class="brand-sub">Tham gia cùng hàng nghìn nhóm đang quản lý dự án hiệu quả</p>
          <div class="features">
            <div class="feature">
              <div class="feature-icon">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="5" r="3" stroke="white" stroke-width="1.4"/>
                  <path d="M2 15c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="white" stroke-width="1.4" stroke-linecap="round"/>
                </svg>
              </div>
              <span>Tạo tài khoản miễn phí</span>
            </div>
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
            <h2 class="form-title">{{ 'auth.createAccount' | translate }}</h2>
            <p class="form-sub">Điền thông tin bên dưới để bắt đầu</p>
          </div>

          <form [formGroup]="form" (ngSubmit)="submit()">

            <!-- Name -->
            <div class="field">
              <label>{{ 'auth.fullName' | translate }}</label>
              <input
                type="text"
                formControlName="name"
                placeholder="Nguyễn Văn A"
                [disabled]="loading"
                [class.input-invalid]="f('name').invalid && f('name').touched"
              />
              <div class="field-error" *ngIf="f('name').touched && f('name').errors">
                <ng-container *ngIf="f('name').errors?.['required']">Họ tên là bắt buộc</ng-container>
                <ng-container *ngIf="f('name').errors?.['minlength']">Họ tên phải có ít nhất 2 ký tự</ng-container>
                <ng-container *ngIf="f('name').errors?.['maxlength']">Họ tên không được vượt quá 50 ký tự</ng-container>
              </div>
            </div>

            <!-- Email -->
            <div class="field">
              <label>{{ 'auth.email' | translate }}</label>
              <input
                #emailRef
                type="email"
                formControlName="email"
                placeholder="you@example.com"
                [disabled]="loading"
                [class.input-invalid]="f('email').invalid && f('email').touched"
              />
              <div class="field-error" *ngIf="f('email').touched && f('email').errors">
                <ng-container *ngIf="f('email').errors?.['required']">Email là bắt buộc</ng-container>
                <ng-container *ngIf="f('email').errors?.['email']">Email không hợp lệ</ng-container>
                <ng-container *ngIf="f('email').errors?.['serverConflict']">{{ 'auth.emailExists' | translate }}</ng-container>
              </div>
            </div>

            <!-- Password -->
            <div class="field">
              <label>{{ 'auth.password' | translate }}</label>
              <div class="input-wrap">
                <input
                  [type]="showPass ? 'text' : 'password'"
                  formControlName="password"
                  placeholder="Tối thiểu 6 ký tự"
                  [disabled]="loading"
                  [class.input-invalid]="f('password').invalid && f('password').touched"
                />
                <button type="button" class="eye-btn" (click)="showPass = !showPass" tabindex="-1">
                  <svg *ngIf="!showPass" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                  </svg>
                  <svg *ngIf="showPass" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                </button>
              </div>
              <div class="field-error" *ngIf="f('password').touched && f('password').errors?.['minlength']">
                Mật khẩu phải có ít nhất 6 ký tự
              </div>
              <!-- Strength bar -->
              <div class="strength-wrap" *ngIf="f('password').value">
                <div class="strength-bar">
                  <div class="strength-seg" [class.active]="true" [class]="'seg-' + strength"></div>
                  <div class="strength-seg" [class.active]="strength === 'medium' || strength === 'strong'" [class]="'seg-' + strength"></div>
                  <div class="strength-seg" [class.active]="strength === 'strong'" [class]="'seg-' + strength"></div>
                </div>
                <span class="strength-label" [class]="'label-' + strength">
                  {{ strength === 'weak' ? 'Yếu' : strength === 'medium' ? 'Trung bình' : 'Mạnh' }}
                </span>
              </div>
            </div>

            <!-- Confirm Password -->
            <div class="field">
              <label>{{ 'auth.confirmPassword' | translate }}</label>
              <div class="input-wrap">
                <input
                  [type]="showConfirm ? 'text' : 'password'"
                  formControlName="confirmPassword"
                  placeholder="Nhập lại mật khẩu"
                  [disabled]="loading"
                  [class.input-invalid]="(f('confirmPassword').touched && f('confirmPassword').errors) || (form.errors?.['mismatch'] && f('confirmPassword').touched)"
                />
                <button type="button" class="eye-btn" (click)="showConfirm = !showConfirm" tabindex="-1">
                  <svg *ngIf="!showConfirm" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                  </svg>
                  <svg *ngIf="showConfirm" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                </button>
              </div>
              <div class="field-error" *ngIf="f('confirmPassword').touched && form.errors?.['mismatch']">
                {{ 'auth.passwordMismatch' | translate }}
              </div>
            </div>

            <!-- Server error -->
            <div class="error-msg" *ngIf="serverError">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style="flex-shrink:0;margin-top:1px">
                <circle cx="7" cy="7" r="6.5" stroke="#de350b" stroke-width="1.3"/>
                <path d="M7 4v3.5M7 9.5v.5" stroke="#de350b" stroke-width="1.4" stroke-linecap="round"/>
              </svg>
              <span>{{ serverError }}</span>
            </div>

            <button type="submit" [disabled]="loading">
              <span class="btn-inner" *ngIf="!loading">{{ 'auth.registerButton' | translate }}</span>
              <span class="btn-inner" *ngIf="loading">
                <span class="spinner"></span>
                Đang tạo tài khoản...
              </span>
            </button>

          </form>

          <div class="login-link">
            {{ 'auth.alreadyHaveAccount' | translate }}
            <a routerLink="/login">{{ 'auth.loginNow' | translate }}</a>
          </div>

        </div>
      </div>

    </div>
  `,
  styles: [`
    :host { flex: 1; display: flex; min-height: 0; }
    .wrap  { flex: 1; display: flex; }

    /* ── Left panel ── */
    .left-panel {
      width: 42%;
      background: linear-gradient(150deg, #0747A6 0%, #0052cc 55%, #1a73e8 100%);
      display: flex; align-items: center; justify-content: center;
      padding: 48px 44px;
      position: relative; overflow: hidden;
    }
    .left-content { position: relative; z-index: 1; color: #fff; max-width: 300px; }
    .brand-logo   { margin-bottom: 22px; }
    .brand-title  { font-size: 26px; font-weight: 700; color: #fff; margin: 0 0 10px; letter-spacing: -.3px; }
    .brand-sub    { font-size: 14px; color: rgba(255,255,255,.72); margin: 0 0 36px; line-height: 1.55; }
    .features     { display: flex; flex-direction: column; gap: 16px; }
    .feature      { display: flex; align-items: center; gap: 13px; color: rgba(255,255,255,.88); font-size: 14px; }
    .feature-icon {
      width: 34px; height: 34px; background: rgba(255,255,255,.12);
      border-radius: 9px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    .deco { position: absolute; border-radius: 50%; background: rgba(255,255,255,.06); pointer-events: none; }
    .deco-1 { width: 340px; height: 340px; top: -130px; right: -110px; }
    .deco-2 { width: 220px; height: 220px; bottom: -90px; left: -70px; }

    /* ── Right panel ── */
    .right-panel {
      flex: 1; display: flex; align-items: center; justify-content: center;
      background: #F4F5F7; padding: 32px 24px; overflow-y: auto;
    }
    .form-card {
      background: #fff; border-radius: 8px; padding: 36px 36px 28px;
      width: 100%; max-width: 420px;
      box-shadow: 0 4px 20px rgba(9,30,66,.10), 0 0 1px rgba(9,30,66,.08);
    }
    .form-header  { text-align: center; margin-bottom: 24px; }
    .form-logo    { display: inline-flex; margin-bottom: 14px; }
    .form-title   { font-size: 21px; font-weight: 700; color: #172b4d; margin: 0 0 6px; }
    .form-sub     { font-size: 13px; color: #5E6C84; margin: 0; }

    /* Fields */
    .field { margin-bottom: 16px; display: flex; flex-direction: column; gap: 5px; }
    label {
      font-size: 12px; font-weight: 600; color: #42526E;
      text-transform: uppercase; letter-spacing: .4px;
    }
    .input-wrap { position: relative; }
    input {
      width: 100%; box-sizing: border-box;
      padding: 9px 36px 9px 12px;
      border: 2px solid #DFE1E6; border-radius: 4px;
      font-size: 14px; color: #172b4d; background: #FAFBFC;
      transition: border-color .15s, background .15s, box-shadow .15s; outline: none;
    }
    .input-wrap input { padding-right: 40px; }
    input:not(.input-wrap input) { padding-right: 12px; }
    input:focus { border-color: #4c9aff; background: #fff; box-shadow: 0 0 0 2px rgba(76,154,255,.2); }
    input.input-invalid { border-color: #FF5630; }
    input::placeholder { color: #8993a4; }
    input:disabled { opacity: .6; cursor: not-allowed; }

    .eye-btn {
      position: absolute; right: 10px; top: 50%; transform: translateY(-50%);
      background: none; border: none; padding: 0; cursor: pointer;
      color: #8993a4; display: flex; align-items: center;
      transition: color .15s;
      &:hover { color: #42526E; }
    }

    .field-error { font-size: 12px; color: #de350b; margin-top: 2px; }

    /* Strength bar */
    .strength-wrap  { display: flex; align-items: center; gap: 8px; margin-top: 6px; }
    .strength-bar   { display: flex; gap: 4px; flex: 1; }
    .strength-seg   { height: 4px; flex: 1; border-radius: 2px; background: #DFE1E6; transition: background .25s; }
    .strength-seg.active.seg-weak   { background: #FF5630; }
    .strength-seg.active.seg-medium { background: #FFAB00; }
    .strength-seg.active.seg-strong { background: #36B37E; }
    .strength-label { font-size: 11px; font-weight: 600; min-width: 58px; text-align: right; }
    .label-weak   { color: #FF5630; }
    .label-medium { color: #FFAB00; }
    .label-strong { color: #36B37E; }

    /* Server error */
    .error-msg {
      display: flex; align-items: flex-start; gap: 8px;
      color: #de350b; font-size: 13px; margin-bottom: 12px;
      padding: 9px 12px; background: #FFEBE6;
      border-radius: 4px; border-left: 3px solid #FF5630;
    }

    /* Button */
    button[type="submit"] {
      width: 100%; padding: 10px; background: #0052cc; color: #fff;
      border: none; border-radius: 4px; font-size: 14px; font-weight: 600;
      cursor: pointer; transition: background .15s, box-shadow .15s; margin-top: 4px;
    }
    button[type="submit"]:hover:not(:disabled) { background: #0747A6; box-shadow: 0 2px 8px rgba(7,71,166,.28); }
    button[type="submit"]:disabled { opacity: .65; cursor: not-allowed; }
    .btn-inner { display: flex; align-items: center; justify-content: center; gap: 8px; }
    .spinner {
      width: 14px; height: 14px;
      border: 2px solid rgba(255,255,255,.35); border-top-color: #fff;
      border-radius: 50%; animation: spin .7s linear infinite; flex-shrink: 0;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    .login-link {
      text-align: center; margin-top: 18px; font-size: 13px; color: #5E6C84;
      a { color: #0052cc; font-weight: 600; text-decoration: none; margin-left: 4px; }
      a:hover { text-decoration: underline; }
    }

    @media (max-width: 680px) {
      .left-panel { display: none; }
      .right-panel { padding: 24px 16px; }
    }
  `],
})
export class RegisterComponent {
  @ViewChild('emailRef') emailRef!: ElementRef<HTMLInputElement>;

  form: FormGroup;
  loading     = false;
  serverError = '';
  showPass    = false;
  showConfirm = false;

  constructor(
    private _fb:        FormBuilder,
    private _auth:      AuthService,
    private _router:    Router,
    private _translate: TranslateService,
  ) {
    this.form = this._fb.group({
      name:            ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
      email:           ['', [Validators.required, Validators.email]],
      password:        ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required],
    }, { validators: passwordsMatch });
  }

  f(name: string) { return this.form.get(name)!; }

  get strength(): 'weak' | 'medium' | 'strong' {
    const p = this.f('password').value || '';
    if (p.length < 6) return 'weak';
    const checks = [/[a-z]/, /[A-Z]/, /\d/, /[^a-zA-Z0-9]/].filter(r => r.test(p)).length;
    return checks >= 3 ? 'strong' : checks >= 2 ? 'medium' : 'weak';
  }

  submit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.loading     = true;
    this.serverError = '';
    const { name, email, password, confirmPassword } = this.form.value;

    this._auth.register(name, email, password, confirmPassword).subscribe({
      next: () => {
        this._router.navigate(['/project']);
      },
      error: (err) => {
        const status = err?.status;
        const msg    = err?.error?.message || '';
        if (status === 409) {
          this.f('email').setErrors({ serverConflict: true });
          setTimeout(() => this.emailRef?.nativeElement?.focus(), 50);
        } else if (status === 400) {
          this.serverError = msg || this._translate.instant('auth.validationError');
        } else {
          this.serverError = this._translate.instant('auth.serverError');
        }
        this.loading = false;
      },
    });
  }
}
