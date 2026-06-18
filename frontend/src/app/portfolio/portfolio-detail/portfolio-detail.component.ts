import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NzTabsModule } from 'ng-zorro-antd/tabs';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzProgressModule } from 'ng-zorro-antd/progress';
import { NzStatisticModule } from 'ng-zorro-antd/statistic';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzCollapseModule } from 'ng-zorro-antd/collapse';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { RiskMatrixComponent } from '../components/risk-matrix/risk-matrix.component';
import { PortfolioService } from '../portfolio.service';
import {
  JPortfolio, JProgram, JRisk, PortfolioDashboard,
  AiHealthCheck, AiRiskPrediction, PortfolioStatus,
} from '../../interface/portfolio';

@Component({
  selector: 'app-portfolio-detail',
  templateUrl: './portfolio-detail.component.html',
  styleUrls: ['./portfolio-detail.component.scss'],
  standalone: true,
  imports: [
    CommonModule, RouterLink, FormsModule,
    NzTabsModule, NzCardModule, NzButtonModule, NzIconModule,
    NzTagModule, NzProgressModule, NzStatisticModule, NzTableModule,
    NzModalModule, NzFormModule, NzInputModule, NzSelectModule,
    NzInputNumberModule, NzDatePickerModule, NzSpinModule,
    NzCollapseModule, NzToolTipModule, NzDividerModule, NzEmptyModule, NzAlertModule,
    RiskMatrixComponent,
  ],
  providers: [NzModalService],
})
export class PortfolioDetailComponent implements OnInit {
  portfolioId = '';
  portfolio: JPortfolio | null = null;
  dashboard: PortfolioDashboard | null = null;
  programs: JProgram[] = [];
  risks: JRisk[] = [];
  loading = true;

  // AI
  aiHealth: AiHealthCheck | null = null;
  aiRisk: AiRiskPrediction | null = null;
  aiLoading = false;

  // Create Program modal
  programVisible = false;
  creatingProgram = false;
  programForm = {
    name: '', description: '', status: 'planning' as PortfolioStatus,
    startDate: null as Date | null, targetEndDate: null as Date | null,
    budgetTotal: 0, color: '#52c41a',
  };

  // Create Risk modal
  riskVisible = false;
  creatingRisk = false;
  riskForm = {
    title: '', description: '', category: 'technical',
    probability: 3, impact: 3, status: 'identified',
    mitigationPlan: '', dueDate: null as Date | null,
  };

  // Edit Portfolio modal
  editVisible = false;
  editForm: Partial<JPortfolio> = {};

  statusOptions = [
    { label: 'Lên kế hoạch', value: 'planning' },
    { label: 'Đang hoạt động', value: 'active' },
    { label: 'Tạm dừng', value: 'on_hold' },
    { label: 'Hoàn thành', value: 'completed' },
    { label: 'Đã hủy', value: 'cancelled' },
  ];

  riskCategories = [
    { label: 'Kỹ thuật', value: 'technical' },
    { label: 'Nguồn lực', value: 'resource' },
    { label: 'Tài chính', value: 'financial' },
    { label: 'Tiến độ', value: 'schedule' },
    { label: 'Phạm vi', value: 'scope' },
    { label: 'Bên ngoài', value: 'external' },
  ];

  constructor(
    private _route: ActivatedRoute,
    private _router: Router,
    private _svc: PortfolioService,
    private _modal: NzModalService,
    private _msg: NzMessageService,
  ) {}

  ngOnInit(): void {
    this.portfolioId = this._route.snapshot.paramMap.get('id') || '';
    this.loadAll();
  }

  loadAll(): void {
    this.loading = true;
    Promise.all([
      this._svc.getPortfolioDashboard(this.portfolioId).toPromise(),
      this._svc.listPrograms(this.portfolioId).toPromise(),
      this._svc.listRisks('portfolio', this.portfolioId).toPromise(),
    ]).then(([dash, programs, risks]) => {
      this.dashboard = dash || null;
      this.portfolio = dash?.portfolio || null;
      this.programs  = programs || [];
      this.risks     = risks || [];
      this.loading   = false;
    }).catch(() => { this.loading = false; });
  }

  // ── Programs ──────────────────────────────────────────────────────────────

  openCreateProgram(): void {
    this.programForm = { name: '', description: '', status: 'planning', startDate: null, targetEndDate: null, budgetTotal: 0, color: '#52c41a' };
    this.programVisible = true;
  }

  submitProgram(): void {
    if (!this.programForm.name.trim()) { this._msg.warning('Nhập tên program'); return; }
    this.creatingProgram = true;
    this._svc.createProgram(this.portfolioId, {
      name: this.programForm.name,
      description: this.programForm.description,
      status: this.programForm.status,
      startDate: this.programForm.startDate?.toISOString() || null,
      targetEndDate: this.programForm.targetEndDate?.toISOString() || null,
      budget: { total: this.programForm.budgetTotal, spent: 0, currency: 'VND' },
      color: this.programForm.color,
    } as any).subscribe({
      next: p => {
        this.programs.unshift(p);
        this.programVisible = false;
        this.creatingProgram = false;
        this._msg.success('Tạo program thành công');
      },
      error: err => { this._msg.error(err?.error?.message || 'Lỗi'); this.creatingProgram = false; },
    });
  }

