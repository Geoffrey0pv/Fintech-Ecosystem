import { DomainError } from './domain.error';

describe('DomainError', () => {
  it('defaults the code to DOMAIN_ERROR', () => {
    const err = new DomainError('something broke');
    expect(err.code).toBe('DOMAIN_ERROR');
    expect(err.message).toBe('something broke');
    expect(err.name).toBe('DomainError');
  });

  it('accepts a custom code', () => {
    expect(new DomainError('bad', 'INVALID_X').code).toBe('INVALID_X');
  });
});
