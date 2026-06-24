import { INestApplication } from '@nestjs/common';
import { PrismaService } from '../../src/shared/infrastructure/prisma/prisma.service';
import { AuthedAgent, cleanDatabase, createTestApp, registerAgent } from './helpers/test-app';

describe('Movements (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let alice: AuthedAgent;

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
    alice = await registerAgent(app, prisma, 'alice@fintech.co');
  });

  it('creates an income movement and returns the amount as a string', async () => {
    const res = await alice.agent
      .post('/api/v1/movements')
      .send({
        type: 'INCOME',
        amount: '3200000.00',
        description: 'Salario',
        occurredAt: '2026-06-01',
      })
      .expect(201);
    expect(res.body.data.amount).toBe('3200000.00');
    expect(res.body.data.type).toBe('INCOME');
  });

  it('rejects an extra userId field (mass-assignment / tenant spoofing) with 400', async () => {
    await alice.agent
      .post('/api/v1/movements')
      .send({
        type: 'INCOME',
        amount: '100',
        description: 'x',
        occurredAt: '2026-06-01',
        userId: 'attacker',
      })
      .expect(400);
  });

  it.each([
    ['negative amount', { amount: '-5' }],
    ['zero amount', { amount: '0' }],
    ['too many decimals', { amount: '1.999' }],
  ])('rejects %s with 400', async (_label, override) => {
    await alice.agent
      .post('/api/v1/movements')
      .send({ type: 'EXPENSE', description: 'x', occurredAt: '2026-06-01', ...override })
      .expect(400);
  });

  it('paginates, sorts and filters by type and date range', async () => {
    const days = ['2026-06-01', '2026-06-10', '2026-06-20', '2026-07-01'];
    for (const [i, occurredAt] of days.entries()) {
      await alice.agent
        .post('/api/v1/movements')
        .send({
          type: i % 2 === 0 ? 'EXPENSE' : 'INCOME',
          amount: `${(i + 1) * 100}`,
          description: `m${i}`,
          occurredAt,
        })
        .expect(201);
    }

    // Filter EXPENSE within June only -> 2 items (2026-06-01, 2026-06-20).
    const res = await alice.agent
      .get('/api/v1/movements')
      .query({ type: 'EXPENSE', startDate: '2026-06-01', endDate: '2026-06-30', limit: 1, page: 1 })
      .expect(200);

    expect(res.body.meta.pagination.totalItems).toBe(2);
    expect(res.body.meta.pagination.totalPages).toBe(2);
    expect(res.body.data).toHaveLength(1);
  });

  it('rejects an inverted date range with 400', async () => {
    await alice.agent
      .get('/api/v1/movements')
      .query({ startDate: '2026-06-30', endDate: '2026-06-01' })
      .expect(400);
  });

  it('computes the net balance (income - expense)', async () => {
    await alice.agent
      .post('/api/v1/movements')
      .send({ type: 'INCOME', amount: '3200000', description: 'in', occurredAt: '2026-06-01' })
      .expect(201);
    await alice.agent
      .post('/api/v1/movements')
      .send({ type: 'EXPENSE', amount: '1850000', description: 'out', occurredAt: '2026-06-02' })
      .expect(201);

    const res = await alice.agent.get('/api/v1/movements/balance').expect(200);
    expect(res.body.data).toMatchObject({
      totalIncome: '3200000.00',
      totalExpense: '1850000.00',
      balance: '1350000.00',
      currency: 'COP',
    });
  });

  it('updates and deletes a movement owned by the user', async () => {
    const created = await alice.agent
      .post('/api/v1/movements')
      .send({ type: 'EXPENSE', amount: '100', description: 'orig', occurredAt: '2026-06-01' })
      .expect(201);
    const id = created.body.data.id;

    const updated = await alice.agent
      .patch(`/api/v1/movements/${id}`)
      .send({ description: 'updated', amount: '250.75' })
      .expect(200);
    expect(updated.body.data.description).toBe('updated');
    expect(updated.body.data.amount).toBe('250.75');

    await alice.agent.delete(`/api/v1/movements/${id}`).expect(204);
    await alice.agent.get(`/api/v1/movements/${id}`).expect(404);
  });

  describe('cross-user isolation (security, blocking)', () => {
    it('prevents reading, updating or deleting another user movement with a valid 3rd-party token', async () => {
      const bob = await registerAgent(app, prisma, 'bob@fintech.co');

      const aliceMovement = await alice.agent
        .post('/api/v1/movements')
        .send({
          type: 'INCOME',
          amount: '999999',
          description: 'alice-only',
          occurredAt: '2026-06-01',
        })
        .expect(201);
      const id = aliceMovement.body.data.id;

      // Bob has a valid session but must never reach Alice's data -> 404.
      await bob.agent.get(`/api/v1/movements/${id}`).expect(404);
      await bob.agent.patch(`/api/v1/movements/${id}`).send({ description: 'hacked' }).expect(404);
      await bob.agent.delete(`/api/v1/movements/${id}`).expect(404);

      // Bob's listing never includes Alice's movements.
      const bobList = await bob.agent.get('/api/v1/movements').expect(200);
      expect(bobList.body.data).toHaveLength(0);

      // Alice's movement is intact.
      await alice.agent.get(`/api/v1/movements/${id}`).expect(200);
    });

    it('prevents attaching a movement to another user category (404)', async () => {
      const bob = await registerAgent(app, prisma, 'bob2@fintech.co');
      const bobCategory = await prisma.category.create({
        data: { userId: bob.userId, name: 'Bob Secret' },
      });

      await alice.agent
        .post('/api/v1/movements')
        .send({
          type: 'EXPENSE',
          amount: '100',
          description: 'x',
          categoryId: bobCategory.id,
          occurredAt: '2026-06-01',
        })
        .expect(404);
    });
  });
});
