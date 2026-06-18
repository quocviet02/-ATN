import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NzCalendarModule } from 'ng-zorro-antd/calendar';
import { NzBadgeModule } from 'ng-zorro-antd/badge';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzAvatarModule } from 'ng-zorro-antd/avatar';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { ResourceService } from '../resource.service';
import { JTimeOff, TimeOffType } from '../../interface/resource';
import { AuthQuery } from '@trungk18/project/auth/auth.query';

@Component({
  selector: 'app-timeoff-calendar',
  templateUrl: './timeoff-calendar.component.html',
  styleUrls: ['./timeoff-calendar.component.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    NzCalendarModule, NzBadgeModule, NzButtonModule, NzIconModule, NzTagModule,
    NzModalModule, NzFormModule, NzSelectModule, NzDatePickerModule,
    NzInputModule, NzTableModule, NzSpinModule, NzEmptyModule, NzAvatarModule, NzDividerModule,
    NzCardModule, NzToolTipModule,
  ],
  providers: [NzModalService],
})
export class TimeoffCalendarComponent implements OnInit {
  myTimeOffs: JTimeOff[] = [];
  orgCalendar: JTimeOff[] = [];
  pendingRequests: JTimeOff[] = [];
  loading = false;

  currentDate = new Date();
  selectedDate: Date | null = null;
  selectedDayOff: JTimeOff[] = [];

  createVisible = false;
  creating = false;
  form = {
    type: 'vacation' as TimeOffType,
    startDate: null as Date | null,
    endDate: null as Date | null,
    reason: '',
    hoursPerDay: 8,
  };

  readonly typeOptions = [
    { value: 'vacation',       label: '🏖️ Nghỉ phép', color: '#1890ff' },
    { value: 'sick',           label: '🤒 Ốm',         color: '#fa8c16' },
    { value: 'personal',       label: '👤 Việc cá nhân', color: '#722ed1' },
    { value: 'training',       label: '📚 Đào tạo',    color: '#13c2c2' },
    { value: 'public_holiday', label: '🎉 Ngày lễ',    color: '#f5222d' },
    { value: 'maternity',      label: '👶 Thai sản',   color: '#eb2f96' },
    { value: 'other',          label: '📋 Khác',       color: '#8c8c8c' },
  ];

  constructor(
    private _svc: ResourceService,
    private _authQ: AuthQuery,
    private _modal: NzModalService,
    private _msg: NzMessageService,
  ) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    const now   = new Date(this.currentDate);
    const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const end   = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();

    Promise.all([
      this._svc.listMyTimeOff().toPromise(),
      this._svc.getOrgTimeOffCalendar(start, end).toPromise(),
      this._svc.listTimeOff({ status: 'pending' }).toPromise(),
    ]).then(([my, calendar, pending]) => {
      this.myTimeOffs       = my || [];
      this.orgCalendar      = calendar || [];
      this.pendingRequests  = pending || [];
      this.loading          = false;
    }).catch(() => { this.loading = false; });
  }

  onMonthChange(date: Date): void {
    this.currentDate = date;
    this.load();
  }

  getDayOff(date: Date): JTimeOff[] {
    const d = date.toDateString();
    return this.orgCalendar.filter(t => {
      const s = new Date(t.startDate).toDateString();
      const e = new Date(t.endDate).toDateString();
      return date >= new Date(t.startDate) && date <= new Date(t.endDate);
    });
  }

  selectDate(date: Date): void {
    this.selectedDate   = date;
    this.selectedDayOff = this.getDayOff(date);
  }

  typeColor(type: string): string {
    return this.typeOptions.find(o => o.value === type)?.color || '#8c8c8c';
  }

  typeLabel(type: string): string {
    return this.typeOptions.find(o => o.value === type)?.label || type;
  }

  statusColor(status: string): string {
    return { pending: 'warning', approved: 'success', rejected: 'error', cancelled: 'default' }[status] || 'default';
  }

  openCreate(): void {
    this.form = { type: 'vacation', startDate: null, endDate: null, reason: '', hoursPerDay: 8 };
    this.createVisible = true;
  }

  submitCreate(): void {
    if (!this.form.startDate || !this.form.endDate) { this._msg.warning('Chọn ngày bắt đầu và kết thúc'); return; }
    this.creating = true;
    this._svc.createTimeOff({
      type: this.form.type,
      startDate: this.form.startDate.toISOString(),
      endDate:   this.form.endDate.toISOString(),
      reason:    this.form.reason,
      hoursPerDay: this.form.hoursPerDay,
    }).subscribe({
      next: t => {
        this.myTimeOffs.unshift(t);
        this.createVisible = false;
        this.creating = false;
        this._msg.success('Đăng ký nghỉ phép thành công');
        this.load();
      },
      error: err => { this._msg.error(err?.error?.message || 'Lỗi'); this.creating = false; },
    });
  }

  approve(t: JTimeOff): void {
    this._svc.approveTimeOff(t.id).subscribe({
      next: updated => {
        const idx = this.pendingRequests.findIndex(x => x.id === t.id);
        if (idx >= 0) this.pendingRequests.splice(idx, 1);
        this._msg.success('Đã duyệt');
        this.load();
      },
      error: err => this._msg.error(err?.error?.message || 'Lỗi'),
    });
  }

  reject(t: JTimeOff): void {
    this._svc.rejectTimeOff(t.id).subscribe({
      next: () => {
        this.pendingRequests = this.pendingRequests.filter(x => x.id !== t.id);
        this._msg.success('Đã từ chối');
        this.load();
      },
      error: err => this._msg.error(err?.error?.message || 'Lỗi'),
    });
  }

  cancel(t: JTimeOff): void {
    this._svc.cancelTimeOff(t.id).subscribe({
      next: () => {
        const idx = this.myTimeOffs.findIndex(x => x.id === t.id);
        if (idx >= 0) this.myTimeOffs[idx] = { ...this.myTimeOffs[idx], status: 'cancelled' };
        this._msg.success('Đã hủy');
      },
      error: err => this._msg.error(err?.error?.message || 'Lỗi'),
    });
  }
}
