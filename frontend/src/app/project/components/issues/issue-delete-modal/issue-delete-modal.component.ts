import { Component, Inject } from '@angular/core';
import { NzModalRef, NZ_MODAL_DATA } from 'ng-zorro-antd/modal';
import { NzMessageService } from 'ng-zorro-antd/message';
import { ProjectService } from '@trungk18/project/state/project/project.service';
import { ButtonComponent } from '../../../../jira-control/button/button.component';
import { FormsModule } from '@angular/forms';
import { NgIf } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'issue-delete-modal',
  templateUrl: './issue-delete-modal.component.html',
  styleUrls: ['./issue-delete-modal.component.scss'],
  imports: [ButtonComponent, FormsModule, NgIf, TranslateModule]
})
export class IssueDeleteModalComponent {
  issueId: string;
  issueName: string;

  confirmText = '';
  isLoading   = false;
  errorMsg    = '';

  private readonly CONFIRM_KEYWORD = 'XÓA';

  get canConfirm(): boolean {
    return this.confirmText.trim().toUpperCase() === this.CONFIRM_KEYWORD && !this.isLoading;
  }

  constructor(
    private _modalRef: NzModalRef,
    private _projectService: ProjectService,
    private _message: NzMessageService,
    private _translate: TranslateService,
    @Inject(NZ_MODAL_DATA) private modalData: { issueId: string; issueName: string }
  ) {
    this.issueId   = this.modalData.issueId;
    this.issueName = this.modalData.issueName;
  }

  deleteIssue(): void {
    if (!this.canConfirm) return;
    this.isLoading = true;
    this.errorMsg  = '';

    this._projectService.deleteIssue(this.issueId).subscribe({
      next: () => {
        this.isLoading = false;
        const successMsg = this._translate.instant('issue.delete.success');
        this._message.success(`${successMsg}: "${this.issueName}"`);
        this._modalRef.close({ deleted: true });
      },
      error: (err) => {
        this.isLoading = false;
        const status   = err?.status;
        if (status === 403) {
          this.errorMsg = this._translate.instant('issue.delete.errorForbidden');
        } else if (status === 404) {
          this.errorMsg = this._translate.instant('issue.delete.errorNotFound');
          // Task already gone — close modal
          setTimeout(() => this._modalRef.close({ deleted: true }), 1500);
        } else {
          this.errorMsg = this._translate.instant('issue.delete.errorNetwork');
        }
      }
    });
  }

  closeModal(): void {
    if (!this.isLoading) {
      this._modalRef.close();
    }
  }
}
