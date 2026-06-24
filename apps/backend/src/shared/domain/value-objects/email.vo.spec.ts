import { DomainError } from '../errors/domain.error';
import { Email } from './email.vo';

describe('Email value object', () => {
  it('normalizes to lowercase and trims', () => {
    expect(Email.create('  User@Example.COM ').value).toBe('user@example.com');
  });

  it('accepts a valid email', () => {
    expect(Email.create('a.b-c@domain.co').value).toBe('a.b-c@domain.co');
  });

  it('exposes the value via toString()', () => {
    expect(Email.create('a@b.com').toString()).toBe('a@b.com');
  });

  it.each(['', 'no-at', 'a@b', 'a@b.', '@domain.com', 'spa ce@x.com'])(
    'rejects invalid email "%s"',
    (raw) => {
      expect(() => Email.create(raw)).toThrow(DomainError);
    },
  );
});
