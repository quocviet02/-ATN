import { Routes } from '@angular/router';
import { AuthGuard } from '@trungk18/core/guards/auth.guard';

export const appRoutes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./auth/login/login.component').then((m) => m.LoginComponent)
  },
  {
    path: 'project',
    canActivate: [AuthGuard],
    loadChildren: () => import('./project/project.routes').then((m) => m.PROJECT_ROUTES)
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
