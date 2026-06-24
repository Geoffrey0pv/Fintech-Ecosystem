'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { useLogin } from '../../hooks/use-auth';
import { ApiError } from '../../lib/api-client';
import { buttonStyle, cardStyle, ErrorText, inputStyle } from '../../components/ui';

export default function LoginPage() {
  const login = useLogin();
  const router = useRouter();
  const [email, setEmail] = useState('demo@fintech.co');
  const [password, setPassword] = useState('Demo1234!');
  const [error, setError] = useState<string>();

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(undefined);
    try {
      await login.mutateAsync({ email, password });
      router.push('/movements');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error inesperado');
    }
  };

  return (
    <main style={{ maxWidth: 380, margin: '4rem auto', padding: '0 1rem' }}>
      <h1>Iniciar sesión</h1>
      <form onSubmit={onSubmit} style={{ ...cardStyle, display: 'grid', gap: '0.8rem' }}>
        <label>
          Correo
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={inputStyle}
            required
          />
        </label>
        <label>
          Contraseña
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={inputStyle}
            required
          />
        </label>
        <button type="submit" style={buttonStyle} disabled={login.isPending}>
          {login.isPending ? 'Entrando…' : 'Entrar'}
        </button>
        <ErrorText message={error} />
      </form>
      <p style={{ marginTop: '1rem' }}>
        ¿No tienes cuenta?{' '}
        <Link href="/register" style={{ color: '#38bdf8' }}>
          Regístrate
        </Link>
      </p>
    </main>
  );
}
