import { Component } from '@angular/core';
import { AsyncPipe, NgClass, NgFor, NgIf, UpperCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProjectQuery } from '@trungk18/project/state/project/project.query';
import { ProjectService } from '@trungk18/project/state/project/project.service';
import { PermissionService } from '@trungk18/core/services/permission.service';
import { BoardDndComponent } from '../../components/board/board-dnd/board-dnd.component';
import { BoardFilterComponent } from '../../components/board/board-filter/board-filter.component';
import { BreadcrumbsComponent } from '../../../jira-control/breadcrumbs/breadcrumbs.component';
import { NzSpinComponent } from 'ng-zorro-antd/spin';
import { NzIconDirective } from 'ng-zorro-antd/icon';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

export interface BgPreset {
  label: string;
  value: string;
  thumb: string;
}

@Component({
    selector: 'board',
    templateUrl: './board.component.html',
    styleUrls: ['./board.component.scss'],
    imports: [BreadcrumbsComponent, BoardFilterComponent, BoardDndComponent,
              AsyncPipe, NgClass, NgIf, NgFor, UpperCasePipe, FormsModule,
              NzSpinComponent, NzIconDirective, TranslateModule]
})
export class BoardComponent {
  breadcrumbs: string[] = ['Projects', 'Kanban Board'];

  newProjectName = '';
  newProjectDesc = '';
  creating    = false;
  createError = '';

  showBgPicker = false;
  customBgUrl  = '';

  readonly roleBadgeClass: Record<string, string> = {
    owner:  'role-badge role-owner',
    admin:  'role-badge role-admin',
    member: 'role-badge role-member'
  };

  readonly BG_COLORS: BgPreset[] = [
    { label: 'Navy',        value: '#0747A6', thumb: '#0747A6' },
    { label: 'Forest',      value: '#006644', thumb: '#006644' },
    { label: 'Red',         value: '#BF2600', thumb: '#BF2600' },
    { label: 'Purple',      value: '#403294', thumb: '#403294' },
    { label: 'Dark',        value: '#172B4D', thumb: '#172B4D' },
    { label: 'Teal',        value: '#008DA6', thumb: '#008DA6' },
    { label: 'Dark Grey',   value: '#42526E', thumb: '#42526E' },
    { label: 'Orange',      value: '#974F0C', thumb: '#974F0C' },
  ];

  readonly BG_GRADIENTS: BgPreset[] = [
    { label: 'Violet',   value: 'linear-gradient(135deg,#667eea 0%,#764ba2 100%)', thumb: 'linear-gradient(135deg,#667eea,#764ba2)' },
    { label: 'Pink',     value: 'linear-gradient(135deg,#f093fb 0%,#f5576c 100%)', thumb: 'linear-gradient(135deg,#f093fb,#f5576c)' },
    { label: 'Sky',      value: 'linear-gradient(135deg,#4facfe 0%,#00f2fe 100%)', thumb: 'linear-gradient(135deg,#4facfe,#00f2fe)' },
    { label: 'Mint',     value: 'linear-gradient(135deg,#43e97b 0%,#38f9d7 100%)', thumb: 'linear-gradient(135deg,#43e97b,#38f9d7)' },
    { label: 'Sunset',   value: 'linear-gradient(135deg,#fa709a 0%,#fee140 100%)', thumb: 'linear-gradient(135deg,#fa709a,#fee140)' },
    { label: 'Ocean',    value: 'linear-gradient(135deg,#0c3483 0%,#a2b6df 100%)', thumb: 'linear-gradient(135deg,#0c3483,#a2b6df)' },
    { label: 'Dusk',     value: 'linear-gradient(135deg,#2c3e50 0%,#fd746c 100%)', thumb: 'linear-gradient(135deg,#2c3e50,#fd746c)' },
    { label: 'Forest',   value: 'linear-gradient(135deg,#134e5e 0%,#71b280 100%)', thumb: 'linear-gradient(135deg,#134e5e,#71b280)' },
  ];

  constructor(
    public  projectQuery: ProjectQuery,
    public  permissionService: PermissionService,
    private _projectService: ProjectService,
    private _translate: TranslateService
  ) {}

  applyBackground(value: string): void {
    this._projectService.updateProject({ background: value } as any);
    this.showBgPicker = false;
  }

  applyCustomUrl(): void {
    const raw = this.customBgUrl.trim();
    if (!raw) return;
    const value = /^https?:\/\//i.test(raw)
      ? `url("${raw}") center/cover no-repeat`
      : raw;
    this.applyBackground(value);
    this.customBgUrl = '';
  }

  clearBackground(): void {
    this.applyBackground('');
  }

  submitCreateProject() {
    const name = this.newProjectName.trim();
    if (!name) return;
    this.creating = true;
    this.createError = '';
    this._projectService.setupNewProject(name, this.newProjectDesc.trim()).subscribe({
      next:  () => { this.creating = false; },
      error: (err) => {
        this.creating = false;
        this.createError = err.error?.message || this._translate.instant('board.createProjectBoard');
      }
    });
  }
}
