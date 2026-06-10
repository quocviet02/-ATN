import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalService } from 'ng-zorro-antd/modal';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { NzDrawerModule } from 'ng-zorro-antd/drawer';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { TranslateModule } from '@ngx-translate/core';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';

import { WorkflowService } from '@trungk18/project/state/workflow/workflow.service';
import { ProjectQuery } from '@trungk18/project/state/project/project.query';
import { JWorkflow, WorkflowState, WorkflowTransition, WorkflowStats } from '@trungk18/interface/workflow';
import { WorkflowAiInsightsComponent } from '../workflow-ai-insights/workflow-ai-insights.component';

type Selected = { type: 'state'; data: WorkflowState } | { type: 'transition'; data: WorkflowTransition } | null;

@UntilDestroy()
@Component({
  selector: 'app-workflow-designer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule, RouterModule,
    NzButtonModule, NzInputModule, NzSelectModule, NzCheckboxModule,
    NzIconModule, NzTagModule, NzSpinModule, NzTooltipModule,
    NzDrawerModule, NzDividerModule, NzInputNumberModule,
    TranslateModule, WorkflowAiInsightsComponent,
  ],
  templateUrl: './workflow-designer.component.html',
  styleUrls:   ['./workflow-designer.component.scss'],
})
export class WorkflowDesignerComponent implements OnInit {
  workflow: JWorkflow | null = null;
  stats:    WorkflowStats | null = null;
  loading   = false;
  saving    = false;
  selected: Selected = null;
  aiDrawerOpen = false;
  aiResult: any = null;
  aiLoading = false;

  workflowName = '';
  validationErrors: string[] = [];

  readonly REQUIRED_FIELD_OPTIONS = [
    { label: 'Mô tả',       value: 'description' },
    { label: 'Người nhận',  value: 'assignee' },
    { label: 'Deadline',    value: 'dueDate' },
    { label: 'Mức ưu tiên', value: 'priority' },
  ];

  readonly ROLE_OPTIONS = [
    { label: 'Owner',  value: 'owner'  },
    { label: 'Admin',  value: 'admin'  },
    { label: 'Member', value: 'member' },
  ];

  constructor(
    private _route:   ActivatedRoute,
    private _router:  Router,
    private _wfSvc:   WorkflowService,
    private _query:   ProjectQuery,
    private _msg:     NzMessageService,
    private _modal:   NzModalService,
    private _cdr:     ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    const id = this._route.snapshot.paramMap.get('workflowId');
    if (id) this._loadWorkflow(id);
  }

  private _loadWorkflow(id: string): void {
    this.loading = true;
    this._wfSvc.getWorkflow(id).subscribe({
      next: ({ workflow, stats }) => {
        this.workflow     = JSON.parse(JSON.stringify(workflow)); // deep clone for editing
        this.workflowName = workflow.name;
        this.stats        = stats;
        this.loading      = false;
        this._cdr.markForCheck();
      },
      error: () => { this.loading = false; this._cdr.markForCheck(); },
    });
  }

  // ── State CRUD ────────────────────────────────────────────────────────────

  addState(): void {
    if (!this.workflow) return;
    const newState: WorkflowState = {
      id:        crypto.randomUUID(),
      name:      'Trạng thái mới',
      color:     '#3b82f6',
      position:  this.workflow.states.length,
      isInitial: this.workflow.states.length === 0,
      isFinal:   false,
      slaHours:  null,
    };
    this.workflow.states.push(newState);
    this.selectState(newState);
    this._cdr.markForCheck();
  }

  removeState(state: WorkflowState): void {
    if (!this.workflow) return;
    const hasTransitions = this.workflow.transitions.some(
      t => t.fromStateId === state.id || t.toStateId === state.id
    );
    if (hasTransitions) {
      this._msg.warning('Xóa tất cả transition liên quan trước');
      return;
    }
    this.workflow.states = this.workflow.states.filter(s => s.id !== state.id);
    if (this.selected?.type === 'state' && this.selected.data.id === state.id) this.selected = null;
    this._cdr.markForCheck();
  }

  setInitial(state: WorkflowState): void {
    if (!this.workflow) return;
    this.workflow.states.forEach(s => s.isInitial = false);
    state.isInitial = true;
    this._cdr.markForCheck();
  }

  // ── Transition CRUD ───────────────────────────────────────────────────────

  addTransition(): void {
    if (!this.workflow || this.workflow.states.length < 2) {
      this._msg.info('Cần ít nhất 2 trạng thái');
      return;
    }
    const from = this.workflow.states[0];
    const to   = this.workflow.states[1];
    const t: WorkflowTransition = {
      id:              crypto.randomUUID(),
      name:            'Transition mới',
      fromStateId:     from.id,
      toStateId:       to.id,
      allowedRoles:    ['owner', 'admin', 'member'],
      allowedUsers:    [],
      requiredFields:  [],
      requireApproval: false,
      approvers:       [],
      approvalCount:   1,
      autoActions:     [],
    };
    this.workflow.transitions.push(t);
    this.selectTransition(t);
    this._cdr.markForCheck();
  }

  removeTransition(t: WorkflowTransition): void {
    if (!this.workflow) return;
    this.workflow.transitions = this.workflow.transitions.filter(x => x.id !== t.id);
    if (this.selected?.type === 'transition' && this.selected.data.id === t.id) this.selected = null;
    this._cdr.markForCheck();
  }

  // ── Selection ─────────────────────────────────────────────────────────────

  selectState(s: WorkflowState):      void { this.selected = { type: 'state',      data: s }; this._cdr.markForCheck(); }
  selectTransition(t: WorkflowTransition): void { this.selected = { type: 'transition', data: t }; this._cdr.markForCheck(); }
  clearSelection():                    void { this.selected = null; this._cdr.markForCheck(); }

