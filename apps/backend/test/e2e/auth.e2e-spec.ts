import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../src/shared/infrastructure/prisma/prisma.service';
import { cleanDatabase, createTestApp } from './helpers/test-app';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const credentials = { email: 'user@fintech.co', password: 'StrongPass1' };

  beforeAll(async () => {
    const ctx = await createTestApp();
    app = ctx.app;
    prisma = ctx.prisma;
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await cleanDatabase(prisma);
  });

  it('registers a user and sets HTTP-Only auth cookies', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send(credentials)
      .expect(201);

    expect(res.body.data.email).toBe(credentials.email);
    expect(res.body.error).toBeNull();
    const cookies = res.headers['set-cookie'] as unknown as string[];
    expect(cookies.some((c) => c.startsWith('access_token=') && /HttpOnly/i.test(c))).toBe(true);
    expect(cookies.some((c) => c.startsWith('refresh_token=') && /HttpOnly/i.test(c))).toBe(true);
  });

  it('rejects a duplicate email with 409', async () => {
    await request(app.getHttpServer()).post('/api/v1/auth/register').send(credentials).expect(201);
    await request(app.getHttpServer()).post('/api/v1/auth/register').send(credentials).expect(409);
  });

  it('rejects a weak password with 400', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email: 'weak@fintech.co', password: 'short' })
      .expect(400);
  });

  it('rejects unknown extra fields (e.g. userId injection) with 400', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ ...credentials, userId: 'attacker-supplied' })
      .expect(400);
  });

  it('logs in with valid credentials and rejects a wrong password', async () => {
    await request(app.getHttpServer()).post('/api/v1/auth/register').send(credentials).expect(201);

    await request(app.getHttpServer()).post('/api/v1/auth/login').send(credentials).expect(200);

    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: credentials.email, password: 'WrongPass99' })
      .expect(401);
  });

  it('does not reveal whether an unknown email exists (401)', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'ghost@fintech.co', password: 'StrongPass1' })
      .expect(401);
  });

  it('protects /auth/me and supports the full session lifecycle', async () => {
    const agent = request.agent(app.getHttpServer());

    // Unauthenticated access is rejected.
    await request(app.getHttpServer()).get('/api/v1/auth/me').expect(401);

    await agent.post('/api/v1/auth/register').send(credentials).expect(201);

    const me = await agent.get('/api/v1/auth/me').expect(200);
    expect(me.body.data.email).toBe(credentials.email);

    // Refresh rotates tokens and keeps the session valid.
    await agent.post('/api/v1/auth/refresh').expect(200);
    await agent.get('/api/v1/auth/me').expect(200);

    // Logout clears cookies; subsequent access is rejected.
    await agent.post('/api/v1/auth/logout').expect(204);
    await agent.get('/api/v1/auth/me').expect(401);
  });

  it('detects refresh-token reuse and revokes the family', async () => {
    const agent = request.agent(app.getHttpServer());
    const reg = await agent.post('/api/v1/auth/register').send(credentials).expect(201);

    // Capture the original refresh cookie before rotation.
    const originalCookies = reg.headers['set-cookie'] as unknown as string[];
    const refreshCookie = originalCookies.find((c) => c.startsWith('refresh_token='))!;

    // Rotate once (agent now holds the new refresh token).
    await agent.post('/api/v1/auth/refresh').expect(200);

    // Replaying the ORIGINAL (now revoked) refresh token is rejected.
    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('Cookie', refreshCookie)
      .expect(401);
  });
});
