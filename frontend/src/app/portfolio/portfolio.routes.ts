import { Routes } from '@angular/router';
import { OrgLayoutComponent } from '../organization/org-layout/org-layout.component';

export const portfolioRoutes: Routes = [
  {
    path: '',
    component: OrgLayoutComponent,
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./portfolio-list/portfolio-list.component').then(m => m.PortfolioListComponent),
      },
      {
        path: ':id',
        loadComponent: () =>
          import('./portfolio-detail/portfolio-detail.component').then(m => m.PortfolioDetailComponent),
      },
    ],
  },
];
