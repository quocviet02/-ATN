import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { JIssue } from '@trungk18/interface/issue';
import { ProjectQuery } from '@trungk18/project/state/project/project.query';
import { ProjectService } from '@trungk18/project/state/project/project.service';
import { AuthQuery } from '@trungk18/project/auth/auth.query';
import { PermissionService } from '@trungk18/core/services/permission.service';
import { NzModalService } from 'ng-zorro-antd/modal';
import { IssueDeleteModalComponent } from '../issue-delete-modal/issue-delete-modal.component';
import { IssueLoaderComponent } from '../issue-loader/issue-loader.component';
import { IssuePriorityComponent } from '../issue-priority/issue-priority.component';
import { IssueAssigneesComponent } from '../issue-assignees/issue-assignees.component';
import { IssueReporterComponent } from '../issue-reporter/issue-reporter.component';
import { IssueStatusComponent } from '../issue-status/issue-status.component';
import { IssueFeedComponent } from '../issue-feed/issue-feed.component';
import { IssueDescriptionComponent } from '../issue-description/issue-description.component';
import { IssueTitleComponent } from '../issue-title/issue-title.component';
import { ButtonComponent } from '../../../../jira-control/button/button.component';
import { IssueTypeComponent } from '../issue-type/issue-type.component';
import { IssueDueDateComponent } from '../issue-due-date/issue-due-date.component';
import { AsyncPipe, DatePipe, NgIf } from '@angular/common';
import { NzTooltipDirective } from 'ng-zorro-antd/tooltip';
import { IssueWorkflowSectionComponent } from '../issue-workflow-section/issue-workflow-section.component';

@UntilDestroy()
@Component({
    selector: 'issue-detail',
    templateUrl: './issue-detail.component.html',
    styleUrls: ['./issue-detail.component.scss'],
    imports: [
      IssueTypeComponent, ButtonComponent, IssueTitleComponent,
      IssueDescriptionComponent, IssueFeedComponent,
      IssueStatusComponent, IssueReporterComponent, IssueAssigneesComponent,
      IssuePriorityComponent, IssueDueDateComponent, IssueLoaderComponent,
      AsyncPipe, DatePipe, NgIf, NzTooltipDirective,
      IssueWorkflowSectionComponent
    ]
})
export class IssueDetailComponent implements OnInit, OnChanges {
  @Input() issue: JIssue;
  @Input() isShowFullScreenButton: boolean;
  @Input() isShowCloseButton: boolean;
  @Output() onClosed    = new EventEmitter();
  @Output() onOpenIssue = new EventEmitter<string>();

  canDelete = false;
  currentUserId: string | null = null;
  role = '';

  readonly canEditTask$     = this._permissionService.canEditTask$;
  readonly canAssignSelf$   = this._permissionService.canAssignSelf$;
  readonly canAssignOthers$ = this._permissionService.canAssignOthers$;

  constructor(
    public projectQuery: ProjectQuery,
    private _projectService: ProjectService,
    private _authQuery: AuthQuery,
    private _permissionService: PermissionService,
    private _modalService: NzModalService
  ) {}

  ngOnInit(): void {
    this._authQuery.userId$.pipe(untilDestroyed(this)).subscribe(uid => {
      this.currentUserId = uid;
      this.updateCanDelete();
    });
    this.projectQuery.myRole$.pipe(untilDestroyed(this)).subscribe(r => {
      this.role = r;
      this.updateCanDelete();
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    const issueChange = changes['issue'];
    if (issueChange?.currentValue?.id !== issueChange?.previousValue?.id && issueChange?.currentValue?.id) {
      this._projectService.loadIssueComments(issueChange.currentValue.id);
    }
  }

  private updateCanDelete(): void {
    if (this.issue) {
      this.canDelete = this._permissionService.canDeleteIssue(this.issue, this.currentUserId, this.role);
    }
  }

  openDeleteIssueModal(): void {
    this._modalService.create({
      nzContent: IssueDeleteModalComponent,
      nzClosable: false,
      nzFooter: null,
      nzStyle: { top: '140px' },
      nzData: { issueId: this.issue.id, issueName: this.issue.title }
    });
  }

  closeModal()    { this.onClosed.emit(); }
  openIssuePage() { this.onOpenIssue.emit(this.issue.id); }

  onWorkflowStateChanged(ev: { stateId: string; task: any }): void {
    if (this.issue) {
      this.issue = { ...this.issue, currentStateId: ev.stateId } as any;
    }
  }
}
