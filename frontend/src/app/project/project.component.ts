import { Component, OnInit } from '@angular/core';
import { ProjectService } from './state/project/project.service';
import { ProjectQuery } from './state/project/project.query';
import { SvgDefinitionsComponent } from '../jira-control/svg-definitions/svg-definitions.component';
import { RouterOutlet } from '@angular/router';
import { NavigationComponent } from './components/navigation/navigation/navigation.component';
import { AsyncPipe } from '@angular/common';

@Component({
    selector: 'app-project',
    templateUrl: './project.component.html',
    styleUrls: ['./project.component.scss'],
    imports: [NavigationComponent, RouterOutlet, SvgDefinitionsComponent, AsyncPipe]
})
export class ProjectComponent implements OnInit {
  expanded: boolean;

  constructor(
    private _projectService: ProjectService,
    public projectQuery: ProjectQuery
  ) {
    this.expanded = true;
  }

  ngOnInit(): void {
    this._projectService.getProject();
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
