import {
  Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NzCardModule }    from 'ng-zorro-antd/card';
import { NzTagModule }     from 'ng-zorro-antd/tag';
import { NzButtonModule }  from 'ng-zorro-antd/button';
import { NzIconModule }    from 'ng-zorro-antd/icon';
import { NzSelectModule }  from 'ng-zorro-antd/select';
import { NzTabsModule }    from 'ng-zorro-antd/tabs';
import { NzSpinModule }    from 'ng-zorro-antd/spin';
import { NzProgressModule } from 'ng-zorro-antd/progress';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { NzStatisticModule } from 'ng-zorro-antd/statistic';
import { NzModalService }  from 'ng-zorro-antd/modal';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzGridModule }    from 'ng-zorro-antd/grid';
import { NzBadgeModule }   from 'ng-zorro-antd/badge';
import { NzAvatarModule }  from 'ng-zorro-antd/avatar';
import { NzEmptyModule }   from 'ng-zorro-antd/empty';
import { TranslateModule } from '@ngx-translate/core';

import { ReleasesService }  from '@trungk18/project/state/releases/releases.service';
import {
  ProjectOverviewItem, OverviewSummary, ProjectStatus, ReleaseStatistics,
  PROJECT_STATUS_COLORS, PROJECT_STATUS_LABELS, JRelease, RELEASE_TYPE_COLORS,
} from '@trungk18/interface/release';
import { CreateReleaseDialogComponent } from '../create-release-dialog/create-release-dialog.component';
import { ChangeStatusDialogComponent }  from '../change-status-dialog/change-status-dialog.component';

@Component({
  selector: 'app-releases-overview',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, FormsModule, RouterModule,
    NzCardModule, NzTagModule, NzButtonModule, NzIconModule, NzSelectModule,
    NzTabsModule, NzSpinModule, NzProgressModule, NzToolTipModule,
    NzStatisticModule, NzGridModule, NzBadgeModule, NzAvatarModule, NzEmptyModule,
    TranslateModule,
    CreateReleaseDialogComponent, ChangeStatusDialogComponent,
  ],
  templateUrl: './releases-overview.component.html',
  styleUrls: ['./releases-overview.component.scss'],
})
export class ReleasesOverviewComponent implements OnInit {
  projects:  ProjectOverviewItem[] = [];
  summary:   OverviewSummary | null = null;
  stats:     ReleaseStatistics | null = null;
  timeline:  JRelease[] = [];

  loading       = true;
  activeTab     = 0;
  viewMode:     'grid' | 'list' = 'grid';
  filterStatus: ProjectStatus | '' = '';
  filterRole:   string = '';
  sortBy:       string = 'recent';

  statusColors = PROJECT_STATUS_COLORS;
  statusLabels = PROJECT_STATUS_LABELS;
  releaseTypeColors = RELEASE_TYPE_COLORS;

  showCreateRelease = false;
  showChangeStatus  = false;
  selectedProject: ProjectOverviewItem | null = null;

  readonly statuses: ProjectStatus[] = [
    'planning','in_development','testing','released','maintenance','paused','cancelled',
  ];

  constructor(
    private _svc: ReleasesService,
    private _msg: NzMessageService,
    private _cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this._loadOverview();
    this._loadStats();
  }

  private _loadOverview(): void {
    this.loading = true;
    const params: any = { sortBy: this.sortBy };
    if (this.filterStatus) params.status = this.filterStatus;
    if (this.filterRole)   params.role   = this.filterRole;

    this._svc.getOverview(params).subscribe({
      next: (r) => {
        this.projects = r.projects;
        this.summary  = r.summary;
        this.loading  = false;
        this._cdr.markForCheck();
      },
      error: (e) => {
        this._msg.error(e.error?.message || 'Lỗi tải dữ liệu');
        this.loading = false;
        this._cdr.markForCheck();
      },
    });
  }

  private _loadStats(): void {
    this._svc.getStatistics().subscribe({
      next: (s) => { this.stats = s; this._cdr.markForCheck(); },
    });
  }

  private _loadTimeline(): void {
    if (this.timeline.length) return;
    this._svc.getTimeline().subscribe({
      next: (r) => { this.timeline = r.releases; this._cdr.markForCheck(); },
    });
  }

  onTabChange(idx: number): void {
    this.activeTab = idx;
    if (idx === 2) this._loadTimeline();
  }

  onFilterChange(): void {
    this._loadOverview();
  }

  openCreateRelease(project: ProjectOverviewItem): void {
    this.selectedProject = project;
    this.showCreateRelease = true;
    this._cdr.markForCheck();
  }

  openChangeStatus(project: ProjectOverviewItem): void {
    this.selectedProject = project;
    this.showChangeStatus = true;
    this._cdr.markForCheck();
  }

  onReleaseCreated(): void {
    this.showCreateRelease = false;
    this._loadOverview();
    this._loadStats();
  }

  onStatusChanged(): void {
    this.showChangeStatus = false;
    this._loadOverview();
  }

  progressColor(p: number): string {
    if (p >= 80) return '#52c41a';
    if (p >= 50) return '#1890ff';
    if (p >= 30) return '#faad14';
    return '#ff4d4f';
  }

  trackById(_: number, item: ProjectOverviewItem): string {
    return item.id;
  }

  byMonthLabel(m: number): string {
    return ['T1','T2','T3','T4','T5','T6','T7','T8','T9','T10','T11','T12'][m - 1] ?? '';
  }

  get maxBarCount(): number {
    if (!this.stats?.byMonth?.length) return 1;
    return Math.max(...this.stats.byMonth.map(m => m.count), 1);
  }

  releaseProjectName(r: JRelease): string {
    return (r as any).projectId?.name ?? '';
  }
}
