import {
  Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Subject, combineLatest } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged } from 'rxjs/operators';

import { NzMessageService } from 'ng-zorro-antd/message';
import { NzDrawerModule } from 'ng-zorro-antd/drawer';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzBadgeModule } from 'ng-zorro-antd/badge';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzDropDownModule } from 'ng-zorro-antd/dropdown';
import { NzMenuModule } from 'ng-zorro-antd/menu';
import { TranslateModule } from '@ngx-translate/core';

import { NotificationService } from '@trungk18/core/services/notification.service';
import { AvatarComponent } from '../../../jira-control/avatar/avatar.component';
import {
  TimelineService, TimelineTask, TimelineProject, ConflictData, ViewMode,
} from './timeline.service';
import { GanttChartComponent, GanttTask, toGanttTasks } from './gantt-chart/gantt-chart.component';

interface ProjectGroup {
  project: TimelineProject;
  tasks: TimelineTask[];
  collapsed: boolean;
}

const PRIORITY_COLOR: Record<string, string> = {
  low:      '#10b981',
  medium:   '#3b82f6',
  high:     '#f97316',
  critical: '#ef4444',
};

@Component({
  selector:        'app-timeline',
  standalone:      true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, FormsModule, RouterModule,
    NzDrawerModule, NzSpinModule, NzBadgeModule, NzTagModule,
    NzSelectModule, NzButtonModule, NzIconModule,
    NzTooltipModule, NzModalModule, NzInputModule,
    NzDropDownModule, NzMenuModule,
    TranslateModule, AvatarComponent, GanttChartComponent,
  ],
  templateUrl: './timeline.component.html',
  styleUrls:   ['./timeline.component.scss'],
})
export class TimelineComponent implements OnInit, OnDestroy {
  projects: TimelineProject[] = [];
  groups:   ProjectGroup[]    = [];
  ganttTasks: GanttTask[]     = [];
  conflicts: ConflictData | null = null;
  loading     = false;
  projectsLoading = false;

  selectedProjectIds: string[] = [];
  viewMode: ViewMode = 'Week';
  searchText = '';
  conflictDrawerOpen = false;
  criticalPathMode   = false;
  criticalTaskIds    = new Set<string>();

  aiLoading    = false;
  aiSuggestions: Array<{ title: string; description: string }> = [];
  aiDrawerOpen = false;
  currentConflictTasks: TimelineTask[] = [];
  currentConflictType  = '';

  private _destroy$ = new Subject<void>();
  private _search$  = new Subject<string>();

  readonly PRIORITY_COLOR = PRIORITY_COLOR;

  viewModes: Array<{ label: string; value: ViewMode }> = [
    { label: 'Ngày',  value: 'Day'   },
    { label: 'Tuần',  value: 'Week'  },
    { label: 'Tháng', value: 'Month' },
    { label: 'Năm',   value: 'Year'  },
  ];

  constructor(
    public  svc: TimelineService,
    private _msg: NzMessageService,
    private _notif: NotificationService,
    private _cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this._loadProjects();
    this._subscribeState();
    this._listenSocket();
    this._setupSearch();
  }

  ngOnDestroy(): void {
    this._destroy$.next();
    this._destroy$.complete();
  }

  // ─── Load ─────────────────────────────────────────────────────────────────

  private _loadProjects(): void {
    this.projectsLoading = true;
    this._cdr.markForCheck();

    this.svc.getProjects().pipe(takeUntil(this._destroy$)).subscribe({
      next: (projects) => {
        this.projects        = projects;
        this.projectsLoading = false;

        const saved = this.svc.selectedProjects$.value;
        const valid = saved.filter(id => projects.some(p => p.id === id));
        if (valid.length) {
          this.selectedProjectIds = valid;
        } else if (projects.length) {
          this.selectedProjectIds = [projects[0].id];
        }
        this.svc.selectedProjects$.next(this.selectedProjectIds);
        this._refresh();
        this._cdr.markForCheck();
      },
      error: () => { this.projectsLoading = false; this._cdr.markForCheck(); },
    });
  }

  private _subscribeState(): void {
    combineLatest([this.svc.tasks$, this.svc.loading$])
      .pipe(takeUntil(this._destroy$))
      .subscribe(([tasks, loading]) => {
        this.loading    = loading;
        this._buildGroups(tasks);
        this._cdr.markForCheck();
      });

    this.svc.conflicts$.pipe(takeUntil(this._destroy$)).subscribe(c => {
      this.conflicts = c;
      this._cdr.markForCheck();
    });
  }

  _refresh(): void {
    this.svc.loadTasks();
    this.svc.loadConflicts();
  }

  private _buildGroups(allTasks: TimelineTask[]): void {
    const filtered = this._applySearch(allTasks);
    const projMap  = new Map<string, TimelineTask[]>();

    for (const t of filtered) {
      if (!projMap.has(t.projectId)) projMap.set(t.projectId, []);
      projMap.get(t.projectId)!.push(t);
    }

    this.groups = this.projects
      .filter(p => this.selectedProjectIds.includes(p.id) && projMap.has(p.id))
      .map(p => ({
        project:   p,
        tasks:     projMap.get(p.id) || [],
        collapsed: this.groups.find(g => g.project.id === p.id)?.collapsed ?? false,
      }));

    const visibleTasks = this.groups.flatMap(g => g.collapsed ? [] : g.tasks);
    this.ganttTasks = toGanttTasks(visibleTasks);
  }

