import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormArray, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { catchError, of, switchMap } from 'rxjs';
import { atLeastOneOrderLineValidator, egyptianMobileValidator, integerValidator } from '../../core/order.validators';
import { calculatePrice, formatEgp, MenuItem, OrderDraft, OrderType } from '../../core/order.models';
import { OrdersApi } from '../../core/orders-api.service';
import { LanguageService } from '../../core/language.service';

type LineControls = { menuId: FormControl<string>; qty: FormControl<number>; note: FormControl<string> };
type LineGroup = FormGroup<LineControls>;
type OrderControls = { type: FormControl<OrderType>; table: FormControl<number | null>; phone: FormControl<string>; items: FormArray<LineGroup> };

@Component({
  selector: 'app-new-order',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './new-order.html',
  styleUrl: './new-order.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NewOrder {
  private readonly api = inject(OrdersApi);
  readonly language = inject(LanguageService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  readonly menu = signal<MenuItem[]>([]);
  readonly loading = signal(true);
  readonly menuError = signal(false);
  readonly saving = signal(false);
  readonly submitError = signal('');
  readonly priceVersion = signal(0);
  readonly formatEgp = formatEgp;
  readonly lineItems = new FormArray<LineGroup>([this.createLine()], { validators: atLeastOneOrderLineValidator });
  readonly form = new FormGroup<OrderControls>({
    type: new FormControl<OrderType>('dine-in', { nonNullable: true }),
    table: new FormControl<number | null>(null, [Validators.required, Validators.min(1), Validators.max(40), integerValidator]),
    phone: new FormControl('', { nonNullable: true }),
    items: this.lineItems,
  });
  readonly total = computed(() => {
    this.priceVersion();
    const draft = { ...this.form.getRawValue(), number: 0, status: 'new' as const, createdAt: '' };
    return calculatePrice(draft, this.menu()).total;
  });

  constructor() {
    this.setTypeValidators('dine-in');
    this.form.controls.type.valueChanges.pipe(takeUntilDestroyed()).subscribe((type) => this.setTypeValidators(type));
    this.form.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.priceVersion.update((version) => version + 1));
    this.api.loadMenu().pipe(takeUntilDestroyed()).subscribe({
      next: (menu) => { this.menu.set(menu); this.loading.set(false); },
      error: () => { this.menuError.set(true); this.loading.set(false); },
    });
  }

  private createLine(): LineGroup {
    return new FormGroup<LineControls>({
      menuId: new FormControl('', { nonNullable: true, validators: Validators.required }),
      qty: new FormControl(1, { nonNullable: true, validators: [Validators.required, Validators.min(1), Validators.max(20), integerValidator] }),
      note: new FormControl('', { nonNullable: true }),
    });
  }

  private setTypeValidators(type: OrderType): void {
    const table = this.form.controls.table;
    const phone = this.form.controls.phone;
    if (type === 'dine-in') {
      table.setValidators([Validators.required, Validators.min(1), Validators.max(40), integerValidator]);
    } else {
      table.clearValidators();
      table.setValue(null, { emitEvent: false });
    }
    if (type === 'delivery') phone.setValidators([Validators.required, egyptianMobileValidator]);
    else { phone.clearValidators(); phone.setValue('', { emitEvent: false }); }
    table.updateValueAndValidity({ emitEvent: false });
    phone.updateValueAndValidity({ emitEvent: false });
  }

  addLine(): void { this.lineItems.push(this.createLine()); }
  removeLine(index: number): void { this.lineItems.removeAt(index); }
  line(index: number): LineGroup { return this.lineItems.at(index); }
  itemName(menuId: string): string { return this.menu().find((item) => item.id === menuId)?.name ?? ''; }

  lineTotal(index: number): number {
    const line = this.line(index).getRawValue();
    return (this.menu().find((item) => item.id === line.menuId)?.price ?? 0) * line.qty;
  }

  submit(): void {
    if (this.saving()) return;
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    this.saving.set(true);
    this.submitError.set('');
    this.api.loadBoard().pipe(
      switchMap(({ orders }) => {
        const value = this.form.getRawValue();
        const draft: OrderDraft = {
          number: Math.max(0, ...orders.map((order) => order.number)) + 1,
          type: value.type,
          table: value.type === 'dine-in' ? value.table : null,
          phone: value.type === 'delivery' ? value.phone : null,
          status: 'new',
          createdAt: new Date().toISOString(),
          items: value.items,
        };
        return this.api.createOrder(draft);
      }),
      catchError(() => { this.submitError.set('saveError'); this.saving.set(false); return of(null); }),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe((created) => {
      if (!created) return;
      void this.router.navigate(['/orders', created.id]);
    });
  }
}