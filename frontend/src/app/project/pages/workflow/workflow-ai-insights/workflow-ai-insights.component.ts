import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { JWorkflow } from '@trungk18/interface/workflow';

@Component({
  selector: 'app-workflow-ai-insights',
  standalone: true,
  imports: [CommonModule, NzSpinModule, NzTagModule, NzDividerModule],
  template: `
    <div class="ai-panel">
      <nz-spin *ngIf="loading" nzTip="Đang phân tích..."></nz-spin>

      <ng-container *ngIf="!loading && result">
        <div class="ai-section" *ngIf="result.analysis">
          <div class="ai-section-title">📊 Thống kê</div>
          <div class="ai-row" *ngIf="result.analysis.avgCompletionDays">
            Thời gian hoàn thành TB: <strong>{{ result.analysis.avgCompletionDays }} ngày</strong>
          </div>

          <div class="ai-section-title mt">🐌 Bottleneck</div>
          <div class="ai-bottleneck" *ngIf="result.analysis.bottleneck">
            <strong>{{ result.analysis.bottleneck.stateName }}</strong><br>
            <span>{{ result.analysis.bottleneck.reason }}</span>
          </div>

          <div class="ai-section-title mt">💡 Đề xuất tối ưu</div>
          <ol class="ai-recommendations">
            <li *ngFor="let r of result.analysis.recommendations">{{ r }}</li>
          </ol>

          <div class="ai-section-title mt">⏱️ Đề xuất SLA</div>
          <div class="sla-row" *ngFor="let s of result.analysis.suggestedSLA">
            <nz-tag nzColor="orange">{{ s.stateName }}</nz-tag>
            <strong>{{ s.hours }}h</strong>
            <span class="sla-reason">{{ s.reason }}</span>
          </div>
        </div>

        <nz-divider></nz-divider>

        <div class="ai-section" *ngIf="result.rawStats?.length">
          <div class="ai-section-title">📈 Dữ liệu thô</div>
          <div class="raw-row" *ngFor="let s of result.rawStats">
            <span>{{ s.stateName }}</span>
            <span *ngIf="s.avgHours != null">⌀ {{ s.avgHours }}h</span>
            <span *ngIf="s.avgHours == null" style="color:#ccc">Chưa có dữ liệu</span>
          </div>
        </div>
      </ng-container>

      <div *ngIf="!loading && !result" class="ai-empty">
        Chưa có kết quả phân tích.
      </div>
    </div>
  `,
  styles: [`
    .ai-panel { padding: 8px 0; }
    .ai-section-title { font-weight: 700; font-size: 13px; color: #4f46e5; margin-bottom: 8px; }
    .ai-section-title.mt { margin-top: 16px; }
    .ai-row { font-size: 13px; margin-bottom: 6px; }
    .ai-bottleneck { background: #fef9c3; border-radius: 6px; padding: 8px; font-size: 12px; margin-bottom: 8px; }
    .ai-recommendations { padding-left: 18px; font-size: 12px; li { margin-bottom: 6px; } }
    .sla-row { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; font-size: 12px; }
    .sla-reason { color: #888; }
    .raw-row { display: flex; justify-content: space-between; font-size: 12px; padding: 3px 0; border-bottom: 1px solid #f0f0f0; }
    .ai-empty { color: #999; text-align: center; padding: 32px; }
  `],
})
export class WorkflowAiInsightsComponent {
  @Input() loading = false;
  @Input() result: any = null;
  @Input() workflow: JWorkflow | null = null;
}
