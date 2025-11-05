import { Routes } from '@angular/router';

export const appRoutes: Routes = [
  {
    path: 'ads',
    children: [
      {
        path: '',
        loadComponent: () => import('./features/ads/ads-list/ads-list.component').then(m => m.AdsListComponent)
      },
      {
        path: 'new',
        loadComponent: () => import('./features/ads/ads-form/ads-form.component').then(m => m.AdsFormComponent)
      },
      {
        path: ':id',
        loadComponent: () => import('./features/ads/ads-details/ads-details.component').then(m => m.AdsDetailsComponent)
      },
      {
        path: ':id/edit',
        loadComponent: () => import('./features/ads/ads-form/ads-form.component').then(m => m.AdsFormComponent)
      }
    ]
  },
  {
    path: '',
    redirectTo: '/ads',
    pathMatch: 'full'
  },
  {
    path: '**',
    redirectTo: '/ads'
  }
];

