import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzProgressModule } from 'ng-zorro-antd/progress';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzStatisticModule } from 'ng-zorro-antd/statistic';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { NzBadgeModule } from 'ng-zorro-antd/badge';
import { NzAvatarModule } from 'ng-zorro-antd/avatar';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { ResourceService } from '../resource.service';
import { JMemberLoad, JOrgCapacityOverview, JUserWorkload } from '../../interface/resource';
import { AuthQuery } from '@trungk18/project/auth/auth.query';
import { NzDrawerModule } from 'ng-zorro-antd/drawer';
import { NzTableModule } from 'ng-zorro-antd/table';

@Component({
  selector: 'app-workload-dashboard',
  templateUrl: './workload-dashboard.component.html',
  styleUrls: ['./workload-dashboard.component.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    NzCardModule, NzProgressModule, NzTagModule, NzButtonModule, NzIconModule,
    NzSpinModule, NzStatisticModule, NzToolTipModule, NzBadgeModule, NzAvatarModule,
    NzEmptyModule, NzAlertModule, NzDividerModule, NzSelectModule,
    NzDrawerModule, NzTableModule,
  ],
})
export class WorkloadDashboardComponent implements OnInit {
  overview: JOrgCapacityOverview | null = null;
  loading  = false;
  filterStatus = 'all';

  drawerVisible = false;
  selectedUser: JMemberLoad | null = null;
  userWorkload: JUserWorkload | null = null;
  workloadLoading = false;

  get filtered(): JMemberLoad[] {
    if (!this.overview) return [];
    if (this.filterStatus === 'all') return this.overview.members;
    return this.overview.members.filter(m => m.status === this.filterStatus);
  }

  constructor(
    private _svc: ResourceService,
    private _authQ: AuthQuery,
    private _router: Router,
  ) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    this._svc.getOrgCapacityOverview().subscribe({
      next: data => { this.overview = data; this.loading = false; },
      error: () => { this.loading = false; },
    });
  }

  openDetail(m: JMemberLoad): void {
    this.selectedUser = m;
    this.drawerVisible = true;
    this.workloadLoading = true;
    this._svc.getUserWorkload(m.user.id || m.user._id, 8).subscribe({
      next: data => { this.userWorkload = data; this.workloadLoading = false; },
      error: () => { this.workloadLoading = false; },
    });
  }

  statusColor(status: string): string {
    return { critical: 'error', overloaded: 'warning', near_capacity: 'processing', healthy: 'success', underloaded: 'default' }[status] || 'default';
  }

  statusLabel(status: string): string {
    return { critical: 'NGUY HIỂM', overloaded: 'QUÁ TẢI', near_capacity: 'GẦN ĐẦY', healthy: 'BÌNH THƯỜNG', underloaded: 'RẢNH' }[status] || status;
  }

  progressColor(util: number): string {
    return util > 120 ? '#ff4d4f' : util > 100 ? '#fa8c16' : util > 80 ? '#faad14' : '#52c41a';
  }

  burnoutColor(risk: string): string {
    return { low: '#52c41a', medium: '#faad14', high: '#fa8c16', critical: '#ff4d4f' }[risk] || '#d9d9d9';
  }

  readonly Math = Math;
  utilFormat = (p: number) => `${p}%`;

  trackBy(_: number, m: JMemberLoad): string { return m.user?.id || m.user?._id || ''; }

  goToSkills(): void { this._router.navigate(['/resources/skills']); }
  goToTimeOff(): void { this._router.navigate(['/resources/timeoff']); }
  goToAi(): void { this._router.navigate(['/resources/ai-insights']); }
}
