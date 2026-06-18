import { Component, Input, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { JRisk } from '../../../interface/portfolio';

interface MatrixCell {
  probability: number;
  impact:      number;
  risks:       JRisk[];
  level:       'low' | 'medium' | 'high' | 'critical';
}

@Component({
  selector: 'app-risk-matrix',
  templateUrl: './risk-matrix.component.html',
  styleUrls: ['./risk-matrix.component.scss'],
  standalone: true,
  imports: [CommonModule, NzToolTipModule, NzTagModule],
})
export class RiskMatrixComponent implements OnChanges {
  @Input() risks: JRisk[] = [];

  matrix: MatrixCell[][] = [];
  readonly impactLabels = ['Rất thấp', 'Thấp', 'Trung bình', 'Cao', 'Rất cao'];
  readonly probLabels   = ['Hiếm khi', 'Ít xảy ra', 'Thỉnh thoảng', 'Thường xuyên', 'Rất thường xuyên'];

  ngOnChanges(): void {
    this.buildMatrix();
  }

  buildMatrix(): void {
    this.matrix = Array.from({ length: 5 }, (_, i) =>
      Array.from({ length: 5 }, (__, j) => {
        const impact      = 5 - i;
        const probability = j + 1;
        const score       = impact * probability;
        return {
          impact, probability,
          risks: this.risks.filter(r => r.impact === impact && r.probability === probability),
          level: score >= 15 ? 'critical' : score >= 9 ? 'high' : score >= 4 ? 'medium' : 'low',
        } as MatrixCell;
      })
    );
  }

  cellClass(cell: MatrixCell): string {
    return `cell-${cell.level}`;
  }

  levelColor(level: string): string {
    return { low: '#52c41a', medium: '#faad14', high: '#fa8c16', critical: '#ff4d4f' }[level] || '#d9d9d9';
  }
}
