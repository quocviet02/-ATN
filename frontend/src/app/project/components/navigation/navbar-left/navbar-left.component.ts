import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthQuery } from '@trungk18/project/auth/auth.query';
import { AuthService } from '@trungk18/project/auth/auth.service';
import { NotificationService } from '@trungk18/core/services/notification.service';
import { PermissionService } from '@trungk18/core/services/permission.service';
import { NzDrawerService } from 'ng-zorro-antd/drawer';
import { SearchDrawerComponent } from '../../search/search-drawer/search-drawer.component';
import { NzModalService } from 'ng-zorro-antd/modal';
import { NzMessageService } from 'ng-zorro-antd/message';
import { AddIssueModalComponent } from '../../add-issue-modal/add-issue-modal.component';
import { ButtonComponent } from '../../../../jira-control/button/button.component';
import { NzPopoverDirective } from 'ng-zorro-antd/popover';
import { AvatarComponent } from '../../../../jira-control/avatar/avatar.component';
import { NzIconDirective } from 'ng-zorro-antd/icon';
import { NzTooltipDirective } from 'ng-zorro-antd/tooltip';
import { AsyncPipe, NgIf } from '@angular/common';
import { NotificationBellComponent } from '../notification-bell/notification-bell.component';
import { LanguageSwitcherComponent } from '../language-switcher/language-switcher.component';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NzDropDownDirective, NzDropdownMenuComponent } from 'ng-zorro-antd/dropdown';
import { NzMenuDirective, NzMenuItemComponent, NzMenuDividerDirective } from 'ng-zorro-antd/menu';
import { OrgSwitcherComponent } from '../../../../organization/org-switcher/org-switcher.component';
import { OrganizationService } from '../../../../organization/organization.service';

@Component({
  selector: 'app-navbar-left',
  templateUrl: './navbar-left.component.html',
  styleUrls: ['./navbar-left.component.scss'],
  imports: [
    NzTooltipDirective, NzIconDirective, AvatarComponent, NzPopoverDirective,
    ButtonComponent, AsyncPipe, NgIf, NotificationBellComponent,
    LanguageSwitcherComponent, TranslateModule,
    NzDropDownDirective, NzDropdownMenuComponent,
    NzMenuDirective, NzMenuItemComponent, NzMenuDividerDirective,
    RouterLink, RouterLinkActive,
    OrgSwitcherComponent,
  ]
})
export class NavbarLeftComponent implements OnInit, OnDestroy {
  items: NavItem[] = [];
  readonly canViewTimeline$ = this.permissionService.canManageBoard$;
  private _langSub: Subscription;

  constructor(
    public authQuery: AuthQuery,
    public permissionService: PermissionService,
    public orgService: OrganizationService,
    private _authService: AuthService,
    private _notifService: NotificationService,
    private _drawerService: NzDrawerService,
    private _modalService: NzModalService,
    private _message: NzMessageService,
    private _translate: TranslateService,
  ) {}

  ngOnInit(): void {
    this._buildNavItems();
    this._langSub = this._translate.onTranslationChange.subscribe(() => this._buildNavItems());
    this._langSub.add(this._translate.onLangChange.subscribe(() => this._buildNavItems()));
  }

  ngOnDestroy(): void {
    this._langSub?.unsubscribe();
  }

  private _buildNavItems(): void {
    this.items = [
      new NavItem('search', this._translate.instant('nav.searchIssues'), this.openSearchDrawler.bind(this))
    ];
  }

  openCreateIssueModal(): void {
    this._modalService.create({
      nzContent: AddIssueModalComponent,
      nzClosable: false,
      nzFooter: null,
      nzWidth: 700
    });
  }

  openSearchDrawler(): void {
    this._drawerService.create({
      nzContent: SearchDrawerComponent,
      nzTitle: null,
      nzPlacement: 'left',
      nzClosable: false,
      nzWidth: 500
    });
  }

  confirmLogout(): void {
    this._modalService.confirm({
      nzTitle:   this._translate.instant('logout.title'),
      nzContent: this._translate.instant('logout.message'),
      nzOkText:  this._translate.instant('logout.confirm'),
      nzCancelText: this._translate.instant('logout.cancel'),
      nzOkDanger: true,
      nzOnOk: () => this._doLogout()
    });
  }

  private _doLogout(): void {
    this._notifService.disconnect();

    this._authService.logout().subscribe({
      next: (result) => {
        const key = result === false ? 'logout.offlineSuccess' : 'logout.success';
        this._message.success(this._translate.instant(key));
        this._authService.navigateToLogin();
      },
      error: () => {
        this._message.warning(this._translate.instant('logout.offlineSuccess'));
        this._authService.navigateToLogin();
      }
    });
  }
}

class NavItem {
  constructor(public icon: string, public tooltip: string, public handler: Handler) {}
}

type Handler = () => void;
