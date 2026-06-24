import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes, randomUUID } from 'crypto';

export interface AccessTokenClaims {
  sub: string; // userId
  type: 'access';
}

/**
 * Issues short-lived RS256 access tokens and opaque, hashable refresh tokens.
 * Refresh tokens are random secrets (not JWTs); only their SHA-256 hash is stored,
 * enabling revocation and rotation-reuse detection (SPEC 3.1).
 */
@Injectable()
export class TokenService {
  private readonly accessTtl: number;
  private readonly refreshTtl: number;

  constructor(
    private readonly jwt: JwtService,
    config: ConfigService,
  ) {
    this.accessTtl = config.get<number>('ACCESS_TOKEN_TTL') ?? 900;
    this.refreshTtl = config.get<number>('REFRESH_TOKEN_TTL') ?? 604800;
  }

  get accessTtlSeconds(): number {
    return this.accessTtl;
  }

  get refreshTtlSeconds(): number {
    return this.refreshTtl;
  }

  signAccessToken(userId: string): string {
    return this.jwt.sign(
      { sub: userId, type: 'access' },
      { expiresIn: this.accessTtl, jwtid: randomUUID() },
    );
  }

  verifyAccessToken(token: string): AccessTokenClaims {
    try {
      const payload = this.jwt.verify<AccessTokenClaims>(token);
      if (payload.type !== 'access' || !payload.sub) {
        throw new UnauthorizedException('Invalid token');
      }
      return payload;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  /** Generates a new opaque refresh token and its storage hash. */
  generateRefreshToken(): { token: string; hash: string; expiresAt: Date } {
    const token = randomBytes(32).toString('hex');
    return {
      token,
      hash: this.hashRefreshToken(token),
      expiresAt: new Date(Date.now() + this.refreshTtl * 1000),
    };
  }

  hashRefreshToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
