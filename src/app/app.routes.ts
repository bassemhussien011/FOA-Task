import { Routes } from '@angular/router';

export const routes: Routes = [
	{ path: 'orders', loadComponent: () => import('./features/orders/orders-board').then((m) => m.OrdersBoard) },
	{ path: 'orders/new', loadComponent: () => import('./features/orders/new-order').then((m) => m.NewOrder) },
	{ path: 'orders/:id', loadComponent: () => import('./features/orders/order-detail').then((m) => m.OrderDetail) },
	{ path: '', pathMatch: 'full', redirectTo: 'orders' },
	{ path: '**', redirectTo: 'orders' },
];
