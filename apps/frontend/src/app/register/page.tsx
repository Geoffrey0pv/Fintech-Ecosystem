'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { useRegister } from '../../hooks/use-auth';
import { ApiError } from '../../lib/api-client';
import { buttonStyle, cardStyle, ErrorText, inputStyle } from '../../components/ui';

export default function RegisterPage() {
  const register = useRegister();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string>();

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(undefined);
    try {
      await register.mutateAsync({ email, password });
      router.push('/movements');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error inesperado');
    }
  };

  return (
    <main style={{ maxWidth: 380, margin: '4rem auto', padding: '0 1rem' }}>
      <h1>Crear cuenta</h1>
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
          Contraseña (mín. 10, mayúscula, minúscula y dígito)
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={inputStyle}
            required
          />
        </label>
        <button type="submit" style={buttonStyle} disabled={register.isPending}>
          {register.isPending ? 'Creando…' : 'Registrarme'}
        </button>
        <ErrorText message={error} />
      </form>
      <p style={{ marginTop: '1rem' }}>
        ¿Ya tienes cuenta?{' '}
        <Link href="/login" style={{ color: '#38bdf8' }}>
          Inicia sesión
        </Link>
      </p>
    </main>
  );
}
