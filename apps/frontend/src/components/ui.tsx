import type { CSSProperties, ReactNode } from 'react';

export const inputStyle: CSSProperties = {
  background: '#0b1222',
  color: '#e2e8f0',
  border: '1px solid #334155',
  borderRadius: 6,
  padding: '0.5rem 0.7rem',
  width: '100%',
  boxSizing: 'border-box',
};

export const buttonStyle: CSSProperties = {
  background: '#2563eb',
  color: 'white',
  border: 'none',
  borderRadius: 6,
  padding: '0.55rem 1rem',
  cursor: 'pointer',
  fontWeight: 600,
};

export const cardStyle: CSSProperties = {
  background: '#0b1222',
  border: '1px solid #1e293b',
  borderRadius: 10,
  padding: '1.2rem',
};

export function Card({ children, title }: { children: ReactNode; title?: string }) {
  return (
    <section style={{ ...cardStyle, marginBottom: '1.2rem' }}>
      {title ? <h2 style={{ marginTop: 0, fontSize: '1.05rem' }}>{title}</h2> : null}
      {children}
    </section>
  );
}

export function ErrorText({ message }: { message?: string }) {
  if (!message) return null;
  return <p style={{ color: '#f87171', margin: '0.5rem 0 0' }}>{message}</p>;
}
