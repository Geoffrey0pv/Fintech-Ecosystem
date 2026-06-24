import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import { AppModule } from '../../../src/app.module';
import { AllExceptionsFilter } from '../../../src/shared/infrastructure/http/filters/all-exceptions.filter';
import { ResponseInterceptor } from '../../../src/shared/infrastructure/http/interceptors/response.interceptor';
import { PrismaService } from '../../../src/shared/infrastructure/prisma/prisma.service';

export interface TestContext {
  app: INestApplication;
  prisma: PrismaService;
}

/**
 * Boots the full application (real Prisma/PostgreSQL) configured exactly like
 * production (pipes, filters, interceptor, cookie parser). Rate limiting is
 * disabled so tests can make many requests from one IP.
 */
export async function createTestApp(): Promise<TestContext> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleRef.createNestApplication();
  app.use(cookieParser());
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalInterceptors(new ResponseInterceptor());
  app.useGlobalFilters(new AllExceptionsFilter());
  await app.init();

  const prisma = app.get(PrismaService);
  return { app, prisma };
}

export async function cleanDatabase(prisma: PrismaService): Promise<void> {
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "refresh_tokens","financial_movements","budgets","categories","users" RESTART IDENTITY CASCADE',
  );
}
