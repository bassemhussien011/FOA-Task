import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export const egyptianMobileValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const value = String(control.value ?? '').trim();
  return /^01[0125]\d{8}$/.test(value) ? null : { egyptianMobile: true };
};

export const integerValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const value: unknown = control.value;
  return value === null || value === '' || Number.isInteger(Number(value)) ? null : { integer: true };
};

export const atLeastOneOrderLineValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const lines: unknown = control.value;
  return Array.isArray(lines) && lines.length > 0 ? null : { atLeastOneOrderLine: true };
};