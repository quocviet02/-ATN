import { Component, Input, OnInit } from '@angular/core';
import { CommonModule, NgTemplateOutlet, NgIf } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { OrganizationService } from '../../../organization.service';
import { JDepartment, OrgRole } from '@trungk18/interface/organization';

@Component({
  selector:    'app-org-departments',
  templateUrl: './org-departments.component.html',
  styleUrls:   ['./org-departments.component.scss'],
  standalone:  true,
  imports: [
    CommonModule, NgTemplateOutlet, NgIf, ReactiveFormsModule,
    NzButtonModule, NzIconModule, NzModalModule,
    NzFormModule, NzInputModule, NzSelectModule,
    NzCardModule, NzTagModule, NzEmptyModule, NzToolTipModule,
  ]
})
export class OrgDepartmentsComponent implements OnInit {
  @Input() orgId!: string;
  @Input() myRole!: OrgRole;

  departments: JDepartment[] = [];
  tree: JDepartment[]        = [];
  loading = false;

  modalVisible  = false;
  modalTitle    = 'Thêm phòng ban';
  editingId: string | null = null;
  deptForm: FormGroup;
  modalLoading = false;

  expandedIds = new Set<string>();

  constructor(
    private _orgSvc:  OrganizationService,
    private _fb:      FormBuilder,
    private _message: NzMessageService,
    private _modal:   NzModalService,
  ) {
    this.deptForm = this._fb.group({
      name:               ['', Validators.required],
      description:        [''],
      color:              ['#1890ff'],
      icon:               ['team'],
      parentDepartmentId: [null],
    });
  }

  get canManage(): boolean {
    return this.myRole === 'owner' || this.myRole === 'admin';
  }

  ngOnInit(): void {
    this._load();
  }

  private _load(): void {
    this.loading = true;
    this._orgSvc.getDepartments(this.orgId).subscribe({
      next: ({ departments, tree }) => {
        this.departments = departments;
        this.tree        = tree;
        this.loading     = false;
      },
      error: () => { this.loading = false; }
    });
  }

  openCreate(parent?: JDepartment): void {
    this.editingId   = null;
    this.modalTitle  = 'Thêm phòng ban';
    this.deptForm.reset({ color: '#1890ff', icon: 'team', parentDepartmentId: parent?.id || null });
    this.modalVisible = true;
  }

  openEdit(dept: JDepartment): void {
    this.editingId  = dept.id;
    this.modalTitle = 'Chỉnh sửa phòng ban';
    this.deptForm.patchValue({
      name:               dept.name,
      description:        dept.description,
      color:              dept.color,
      icon:               dept.icon,
      parentDepartmentId: dept.parentDepartmentId || null,
    });
    this.modalVisible = true;
  }

  saveModal(): void {
    if (this.deptForm.invalid) {
      Object.values(this.deptForm.controls).forEach(c => { c.markAsDirty(); c.updateValueAndValidity(); });
      return;
    }
    this.modalLoading = true;
    const data = this.deptForm.value;

    const req = this.editingId
      ? this._orgSvc.updateDepartment(this.editingId, data)
      : this._orgSvc.createDepartment(this.orgId, data);

    req.subscribe({
      next: () => {
        this.modalLoading = false;
        this.modalVisible = false;
        this._message.success(this.editingId ? 'Đã cập nhật phòng ban' : 'Đã tạo phòng ban');
        this._load();
      },
      error: (e) => {
        this.modalLoading = false;
        this._message.error(e?.error?.message || 'Lỗi');
      }
    });
  }

  confirmDelete(dept: JDepartment): void {
    this._modal.confirm({
      nzTitle:      'Xóa phòng ban?',
      nzContent:    `Bạn có chắc muốn xóa phòng ban <strong>${dept.name}</strong>?`,
      nzOkText:     'Xóa',
      nzOkDanger:   true,
      nzCancelText: 'Hủy',
      nzOnOk: () => {
        this._orgSvc.deleteDepartment(dept.id).subscribe({
          next: () => {
            this._message.success('Đã xóa phòng ban');
            this._load();
          },
          error: (e) => this._message.error(e?.error?.message || 'Không thể xóa')
        });
      }
    });
  }

  toggleExpand(id: string): void {
    this.expandedIds.has(id) ? this.expandedIds.delete(id) : this.expandedIds.add(id);
  }

  isExpanded(id: string): boolean {
    return this.expandedIds.has(id);
  }
}
