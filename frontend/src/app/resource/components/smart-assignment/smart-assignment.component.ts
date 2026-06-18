import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzAvatarModule } from 'ng-zorro-antd/avatar';
import { NzProgressModule } from 'ng-zorro-antd/progress';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzMessageService } from 'ng-zorro-antd/message';
import { ResourceService } from '../../resource.service';
import { JAssignmentCandidate } from '../../../interface/resource';

@Component({
  selector: 'app-smart-assignment',
  templateUrl: './smart-assignment.component.html',
  styleUrls: ['./smart-assignment.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    NzButtonModule, NzIconModule, NzSpinModule, NzTagModule,
    NzAvatarModule, NzProgressModule, NzModalModule, NzToolTipModule, NzDividerModule,
  ],
})
export class SmartAssignmentComponent implements OnChanges {
  @Input() taskId = '';
  @Input() visible = false;
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() selectCandidate = new EventEmitter<JAssignmentCandidate>();

  loading = false;
  candidates: JAssignmentCandidate[] = [];
  detectedSkills: string[] = [];
  error = '';

  constructor(
    private _svc: ResourceService,
    private _msg: NzMessageService,
  ) {}

  ngOnChanges(): void {
    if (this.visible && this.taskId) {
      this.analyze();
    }
  }

  analyze(): void {
    this.loading = true;
    this.error   = '';
    this._svc.getAiRecommendAssignee(this.taskId).subscribe({
      next: data => {
        this.candidates    = data.candidates || [];
        this.detectedSkills = data.taskSkillsDetected || [];
        this.loading = false;
      },
      error: err => {
        this.error = err?.error?.message || 'Không thể phân tích. Thử lại sau.';
        this.loading = false;
      },
    });
  }

  pick(c: JAssignmentCandidate): void {
    this.selectCandidate.emit(c);
    this.close();
  }

  close(): void {
    this.visible = false;
    this.visibleChange.emit(false);
  }

  scoreColor(score: number): string {
    return score >= 80 ? '#52c41a' : score >= 60 ? '#faad14' : '#fa8c16';
  }

  loadColor(util: number): string {
    return util > 100 ? '#ff4d4f' : util > 80 ? '#faad14' : '#52c41a';
  }

  readonly pctFmt = (p: number) => `${p}`;
}
