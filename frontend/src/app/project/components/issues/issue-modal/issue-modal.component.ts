import { Component, Inject, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { JIssue } from '@trungk18/interface/issue';
import { ProjectService } from '@trungk18/project/state/project/project.service';
import { NzModalRef, NZ_MODAL_DATA } from 'ng-zorro-antd/modal';
import { Observable, Subscription } from 'rxjs';
import { AsyncPipe } from '@angular/common';
import { IssueDetailComponent } from '../issue-detail/issue-detail.component';

@Component({
  selector: 'issue-modal',
  templateUrl: './issue-modal.component.html',
  styleUrls: ['./issue-modal.component.scss'],
  imports: [IssueDetailComponent, AsyncPipe]
})
export class IssueModalComponent implements OnInit, OnDestroy {
  issue$: Observable<JIssue>;
  private _issueId: string | undefined;
  private _deletedSub: Subscription;

  constructor(
    private _modal: NzModalRef,
    private _router: Router,
    private _projectService: ProjectService,
    @Inject(NZ_MODAL_DATA) private modalData: { issue$: Observable<JIssue> }
  ) {
    this.issue$ = this.modalData.issue$;
  }

  ngOnInit(): void {
    // Track the current issue id so we can close if it gets deleted by another user
    this.issue$.subscribe(issue => {
      if (issue?.id) this._issueId = issue.id;
    });

    this._deletedSub = this._projectService.issueDeleted$.subscribe((deletedId) => {
      if (deletedId === this._issueId) {
        this._modal.close();
      }
    });
  }

  ngOnDestroy(): void {
    this._deletedSub?.unsubscribe();
  }

  closeModal(): void {
    this._modal.close();
  }

  openIssuePage(issueId: string): void {
    this.closeModal();
    this._router.navigate(['project', 'issue', issueId]);
  }
}
