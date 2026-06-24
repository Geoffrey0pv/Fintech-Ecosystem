/**
 * Wrap a handler's return value when it must carry `meta` (pagination, budget
 * alerts, ...) in the standard API envelope. Handlers that don't need meta just
 * return their payload directly and the interceptor wraps it as { data, meta: null }.
 */
export class MetaEnvelope<T> {
  constructor(
    public readonly data: T,
    public readonly meta: Record<string, unknown> | null = null,
  ) {}
}
