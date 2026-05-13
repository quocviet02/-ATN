import { Component, OnInit } from '@angular/core';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { CdkDragDrop, CdkDropList, CdkDrag, moveItemInArray } from '@angular/cdk/drag-drop';
import { ProjectQuery } from '@trungk18/project/state/project/project.query';
import { ProjectService } from '@trungk18/project/state/project/project.service';
import { ProjectColumn } from '@trungk18/project/state/project/project.store';
import { AuthQuery } from '@trungk18/project/auth/auth.query';
import { PermissionService } from '@trungk18/core/services/permission.service';
import { BoardDndListComponent } from '../board-dnd-list/board-dnd-list.component';
import { AsyncPipe, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NzIconDirective } from 'ng-zorro-antd/icon';

@UntilDestroy()
@Component({
    selector: 'board-dnd',
    templateUrl: './board-dnd.component.html',
    styleUrls: ['./board-dnd.component.scss'],
    imports: [CdkDropList, CdkDrag, BoardDndListComponent, AsyncPipe, NgIf, FormsModule, NzIconDirective]
})
export class BoardDndComponent implements OnInit {
  columns: ProjectColumn[] = [];
  role    = '';
  showAddColumn  = false;
  newColumnName  = '';

  constructor(
    public projectQuery: ProjectQuery,
    public authQuery: AuthQuery,
    public permissionService: PermissionService,
    private _projectService: ProjectService
  ) {}

  ngOnInit(): void {
    this.projectQuery.columns$.pipe(untilDestroyed(this)).subscribe(c => this.columns = [...c]);
    this.projectQuery.myRole$.pipe(untilDestroyed(this)).subscribe(r => this.role = r);
  }

  get taskListIds(): string[] {
    return this.columns.map(col => col.status as string);
  }

  dropColumn(event: CdkDragDrop<ProjectColumn[]>): void {
    if (event.previousIndex === event.currentIndex) return;
    const movedCol = this.columns[event.previousIndex];
    moveItemInArray(this.columns, event.previousIndex, event.currentIndex);
    this._projectService.moveColumn(movedCol.id, event.currentIndex);
  }

  submitAddColumn() {
    const name = this.newColumnName.trim();
    if (!name) return;
    this._projectService.addColumn(name);
    this.newColumnName = '';
    this.showAddColumn = false;
  }

  cancelAddColumn() {
    this.newColumnName = '';
    this.showAddColumn = false;
  }
}
