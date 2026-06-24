import { Money } from '../../../shared/domain/value-objects/money.vo';
import { evaluateBudget } from './budget-alert';

const m = (v: string) => Money.fromString(v);

describe('evaluateBudget', () => {
  it('returns no alert below 80%', () => {
    const result = evaluateBudget(m('631999.99'), m('800000'));
    expect(result.alert).toBeNull();
    expect(result.usagePercent).toBeCloseTo(79.0, 0);
  });

  it('returns WARNING_80 exactly at 80%', () => {
    const result = evaluateBudget(m('640000'), m('800000'));
    expect(result.alert).toBe('WARNING_80');
    expect(result.usagePercent).toBe(80);
    expect(result.remaining).toBe('160000.00');
  });

  it('keeps WARNING_80 just below 100%', () => {
    expect(evaluateBudget(m('799999.99'), m('800000')).alert).toBe('WARNING_80');
  });

  it('returns CRITICAL_100 exactly at 100%', () => {
    const result = evaluateBudget(m('800000'), m('800000'));
    expect(result.alert).toBe('CRITICAL_100');
    expect(result.usagePercent).toBe(100);
    expect(result.remaining).toBe('0.00');
  });

  it('returns CRITICAL_100 over budget with negative remaining', () => {
    const result = evaluateBudget(m('820000'), m('800000'));
    expect(result.alert).toBe('CRITICAL_100');
    expect(result.usagePercent).toBe(102.5);
    expect(result.remaining).toBe('-20000.00');
  });

  it('returns no alert when no budget is set (0)', () => {
    const result = evaluateBudget(m('100000'), Money.zero());
    expect(result.alert).toBeNull();
    expect(result.usagePercent).toBe(0);
  });
});
