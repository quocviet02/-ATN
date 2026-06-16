import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzDropDownModule } from 'ng-zorro-antd/dropdown';
import { NzMenuModule } from 'ng-zorro-antd/menu';
import { NzAvatarModule } from 'ng-zorro-antd/avatar';
import { AuthQuery } from '@trungk18/project/auth/auth.query';
import { AuthService } from '@trungk18/project/auth/auth.service';
import { NotificationService } from '@trungk18/core/services/notification.service';

@Component({
  selector:    'app-org-layout',
  templateUrl: './org-layout.component.html',
  styleUrls:   ['./org-layout.component.scss'],
  standalone:  true,
  imports: [
    CommonModule, RouterLink, RouterOutlet,
    NzIconModule, NzButtonModule,
    NzDropDownModule, NzMenuModule, NzAvatarModule,
  ]
})
export class OrgLayoutComponent {
  constructor(
    public authQuery: AuthQuery,
    private _authService: AuthService,
    private _notifService: NotificationService,
    private _router: Router,
  ) {}

  goToProject(): void {
    this._router.navigate(['/project/board']);
  }

  logout(): void {
    this._notifService.disconnect();
    this._authService.logout().subscribe(() => {
      this._authService.navigateToLogin();
    });
  }
}
