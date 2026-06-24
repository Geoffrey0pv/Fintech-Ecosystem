import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiFetch, ApiError } from './api-client';

function mockFetch(status: number, body: unknown) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response);
}

describe('apiFetch', () => {
  afterEach(() => vi.restoreAllMocks());

  it('sends cookies and appends defined query params', async () => {
    const fetchMock = mockFetch(200, { data: [], meta: null, error: null });
    vi.stubGlobal('fetch', fetchMock);

    await apiFetch('/movements', { query: { type: 'EXPENSE', page: 1, empty: '', skip: undefined } });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain('/movements?');
    expect(url).toContain('type=EXPENSE');
    expect(url).toContain('page=1');
    expect(url).not.toContain('empty=');
    expect(url).not.toContain('skip=');
    expect(init.credentials).toBe('include');
  });

  it('returns undefined data for 204 responses', async () => {
    vi.stubGlobal('fetch', mockFetch(204, undefined));
    const res = await apiFetch('/auth/logout', { method: 'POST' });
    expect(res.data).toBeUndefined();
  });

  it('throws ApiError when the envelope carries an error', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetch(401, { data: null, meta: null, error: { code: 'UNAUTHORIZED', message: 'nope' } }),
    );
    await expect(apiFetch('/auth/me')).rejects.toBeInstanceOf(ApiError);
  });
});
