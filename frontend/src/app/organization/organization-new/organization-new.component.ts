import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NzStepsModule } from 'ng-zorro-antd/steps';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzRadioModule } from 'ng-zorro-antd/radio';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzCardModule } from 'ng-zorro-antd/card';
import { OrganizationService } from '../organization.service';

@Component({
  selector:    'app-organization-new',
  templateUrl: './organization-new.component.html',
  styleUrls:   ['./organization-new.component.scss'],
  standalone:  true,
  imports: [
    CommonModule, ReactiveFormsModule,
    NzStepsModule, NzFormModule, NzInputModule,
    NzSelectModule, NzRadioModule, NzButtonModule,
    NzIconModule, NzCardModule,
  ]
})
export class OrganizationNewComponent {
  currentStep = 0;
  loading = false;
  createdOrgId: string | null = null;

  basicForm: FormGroup;

  industries = [
    { value: 'banking',    label: 'Ngân hàng' },
    { value: 'finance',    label: 'Tài chính' },
    { value: 'technology', label: 'Công nghệ' },
    { value: 'healthcare', label: 'Y tế' },
    { value: 'education',  label: 'Giáo dục' },
    { value: 'other',      label: 'Khác' },
  ];

  sizes = [
    { value: '1-10',    label: '1 - 10 nhân viên' },
    { value: '11-50',   label: '11 - 50 nhân viên' },
    { value: '51-200',  label: '51 - 200 nhân viên' },
    { value: '201-500', label: '201 - 500 nhân viên' },
    { value: '500+',    label: 'Trên 500 nhân viên' },
  ];

  plans = [
    {
      value:       'free',
      label:       'Free',
      price:       '0đ/tháng',
      members:     10,
      projects:    5,
      features:    ['10 thành viên', '5 dự án', 'Tính năng cơ bản'],
    },
    {
      value:       'starter',
      label:       'Starter',
      price:       '299.000đ/tháng',
      members:     50,
      projects:    20,
      features:    ['50 thành viên', '20 dự án', 'Workflow nâng cao', 'Báo cáo'],
    },
    {
      value:       'business',
      label:       'Business',
      price:       '999.000đ/tháng',
      members:     200,
      projects:    100,
      features:    ['200 thành viên', '100 dự án', 'SSO', 'API access', 'Priority support'],
    },
    {
      value:       'enterprise',
      label:       'Enterprise',
      price:       'Liên hệ',
      members:     99999,
      projects:    99999,
      features:    ['Không giới hạn thành viên', 'Không giới hạn dự án', 'Tùy chỉnh cao', 'SLA'],
    },
  ];

  selectedPlan = 'free';

  constructor(
    private _fb:      FormBuilder,
    private _orgSvc:  OrganizationService,
    private _message: NzMessageService,
    private _router:  Router,
  ) {
    this.basicForm = this._fb.group({
      name:        ['', [Validators.required, Validators.minLength(2)]],
      description: [''],
      industry:    ['technology', Validators.required],
      size:        ['1-10', Validators.required],
      country:     ['Vietnam'],
      website:     [''],
    });
  }

  goNext(): void {
    if (this.currentStep === 0) {
      if (this.basicForm.invalid) {
        Object.values(this.basicForm.controls).forEach(c => { c.markAsDirty(); c.updateValueAndValidity(); });
        return;
      }
      this.loading = true;
      this._orgSvc.createOrganization(this.basicForm.value).subscribe({
        next: ({ organization }) => {
          this.createdOrgId = organization.id;
          this.loading = false;
          this.currentStep++;
        },
        error: (e) => {
          this.loading = false;
          this._message.error(e?.error?.message || 'Không thể tạo tổ chức');
        }
      });
    } else if (this.currentStep === 1) {
      this.currentStep++;
    }
  }

  goPrev(): void {
    if (this.currentStep > 0) this.currentStep--;
  }

  finish(): void {
    if (this.createdOrgId) {
      this._orgSvc.switchOrganization(this.createdOrgId).subscribe({
        next: () => {
          this._message.success('Tổ chức đã được tạo thành công!');
          this._router.navigate([`/organizations/${this.createdOrgId}/settings`]);
        },
        error: () => {
          this._router.navigate([`/organizations/${this.createdOrgId}/settings`]);
        }
      });
    }
  }
}
