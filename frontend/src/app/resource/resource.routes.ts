import { Routes } from '@angular/router';
import { OrgLayoutComponent } from '../organization/org-layout/org-layout.component';

export const resourceRoutes: Routes = [
  {
    path: '',
    component: OrgLayoutComponent,
    children: [
      {
        path: '',
        redirectTo: 'workload',
        pathMatch: 'full',
      },
      {
        path: 'workload',
        loadComponent: () =>
          import('./workload-dashboard/workload-dashboard.component').then(m => m.WorkloadDashboardComponent),
      },
      {
        path: 'skills',
        loadComponent: () =>
          import('./skills-matrix/skills-matrix.component').then(m => m.SkillsMatrixComponent),
      },
      {
        path: 'timeoff',
        loadComponent: () =>
          import('./timeoff-calendar/timeoff-calendar.component').then(m => m.TimeoffCalendarComponent),
      },
      {
        path: 'ai-insights',
        loadComponent: () =>
          import('./ai-insights/ai-insights.component').then(m => m.AiInsightsComponent),
      },
    ],
  },
];
