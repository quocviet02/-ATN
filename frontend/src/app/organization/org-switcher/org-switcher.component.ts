import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { NzDropDownModule } from 'ng-zorro-antd/dropdown';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzMenuModule } from 'ng-zorro-antd/menu';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { OrganizationService } from '../organization.service';
import { JOrganization } from '@trungk18/interface/organization';

@Component({
  selector: 'app-org-switcher',
  templateUrl: './org-switcher.component.html',
  styleUrls: ['./org-switcher.component.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterModule,
    NzDropDownModule, NzIconModule, NzMenuModule, NzSpinModule, NzToolTipModule,
  ]
})
export class OrgSwitcherComponent implements OnInit, OnDestroy {
  organizations: JOrganization[] = [];
  filteredOrgs: JOrganization[] = [];
  currentOrg: JOrganization | null = null;
  searchText = '';
  loading = false;
  visible = false;

  private _destroy$ = new Subject<void>();

  constructor(
    private _orgService: OrganizationService,
    private _message: NzMessageService,
    private _router: Router,
  ) {}

  ngOnInit(): void {
    this._loadOrganizations();
    this._orgService.currentOrgId$.pipe(takeUntil(this._destroy$)).subscribe(id => {
      if (id && this.organizations.length) {
        this.currentOrg = this.organizations.find(o => o.id === id) || null;
      }
    });
  }

  ngOnDestroy(): void {
    this._destroy$.next();
    this._destroy$.complete();
  }

  private _loadOrganizations(): void {
    this.loading = true;
    this._orgService.getMyOrganizations().subscribe({
      next: ({ organizations }) => {
        this.organizations = organizations;
        this.filteredOrgs  = organizations;
        const currentId    = this._orgService.currentOrgId;
        this.currentOrg    = organizations.find(o => o.id === currentId) || organizations[0] || null;
        if (!currentId && this.currentOrg) {
          this._orgService.switchOrganization(this.currentOrg.id).subscribe();
        }
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  onSearch(): void {
    const q = this.searchText.toLowerCase();
    this.filteredOrgs = q
      ? this.organizations.filter(o => o.name.toLowerCase().includes(q))
      : this.organizations;
  }

  selectOrg(org: JOrganization): void {
    if (org.id === this.currentOrg?.id) {
      this.visible = false;
      return;
    }
    this._orgService.switchOrganization(org.id).subscribe({
      next: () => {
        this.currentOrg = org;
        this.visible    = false;
        this._message.success(`Đã chuyển sang ${org.name}`);
        this._router.navigate(['/project/board']);
        window.location.reload();
      },
      error: () => this._message.error('Không thể chuyển organization')
    });
  }

  getRoleBadge(role: string): string {
    const map: Record<string, string> = {
      owner:           'Owner',
      admin:           'Admin',
      department_head: 'Dept Head',
      team_lead:       'Team Lead',
      member:          'Member',
      guest:           'Guest',
    };
    return map[role] || role;
  }

  getRoleColor(role: string): string {
    const map: Record<string, string> = {
      owner: '#f50',
      admin: '#2db7f5',
      department_head: '#87d068',
      team_lead: '#108ee9',
      member: '#d9d9d9',
      guest: '#d9d9d9',
    };
    return map[role] || '#d9d9d9';
  }
}
