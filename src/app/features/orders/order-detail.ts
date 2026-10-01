import { ChangeDetectionStrategy, Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin, of, switchMap } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { calculatePrice, MenuItem, Order, OrderType } from '../../core/order.models';
import { OrdersApi } from '../../core/orders-api.service';
import { LanguageService } from '../../core/language.service';

@Component({
  selector: 'app-order-detail',
  imports: [DatePipe, RouterLink],
  templateUrl: './order-detail.html',
  styleUrl: './order-detail.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderDetail implements OnInit {
  private readonly api = inject(OrdersApi);
  readonly language = inject(LanguageService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  readonly order = signal<Order | null>(null);
  readonly menu = signal<MenuItem[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');

  ngOnInit(): void {
    this.route.paramMap.pipe(
      switchMap((params) => {
        const id = params.get('id');
        if (!id) return of(null);
        this.loading.set(true);
        this.error.set('');
        return forkJoin({ order: this.api.loadOrder(id), menu: this.api.loadMenu() }).pipe(
          catchError((error: unknown) => {
            this.error.set(error instanceof HttpErrorResponse && error.status === 404
              ? 'orderNotFound'
              : 'orderLoadError');
            this.loading.set(false);
            return of(null);
          }),
        );
      }),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe((result) => {
      if (!result) return;
      this.order.set(result.order);
      this.menu.set(result.menu);
      this.loading.set(false);
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
    return this.language.typeLabel(type);
  }
}