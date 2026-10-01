import { FormArray, FormControl } from '@angular/forms';
import { atLeastOneOrderLineValidator, egyptianMobileValidator, integerValidator } from './order.validators';

describe('egyptianMobileValidator', () => {
  it.each(['01012345678', '01112345678', '01212345678', '01512345678'])('accepts %s', (number) => {
    expect(egyptianMobileValidator(new FormControl(number))).toBeNull();
  });

  describe('integerValidator', () => {
    it('accepts whole numbers and rejects fractions', () => {
      expect(integerValidator(new FormControl(1))).toBeNull();
      expect(integerValidator(new FormControl(1.5))).toEqual({ integer: true });
    });
  });

  describe('atLeastOneOrderLineValidator', () => {
    it('requires at least one line', () => {
      expect(atLeastOneOrderLineValidator(new FormArray([]))).toEqual({ atLeastOneOrderLine: true });
      expect(atLeastOneOrderLineValidator(new FormArray([new FormControl('m1')]))).toBeNull();
    });
  });

  it.each(['1012345678', '01312345678', '0101234567', '010123456789'])('rejects %s', (number) => {
    expect(egyptianMobileValidator(new FormControl(number))).toEqual({ egyptianMobile: true });
  });
});