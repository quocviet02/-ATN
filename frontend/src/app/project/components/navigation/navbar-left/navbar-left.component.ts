import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { AuthQuery } from '@trungk18/project/auth/auth.query';
import { PermissionService } from '@trungk18/core/services/permission.service';
import { NzDrawerService } from 'ng-zorro-antd/drawer';
import { SearchDrawerComponent } from '../../search/search-drawer/search-drawer.component';
import { NzModalService } from 'ng-zorro-antd/modal';
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

@Component({
    selector: 'app-navbar-left',
    templateUrl: './navbar-left.component.html',
    styleUrls: ['./navbar-left.component.scss'],
    imports: [NzTooltipDirective, NzIconDirective, AvatarComponent, NzPopoverDirective, ButtonComponent, AsyncPipe, NgIf, NotificationBellComponent, LanguageSwitcherComponent, TranslateModule]
})
export class NavbarLeftComponent implements OnInit, OnDestroy {
  items: NavItem[] = [];
  private _langSub: Subscription;

  constructor(
    public authQuery: AuthQuery,
    public permissionService: PermissionService,
    private _drawerService: NzDrawerService,
    private _modalService: NzModalService,
    private _translate: TranslateService
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

  openCreateIssueModal() {
    this._modalService.create({
      nzContent: AddIssueModalComponent,
      nzClosable: false,
      nzFooter: null,
      nzWidth: 700
    });
  }

  openSearchDrawler() {
    this._drawerService.create({
      nzContent: SearchDrawerComponent,
      nzTitle: null,
      nzPlacement: 'left',
      nzClosable: false,
      nzWidth: 500
    });
  }
}

class NavItem {
  constructor(public icon: string, public tooltip: string, public handler: Handler) {}
}

type Handler = () => void;
