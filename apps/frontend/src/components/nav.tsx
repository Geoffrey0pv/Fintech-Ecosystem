'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLogout, useMe } from '../hooks/use-auth';

export function Nav() {
  const { data: user } = useMe();
  const logout = useLogout();
  const router = useRouter();

  const onLogout = async () => {
    await logout.mutateAsync();
    router.push('/login');
  };

  return (
    <nav
      style={{
        display: 'flex',
        gap: '1rem',
        alignItems: 'center',
        padding: '1rem 1.5rem',
        borderBottom: '1px solid #1e293b',
        background: '#0b1222',
      }}
    >
      <strong style={{ color: '#38bdf8' }}>Fintech</strong>
      <Link href="/movements" style={{ color: '#e2e8f0' }}>
        Movimientos
      </Link>
      <Link href="/budgets" style={{ color: '#e2e8f0' }}>
        Presupuestos
      </Link>
      <span style={{ marginLeft: 'auto', color: '#94a3b8' }}>{user?.email}</span>
      <button onClick={onLogout} disabled={logout.isPending} style={btnStyle}>
        Salir
      </button>
    </nav>
  );
}

const btnStyle: React.CSSProperties = {
  background: '#1e293b',
  color: '#e2e8f0',
  border: '1px solid #334155',
  borderRadius: 6,
  padding: '0.4rem 0.8rem',
  cursor: 'pointer',
};
