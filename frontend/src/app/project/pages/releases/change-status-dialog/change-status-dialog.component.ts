import {
  Component, Input, Output, EventEmitter, ChangeDetectionStrategy, ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule }  from '@angular/forms';
import { NzModalModule }    from 'ng-zorro-antd/modal';
import { NzButtonModule }   from 'ng-zorro-antd/button';
import { NzSelectModule }   from 'ng-zorro-antd/select';
import { NzInputModule }    from 'ng-zorro-antd/input';
import { NzTagModule }      from 'ng-zorro-antd/tag';
import { NzMessageService } from 'ng-zorro-antd/message';

import { ReleasesService }     from '@trungk18/project/state/releases/releases.service';
import {
  ProjectOverviewItem, ProjectStatus,
  PROJECT_STATUS_COLORS, PROJECT_STATUS_LABELS,
} from '@trungk18/interface/release';

@Component({
  selector: 'app-change-status-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, FormsModule,
    NzModalModule, NzButtonModule, NzSelectModule, NzInputModule, NzTagModule,
  ],
  template: `
    <nz-modal
      [nzVisible]="true"
      [nzTitle]="'Đổi trạng thái — ' + project.name"
      (nzOnCancel)="cancelled.emit()"
      (nzOnOk)="submit()"
      [nzOkLoading]="saving"
      nzOkText="Lưu thay đổi"
      [nzWidth]="480"
    >
      <ng-container *nzModalContent>
        <div style="display:flex;flex-direction:column;gap:16px">
          <div>
            <p style="margin:0 0 4px;font-weight:500">Trạng thái hiện tại</p>
            <nz-tag [nzColor]="statusColors[project.status]">{{ statusLabels[project.status] }}</nz-tag>
          </div>
          <div>
            <p style="margin:0 0 6px;font-weight:500">Trạng thái mới <span style="color:#ff4d4f">*</span></p>
            <nz-select [(ngModel)]="newStatus" style="width:100%">
              <nz-option *ngFor="let s of statuses" [nzValue]="s"
                [nzLabel]="statusLabels[s]"
                [nzDisabled]="s === project.status">
              </nz-option>
            </nz-select>
          </div>
          <div>
            <p style="margin:0 0 6px;font-weight:500">Ghi chú (tuỳ chọn)</p>
            <textarea nz-input [(ngModel)]="note"
              placeholder="Lý do thay đổi trạng thái..."
              [nzAutosize]="{ minRows: 2, maxRows: 5 }">
            </textarea>
          </div>
        </div>
      </ng-container>
    </nz-modal>
  `,
})
export class ChangeStatusDialogComponent {
  @Input() project!: ProjectOverviewItem;
  @Output() changed   = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  newStatus: ProjectStatus = 'in_development';
  note = '';
  saving = false;

  statusColors = PROJECT_STATUS_COLORS;
  statusLabels = PROJECT_STATUS_LABELS;

  readonly statuses: ProjectStatus[] = [
    'planning','in_development','testing','released','maintenance','paused','cancelled',
  ];

  constructor(
    private _svc: ReleasesService,
    private _msg: NzMessageService,
    private _cdr: ChangeDetectorRef,
  ) {}

  submit(): void {
    if (!this.newStatus || this.newStatus === this.project.status) {
      this._msg.warning('Vui lòng chọn trạng thái khác');
      return;
    }
    this.saving = true;
    this._svc.changeProjectStatus(this.project.id, this.newStatus, this.note).subscribe({
      next: () => {
        this._msg.success('Đã cập nhật trạng thái dự án');
        this.saving = false;
        this.changed.emit();
      },
      error: (e) => {
        this._msg.error(e.error?.message || 'Lỗi cập nhật trạng thái');
        this.saving = false;
        this._cdr.markForCheck();
      },
    });
  }
}
