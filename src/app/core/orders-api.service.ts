import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { forkJoin, map, Observable, shareReplay, tap } from 'rxjs';
import { MenuItem, Order, OrderDraft } from './order.models';

interface MockDatabase {
  menu: MenuItem[];
  orders: Order[];
}

const MOCK_DATABASE_KEY = 'mise-orders-database';

@Injectable({ providedIn: 'root' })
export class OrdersApi {
  private readonly http = inject(HttpClient);
  private readonly document = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly baseUrl = 'http://localhost:3000';
  private readonly useBrowserMock = isPlatformBrowser(this.platformId)
    && this.document.location.hostname.endsWith('.github.io');
  private mockDatabase$?: Observable<MockDatabase>;

  loadBoard(): Observable<{ orders: Order[]; menu: MenuItem[] }> {
    if (this.useBrowserMock) {
      return this.loadMockDatabase().pipe(
        map(({ orders, menu }) => ({ orders: structuredClone(orders), menu: structuredClone(menu) })),
      );
    }
    return forkJoin({
      orders: this.http.get<Order[]>(`${this.baseUrl}/orders`),
      menu: this.http.get<MenuItem[]>(`${this.baseUrl}/menu`),
    });
  }

  loadOrder(id: string): Observable<Order> {
    if (this.useBrowserMock) {
      return this.loadMockDatabase().pipe(
        map(({ orders }) => {
          const order = orders.find((entry) => entry.id === id);
          if (!order) throw new HttpErrorResponse({ status: 404, statusText: `Order ${id} was not found.` });
          return structuredClone(order);
        }),
      );
    }
    return this.http.get<Order>(`${this.baseUrl}/orders/${encodeURIComponent(id)}`);
  }

  loadMenu(): Observable<MenuItem[]> {
    if (this.useBrowserMock) {
      return this.loadMockDatabase().pipe(map(({ menu }) => structuredClone(menu)));
    }
    return this.http.get<MenuItem[]>(`${this.baseUrl}/menu`);
  }

  updateStatus(id: string, status: Order['status']): Observable<Order> {
    if (this.useBrowserMock) {
      return this.loadMockDatabase().pipe(map((database) => {
        const order = database.orders.find((entry) => entry.id === id);
        if (!order) throw new HttpErrorResponse({ status: 404, statusText: `Order ${id} was not found.` });
        order.status = status;
        this.saveMockDatabase(database);
        return structuredClone(order);
      }));
    }
    return this.http.patch<Order>(`${this.baseUrl}/orders/${encodeURIComponent(id)}`, { status });
  }

  createOrder(draft: OrderDraft): Observable<Order> {
    if (this.useBrowserMock) {
      return this.loadMockDatabase().pipe(map((database) => {
        const crypto = this.document.defaultView?.crypto;
        if (!crypto?.randomUUID) throw new Error('Secure order ID generation is not available in this browser.');
        const order: Order = { ...structuredClone(draft), id: crypto.randomUUID() };
        database.orders.push(order);
        this.saveMockDatabase(database);
        return structuredClone(order);
      }));
    }
    return this.http.post<Order>(`${this.baseUrl}/orders`, draft);
  }

  private loadMockDatabase(): Observable<MockDatabase> {
    if (!this.mockDatabase$) {
      this.mockDatabase$ = this.http.get<MockDatabase>('db.json').pipe(
        map((seed) => {
          const saved = this.document.defaultView?.localStorage.getItem(MOCK_DATABASE_KEY);
          return saved ? JSON.parse(saved) as MockDatabase : structuredClone(seed);
        }),
        tap((database) => this.saveMockDatabase(database)),
        shareReplay({ bufferSize: 1, refCount: false }),
      );
    }
    return this.mockDatabase$;
  }

  private saveMockDatabase(database: MockDatabase): void {
    this.document.defaultView?.localStorage.setItem(MOCK_DATABASE_KEY, JSON.stringify(database));
  }
}