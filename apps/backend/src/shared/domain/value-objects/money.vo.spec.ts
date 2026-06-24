import { DomainError } from '../errors/domain.error';
import { Money } from './money.vo';

describe('Money value object', () => {
  it('adds and subtracts without precision loss', () => {
    const total = Money.fromString('3200000.00').subtract(Money.fromString('1850000.00'));
    expect(total.toString()).toBe('1350000.00');
  });

  it('handles classic float-error cases exactly (0.1 + 0.2 = 0.30)', () => {
    expect(Money.fromString('0.10').add(Money.fromString('0.20')).toString()).toBe('0.30');
  });

  it('serializes with exactly two decimals', () => {
    expect(Money.fromString('5').toString()).toBe('5.00');
    expect(Money.fromString('5.5').toString()).toBe('5.50');
  });

  it('zero is not positive', () => {
    expect(Money.zero().isPositive()).toBe(false);
    expect(Money.fromString('0.01').isPositive()).toBe(true);
  });

  it.each(['-1', '1.234', 'abc', '', 'NaN', 'Infinity'])('rejects invalid amount "%s"', (raw) => {
    expect(() => Money.fromString(raw)).toThrow(DomainError);
  });

  describe('percentageOf', () => {
    it('computes usage percentage rounded to 2 decimals', () => {
      expect(Money.fromString('640000').percentageOf(Money.fromString('800000'))).toBe(80);
      expect(Money.fromString('820000').percentageOf(Money.fromString('800000'))).toBe(102.5);
    });

    it('returns 0 when budget is zero', () => {
      expect(Money.fromString('100').percentageOf(Money.zero())).toBe(0);
    });
  });
});
