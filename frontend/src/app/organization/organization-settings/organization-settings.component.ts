import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NzTabsModule } from 'ng-zorro-antd/tabs';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalService } from 'ng-zorro-antd/modal';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { OrganizationService } from '../organization.service';
import { JOrganization, OrgRole } from '@trungk18/interface/organization';
import { OrgDepartmentsComponent } from './tabs/org-departments/org-departments.component';
import { OrgMembersComponent } from './tabs/org-members/org-members.component';

@Component({
  selector:    'app-organization-settings',
  templateUrl: './organization-settings.component.html',
  styleUrls:   ['./organization-settings.component.scss'],
  standalone:  true,
  imports: [
    CommonModule, ReactiveFormsModule,
    NzTabsModule, NzFormModule, NzInputModule, NzSelectModule,
    NzButtonModule, NzIconModule, NzCardModule, NzSpinModule,
    NzSwitchModule, NzTagModule,
    OrgDepartmentsComponent, OrgMembersComponent,
  ]
})
export class OrganizationSettingsComponent implements OnInit {
  org: JOrganization | null = null;
  myRole: OrgRole | null = null;
  loading = true;
  saving  = false;
  orgId   = '';

  generalForm: FormGroup;

  industries = [
    { value: 'banking',    label: 'Ngân hàng' },
    { value: 'finance',    label: 'Tài chính' },
    { value: 'technology', label: 'Công nghệ' },
    { value: 'healthcare', label: 'Y tế' },
    { value: 'education',  label: 'Giáo dục' },
    { value: 'other',      label: 'Khác' },
  ];

  sizes = ['1-10', '11-50', '51-200', '201-500', '500+'];

  constructor(
    private _route:   ActivatedRoute,
    private _router:  Router,
    private _fb:      FormBuilder,
    private _orgSvc:  OrganizationService,
    private _message: NzMessageService,
    private _modal:   NzModalService,
  ) {
    this.generalForm = this._fb.group({
      name:        ['', Validators.required],
      description: [''],
      industry:    ['other'],
      size:        ['1-10'],
      country:     ['Vietnam'],
      website:     [''],
    });
  }

  get isOwnerOrAdmin(): boolean {
    return this.myRole === 'owner' || this.myRole === 'admin';
  }

  get isOwner(): boolean {
    return this.myRole === 'owner';
  }

  ngOnInit(): void {
    this.orgId = this._route.snapshot.paramMap.get('id') || '';
    if (!this.orgId) { this._router.navigate(['/project']); return; }
    this._loadOrg();
  }

  private _loadOrg(): void {
    this.loading = true;
    this._orgSvc.getOrganization(this.orgId).subscribe({
      next: ({ organization, myRole }) => {
        this.org    = organization;
        this.myRole = myRole;
        this.generalForm.patchValue({
          name:        organization.name,
          description: organization.description,
          industry:    organization.industry,
          size:        organization.size,
          country:     organization.country,
          website:     organization.website,
        });
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this._message.error('Không thể tải thông tin tổ chức');
        this._router.navigate(['/project']);
      }
    });
  }

  saveGeneral(): void {
    if (this.generalForm.invalid) return;
    this.saving = true;
    this._orgSvc.updateOrganization(this.orgId, this.generalForm.value).subscribe({
      next: ({ organization }) => {
        this.org    = organization;
        this.saving = false;
        this._message.success('Đã cập nhật thông tin tổ chức');
      },
      error: (e) => {
        this.saving = false;
        this._message.error(e?.error?.message || 'Không thể cập nhật');
      }
    });
  }

  confirmDelete(): void {
    this._modal.confirm({
      nzTitle:     'Xóa tổ chức?',
      nzContent:   `Hành động này sẽ xóa tất cả dữ liệu của <strong>${this.org?.name}</strong>. Không thể hoàn tác!`,
      nzOkText:    'Xóa',
      nzOkDanger:  true,
      nzCancelText: 'Hủy',
      nzOnOk: () => this._deleteOrg(),
    });
  }

  private _deleteOrg(): void {
    this._orgSvc.deleteOrganization(this.orgId).subscribe({
      next: () => {
        this._message.success('Đã xóa tổ chức');
        localStorage.removeItem('currentOrgId');
        this._router.navigate(['/project']);
      },
      error: (e) => this._message.error(e?.error?.message || 'Không thể xóa')
    });
  }
}
