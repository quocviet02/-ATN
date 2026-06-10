import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { ProjectConst } from '@trungk18/project/config/const';
import { ProjectQuery } from '@trungk18/project/state/project/project.query';
import { ProjectService } from '@trungk18/project/state/project/project.service';
import { JProject } from '@trungk18/interface/project';
import { untilDestroyed, UntilDestroy } from '@ngneat/until-destroy';
import { Observable } from 'rxjs';
import { JIssue } from '@trungk18/interface/issue';
import { IssueDetailComponent } from '../../components/issues/issue-detail/issue-detail.component';
import { AsyncPipe } from '@angular/common';
import { BreadcrumbsComponent } from '../../../jira-control/breadcrumbs/breadcrumbs.component';

@Component({
  selector: 'full-issue-detail',
  templateUrl: './full-issue-detail.component.html',
  styleUrls: ['./full-issue-detail.component.scss'],
  imports: [BreadcrumbsComponent, IssueDetailComponent, AsyncPipe]
})
@UntilDestroy()
export class FullIssueDetailComponent implements OnInit, OnDestroy {
  project: JProject;
  issueById$: Observable<JIssue>;
  issueId: string;

  private _deletedSub: Subscription;

  get breadcrumbs(): string[] {
    return [ProjectConst.Projects, this.project?.name, 'Issues', this.issueId];
  }

  constructor(
    private _router: Router,
    private _route: ActivatedRoute,
    private _projectQuery: ProjectQuery,
    private _projectService: ProjectService
  ) {}

  ngOnInit(): void {
    this.getIssue();
    this._projectQuery.all$.pipe(untilDestroyed(this)).subscribe((project) => {
      this.project = project;
    });

    // Navigate back if this issue is deleted while viewing it
    this._deletedSub = this._projectService.issueDeleted$.subscribe((deletedId) => {
      if (deletedId === this.issueId) {
        this.backHome();
      }
    });
  }

  ngOnDestroy(): void {
    this._deletedSub?.unsubscribe();
  }

  private getIssue(): void {
    this.issueId = this._route.snapshot.paramMap.get(ProjectConst.IssueId);
    if (!this.issueId) {
      this.backHome();
      return;
    }
    this.issueById$ = this._projectQuery.issueById$(this.issueId);
  }

  private backHome(): void {
    this._router.navigate(['/']);
  }
}
