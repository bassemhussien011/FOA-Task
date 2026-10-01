import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { forkJoin, Observable } from 'rxjs';
import { MenuItem, Order, OrderDraft } from './order.models';

@Injectable({ providedIn: 'root' })
export class OrdersApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:3000';

  loadBoard(): Observable<{ orders: Order[]; menu: MenuItem[] }> {
    return forkJoin({
      orders: this.http.get<Order[]>(`${this.baseUrl}/orders`),
      menu: this.http.get<MenuItem[]>(`${this.baseUrl}/menu`),
    });
  }

  loadOrder(id: string): Observable<Order> {
    return this.http.get<Order>(`${this.baseUrl}/orders/${encodeURIComponent(id)}`);
  }

  loadMenu(): Observable<MenuItem[]> {
    return this.http.get<MenuItem[]>(`${this.baseUrl}/menu`);
  }

  updateStatus(id: string, status: Order['status']): Observable<Order> {
    return this.http.patch<Order>(`${this.baseUrl}/orders/${encodeURIComponent(id)}`, { status });
  }

  createOrder(draft: OrderDraft): Observable<Order> {
    return this.http.post<Order>(`${this.baseUrl}/orders`, draft);
  }
}