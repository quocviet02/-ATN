import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzProgressModule } from 'ng-zorro-antd/progress';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { PortfolioService } from '../portfolio.service';
import { JPortfolio, PortfolioStatus } from '../../interface/portfolio';

@Component({
  selector: 'app-portfolio-list',
  templateUrl: './portfolio-list.component.html',
  styleUrls: ['./portfolio-list.component.scss'],
  standalone: true,
  imports: [
    CommonModule, RouterLink, FormsModule,
    NzCardModule, NzButtonModule, NzTagModule, NzProgressModule,
    NzIconModule, NzModalModule, NzFormModule, NzInputModule,
    NzSelectModule, NzDatePickerModule, NzInputNumberModule,
    NzSpinModule, NzEmptyModule, NzToolTipModule,
  ],
  providers: [NzModalService],
})
export class PortfolioListComponent implements OnInit {
  portfolios: JPortfolio[] = [];
  loading = false;
  createVisible = false;
  creating = false;

  form = {
    name:        '',
    description: '',
    status:      'planning' as PortfolioStatus,
    startDate:   null as Date | null,
    targetEndDate: null as Date | null,
    budgetTotal: 0,
    color:       '#1890ff',
  };

  statusOptions: { label: string; value: PortfolioStatus }[] = [
    { label: 'Lên kế hoạch', value: 'planning' },
    { label: 'Đang hoạt động', value: 'active' },
    { label: 'Tạm dừng', value: 'on_hold' },
    { label: 'Hoàn thành', value: 'completed' },
    { label: 'Đã hủy', value: 'cancelled' },
  ];

  constructor(
    private _svc: PortfolioService,
    private _modal: NzModalService,
    private _msg: NzMessageService,
    private _router: Router,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this._svc.listPortfolios().subscribe({
      next: data => { this.portfolios = data; this.loading = false; },
      error: () => { this.loading = false; },
    });
  }

  openCreate(): void {
    this.form = { name: '', description: '', status: 'planning', startDate: null, targetEndDate: null, budgetTotal: 0, color: '#1890ff' };
    this.createVisible = true;
  }

  submitCreate(): void {
    if (!this.form.name.trim()) { this._msg.warning('Vui lòng nhập tên portfolio'); return; }
    this.creating = true;
    this._svc.createPortfolio({
      name:         this.form.name,
      description:  this.form.description,
      status:       this.form.status,
      startDate:    this.form.startDate ? this.form.startDate.toISOString() : null,
      targetEndDate: this.form.targetEndDate ? this.form.targetEndDate.toISOString() : null,
      budget:       { total: this.form.budgetTotal, spent: 0, currency: 'VND' },
      color:        this.form.color,
    }).subscribe({
      next: p => {
        this.portfolios.unshift(p);
        this.createVisible = false;
        this.creating = false;
        this._msg.success('Tạo portfolio thành công');
      },
      error: err => {
        this._msg.error(err?.error?.message || 'Lỗi tạo portfolio');
        this.creating = false;
      },
    });
  }

  deletePortfolio(p: JPortfolio, e: Event): void {
    e.stopPropagation();
    this._modal.confirm({
      nzTitle: `Xóa portfolio "${p.name}"?`,
      nzContent: 'Thao tác này không thể hoàn tác.',
      nzOkDanger: true,
      nzOkText: 'Xóa',
      nzOnOk: () => {
        this._svc.deletePortfolio(p.id).subscribe({
          next: () => {
            this.portfolios = this.portfolios.filter(x => x.id !== p.id);
            this._msg.success('Đã xóa');
          },
          error: err => this._msg.error(err?.error?.message || 'Lỗi xóa'),
        });
      },
    });
  }

  goToDetail(p: JPortfolio): void {
    this._router.navigate(['/portfolios', p.id]);
  }

  statusColor(status: PortfolioStatus): string {
    return { planning: 'default', active: 'processing', on_hold: 'warning', completed: 'success', cancelled: 'error' }[status] || 'default';
  }

  statusLabel(status: PortfolioStatus): string {
    return { planning: 'Lên kế hoạch', active: 'Đang hoạt động', on_hold: 'Tạm dừng', completed: 'Hoàn thành', cancelled: 'Đã hủy' }[status] || status;
  }

  budgetPercent(p: JPortfolio): number {
    if (!p.budget?.total) return 0;
    return Math.min(100, Math.round((p.budget.spent / p.budget.total) * 100));
  }

  formatVnd(n: number): string {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);
  }
}
