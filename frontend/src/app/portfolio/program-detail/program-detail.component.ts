import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NzTabsModule } from 'ng-zorro-antd/tabs';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzProgressModule } from 'ng-zorro-antd/progress';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzListModule } from 'ng-zorro-antd/list';
import { NzStatisticModule } from 'ng-zorro-antd/statistic';
import { PortfolioService } from '../portfolio.service';
import { JProgram } from '../../interface/portfolio';

@Component({
  selector: 'app-program-detail',
  templateUrl: './program-detail.component.html',
  styleUrls: ['./program-detail.component.scss'],
  standalone: true,
  imports: [
    CommonModule, RouterLink, FormsModule,
    NzTabsModule, NzCardModule, NzButtonModule, NzIconModule,
    NzTagModule, NzTableModule, NzProgressModule, NzSpinModule,
    NzDividerModule, NzEmptyModule, NzListModule, NzStatisticModule,
  ],
})
export class ProgramDetailComponent implements OnInit {
  programId = '';
  program: JProgram | null = null;
  projects: any[] = [];
  loading = true;

  constructor(
    private _route: ActivatedRoute,
    private _router: Router,
    private _svc: PortfolioService,
    private _msg: NzMessageService,
  ) {}

  ngOnInit(): void {
    this.programId = this._route.snapshot.paramMap.get('id') || '';
    this.load();
  }

  load(): void {
    this.loading = true;
    Promise.all([
      this._svc.getProgram(this.programId).toPromise(),
      this._svc.getProgramProjects(this.programId).toPromise(),
    ]).then(([prog, projects]) => {
      this.program  = prog || null;
      this.projects = projects || [];
      this.loading  = false;
    }).catch(() => { this.loading = false; });
  }

  statusColor(status: string): string {
    return { planning: 'default', active: 'processing', on_hold: 'warning', completed: 'success', cancelled: 'error' }[status] || 'default';
  }

  statusLabel(status: string): string {
    return { planning: 'Lên kế hoạch', active: 'Đang hoạt động', on_hold: 'Tạm dừng', completed: 'Hoàn thành', cancelled: 'Đã hủy' }[status] || status;
  }

  formatVnd(n: number): string {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);
  }

  goBack(): void {
    if (this.program?.portfolioId) {
      this._router.navigate(['/portfolios', this.program.portfolioId]);
    } else {
      this._router.navigate(['/portfolios']);
    }
  }

  goToProject(p: any): void {
    this._router.navigate(['/project/board'], { queryParams: { projectId: p.id } });
  }

  avgProgress(): number {
    if (!this.projects.length) return 0;
    return Math.round(this.projects.reduce((s, p) => s + (p.progress || 0), 0) / this.projects.length);
  }
}
