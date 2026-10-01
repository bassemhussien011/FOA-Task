import { HttpClient } from '@angular/common/http';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { TranslocoLoader, TranslocoService, Translation } from '@jsverse/transloco';
import { Observable } from 'rxjs';
import { OrderStatus, OrderType } from './order.models';

export type AppLanguage = 'en' | 'ar';

@Injectable()
export class TranslocoHttpLoader implements TranslocoLoader {
  private readonly http = inject(HttpClient);

  getTranslation(language: string): Observable<Translation> {
    return this.http.get<Translation>(`i18n/${language}.json`);
  }
}

const MENU_TRANSLATION_KEYS: Record<string, string> = {
  m1: 'menuM1',
  m2: 'menuM2',
  m3: 'menuM3',
  m4: 'menuM4',
  m5: 'menuM5',
  m6: 'menuM6',
  m7: 'menuM7',
};

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly document = inject(DOCUMENT);
  private readonly transloco = inject(TranslocoService);
  private readonly currentLanguage = signal<AppLanguage>('en');
  readonly language = this.currentLanguage.asReadonly();
  readonly loading = signal(false);
  readonly translationError = signal(false);

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      const savedLanguage = this.document.defaultView?.localStorage.getItem('mise-language');
      this.activate(savedLanguage === 'ar' ? 'ar' : 'en', false);
    } else {
      this.transloco.setActiveLang('en');
    }
  }

  toggle(): void {
    if (this.loading()) return;
    const nextLanguage = this.language() === 'en' ? 'ar' : 'en';
    this.activate(nextLanguage, true);
  }

  text(key: string): string {
    this.language();
    return this.transloco.translate(key);
  }

  statusLabel(status: OrderStatus): string {
    const keys: Record<OrderStatus, string> = {
      new: 'statusNew',
      preparing: 'statusPreparing',
      ready: 'statusReady',
      served: 'statusServed',
    };
    return this.text(keys[status]);
  }

  typeLabel(type: OrderType): string {
    const keys: Record<OrderType, string> = {
      'dine-in': 'typeDineIn',
      takeaway: 'typeTakeaway',
      delivery: 'typeDelivery',
    };
    return this.text(keys[type]);
  }

  menuName(id: string, fallback: string): string {
    const key = MENU_TRANSLATION_KEYS[id];
    return key ? this.text(key) : fallback;
  }

  formatCurrency(amount: number): string {
    const locale = this.language() === 'ar' ? 'ar-EG' : 'en-EG';
    return new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
  }

  dateLocale(): string {
    return this.language() === 'ar' ? 'ar-EG' : 'en-US';
  }

  direction(): 'rtl' | 'ltr' {
    return this.language() === 'ar' ? 'rtl' : 'ltr';
  }

  private activate(language: AppLanguage, persist: boolean): void {
    this.loading.set(true);
    this.translationError.set(false);
    this.transloco.load(language).subscribe({
      next: () => {
        this.transloco.setActiveLang(language);
        this.currentLanguage.set(language);
        this.document.documentElement.lang = language;
        this.document.documentElement.dir = this.direction();
        if (persist && isPlatformBrowser(this.platformId)) {
          this.document.defaultView?.localStorage.setItem('mise-language', language);
        }
        this.loading.set(false);
      },
      error: (error: unknown) => {
        console.error(`Could not load the ${language} translation file.`, error);
        this.translationError.set(true);
        this.loading.set(false);
      },
    });
  }
}
