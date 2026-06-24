import { DomainError } from '../errors/domain.error';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Email value object. Normalizes to lowercase so equality and uniqueness are
 * case-insensitive regardless of how it was typed (defense alongside DB citext).
 */
export class Email {
  private constructor(public readonly value: string) {}

  static create(raw: string): Email {
    const normalized = raw?.trim().toLowerCase();
    if (!normalized || !EMAIL_REGEX.test(normalized)) {
      throw new DomainError('Invalid email address', 'INVALID_EMAIL');
    }
    return new Email(normalized);
  }

  toString(): string {
    return this.value;
  }
}
