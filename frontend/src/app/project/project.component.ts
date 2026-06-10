import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { ProjectService } from './state/project/project.service';
import { ProjectQuery } from './state/project/project.query';
import { SvgDefinitionsComponent } from '../jira-control/svg-definitions/svg-definitions.component';
import { RouterOutlet } from '@angular/router';
import { NavigationComponent } from './components/navigation/navigation/navigation.component';
import { AsyncPipe } from '@angular/common';
import { NotificationToastComponent } from './components/notification-toast/notification-toast.component';
import { NotificationService, AppNotification } from '@trungk18/core/services/notification.service';

@Component({
    selector: 'app-project',
    templateUrl: './project.component.html',
    styleUrls: ['./project.component.scss'],
    imports: [NavigationComponent, RouterOutlet, SvgDefinitionsComponent, AsyncPipe, NotificationToastComponent]
})
export class ProjectComponent implements OnInit, OnDestroy {
  expanded: boolean;
  private _taskDeletedSub: Subscription;

  constructor(
    private _projectService: ProjectService,
    public projectQuery: ProjectQuery,
    private _notifService: NotificationService
  ) {
    this.expanded = true;
  }

  ngOnInit(): void {
    this._projectService.getProject();
    this._notifService.connect();
    this.handleResize();
    this._listenTaskDeleted();
  }

  ngOnDestroy(): void {
    this._taskDeletedSub?.unsubscribe();
  }

  private _listenTaskDeleted(): void {
    this._taskDeletedSub = this._notifService.taskDeleted$.subscribe(({ taskId, deletedBy, title }) => {
      this._projectService.removeIssueFromStore(taskId);
      // Show toast so other users know who deleted the task
      const toast: AppNotification = {
        id:        '',
        type:      'task_deleted',
        title:     'Task đã bị xóa',
        body:      `${deletedBy.name} đã xóa task "${title}"`,
        link:      '',
        isRead:    false,
        createdAt: new Date().toISOString(),
      };
      this._notifService.toast$.next(toast);
    });
  }

  handleResize() {
    const match = window.matchMedia('(min-width: 1024px)');
    match.addEventListener('change', (e) => {
      console.log(e);
      this.expanded = e.matches;
    });
  }

  manualToggle() {
    this.expanded = !this.expanded;
  }
}