  deleteProgram(p: JProgram, e: Event): void {
    e.stopPropagation();
    this._modal.confirm({
      nzTitle: `Xóa program "${p.name}"?`,
      nzOkDanger: true, nzOkText: 'Xóa',
      nzOnOk: () => this._svc.deleteProgram(p.id).subscribe({
        next: () => {
          this.programs = this.programs.filter(x => x.id !== p.id);
          this._msg.success('Đã xóa');
        },
        error: err => this._msg.error(err?.error?.message || 'Lỗi'),
      }),
    });
  }

  goToProgram(p: JProgram): void {
    this._router.navigate(['/programs', p.id]);
  }

  // ── Risks ─────────────────────────────────────────────────────────────────

  openCreateRisk(): void {
    this.riskForm = { title: '', description: '', category: 'technical', probability: 3, impact: 3, status: 'identified', mitigationPlan: '', dueDate: null };
    this.riskVisible = true;
  }

  submitRisk(): void {
    if (!this.riskForm.title.trim()) { this._msg.warning('Nhập tiêu đề rủi ro'); return; }
    this.creatingRisk = true;
    this._svc.createRisk({
      ...this.riskForm,
      scopeType: 'portfolio',
      scopeId: this.portfolioId,
      dueDate: this.riskForm.dueDate?.toISOString() || null,
    } as any).subscribe({
      next: r => {
        this.risks.unshift(r);
        this.riskVisible = false;
        this.creatingRisk = false;
        this._msg.success('Thêm rủi ro thành công');
      },
      error: err => { this._msg.error(err?.error?.message || 'Lỗi'); this.creatingRisk = false; },
    });
  }

  deleteRisk(r: JRisk, e: Event): void {
    e.stopPropagation();
    this._modal.confirm({
      nzTitle: `Xóa rủi ro "${r.title}"?`,
      nzOkDanger: true, nzOkText: 'Xóa',
      nzOnOk: () => this._svc.deleteRisk(r.id).subscribe({
        next: () => {
          this.risks = this.risks.filter(x => x.id !== r.id);
          this._msg.success('Đã xóa');
        },
        error: err => this._msg.error(err?.error?.message || 'Lỗi'),
      }),
    });
  }

  // ── AI Insights ───────────────────────────────────────────────────────────

  runAiHealthCheck(): void {
    this.aiLoading = true;
    this._svc.getAiHealthCheck(this.portfolioId).subscribe({
      next: data => { this.aiHealth = data; this.aiLoading = false; },
      error: err => { this._msg.error('AI health-check thất bại'); this.aiLoading = false; },
    });
  }

  runAiRiskPrediction(): void {
    this.aiLoading = true;
    this._svc.getAiRiskPrediction(this.portfolioId).subscribe({
      next: data => { this.aiRisk = data; this.aiLoading = false; },
      error: err => { this._msg.error('AI risk-prediction thất bại'); this.aiLoading = false; },
    });
  }

  // ── Edit Portfolio ─────────────────────────────────────────────────────────

  openEdit(): void {
    if (!this.portfolio) return;
    this.editForm = { ...this.portfolio };
    this.editVisible = true;
  }

  submitEdit(): void {
    if (!this.editForm.name?.trim()) { this._msg.warning('Nhập tên portfolio'); return; }
    this._svc.updatePortfolio(this.portfolioId, this.editForm).subscribe({
      next: p => {
        this.portfolio = p;
        if (this.dashboard) this.dashboard.portfolio = p;
        this.editVisible = false;
        this._msg.success('Cập nhật thành công');
      },
      error: err => this._msg.error(err?.error?.message || 'Lỗi'),
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  statusColor(status: string): string {
    return { planning: 'default', active: 'processing', on_hold: 'warning', completed: 'success', cancelled: 'error' }[status] || 'default';
  }

  statusLabel(status: string): string {
    return { planning: 'Lên kế hoạch', active: 'Đang hoạt động', on_hold: 'Tạm dừng', completed: 'Hoàn thành', cancelled: 'Đã hủy' }[status] || status;
  }

  riskScoreColor(score: number): string {
    return score >= 15 ? '#ff4d4f' : score >= 9 ? '#fa8c16' : score >= 4 ? '#faad14' : '#52c41a';
  }

  formatVnd(n: number): string {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);
  }

  gradeColor(grade: string): string {
    return { A: '#52c41a', B: '#1890ff', C: '#faad14', D: '#fa8c16', F: '#ff4d4f' }[grade] || '#8c8c8c';
  }

  trendIcon(trend: string): string {
    return { improving: 'arrow-up', stable: 'minus', worsening: 'arrow-down' }[trend] || 'minus';
  }

  trendColor(trend: string): string {
    return { improving: '#52c41a', stable: '#faad14', worsening: '#ff4d4f' }[trend] || '#8c8c8c';
  }

  goBack(): void {
    this._router.navigate(['/portfolios']);
  }

  healthFormat = (percent: number) => `${percent}`;
}
