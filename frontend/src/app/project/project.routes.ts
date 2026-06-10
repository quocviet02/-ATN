import { Routes } from '@angular/router';
import { importProvidersFrom } from '@angular/core';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzDrawerModule } from 'ng-zorro-antd/drawer';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NZ_JIRA_ICONS } from './config/icons';
import { ProjectComponent } from './project.component';
import { BoardComponent } from './pages/board/board.component';
import { SettingsComponent } from './pages/settings/settings.component';
import { MembersComponent } from './pages/members/members.component';
import { FullIssueDetailComponent } from './pages/full-issue-detail/full-issue-detail.component';
import { NotificationsComponent } from './pages/notifications/notifications.component';
import { TimelineComponent } from './pages/timeline/timeline.component';
import { WorkflowListComponent } from './pages/workflow/workflow-list/workflow-list.component';
import { WorkflowDesignerComponent } from './pages/workflow/workflow-designer/workflow-designer.component';
import { ReleasesOverviewComponent } from './pages/releases/releases-overview/releases-overview.component';
import { ProjectReleasesComponent } from './pages/releases/project-releases/project-releases.component';
import { ProjectConst } from './config/const';

export const PROJECT_ROUTES: Routes = [
  {
    path: '',
    component: ProjectComponent,
    providers: [
      importProvidersFrom(
        NzIconModule.forChild(NZ_JIRA_ICONS),
        NzDrawerModule,
        NzModalModule
      )
    ],
    children: [
      {
        path: 'board',
        component: BoardComponent
      },
      {
        path: 'settings',
        component: SettingsComponent
      },
      {
        path: 'members',
        component: MembersComponent
      },
      {
        path: `issue/:${ProjectConst.IssueId}`,
        component: FullIssueDetailComponent
      },
      {
        path: 'notifications',
        component: NotificationsComponent
      },
      {
        path: 'timeline',
        component: TimelineComponent
      },
      {
        path: 'workflows',
        component: WorkflowListComponent
      },
      {
        path: 'workflows/:workflowId/design',
        component: WorkflowDesignerComponent
      },
      {
        path: 'releases',
        component: ReleasesOverviewComponent
      },
      {
        path: 'releases/:id',
        component: ProjectReleasesComponent
      },
      {
        path: '',
        redirectTo: 'board',
        pathMatch: 'full'
      }
    ]
  }
];
