import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzAvatarModule } from 'ng-zorro-antd/avatar';
import { NzDropDownModule } from 'ng-zorro-antd/dropdown';
import { NzMenuModule } from 'ng-zorro-antd/menu';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { OrganizationService } from '../../../organization.service';
import { JDepartment, JOrgMember, OrgRole } from '@trungk18/interface/organization';

@Component({
  selector:    'app-org-members',
  templateUrl: './org-members.component.html',
  styleUrls:   ['./org-members.component.scss'],
  standalone:  true,
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule,
    NzTableModule, NzButtonModule, NzIconModule, NzTagModule,
    NzModalModule, NzFormModule, NzInputModule, NzSelectModule,
    NzAvatarModule, NzDropDownModule, NzMenuModule, NzSpinModule, NzToolTipModule,
  ]
})
export class OrgMembersComponent implements OnInit {
  @Input() orgId!: string;
  @Input() myRole!: OrgRole;

  members: JOrgMember[] = [];
  departments: JDepartment[] = [];
  total   = 0;
  page    = 1;
  limit   = 20;
  loading = false;

  searchText    = '';
  filterRole    = '';
  filterDeptId  = '';

  inviteVisible  = false;
  inviteLoading  = false;
  inviteForm: FormGroup;

  roles: { value: OrgRole; label: string; color: string }[] = [
    { value: 'owner',           label: 'Owner',        color: '#f50'     },
    { value: 'admin',           label: 'Admin',        color: '#2db7f5'  },
    { value: 'department_head', label: 'Dept Head',    color: '#87d068'  },
    { value: 'team_lead',       label: 'Team Lead',    color: '#108ee9'  },
    { value: 'member',          label: 'Member',       color: '#d9d9d9'  },
    { value: 'guest',           label: 'Guest',        color: '#d9d9d9'  },
  ];

  statusColors: Record<string, string> = {
    active:      'green',
    invited:     'gold',
    suspended:   'red',
    deactivated: 'default',
  };

  statusLabels: Record<string, string> = {
    active:      'Hoạt động',
    invited:     'Đã mời',
    suspended:   'Bị khóa',
    deactivated: 'Đã hủy',
  };

  constructor(
    private _orgSvc:  OrganizationService,
    private _fb:      FormBuilder,
    private _message: NzMessageService,
    private _modal:   NzModalService,
  ) {
    this.inviteForm = this._fb.group({
      email:        ['', [Validators.required, Validators.email]],
      orgRole:      ['member'],
      departmentId: [null],
      jobTitle:     [''],
    });
  }

  get canManage(): boolean {
    return this.myRole === 'owner' || this.myRole === 'admin';
  }

  ngOnInit(): void {
    this._load();
    this._loadDepts();
  }

  private _load(): void {
    this.loading = true;
    const params: any = { page: this.page, limit: this.limit };
    if (this.filterRole)   params.role         = this.filterRole;
    if (this.filterDeptId) params.departmentId  = this.filterDeptId;

    this._orgSvc.getMembers(this.orgId, params).subscribe({
      next: ({ members, total }) => {
        let result = members;
        if (this.searchText) {
          const q = this.searchText.toLowerCase();
          result  = members.filter(m =>
            m.userId?.name?.toLowerCase().includes(q) ||
            m.userId?.email?.toLowerCase().includes(q)
          );
        }
        this.members = result;
        this.total   = total;
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  private _loadDepts(): void {
    this._orgSvc.getDepartments(this.orgId).subscribe({
      next: ({ departments }) => { this.departments = departments; }
    });
  }

  onSearch(): void { this.page = 1; this._load(); }
  onFilter(): void { this.page = 1; this._load(); }
  onPageChange(p: number): void { this.page = p; this._load(); }

  getRoleInfo(role: string) {
    return this.roles.find(r => r.value === role) || { label: role, color: '#d9d9d9' };
  }

  openInvite(): void {
    this.inviteForm.reset({ orgRole: 'member' });
    this.inviteVisible = true;
  }

  submitInvite(): void {
    if (this.inviteForm.invalid) {
      Object.values(this.inviteForm.controls).forEach(c => { c.markAsDirty(); c.updateValueAndValidity(); });
      return;
    }
    this.inviteLoading = true;
    this._orgSvc.inviteMember(this.orgId, this.inviteForm.value).subscribe({
      next: () => {
        this.inviteLoading = false;
        this.inviteVisible = false;
        this._message.success('Đã mời thành viên');
        this._load();
      },
      error: (e) => {
        this.inviteLoading = false;
        this._message.error(e?.error?.message || 'Không thể mời thành viên');
      }
    });
  }

  suspendMember(m: JOrgMember): void {
    this._modal.confirm({
      nzTitle:      'Khóa thành viên?',
      nzContent:    `Khóa <strong>${m.userId?.name}</strong>?`,
      nzOkDanger:   true,
      nzOkText:     'Khóa',
      nzCancelText: 'Hủy',
      nzOnOk: () => {
        this._orgSvc.suspendMember(this.orgId, m.userId?.id).subscribe({
          next: () => { this._message.success('Đã khóa thành viên'); this._load(); },
          error: (e) => this._message.error(e?.error?.message || 'Lỗi')
        });
      }
    });
  }

  activateMember(m: JOrgMember): void {
    this._orgSvc.activateMember(this.orgId, m.userId?.id).subscribe({
      next: () => { this._message.success('Đã kích hoạt thành viên'); this._load(); },
      error: (e) => this._message.error(e?.error?.message || 'Lỗi')
    });
  }

  removeMember(m: JOrgMember): void {
    this._modal.confirm({
      nzTitle:      'Xóa thành viên?',
      nzContent:    `Xóa <strong>${m.userId?.name}</strong> khỏi tổ chức?`,
      nzOkDanger:   true,
      nzOkText:     'Xóa',
      nzCancelText: 'Hủy',
      nzOnOk: () => {
        this._orgSvc.removeMember(this.orgId, m.userId?.id).subscribe({
          next: () => { this._message.success('Đã xóa thành viên'); this._load(); },
          error: (e) => this._message.error(e?.error?.message || 'Lỗi')
        });
      }
    });
  }
}
