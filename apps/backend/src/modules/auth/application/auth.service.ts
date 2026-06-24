import { ConflictException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Email } from '../../../shared/domain/value-objects/email.vo';
import { TokenService } from '../../../shared/infrastructure/security/token.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { PASSWORD_HASHER, PasswordHasher } from './ports/password-hasher.port';
import {
  REFRESH_TOKEN_REPOSITORY,
  RefreshTokenRepositoryPort,
} from './ports/refresh-token.repository.port';
import { USER_REPOSITORY, UserRepositoryPort } from './ports/user.repository.port';

export interface PublicUser {
  id: string;
  email: string;
}

export interface AuthResult {
  user: PublicUser;
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepositoryPort,
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokens: RefreshTokenRepositoryPort,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasher,
    private readonly tokens: TokenService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResult> {
    const email = Email.create(dto.email).value;
    const existing = await this.users.findByEmail(email);
    if (existing) {
      throw new ConflictException('Email already registered');
    }
    const passwordHash = await this.hasher.hash(dto.password);
    const user = await this.users.create(email, passwordHash);
    return this.issueSession({ id: user.id, email: user.email }, randomUUID());
  }

  async login(dto: LoginDto): Promise<AuthResult> {
    const email = Email.create(dto.email).value;
    const user = await this.users.findByEmail(email);
    // Always run a verification to keep timing roughly constant and avoid
    // leaking whether the email exists.
    const passwordHash = user?.passwordHash ?? DUMMY_HASH;
    const valid = await this.hasher.verify(passwordHash, dto.password);
    if (!user || !valid) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return this.issueSession({ id: user.id, email: user.email }, randomUUID());
  }

  async refresh(rawRefreshToken: string | undefined): Promise<AuthResult> {
    if (!rawRefreshToken) {
      throw new UnauthorizedException('Missing refresh token');
    }
    const hash = this.tokens.hashRefreshToken(rawRefreshToken);
    const record = await this.refreshTokens.findByHash(hash);
    if (!record) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Reuse detection: a revoked token being presented means the family is
    // compromised -> revoke the whole family.
    if (record.revokedAt) {
      await this.refreshTokens.revokeFamily(record.familyId);
      throw new UnauthorizedException('Refresh token reuse detected');
    }
    if (record.expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException('Refresh token expired');
    }

    await this.refreshTokens.revokeById(record.id);
    const user = await this.users.findById(record.userId);
    if (!user) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    // Rotate within the same family.
    return this.issueSession({ id: user.id, email: user.email }, record.familyId);
  }

  async logout(rawRefreshToken: string | undefined): Promise<void> {
    if (!rawRefreshToken) {
      return;
    }
    const hash = this.tokens.hashRefreshToken(rawRefreshToken);
    const record = await this.refreshTokens.findByHash(hash);
    if (record) {
      await this.refreshTokens.revokeFamily(record.familyId);
    }
  }

  async me(userId: string): Promise<PublicUser> {
    const user = await this.users.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return { id: user.id, email: user.email };
  }

  private async issueSession(user: PublicUser, familyId: string): Promise<AuthResult> {
    const accessToken = this.tokens.signAccessToken(user.id);
    const refresh = this.tokens.generateRefreshToken();
    await this.refreshTokens.create({
      userId: user.id,
      tokenHash: refresh.hash,
      familyId,
      expiresAt: refresh.expiresAt,
    });
    return { user, accessToken, refreshToken: refresh.token };
  }
}

// Precomputed Argon2id hash of a random string; used to equalize login timing
// when the email does not exist. Never matches a real password.
const DUMMY_HASH =
  '$argon2id$v=19$m=19456,t=2,p=1$PoPUOiRb6LI4INyKeYrDFQ$2//E76Unu7WP/NDuDO4FOWjZXkKi+iAF4oxCQfcUEcI';
