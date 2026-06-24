import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { validateEnv } from './config/env.validation';
import { HealthController } from './health.controller';
import { AuthModule } from './modules/auth/auth.module';
import { BudgetsModule } from './modules/budgets/budgets.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { MovementsModule } from './modules/movements/movements.module';
import { PrismaModule } from './shared/infrastructure/prisma/prisma.module';
import { JwtAuthGuard } from './shared/infrastructure/security/jwt-auth.guard';
import { SecurityModule } from './shared/infrastructure/security/security.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60_000, limit: 100 }],
      // Disable rate limiting under automated tests so suites can hammer endpoints.
      skipIf: () => process.env.NODE_ENV === 'test',
    }),
    PrismaModule,
    SecurityModule,
    AuthModule,
    CategoriesModule,
    BudgetsModule,
    MovementsModule,
  ],
  controllers: [HealthController],
  providers: [
    // Order matters: rate-limit first, then authenticate.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AppModule {}
