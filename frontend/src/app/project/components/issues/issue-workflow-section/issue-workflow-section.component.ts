import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzModalService } from 'ng-zorro-antd/modal';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { TranslateModule } from '@ngx-translate/core';

import { WorkflowService } from '@trungk18/project/state/workflow/workflow.service';
import { ProjectQuery } from '@trungk18/project/state/project/project.query';
import { PermissionService } from '@trungk18/core/services/permission.service';
import {
  WorkflowTransition, WorkflowState, StateHistoryEntry, AvailableTransitionsResult
} from '@trungk18/interface/workflow';

@Component({
  selector: 'app-issue-workflow-section',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, FormsModule,
    NzButtonModule, NzTagModule, NzIconModule, NzInputModule,
    NzSpinModule, NzTooltipModule, NzSelectModule, TranslateModule,
  ],
  templateUrl: './issue-workflow-section.component.html',
  styleUrls: ['./issue-workflow-section.component.scss'],
})
export class IssueWorkflowSectionComponent implements OnChanges {
  @Input() issueId: string = '';
  @Input() workflowId: string | null = null;
  @Input() currentStateId: string | null = null;
  @Output() stateChanged = new EventEmitter<{ stateId: string; task: any }>();

  availableResult: AvailableTransitionsResult | null = null;
  history: StateHistoryEntry[] = [];
  loading  = false;
  showHistory = false;

  comment = '';
  pendingTransitionId = '';
  processingTransitionId = '';
  approvalTransitionId = '';

  constructor(
    private _wfSvc: WorkflowService,
    private _query: ProjectQuery,
    public  permSvc: PermissionService,
    private _modal: NzModalService,
    private _msg:   NzMessageService,
    private _cdr:   ChangeDetectorRef,
  ) {}

  ngOnChanges(ch: SimpleChanges): void {
    if (ch['issueId']?.currentValue && this.workflowId) {
      this._load();
    }
  }

  private _load(): void {
    if (!this.issueId) return;
    this.loading = true;
    this._wfSvc.getAvailableTransitions(this.issueId).subscribe({
      next: (r) => { this.availableResult = r; this.loading = false; this._cdr.markForCheck(); },
      error: ()  => { this.loading = false; this._cdr.markForCheck(); },
    });
  }

  loadHistory(): void {
    this.showHistory = !this.showHistory;
    if (this.showHistory && !this.history.length) {
      this._wfSvc.getStateHistory(this.issueId).subscribe({
        next: (h) => { this.history = h; this._cdr.markForCheck(); },
      });
    }
  }

  get currentState(): WorkflowState | undefined {
    const stateId = this.currentStateId ?? this.availableResult?.currentStateId;
    return this.availableResult?.workflow?.states?.find(s => s.id === stateId);
  }

  get timeInCurrentState(): string {
    const last = [...this.history].reverse().find(h => !h.exitedAt) || this.history[this.history.length - 1];
    if (!last) return '';
    const diff = Date.now() - new Date(last.enteredAt).getTime();
    const hours = Math.floor(diff / 3600000);
    if (hours < 24) return `${hours} giờ`;
    return `${Math.floor(hours / 24)} ngày`;
  }

  executeTransition(t: WorkflowTransition): void {
    if (t.requireApproval) {
      this.approvalTransitionId = t.id;
      this._openApprovalDialog(t);
      return;
    }

    if (t.requiredFields?.length) {
      this.pendingTransitionId = t.id;
    }

    this.processingTransitionId = t.id;
    this._wfSvc.executeTransition(this.issueId, t.id, this.comment).subscribe({
      next: ({ task, status }) => {
        this.processingTransitionId = '';
        this.comment = '';
        if (status === 'pending_approval') {
          this._msg.info('Yêu cầu phê duyệt đã được gửi đến approvers');
        } else {
          this._msg.success(`Đã chuyển sang "${this._toStateName(t.toStateId)}"`);
          this.stateChanged.emit({ stateId: t.toStateId, task });
          this._load();
        }
        this._cdr.markForCheck();
      },
      error: (e) => {
        this.processingTransitionId = '';
        this._msg.error(e.error?.message || 'Lỗi chuyển trạng thái');
        this._cdr.markForCheck();
      },
    });
  }

  private _openApprovalDialog(t: WorkflowTransition): void {
    this._modal.confirm({
      nzTitle:   `Yêu cầu phê duyệt`,
      nzContent: `Bạn muốn chuyển task sang "${this._toStateName(t.toStateId)}". Yêu cầu sẽ được gửi đến ${t.approvalCount} approver.`,
      nzOkText:  'Gửi yêu cầu',
      nzOnOk: () => {
        this._wfSvc.executeTransition(this.issueId, t.id, this.comment).subscribe({
          next: () => { this._msg.info('Yêu cầu đã gửi'); this._load(); this._cdr.markForCheck(); },
          error: (e) => this._msg.error(e.error?.message || 'Lỗi'),
        });
      },
    });
  }

  private _toStateName(stateId: string): string {
    return this.availableResult?.workflow?.states?.find(s => s.id === stateId)?.name || stateId;
  }

  formatDuration(h: StateHistoryEntry): string {
    if (h.durationHours == null) return 'đang...';
    if (h.durationHours < 1) return `${Math.round(h.durationHours * 60)}p`;
    if (h.durationHours < 24) return `${Math.round(h.durationHours)}h`;
    return `${Math.round(h.durationHours / 24)}d`;
  }
}
