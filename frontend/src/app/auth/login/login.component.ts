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
    <div class="login-page">
      <div class="login-box">
        <h2>{{ 'auth.signInTitle' | translate }}</h2>
        <form [formGroup]="form" (ngSubmit)="submit()">
          <div class="field">
            <label>{{ 'auth.email' | translate }}</label>
            <input type="email" formControlName="email" placeholder="you@example.com" />
          </div>
          <div class="field">
            <label>{{ 'auth.password' | translate }}</label>
            <input type="password" formControlName="password" [placeholder]="'auth.password' | translate" />
          </div>
          <p class="error" *ngIf="error">{{ error }}</p>
          <button type="submit" [disabled]="loading">
            {{ (loading ? 'auth.signingIn' : 'auth.signIn') | translate }}
          </button>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .login-page { display:flex; justify-content:center; align-items:center; min-height:100vh; background:#f4f5f7; }
    .login-box { background:#fff; padding:40px; border-radius:4px; width:360px; box-shadow:0 2px 8px rgba(0,0,0,.15); }
    h2 { margin-bottom:24px; font-size:20px; }
    .field { margin-bottom:16px; display:flex; flex-direction:column; gap:6px; }
    label { font-weight:500; font-size:14px; }
    input { padding:8px 12px; border:1px solid #dfe1e6; border-radius:3px; font-size:14px; }
    button { width:100%; padding:10px; background:#0052cc; color:#fff; border:none; border-radius:3px; cursor:pointer; font-size:14px; }
    button:disabled { opacity:.6; cursor:default; }
    .error { color:#de350b; font-size:13px; margin-bottom:12px; }
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
