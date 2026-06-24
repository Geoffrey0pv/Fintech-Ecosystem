import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { resolveJwtKeys } from './jwt-keys';
import { TokenService } from './token.service';

function buildTokenService(): TokenService {
  const config = new ConfigService({
    NODE_ENV: 'test',
    ACCESS_TOKEN_TTL: 900,
    REFRESH_TOKEN_TTL: 604800,
  });
  const keys = resolveJwtKeys(config);
  const jwt = new JwtService({
    privateKey: keys.privateKey,
    publicKey: keys.publicKey,
    signOptions: { algorithm: 'RS256' },
    verifyOptions: { algorithms: ['RS256'] },
  });
  return new TokenService(jwt, config);
}

describe('TokenService', () => {
  const service = buildTokenService();

  it('signs and verifies an access token carrying the userId', () => {
    const token = service.signAccessToken('user-123');
    expect(service.verifyAccessToken(token).sub).toBe('user-123');
  });

  it('rejects a tampered/invalid token', () => {
    expect(() => service.verifyAccessToken('not-a-jwt')).toThrow();
  });

  it('produces a deterministic hash for a given refresh token', () => {
    const a = service.hashRefreshToken('abc');
    const b = service.hashRefreshToken('abc');
    expect(a).toBe(b);
    expect(a).not.toBe(service.hashRefreshToken('abd'));
  });

  it('generates a unique refresh token with a matching hash and future expiry', () => {
    const r1 = service.generateRefreshToken();
    const r2 = service.generateRefreshToken();
    expect(r1.token).not.toBe(r2.token);
    expect(r1.hash).toBe(service.hashRefreshToken(r1.token));
    expect(r1.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });
});
