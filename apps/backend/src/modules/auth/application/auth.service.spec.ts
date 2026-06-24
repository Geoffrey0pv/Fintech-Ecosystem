import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { TokenService } from '../../../shared/infrastructure/security/token.service';
import { AuthService } from './auth.service';
import { PasswordHasher } from './ports/password-hasher.port';
import {
  RefreshTokenRecord,
  RefreshTokenRepositoryPort,
} from './ports/refresh-token.repository.port';
import { UserRecord, UserRepositoryPort } from './ports/user.repository.port';

class InMemoryUserRepo implements UserRepositoryPort {
  private readonly byId = new Map<string, UserRecord>();

  async create(email: string, passwordHash: string): Promise<UserRecord> {
    const user: UserRecord = { id: randomUUID(), email, passwordHash };
    this.byId.set(user.id, user);
    return user;
  }
  async findByEmail(email: string): Promise<UserRecord | null> {
    return [...this.byId.values()].find((u) => u.email === email) ?? null;
  }
  async findById(id: string): Promise<UserRecord | null> {
    return this.byId.get(id) ?? null;
  }
}

class InMemoryRefreshRepo implements RefreshTokenRepositoryPort {
  records: RefreshTokenRecord[] = [];

  async create(data: {
    userId: string;
    tokenHash: string;
    familyId: string;
    expiresAt: Date;
  }): Promise<RefreshTokenRecord> {
    const record: RefreshTokenRecord = { id: randomUUID(), revokedAt: null, ...data };
    this.records.push(record);
    return record;
  }
  async findByHash(tokenHash: string): Promise<RefreshTokenRecord | null> {
    return this.records.find((r) => r.tokenHash === tokenHash) ?? null;
  }
  async revokeById(id: string): Promise<void> {
    const r = this.records.find((x) => x.id === id);
    if (r) r.revokedAt = new Date();
  }
  async revokeFamily(familyId: string): Promise<void> {
    this.records.filter((r) => r.familyId === familyId).forEach((r) => (r.revokedAt = new Date()));
  }
  async revokeAllForUser(userId: string): Promise<void> {
    this.records.filter((r) => r.userId === userId).forEach((r) => (r.revokedAt = new Date()));
  }
}

// Plain-text "hasher" for fast, deterministic unit tests.
const fakeHasher: PasswordHasher = {
  hash: async (plain) => `hashed:${plain}`,
  verify: async (hash, plain) => hash === `hashed:${plain}`,
};

function buildTokenServiceMock(): TokenService {
  let counter = 0;
  return {
    accessTtlSeconds: 900,
    refreshTtlSeconds: 604800,
    signAccessToken: (userId: string) => `access:${userId}`,
    hashRefreshToken: (token: string) => `h:${token}`,
    generateRefreshToken: () => {
      counter += 1;
      const token = `refresh-${counter}`;
      return { token, hash: `h:${token}`, expiresAt: new Date(Date.now() + 1_000_000) };
    },
    verifyAccessToken: () => ({ sub: 'x', type: 'access' as const }),
  } as unknown as TokenService;
}

describe('AuthService', () => {
  let users: InMemoryUserRepo;
  let refresh: InMemoryRefreshRepo;
  let service: AuthService;

  beforeEach(() => {
    users = new InMemoryUserRepo();
    refresh = new InMemoryRefreshRepo();
    service = new AuthService(users, refresh, fakeHasher, buildTokenServiceMock());
  });

  describe('register', () => {
    it('creates a user and issues a session', async () => {
      const result = await service.register({ email: 'New@User.com', password: 'StrongPass1' });
      expect(result.user.email).toBe('new@user.com');
      expect(result.accessToken).toBe(`access:${result.user.id}`);
      expect(result.refreshToken).toMatch(/^refresh-/);
      expect(refresh.records).toHaveLength(1);
    });

    it('rejects a duplicate email', async () => {
      await service.register({ email: 'dup@user.com', password: 'StrongPass1' });
      await expect(
        service.register({ email: 'dup@user.com', password: 'StrongPass1' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('login', () => {
    beforeEach(async () => {
      await service.register({ email: 'a@b.com', password: 'StrongPass1' });
    });

    it('succeeds with valid credentials', async () => {
      const result = await service.login({ email: 'a@b.com', password: 'StrongPass1' });
      expect(result.user.email).toBe('a@b.com');
    });

    it('fails with a wrong password', async () => {
      await expect(
        service.login({ email: 'a@b.com', password: 'WrongPass99' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('fails for an unknown email (no user enumeration)', async () => {
      await expect(
        service.login({ email: 'ghost@b.com', password: 'StrongPass1' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe('refresh', () => {
    it('rotates the refresh token keeping the family', async () => {
      const session = await service.register({ email: 'r@b.com', password: 'StrongPass1' });
      const familyId = refresh.records[0].familyId;

      const rotated = await service.refresh(session.refreshToken);

      expect(rotated.refreshToken).not.toBe(session.refreshToken);
      expect(refresh.records).toHaveLength(2);
      expect(refresh.records[1].familyId).toBe(familyId);
      expect(refresh.records[0].revokedAt).not.toBeNull(); // old one revoked
    });

    it('detects reuse of a revoked token and revokes the family', async () => {
      const session = await service.register({ email: 'reuse@b.com', password: 'StrongPass1' });
      await service.refresh(session.refreshToken); // first rotation revokes original

      await expect(service.refresh(session.refreshToken)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      // Whole family revoked -> the rotated token is also dead.
      expect(refresh.records.every((r) => r.revokedAt !== null)).toBe(true);
    });

    it('rejects an unknown refresh token', async () => {
      await expect(service.refresh('does-not-exist')).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rejects an expired refresh token', async () => {
      const session = await service.register({ email: 'exp@b.com', password: 'StrongPass1' });
      refresh.records[0].expiresAt = new Date(Date.now() - 1000);
      await expect(service.refresh(session.refreshToken)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });
  });

  describe('logout', () => {
    it('revokes the token family', async () => {
      const session = await service.register({ email: 'out@b.com', password: 'StrongPass1' });
      await service.logout(session.refreshToken);
      expect(refresh.records[0].revokedAt).not.toBeNull();
    });

    it('is a no-op without a token', async () => {
      await expect(service.logout(undefined)).resolves.toBeUndefined();
    });
  });

  describe('me', () => {
    it('returns the public user', async () => {
      const session = await service.register({ email: 'me@b.com', password: 'StrongPass1' });
      expect(await service.me(session.user.id)).toEqual({
        id: session.user.id,
        email: 'me@b.com',
      });
    });

    it('throws for an unknown user', async () => {
      await expect(service.me('missing')).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });
});
