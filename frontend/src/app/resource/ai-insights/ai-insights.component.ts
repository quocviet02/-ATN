import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NzTabsModule } from 'ng-zorro-antd/tabs';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzAvatarModule } from 'ng-zorro-antd/avatar';
import { NzProgressModule } from 'ng-zorro-antd/progress';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzListModule } from 'ng-zorro-antd/list';
import { ResourceService } from '../resource.service';

@Component({
  selector: 'app-ai-insights',
  templateUrl: './ai-insights.component.html',
  styleUrls: ['./ai-insights.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    NzTabsModule, NzCardModule, NzButtonModule, NzIconModule, NzSpinModule,
    NzTagModule, NzAvatarModule, NzProgressModule, NzAlertModule, NzDividerModule,
    NzEmptyModule, NzListModule,
  ],
})
export class AiInsightsComponent implements OnInit {
  loading = false;
  burnoutData: any = null;

  constructor(private _svc: ResourceService) {}

  ngOnInit(): void { this.runBurnout(); }

  runBurnout(): void {
    this.loading = true;
    this._svc.getAiBurnoutPrediction().subscribe({
      next: data => { this.burnoutData = data; this.loading = false; },
      error: () => { this.loading = false; },
    });
  }

  riskColor(risk: string): string {
    return { low: '#52c41a', medium: '#faad14', high: '#fa8c16', critical: '#ff4d4f' }[risk] || '#d9d9d9';
  }

  urgencyTag(urgency: string): string {
    return { immediate: 'error', soon: 'warning', monitor: 'default' }[urgency] || 'default';
  }

  urgencyLabel(urgency: string): string {
    return { immediate: 'Ngay lập tức', soon: 'Sớm', monitor: 'Theo dõi' }[urgency] || urgency;
  }

  getAnalysis(name: string): any {
    return this.burnoutData?.aiAnalysis?.userAnalyses?.find((a: any) => a.name === name) || null;
  }
}
