import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Providers } from '../components/providers';

export const metadata: Metadata = {
  title: 'Fintech Movements',
  description: 'Personal financial movements management (MVP)',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body
        style={{
          fontFamily: 'system-ui, sans-serif',
          margin: 0,
          background: '#0f172a',
          color: '#e2e8f0',
        }}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
