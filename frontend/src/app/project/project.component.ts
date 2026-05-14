import { Component, OnInit } from '@angular/core';
import { ProjectService } from './state/project/project.service';
import { ProjectQuery } from './state/project/project.query';
import { SvgDefinitionsComponent } from '../jira-control/svg-definitions/svg-definitions.component';
import { RouterOutlet } from '@angular/router';
import { NavigationComponent } from './components/navigation/navigation/navigation.component';
import { AsyncPipe } from '@angular/common';
import { NotificationToastComponent } from './components/notification-toast/notification-toast.component';
import { NotificationService } from '@trungk18/core/services/notification.service';

@Component({
    selector: 'app-project',
    templateUrl: './project.component.html',
    styleUrls: ['./project.component.scss'],
    imports: [NavigationComponent, RouterOutlet, SvgDefinitionsComponent, AsyncPipe, NotificationToastComponent]
})
export class ProjectComponent implements OnInit {
  expanded: boolean;

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
