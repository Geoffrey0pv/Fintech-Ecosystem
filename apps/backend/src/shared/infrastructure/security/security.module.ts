import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { JwtAuthGuard } from './jwt-auth.guard';
import { resolveJwtKeys } from './jwt-keys';
import { TokenService } from './token.service';

/**
 * Global security primitives: RS256 JWT signing/verification and the auth guard.
 * Exported so any module (and the global APP_GUARD) can consume them.
 */
@Global()
@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const keys = resolveJwtKeys(config);
        return {
          privateKey: keys.privateKey,
          publicKey: keys.publicKey,
          signOptions: { algorithm: 'RS256' },
          verifyOptions: { algorithms: ['RS256'] },
        };
      },
    }),
  ],
  providers: [TokenService, JwtAuthGuard],
  exports: [TokenService, JwtAuthGuard, JwtModule],
})
export class SecurityModule {}
