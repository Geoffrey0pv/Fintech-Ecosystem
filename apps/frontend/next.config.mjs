import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  // Trace from the monorepo root so the standalone bundle includes hoisted deps.
  outputFileTracingRoot: path.join(__dirname, '../../'),
};

export default nextConfig;