  get selectedState():      WorkflowState      | null { return this.selected?.type === 'state'      ? this.selected.data : null; }
  get selectedTransition(): WorkflowTransition | null { return this.selected?.type === 'transition' ? this.selected.data : null; }

  stateName(id: string): string {
    return this.workflow?.states.find(s => s.id === id)?.name || id;
  }

  // ── Validation ────────────────────────────────────────────────────────────

  private _validate(): string[] {
    const s = this.workflow?.states || [];
    const t = this.workflow?.transitions || [];
    const errs: string[] = [];
    if (!this.workflowName.trim()) errs.push('Tên workflow không được để trống');
    if (!s.some(x => x.isInitial)) errs.push('Cần ít nhất một trạng thái bắt đầu');
    if (!s.some(x => x.isFinal))   errs.push('Cần ít nhất một trạng thái kết thúc');
    const stateIds = new Set(s.map(x => x.id));
    for (const tr of t) {
      if (!tr.name.trim()) errs.push('Có transition chưa có tên');
      if (!stateIds.has(tr.fromStateId)) errs.push(`Transition "${tr.name}" có fromState không hợp lệ`);
      if (!stateIds.has(tr.toStateId))   errs.push(`Transition "${tr.name}" có toState không hợp lệ`);
    }
    return errs;
  }

  // ── Save ──────────────────────────────────────────────────────────────────

  save(): void {
    this.validationErrors = this._validate();
    if (this.validationErrors.length) return;
    if (!this.workflow) return;

    this.saving = true;
    this._wfSvc.updateWorkflow(this.workflow.id, {
      name:        this.workflowName,
      states:      this.workflow.states,
      transitions: this.workflow.transitions,
    }).subscribe({
      next: (wf) => {
        this.saving   = false;
        this.workflow = JSON.parse(JSON.stringify(wf));
        this._msg.success('Đã lưu workflow');
        this._cdr.markForCheck();
      },
      error: (e) => {
        this.saving = false;
        this._msg.error(e.error?.message || 'Lỗi lưu workflow');
        this._cdr.markForCheck();
      },
    });
  }

  // ── AI ────────────────────────────────────────────────────────────────────

  openAiAnalysis(): void {
    if (!this.workflow) return;
    this.aiDrawerOpen = true;
    this.aiLoading    = true;
    this._cdr.markForCheck();

    this._wfSvc.aiAnalyze(this.workflow.id).subscribe({
      next: (r) => { this.aiResult = r; this.aiLoading = false; this._cdr.markForCheck(); },
      error: ()  => { this.aiLoading = false; this._cdr.markForCheck(); },
    });
  }

  // ── SVG helpers ───────────────────────────────────────────────────────────

  get svgPaths(): Array<{ fromX: number; fromY: number; toX: number; toY: number; label: string; color: string }> {
    if (!this.workflow) return [];
    const statePositions = this._calcStatePositions();
    return this.workflow.transitions.map(t => {
      const from = statePositions[t.fromStateId];
      const to   = statePositions[t.toStateId];
      if (!from || !to) return null;
      return { fromX: from.cx, fromY: from.cy, toX: to.cx, toY: to.cy, label: t.name, color: '#6366f1' };
    }).filter(Boolean) as any[];
  }

  private _calcStatePositions(): Record<string, { cx: number; cy: number }> {
    const result: Record<string, { cx: number; cy: number }> = {};
    const states = this.workflow?.states || [];
    const cols = Math.min(4, states.length);
    states.forEach((s, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      result[s.id] = { cx: 80 + col * 160, cy: 60 + row * 100 };
    });
    return result;
  }

  stateX(i: number): number { return 80 + (i % 4) * 160; }
  stateY(i: number): number { return 50 + Math.floor(i / 4) * 100; }

  svgHeight(): number {
    const rows = Math.ceil((this.workflow?.states?.length || 1) / 4);
    return Math.max(200, 50 + rows * 100 + 60);
  }

  arrowPath(t: WorkflowTransition): string {
    const positions = this._calcStatePositions();
    const from = positions[t.fromStateId];
    const to   = positions[t.toStateId];
    if (!from || !to) return '';
    const dx = to.cx - from.cx;
    const dy = to.cy - from.cy;
    const mx = from.cx + dx * 0.5;
    const my = from.cy + dy * 0.5;
    return `M${from.cx},${from.cy} Q${mx},${my - 20} ${to.cx},${to.cy}`;
  }

  arrowLabelX(t: WorkflowTransition): number {
    const p = this._calcStatePositions();
    const f = p[t.fromStateId], to = p[t.toStateId];
    if (!f || !to) return 0;
    return (f.cx + to.cx) / 2;
  }

  arrowLabelY(t: WorkflowTransition): number {
    const p = this._calcStatePositions();
    const f = p[t.fromStateId], to = p[t.toStateId];
    if (!f || !to) return 0;
    return (f.cy + to.cy) / 2 - 12;
  }

  delete(): void {
    if (!this.workflow) return;
    this._modal.confirm({
      nzTitle:   'Xóa workflow',
      nzContent: 'Workflow sẽ bị xóa. Thao tác không thể hoàn tác.',
      nzOkDanger: true,
      nzOkText:  'Xóa',
      nzOnOk: () => this._wfSvc.deleteWorkflow(this.workflow!.id).subscribe({
        next: () => { this._msg.success('Đã xóa'); this._router.navigate(['/project/workflows']); },
        error: (e) => this._msg.error(e.error?.message || 'Lỗi xóa'),
      }),
    });
  }
}
