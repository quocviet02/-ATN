import {
  Component, Input, Output, EventEmitter, OnInit, ChangeDetectionStrategy, ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NzModalModule }    from 'ng-zorro-antd/modal';
import { NzButtonModule }   from 'ng-zorro-antd/button';
import { NzFormModule }     from 'ng-zorro-antd/form';
import { NzInputModule }    from 'ng-zorro-antd/input';
import { NzSelectModule }   from 'ng-zorro-antd/select';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzTagModule }      from 'ng-zorro-antd/tag';

import { ReleasesService }     from '@trungk18/project/state/releases/releases.service';
import { ProjectOverviewItem, ReleaseType } from '@trungk18/interface/release';

@Component({
  selector: 'app-create-release-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, FormsModule,
    NzModalModule, NzButtonModule, NzFormModule, NzInputModule,
    NzSelectModule, NzDatePickerModule, NzCheckboxModule, NzTagModule,
  ],
  template: `
    <nz-modal
      [nzVisible]="true"
      [nzTitle]="'Tạo Release — ' + project.name"
      (nzOnCancel)="cancelled.emit()"
      (nzOnOk)="submit()"
      [nzOkLoading]="saving"
      nzOkText="Tạo Release"
      [nzWidth]="600"
    >
      <ng-container *nzModalContent>
        <div class="form-body">
          <!-- Version -->
          <div class="form-row">
            <label>Phiên bản <span class="required">*</span></label>
            <div class="version-row">
              <input nz-input [(ngModel)]="form.version" placeholder="v1.2.0" style="flex:1" />
              <div class="suggest-btns">
                <span class="suggest-lbl">Gợi ý:</span>
                <button nz-button nzSize="small" *ngFor="let t of releaseTypes"
                  (click)="suggestVersion(t)">{{ t }}</button>
              </div>
            </div>
          </div>
          <!-- Type -->
          <div class="form-row">
            <label>Loại Release</label>
            <nz-select [(ngModel)]="form.type" style="width:100%">
              <nz-option nzValue="major"  nzLabel="Major — thay đổi lớn"></nz-option>
              <nz-option nzValue="minor"  nzLabel="Minor — tính năng mới"></nz-option>
              <nz-option nzValue="patch"  nzLabel="Patch — sửa lỗi"></nz-option>
              <nz-option nzValue="hotfix" nzLabel="Hotfix — sửa lỗi khẩn"></nz-option>
            </nz-select>
          </div>
          <!-- Date -->
          <div class="form-row">
            <label>Ngày phát hành <span class="required">*</span></label>
            <nz-date-picker [(ngModel)]="releaseDate" nzFormat="dd/MM/yyyy" style="width:100%"></nz-date-picker>
          </div>
          <!-- Notes -->
          <div class="form-row">
            <label>Release Notes</label>
            <textarea nz-input [(ngModel)]="form.releaseNotes"
              placeholder="Mô tả những thay đổi trong phiên bản này..."
              [nzAutosize]="{ minRows: 3, maxRows: 8 }">
            </textarea>
          </div>
          <!-- Done tasks -->
          <div class="form-row" *ngIf="doneTasks.length">
            <label>Gắn Tasks hoàn thành ({{ selectedTasks.length }}/{{ doneTasks.length }})</label>
            <div class="task-list">
              <label nz-checkbox *ngFor="let t of doneTasks" [nzValue]="t.id"
                [(ngModel)]="taskSelection[t.id]">
                {{ t.title }}
              </label>
            </div>
          </div>
        </div>
      </ng-container>
    </nz-modal>
  `,
  styles: [`
    .form-body { display: flex; flex-direction: column; gap: 16px; }
    .form-row { display: flex; flex-direction: column; gap: 6px; }
    label { font-weight: 500; font-size: 13px; }
    .required { color: #ff4d4f; }
    .version-row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
    .suggest-btns { display: flex; gap: 4px; align-items: center; }
    .suggest-lbl { font-size: 12px; color: #8c8c8c; }
    .task-list { display: flex; flex-direction: column; gap: 6px; max-height: 160px; overflow-y: auto; padding: 4px; border: 1px solid #f0f0f0; border-radius: 6px; }
  `],
})
export class CreateReleaseDialogComponent implements OnInit {
  @Input() project!: ProjectOverviewItem;
  @Output() created   = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  form = {
    version:      '',
    type:         'minor' as ReleaseType,
    releaseNotes: '',
  };

  releaseDate: Date | null = new Date();
  doneTasks: { id: string; title: string }[] = [];
  taskSelection: Record<string, boolean> = {};
  saving = false;

  readonly releaseTypes: ReleaseType[] = ['major', 'minor', 'patch', 'hotfix'];

  constructor(
    private _svc: ReleasesService,
    private _msg: NzMessageService,
    private _cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this._svc.getDoneTasks(this.project.id).subscribe({
      next: (r) => { this.doneTasks = r.tasks; this._cdr.markForCheck(); },
    });
    this._svc.suggestVersion(this.project.id, 'minor').subscribe({
      next: (r) => { this.form.version = r.suggested; this._cdr.markForCheck(); },
    });
  }

  suggestVersion(type: ReleaseType): void {
    this._svc.suggestVersion(this.project.id, type).subscribe({
      next: (r) => { this.form.version = r.suggested; this._cdr.markForCheck(); },
    });
  }

  get selectedTasks(): string[] {
    return Object.entries(this.taskSelection).filter(([, v]) => v).map(([k]) => k);
  }

  submit(): void {
    if (!this.form.version.trim()) { this._msg.warning('Vui lòng nhập phiên bản'); return; }
    if (!this.releaseDate)          { this._msg.warning('Vui lòng chọn ngày phát hành'); return; }

    this.saving = true;
    this._svc.createRelease(this.project.id, {
      version:      this.form.version.trim(),
      releaseDate:  this.releaseDate.toISOString(),
      releaseNotes: this.form.releaseNotes,
      type:         this.form.type,
      tasks:        this.selectedTasks,
    }).subscribe({
      next: () => {
        this._msg.success(`Đã tạo release ${this.form.version}`);
        this.saving = false;
        this.created.emit();
      },
      error: (e) => {
        this._msg.error(e.error?.message || 'Lỗi tạo release');
        this.saving = false;
        this._cdr.markForCheck();
      },
    });
  }
}
