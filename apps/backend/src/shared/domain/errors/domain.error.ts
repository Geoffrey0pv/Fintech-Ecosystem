/**
 * Base class for business-rule violations raised from the domain layer.
 * Mapped to HTTP 422 by the global exception filter.
 */
export class DomainError extends Error {
  constructor(
    message: string,
    public readonly code = 'DOMAIN_ERROR',
  ) {
    super(message);
    this.name = 'DomainError';
  }
}
