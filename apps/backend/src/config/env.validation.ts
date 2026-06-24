import { plainToInstance, Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Min, validateSync } from 'class-validator';

export enum NodeEnv {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

/**
 * Fail-fast validation of environment variables at boot.
 * A misconfigured financial service must never start silently.
 */
export class EnvironmentVariables {
  @IsEnum(NodeEnv)
  @IsOptional()
  NODE_ENV: NodeEnv = NodeEnv.Development;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  BACKEND_PORT = 4000;

  @IsString()
  DATABASE_URL!: string;

  @IsString()
  FRONTEND_URL = 'http://localhost:3000';

  // JWT_PRIVATE_KEY / JWT_PUBLIC_KEY are optional: when absent the TokenService
  // generates an ephemeral RS256 keypair for local/dev (documented in README).
  @IsString()
  @IsOptional()
  JWT_PRIVATE_KEY?: string;

  @IsString()
  @IsOptional()
  JWT_PUBLIC_KEY?: string;

  @Type(() => Number)
  @IsInt()
  @Min(60)
  @IsOptional()
  ACCESS_TOKEN_TTL = 900;

  @Type(() => Number)
  @IsInt()
  @Min(300)
  @IsOptional()
  REFRESH_TOKEN_TTL = 604800;

  // Whether auth cookies carry the Secure flag. Must be true behind HTTPS in
  // production; false for local http demos. Accepts 'true' / 'false'.
  @IsString()
  @IsOptional()
  COOKIE_SECURE = 'false';

  @IsString()
  @IsOptional()
  SEED_USER_EMAIL = 'demo@fintech.co';

  @IsString()
  @IsOptional()
  SEED_USER_PASSWORD = 'Demo1234!';
}

export function validateEnv(config: Record<string, unknown>): EnvironmentVariables {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validated, { skipMissingProperties: false });
  if (errors.length > 0) {
    throw new Error(`Invalid environment configuration:\n${errors.toString()}`);
  }
  return validated;
}
