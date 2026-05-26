import { Component, Input, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { JIssue } from '@trungk18/interface/issue';
import { ProjectService } from '@trungk18/project/state/project/project.service';
import { environment } from 'src/environments/environment';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

interface SuggestionResult {
  suggestedDeadline: string;
  estimatedDays: number;
  confidence: 'high' | 'medium' | 'low';
  reasoning: string;
  warnings: string[];
  alternatives: Array<{ date: string; label: string }>;
}

@Component({
  selector: 'issue-due-date',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  templateUrl: './issue-due-date.component.html',
  styleUrls: ['./issue-due-date.component.scss'],
})
export class IssueDueDateComponent implements OnChanges {
  @Input() issue: JIssue;
  @Input() canEdit = false;

  selectedDate = '';
  showPopup = false;
  loading = false;
  error = '';
  suggestion: SuggestionResult | null = null;
  toastMsg = '';

  constructor(
    private _http: HttpClient,
    private _projectService: ProjectService,
    private _translate: TranslateService,
  ) {}

  ngOnChanges(): void {
    this.selectedDate = this.issue?.dueDate || '';
  }

  onDateChange(value: string): void {
    this.selectedDate = value;
    this._projectService.updateIssue({ ...this.issue, dueDate: value || undefined });
  }

  clearDate(): void {
    this.selectedDate = '';
    this._projectService.updateIssue({ ...this.issue, dueDate: undefined });
  }

  openSuggest(): void {
    this.showPopup = true;
    this.loading = true;
    this.error = '';
    this.suggestion = null;

    this._http.post<SuggestionResult>(
      `${environment.apiUrl}/tasks/${this.issue.id}/suggest-deadline`, {}
    ).subscribe({
      next: (res) => { this.suggestion = res; this.loading = false; },
      error: (err) => {
        console.error('[suggest-deadline]', err);
        const msg = err.error?.message || err.message;
        this.error = msg
          ? `Lỗi ${err.status ?? ''}: ${msg}`
          : 'Không thể lấy gợi ý lúc này. Vui lòng thử lại.';
        this.loading = false;
      },
    });
  }

  applyDate(date: string): void {
    this.selectedDate = date;
    this._projectService.updateIssue({ ...this.issue, dueDate: date });
    this.showPopup = false;
    this.showToast(date);
  }

  closePopup(): void {
    this.showPopup = false;
  }

  confidenceColor(c: string): string {
    return c === 'high' ? '#36b37e' : c === 'medium' ? '#ff991f' : '#de350b';
  }

  confidencePct(c: string): number {
    return c === 'high' ? 85 : c === 'medium' ? 55 : 30;
  }

  confidenceLabel(c: string): string {
    return this._translate.instant(`issue.dueDate.confidence.${c}`);
  }

  private showToast(msg: string): void {
    this.toastMsg = `${this._translate.instant('issue.dueDate.applied')} ${msg}`;
    setTimeout(() => { this.toastMsg = ''; }, 3000);
  }
}
