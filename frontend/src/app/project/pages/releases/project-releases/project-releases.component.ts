import {
  Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule }  from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { NzCardModule }       from 'ng-zorro-antd/card';
import { NzTagModule }        from 'ng-zorro-antd/tag';
import { NzButtonModule }     from 'ng-zorro-antd/button';
import { NzIconModule }       from 'ng-zorro-antd/icon';
import { NzSpinModule }       from 'ng-zorro-antd/spin';
import { NzTableModule }      from 'ng-zorro-antd/table';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { NzMessageService }   from 'ng-zorro-antd/message';
import { NzEmptyModule }      from 'ng-zorro-antd/empty';
import { NzToolTipModule }    from 'ng-zorro-antd/tooltip';
import { NzInputModule }      from 'ng-zorro-antd/input';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzPaginationModule } from 'ng-zorro-antd/pagination';
import { TranslateModule }    from '@ngx-translate/core';

import { ReleasesService }   from '@trungk18/project/state/releases/releases.service';
import {
  JRelease, RELEASE_TYPE_COLORS, ReleaseStatus,
} from '@trungk18/interface/release';
import { CreateReleaseDialogComponent } from '../create-release-dialog/create-release-dialog.component';

@Component({
  selector: 'app-project-releases',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, FormsModule, RouterModule,
    NzCardModule, NzTagModule, NzButtonModule, NzIconModule,
    NzSpinModule, NzTableModule, NzModalModule,
    NzEmptyModule, NzToolTipModule, NzInputModule, NzPopconfirmModule, NzPaginationModule,
    TranslateModule,
    CreateReleaseDialogComponent,
  ],
  templateUrl: './project-releases.component.html',
  styleUrls: ['./project-releases.component.scss'],
})
export class ProjectReleasesComponent implements OnInit {
  projectId  = '';
  releases:  JRelease[] = [];
  total      = 0;
  page       = 1;
  limit      = 20;
  loading    = true;

  editingId  = '';
  editNotes  = '';
  saving     = false;

  showCreate = false;
  releaseTypeColors = RELEASE_TYPE_COLORS;
  projectName = '';

  constructor(
    private _route: ActivatedRoute,
    private _svc:   ReleasesService,
    private _modal: NzModalService,
    private _msg:   NzMessageService,
    private _cdr:   ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this._route.params.subscribe(p => {
      this.projectId = p['id'] || p['projectId'];
      this._load();
    });
  }

  private _load(): void {
    this.loading = true;
    this._svc.getProjectReleases(this.projectId, this.page, this.limit).subscribe({
      next: (r) => {
        this.releases = r.releases;
        this.total    = r.total;
        this.loading  = false;
        if (r.releases.length && !this.projectName) {
          const proj = (r.releases[0] as any).projectId;
          if (proj?.name) this.projectName = proj.name;
        }
        this._cdr.markForCheck();
      },
      error: (e) => {
        this._msg.error(e.error?.message || 'Lỗi tải dữ liệu');
        this.loading = false;
        this._cdr.markForCheck();
      },
    });
  }

  onPageChange(p: number): void {
    this.page = p;
    this._load();
  }

  startEdit(r: JRelease): void {
    this.editingId = r.id;
    this.editNotes = r.releaseNotes;
    this._cdr.markForCheck();
  }

  cancelEdit(): void {
    this.editingId = '';
    this.editNotes = '';
    this._cdr.markForCheck();
  }

  saveNotes(r: JRelease): void {
    this.saving = true;
    this._svc.updateRelease(r.id, { releaseNotes: this.editNotes }).subscribe({
      next: (res) => {
        const idx = this.releases.findIndex(x => x.id === r.id);
        if (idx >= 0) this.releases[idx] = res.release;
        this.editingId = '';
        this.saving    = false;
        this._msg.success('Đã lưu release notes');
        this._cdr.markForCheck();
      },
      error: (e) => {
        this._msg.error(e.error?.message || 'Lỗi lưu');
        this.saving = false;
        this._cdr.markForCheck();
      },
    });
  }

  markRollback(r: JRelease): void {
    this._modal.confirm({
      nzTitle:   'Đánh dấu Rollback?',
      nzContent: `Phiên bản "${r.version}" sẽ được đánh dấu là đã rollback.`,
      nzOkText:  'Rollback',
      nzOkDanger: true,
      nzOnOk: () => {
        this._svc.updateRelease(r.id, { status: 'rollback' }).subscribe({
          next: (res) => {
            const idx = this.releases.findIndex(x => x.id === r.id);
            if (idx >= 0) this.releases[idx] = res.release;
            this._msg.warning(`${r.version} đánh dấu rollback`);
            this._cdr.markForCheck();
          },
          error: (e) => this._msg.error(e.error?.message || 'Lỗi'),
        });
      },
    });
  }

  onReleaseCreated(): void {
    this.showCreate = false;
    this._load();
  }

  statusColor(s: ReleaseStatus): string {
    return s === 'released' ? 'green' : s === 'rollback' ? 'red' : 'default';
  }

  get mockProject(): any {
    return { id: this.projectId, name: this.projectName, status: 'in_development', version: '1.0.0',
      description: '', progress: 0, releaseDate: null, startDate: null, endDate: null,
      techStack: [], repository: '', demoUrl: '', role: 'owner', memberCount: 1,
      taskStats: { total: 0, completed: 0, inProgress: 0, overdue: 0 }, lastActivity: '', latestRelease: null };
  }
}
