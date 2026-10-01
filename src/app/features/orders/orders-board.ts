import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, debounceTime, distinctUntilChanged, EMPTY, exhaustMap, finalize, fromEvent, interval, startWith, Subject, switchMap, tap, timer } from 'rxjs';
import { MenuItem, ORDER_STATUSES, Order, OrderStatus, OrderType } from '../../core/order.models';
import { OrdersApi } from '../../core/orders-api.service';
import { LanguageService } from '../../core/language.service';

type OrderTypeFilter = OrderType | 'all';

const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  new: 'preparing', preparing: 'ready', ready: 'served',
};

function isOrderType(value: string | null): value is OrderType {
  return value === 'dine-in' || value === 'takeaway' || value === 'delivery';
}

@Component({
  selector: 'app-orders-board',
  imports: [RouterLink],
  templateUrl: './orders-board.html',
  styleUrl: './orders-board.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrdersBoard {
  private readonly api = inject(OrdersApi);
  readonly language = inject(LanguageService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly document = inject(DOCUMENT);
  private readonly searchChanges = new Subject<string>();
  readonly statuses = ORDER_STATUSES;
  readonly orders = signal<Order[]>([]);
  readonly menu = signal<MenuItem[]>([]);
  private readonly pendingStatuses = signal(new Map<string, OrderStatus>());
  readonly search = signal('');
  readonly searchDraft = signal('');
  readonly typeFilter = signal<OrderTypeFilter>('all');
  readonly now = signal(Date.now());
  readonly loading = signal(true);
  readonly error = signal('');

  constructor() {
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      this.search.set(params.get('q') ?? '');
      this.searchDraft.set(params.get('q') ?? '');
      const type = params.get('type');
      this.typeFilter.set(isOrderType(type) ? type : 'all');
    });
    this.searchChanges.pipe(
      debounceTime(250),
      distinctUntilChanged(),
      tap((query) => {
        this.search.set(query);
        void this.router.navigate([], { relativeTo: this.route, queryParams: { q: query || null }, queryParamsHandling: 'merge', replaceUrl: true });
      }),
      takeUntilDestroyed(),
    ).subscribe();
    fromEvent(this.document, 'visibilitychange').pipe(
      startWith(null),
      switchMap(() => this.document.visibilityState === 'hidden'
        ? EMPTY
        : timer(0, 15_000).pipe(
          exhaustMap(() => this.api.loadBoard().pipe(
            tap(({ orders, menu }) => {
              this.orders.set(orders.map((order) => {
                const pendingStatus = this.pendingStatuses().get(order.id);
                return pendingStatus ? { ...order, status: pendingStatus } : order;
              }));
              this.menu.set(menu);
              this.loading.set(false);
              this.error.set('');
            }),
            catchError(() => {
              this.loading.set(false);
              this.error.set('refreshError');
              return EMPTY;
            }),
          )),
        )),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe();
    interval(1000).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.now.set(Date.now()));
  }

  visibleOrders(status: OrderStatus): Order[] {
    const query = this.search().trim().toLowerCase();
    return this.orders().filter((order) => {
      const matchesText = !query || String(order.number).includes(query) || String(order.table ?? '').includes(query);
      const matchesType = this.typeFilter() === 'all' || order.type === this.typeFilter();
      return order.status === status && matchesText && matchesType;
    });
  }

  count(status: OrderStatus): number {
    return this.visibleOrders(status).length;
  }

  visibleOrderCount(): number {
    return this.statuses.reduce((count, status) => count + this.count(status), 0);
  }

  itemCount(order: Order): number {
    return order.items.reduce((total, line) => total + line.qty, 0);
  }

  subtotal(order: Order): string {
    const amount = order.items.reduce((total, line) => total + (this.menu().find((item) => item.id === line.menuId)?.price ?? 0) * line.qty, 0);
    return this.language.formatCurrency(amount);
  }

  elapsed(createdAt: string): string {
    const minutes = Math.max(0, Math.floor((this.now() - new Date(createdAt).getTime()) / 60_000));
    return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
  }

  isLate(order: Order): boolean {
    return order.status !== 'ready' && order.status !== 'served' && this.now() - new Date(order.createdAt).getTime() > 20 * 60_000;
  }

  setSearch(value: string): void {
    this.searchDraft.set(value);
    this.searchChanges.next(value.trim());
  }

  setType(value: OrderTypeFilter): void {
    this.typeFilter.set(value);
    void this.router.navigate([], { relativeTo: this.route, queryParams: { type: value === 'all' ? null : value }, queryParamsHandling: 'merge', replaceUrl: true });
  }

  advance(order: Order): void {
    const next = NEXT_STATUS[order.status];
    if (!next || this.pendingStatuses().has(order.id)) return;
    this.pendingStatuses.update((pending) => new Map(pending).set(order.id, next));
    this.orders.update((orders) => orders.map((entry) => entry.id === order.id ? { ...entry, status: next } : entry));
    this.api.updateStatus(order.id, next).pipe(
      tap((updated) => {
        this.orders.update((orders) => orders.map((entry) => entry.id === order.id ? { ...entry, status: updated.status } : entry));
      }),
      finalize(() => {
        this.pendingStatuses.update((pending) => {
          const remaining = new Map(pending);
          remaining.delete(order.id);
          return remaining;
        });
      }),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      error: () => {
        this.orders.update((orders) => orders.map((entry) => entry.id === order.id ? { ...entry, status: order.status } : entry));
        this.error.set(`Order #${order.number} was not moved. The change has been rolled back.`);
      },
    });
  }

  isPending(orderId: string): boolean {
    return this.pendingStatuses().has(orderId);
  }

  typeLabel(type: OrderType): string {
    return this.language.typeLabel(type);
  }

  statusLabel(status: OrderStatus): string {
    return this.language.statusLabel(status);
  }
}