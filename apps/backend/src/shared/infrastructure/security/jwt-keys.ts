import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { generateKeyPairSync } from 'crypto';

export interface JwtKeyPair {
  privateKey: string;
  publicKey: string;
}

/**
 * Resolves the RS256 key pair used to sign/verify access tokens.
 *
 * - Production: keys MUST be supplied via JWT_PRIVATE_KEY / JWT_PUBLIC_KEY
 *   (escaped newlines `\n` are restored).
 * - Dev/Test: if absent, an ephemeral 2048-bit key pair is generated so the app
 *   runs with zero key setup. Tokens become invalid on restart (documented).
 */
export function resolveJwtKeys(config: ConfigService): JwtKeyPair {
  const logger = new Logger('JwtKeys');
  const priv = config.get<string>('JWT_PRIVATE_KEY');
  const pub = config.get<string>('JWT_PUBLIC_KEY');

  if (priv && pub) {
    return {
      privateKey: priv.replace(/\\n/g, '\n'),
      publicKey: pub.replace(/\\n/g, '\n'),
    };
  }

  if (config.get<string>('NODE_ENV') === 'production') {
    // For real production deployments persistent keys MUST be supplied; otherwise
    // tokens are invalidated on every restart. We generate ephemeral keys so the
    // one-command demo runs, but warn loudly.
    logger.warn(
      'JWT_PRIVATE_KEY/JWT_PUBLIC_KEY not set in production: generating EPHEMERAL keys. ' +
        'Provide persistent keys for a real deployment.',
    );
  } else {
    logger.warn('No JWT keys provided; generating an ephemeral RS256 key pair (dev)');
  }
  const { privateKey, publicKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });
  return { privateKey, publicKey };
}
