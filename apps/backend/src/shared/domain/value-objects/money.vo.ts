import Decimal from 'decimal.js';
import { DomainError } from '../errors/domain.error';

const MAX_SCALE = 2; // currency has at most 2 decimal places

/**
 * Money value object backed by decimal.js for exact arithmetic.
 * NEVER use float/double for money. Values are stored/compared as exact decimals
 * and serialized as fixed-2 strings for transport (SPEC section 1.1).
 */
export class Money {
  private constructor(private readonly value: Decimal) {}

  static fromString(raw: string): Money {
    if (typeof raw !== 'string' || raw.trim() === '') {
      throw new DomainError('Amount must be a decimal string', 'INVALID_AMOUNT');
    }
    let decimal: Decimal;
    try {
      decimal = new Decimal(raw);
    } catch {
      throw new DomainError('Amount is not a valid number', 'INVALID_AMOUNT');
    }
    if (!decimal.isFinite()) {
      throw new DomainError('Amount must be finite', 'INVALID_AMOUNT');
    }
    if (decimal.isNegative()) {
      throw new DomainError('Amount must not be negative', 'INVALID_AMOUNT');
    }
    if (decimal.decimalPlaces() > MAX_SCALE) {
      throw new DomainError('Amount supports at most 2 decimal places', 'INVALID_AMOUNT');
    }
    return new Money(decimal);
  }

  static zero(): Money {
    return new Money(new Decimal(0));
  }

  add(other: Money): Money {
    return new Money(this.value.plus(other.value));
  }

  subtract(other: Money): Money {
    return new Money(this.value.minus(other.value));
  }

  isPositive(): boolean {
    return this.value.greaterThan(0);
  }

  gte(other: Money): boolean {
    return this.value.greaterThanOrEqualTo(other.value);
  }

  isNegative(): boolean {
    return this.value.isNegative();
  }

  /**
   * Exact check (no rounding) of whether this amount reaches a given percentage
   * of `budget`. Avoids rounding artifacts at the 80%/100% alert thresholds.
   */
  reachesPercentOf(percent: number, budget: Money): boolean {
    if (!budget.value.greaterThan(0)) {
      return false;
    }
    return this.value.times(100).greaterThanOrEqualTo(budget.value.times(percent));
  }

  /** Percentage this amount represents of `budget`, rounded to 2 decimals. */
  percentageOf(budget: Money): number {
    if (!budget.value.greaterThan(0)) {
      return 0;
    }
    return this.value.div(budget.value).times(100).toDecimalPlaces(2).toNumber();
  }

  toString(): string {
    return this.value.toFixed(MAX_SCALE);
  }
}
