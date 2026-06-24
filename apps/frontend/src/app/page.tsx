import Link from 'next/link';

export default function HomePage() {
  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '4rem 1.5rem' }}>
      <h1>Fintech · Movimientos financieros</h1>
      <p>MVP del módulo de gestión de movimientos financieros personales.</p>
      <p>
        <Link href="/login" style={{ color: '#38bdf8' }}>
          Iniciar sesión
        </Link>{' '}
        ·{' '}
        <Link href="/register" style={{ color: '#38bdf8' }}>
          Registrarse
        </Link>
      </p>
    </main>
  );
}
