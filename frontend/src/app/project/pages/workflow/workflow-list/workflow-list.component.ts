import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzModalService } from 'ng-zorro-antd/modal';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzBadgeModule } from 'ng-zorro-antd/badge';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { TranslateModule } from '@ngx-translate/core';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';

import { ProjectQuery } from '@trungk18/project/state/project/project.query';
import { PermissionService } from '@trungk18/core/services/permission.service';
import { WorkflowService } from '@trungk18/project/state/workflow/workflow.service';
import { JWorkflow, WORKFLOW_TEMPLATES } from '@trungk18/interface/workflow';
import { BreadcrumbsComponent } from '../../../../jira-control/breadcrumbs/breadcrumbs.component';

@UntilDestroy()
@Component({
  selector: 'app-workflow-list',
  standalone: true,
  imports: [
    CommonModule, RouterModule, FormsModule,
    NzButtonModule, NzCardModule, NzTagModule, NzIconModule,
    NzSpinModule, NzBadgeModule, NzInputModule, NzTooltipModule,
    TranslateModule, BreadcrumbsComponent,
  ],
  templateUrl: './workflow-list.component.html',
  styleUrls: ['./workflow-list.component.scss'],
})
export class WorkflowListComponent implements OnInit {
  workflows: JWorkflow[] = [];
  loading   = false;
  projectId = '';
  isOwner   = false;
  newName   = '';
  creating  = false;

  readonly breadcrumbs = ['Projects', 'Workflows'];

  constructor(
    private _wfSvc: WorkflowService,
    private _query: ProjectQuery,
    public  permSvc: PermissionService,
    private _modal: NzModalService,
    private _msg: NzMessageService,
    private _router: Router,
  ) {}

  ngOnInit(): void {
    this._query.all$.pipe(untilDestroyed(this)).subscribe(p => {
      if (p?.id) { this.projectId = p.id; this._load(); }
    });
    this.permSvc.role$.pipe(untilDestroyed(this)).subscribe(r => this.isOwner = r === 'owner');
  }

  private _load(): void {
    this.loading = true;
    this._wfSvc.listWorkflows(this.projectId).subscribe({
      next:  wfs => { this.workflows = wfs; this.loading = false; },
      error: ()  => this.loading = false,
    });
  }

  createFromTemplate(tpl: typeof WORKFLOW_TEMPLATES[0]): void {
    if (!this.isOwner) return;
    this.creating = true;
    this._wfSvc.createWorkflow(this.projectId, tpl).subscribe({
      next: (wf) => {
        this.creating = false;
        this._router.navigate(['/project/workflows', wf.id, 'design']);
      },
      error: (e) => { this.creating = false; this._msg.error(e.error?.message || 'Lỗi tạo workflow'); },
    });
  }

  createBlank(): void {
    if (!this.isOwner || !this.newName.trim()) return;
    this.creating = true;
    const blank: Partial<JWorkflow> = {
      name: this.newName.trim(),
      states: [
        { id: crypto.randomUUID(), name: 'Mới',        color: '#6b7280', position: 0, isInitial: true,  isFinal: false, slaHours: null },
        { id: crypto.randomUUID(), name: 'Hoàn thành', color: '#10b981', position: 1, isInitial: false, isFinal: true,  slaHours: null },
      ],
      transitions: [],
    };
    this._wfSvc.createWorkflow(this.projectId, blank).subscribe({
      next: (wf) => {
        this.creating = false;
        this.newName  = '';
        this._router.navigate(['/project/workflows', wf.id, 'design']);
      },
      error: (e) => { this.creating = false; this._msg.error(e.error?.message || 'Lỗi tạo workflow'); },
    });
  }

  clone(wf: JWorkflow): void {
    this._modal.confirm({
      nzTitle:   'Sao chép workflow',
      nzContent: `Tạo bản sao của "${wf.name}"?`,
      nzOkText:  'Sao chép',
      nzOnOk: () => this._wfSvc.cloneWorkflow(wf.id, `${wf.name} (bản sao)`).subscribe({
        next: (newWf) => { this._msg.success('Đã sao chép'); this._load(); },
        error: (e) => this._msg.error(e.error?.message || 'Lỗi'),
      }),
    });
  }

  delete(wf: JWorkflow): void {
    if (!this.isOwner || wf.isDefault) return;
    this._modal.confirm({
      nzTitle:    'Xóa workflow',
      nzContent:  `Xóa "${wf.name}"? Workflow không được xóa nếu đang có task sử dụng.`,
      nzOkText:   'Xóa',
      nzOkDanger: true,
      nzOnOk: () => this._wfSvc.deleteWorkflow(wf.id).subscribe({
        next: () => { this._msg.success('Đã xóa'); this._load(); },
        error: (e) => this._msg.error(e.error?.message || 'Lỗi'),
      }),
    });
  }

  readonly templates = WORKFLOW_TEMPLATES;
}
