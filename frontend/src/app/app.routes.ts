import { Routes } from '@angular/router';
import { AuthGuard } from '@trungk18/core/guards/auth.guard';

export const appRoutes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./auth/login/login.component').then((m) => m.LoginComponent)
  },
  {
    path: 'register',
    loadComponent: () => import('./auth/register/register.component').then((m) => m.RegisterComponent)
  },
  {
    path: 'invite/accept/:token',
    loadComponent: () => import('./invite/invite-accept.component').then((m) => m.InviteAcceptComponent)
  },
  {
    path: 'invite/reject/:token',
    loadComponent: () => import('./invite/invite-reject.component').then((m) => m.InviteRejectComponent)
  },
  {
    path: 'project',
    canActivate: [AuthGuard],
    loadChildren: () => import('./project/project.routes').then((m) => m.PROJECT_ROUTES)
  },
  {
    path: 'organizations',
    loadChildren: () => import('./organization/organization.routes').then((m) => m.ORGANIZATION_ROUTES)
  },
  {
    path: 'portfolios',
    canActivate: [AuthGuard],
    loadChildren: () => import('./portfolio/portfolio.routes').then((m) => m.portfolioRoutes)
  },
  {
    path: 'programs',
    canActivate: [AuthGuard],
    loadChildren: () => import('./portfolio/program.routes').then((m) => m.programRoutes)
  },
  {
    path: 'resources',
    canActivate: [AuthGuard],
    loadChildren: () => import('./resource/resource.routes').then((m) => m.resourceRoutes)
  },
  {
    path: 'wip',
    loadChildren: () => import('./work-in-progress/work-in-progress.routes').then((m) => m.WIP_ROUTES)
  },
  {
    path: '',
    redirectTo: 'project',
    pathMatch: 'full'
  }
];
