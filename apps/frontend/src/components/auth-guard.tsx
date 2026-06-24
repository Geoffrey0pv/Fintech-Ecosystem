'use client';

import { useRouter } from 'next/navigation';
import { ReactNode, useEffect } from 'react';
import { useMe } from '../hooks/use-auth';
import { Nav } from './nav';

/**
 * Client-side route protection: verifies the session via /auth/me and redirects
 * unauthenticated users to /login. The API remains the source of truth.
 */
export function AuthGuard({ children }: { children: ReactNode }) {
  const { isLoading, isError } = useMe();
  const router = useRouter();

  useEffect(() => {
    if (isError) {
      router.replace('/login');
    }
  }, [isError, router]);

  if (isLoading) {
    return <main style={{ padding: '2rem' }}>Cargando…</main>;
  }
  if (isError) {
    return null;
  }

  return (
    <>
      <Nav />
      <main style={{ maxWidth: 980, margin: '0 auto', padding: '1.5rem' }}>{children}</main>
    </>
  );
}
