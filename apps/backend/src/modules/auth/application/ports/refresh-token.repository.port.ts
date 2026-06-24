export const REFRESH_TOKEN_REPOSITORY = Symbol('REFRESH_TOKEN_REPOSITORY');

export interface RefreshTokenRecord {
  id: string;
  userId: string;
  tokenHash: string;
  familyId: string;
  revokedAt: Date | null;
  expiresAt: Date;
}

export interface RefreshTokenRepositoryPort {
  create(data: {
    userId: string;
    tokenHash: string;
    familyId: string;
    expiresAt: Date;
  }): Promise<RefreshTokenRecord>;
  findByHash(tokenHash: string): Promise<RefreshTokenRecord | null>;
  revokeById(id: string): Promise<void>;
  /** Revokes every active token in a rotation family (reuse detection). */
  revokeFamily(familyId: string): Promise<void>;
  /** Revokes all tokens for a user (logout-all / single logout). */
  revokeAllForUser(userId: string): Promise<void>;
}