  private _applySearch(tasks: TimelineTask[]): TimelineTask[] {
    const q = this.searchText.trim().toLowerCase();
    return q ? tasks.filter(t => t.title.toLowerCase().includes(q)) : tasks;
  }

  // ─── Project selection ────────────────────────────────────────────────────

  onProjectSelectionChange(): void {
    this.svc.selectedProjects$.next(this.selectedProjectIds);
    this._refresh();
  }

  selectAllProjects(): void {
    this.selectedProjectIds = this.projects.map(p => p.id);
    this.onProjectSelectionChange();
  }

  clearAllProjects(): void {
    this.selectedProjectIds = [];
    this.onProjectSelectionChange();
  }

  // ─── View mode ────────────────────────────────────────────────────────────

  setViewMode(m: ViewMode): void {
    this.viewMode = m;
    this.svc.viewMode$.next(m);
  }

  // ─── Search ───────────────────────────────────────────────────────────────

  private _setupSearch(): void {
    this._search$.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this._destroy$),
    ).subscribe(() => this._buildGroups(this.svc.tasks$.value));
  }

  onSearchChange(text: string): void {
    this.searchText = text;
    this._search$.next(text);
  }

  // ─── Group toggle ─────────────────────────────────────────────────────────

  toggleGroup(g: ProjectGroup): void {
    g.collapsed = !g.collapsed;
    const visibleTasks = this.groups.flatMap(gr => gr.collapsed ? [] : gr.tasks);
    this.ganttTasks = toGanttTasks(visibleTasks);
    this._cdr.markForCheck();
  }

  // ─── Gantt events ─────────────────────────────────────────────────────────

  onTaskDateChange(ev: { taskId: string; startDate: string; endDate: string }): void {
    this.svc.rescheduleTask(ev.taskId, ev.startDate, ev.endDate)
      .pipe(takeUntil(this._destroy$))
      .subscribe({
        next: () => {
          const tasks = this.svc.tasks$.value.map(t =>
            t.id === ev.taskId ? { ...t, startDate: ev.startDate, dueDate: ev.endDate } : t
          );
          this.svc.tasks$.next(tasks);
          this._buildGroups(tasks);
          this._msg.success(`Đã cập nhật lịch task`);
          this._cdr.markForCheck();
        },
        error: () => this._msg.error('Cập nhật thất bại'),
      });
  }

  // ─── Critical path ────────────────────────────────────────────────────────

  toggleCriticalPath(): void {
    this.criticalPathMode = !this.criticalPathMode;
    if (!this.criticalPathMode) { this.criticalTaskIds = new Set(); this._cdr.markForCheck(); return; }

    const firstProjectId = this.selectedProjectIds[0];
    if (!firstProjectId) return;

    this.svc.getCriticalPath(firstProjectId).pipe(takeUntil(this._destroy$)).subscribe({
      next: ({ criticalPath }) => {
        this.criticalTaskIds = new Set((criticalPath as any[]).map(t => t.id));
        this._cdr.markForCheck();
      },
      error: () => this._msg.error('Không thể tính critical path'),
    });
  }

  isCritical(taskId: string): boolean {
    return this.criticalPathMode && this.criticalTaskIds.has(taskId);
  }

  // ─── Conflict panel ───────────────────────────────────────────────────────

  get conflictCount(): number {
    if (!this.conflicts) return 0;
    return this.conflicts.overdue.length + this.conflicts.overlaps.length + this.conflicts.blocked.length;
  }

  openConflictDrawer(): void { this.conflictDrawerOpen = true; }
  closeConflictDrawer(): void { this.conflictDrawerOpen = false; }

  // ─── AI resolve ───────────────────────────────────────────────────────────

  openAiResolve(type: string, tasks: TimelineTask[]): void {
    this.currentConflictType  = type;
    this.currentConflictTasks = tasks;
    this.aiSuggestions        = [];
    this.aiLoading            = true;
    this.aiDrawerOpen         = true;
    this._cdr.markForCheck();

    this.svc.aiResolveConflict(type, tasks).pipe(takeUntil(this._destroy$)).subscribe({
      next: res => {
        this.aiSuggestions = (res.suggestions || []) as any[];
        this.aiLoading     = false;
        this._cdr.markForCheck();
      },
      error: () => { this.aiLoading = false; this._msg.error('AI không khả dụng'); this._cdr.markForCheck(); },
    });
  }

  closeAiDrawer(): void { this.aiDrawerOpen = false; }

  // ─── Socket realtime ──────────────────────────────────────────────────────

  private _listenSocket(): void {
    (this._notif as any)._socket?.on('task_rescheduled', (ev: any) => {
      const tasks = this.svc.tasks$.value.map(t =>
        t.id === ev.taskId
          ? { ...t, startDate: ev.startDate, dueDate: ev.dueDate }
          : t
      );
      this.svc.tasks$.next(tasks);
      this._buildGroups(tasks);
      this._cdr.markForCheck();
    });
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  getPriorityColor(p: string): string { return PRIORITY_COLOR[p] || '#3b82f6'; }

  isOverdue(iso: string | null): boolean {
    return !!iso && new Date(iso) < new Date();
  }

  formatDate(iso: string | null): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  trackById(_: number, item: { id: string }) { return item.id; }
  trackByProjectId(_: number, g: ProjectGroup) { return g.project.id; }
}
