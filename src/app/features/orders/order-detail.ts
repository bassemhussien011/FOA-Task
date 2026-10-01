import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { calculatePrice, formatEgp, MenuItem, Order, OrderType } from '../../core/order.models';
import { OrdersApi } from '../../core/orders-api.service';

@Component({
  selector: 'app-order-detail',
  imports: [DatePipe, RouterLink],
  templateUrl: './order-detail.html',
  styleUrl: './order-detail.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderDetail {
  private readonly api = inject(OrdersApi);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  readonly order = signal<Order | null>(null);
  readonly menu = signal<MenuItem[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly formatEgp = formatEgp;

  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      const id = params.get('id');
      if (!id) return;
      this.loading.set(true);
      this.error.set('');
      forkJoin({ order: this.api.loadOrder(id), menu: this.api.loadMenu() }).pipe(
        catchError(() => {
          this.error.set('This order could not be found. It may have been removed.');
          this.loading.set(false);
          return of(null);
        }),
        takeUntilDestroyed(this.destroyRef),
      ).subscribe((result) => {
        if (!result) return;
        this.order.set(result.order);
        this.menu.set(result.menu);
        this.loading.set(false);
      });
    });
  }

  menuItem(menuId: string): MenuItem | undefined {
    return this.menu().find((item) => item.id === menuId);
  }

  prices() {
    const order = this.order();
    return order ? calculatePrice(order, this.menu()) : null;
  }

  typeLabel(type: OrderType): string {
    return type === 'dine-in' ? 'Dine in' : type === 'takeaway' ? 'Takeaway' : 'Delivery';
  }
}