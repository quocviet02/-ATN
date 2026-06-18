import { Routes } from '@angular/router';
import { OrgLayoutComponent } from '../organization/org-layout/org-layout.component';

export const programRoutes: Routes = [
  {
    path: '',
    component: OrgLayoutComponent,
    children: [
      {
        path: ':id',
        loadComponent: () =>
          import('./program-detail/program-detail.component').then(m => m.ProgramDetailComponent),
      },
    ],
  },
];
