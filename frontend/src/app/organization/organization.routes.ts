import { Routes } from '@angular/router';
import { AuthGuard } from '@trungk18/core/guards/auth.guard';
import { OrgLayoutComponent } from './org-layout/org-layout.component';

export const ORGANIZATION_ROUTES: Routes = [
  {
    path:        '',
    component:   OrgLayoutComponent,
    canActivate: [AuthGuard],
    children: [
      {
        path: 'new',
        loadComponent: () =>
          import('./organization-new/organization-new.component').then(m => m.OrganizationNewComponent),
      },
      {
        path: ':id/settings',
        loadComponent: () =>
          import('./organization-settings/organization-settings.component').then(m => m.OrganizationSettingsComponent),
      },
    ],
  },
];
