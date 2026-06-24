import { INestApplication } from '@nestjs/common';
import { PrismaService } from '../../src/shared/infrastructure/prisma/prisma.service';
import { AuthedAgent, cleanDatabase, createTestApp, registerAgent } from './helpers/test-app';

describe('Categories, budgets & alerts (e2e)', () => {
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

  async function createCategory(agent: AuthedAgent, name: string): Promise<string> {
    const res = await agent.agent.post('/api/v1/categories').send({ name }).expect(201);
    return res.body.data.id;
  }

  it('creates a category and rejects duplicates with 409', async () => {
    await createCategory(alice, 'Alimentación');
    await alice.agent.post('/api/v1/categories').send({ name: 'Alimentación' }).expect(409);
  });

  it('sets a monthly budget and reports status', async () => {
    const categoryId = await createCategory(alice, 'Alimentación');
    await alice.agent
      .put(`/api/v1/categories/${categoryId}/budget`)
      .send({ amount: '800000', year: 2026, month: 6 })
      .expect(200);

    const status = await alice.agent
      .get(`/api/v1/categories/${categoryId}/budget`)
      .query({ year: 2026, month: 6 })
      .expect(200);

    expect(status.body.data).toMatchObject({
      budget: '800000.00',
      spent: '0.00',
      usagePercent: 0,
      alert: null,
    });
  });

  it('injects WARNING_80 and CRITICAL_100 alerts as expenses cross thresholds', async () => {
    const categoryId = await createCategory(alice, 'Alimentación');
    await alice.agent
      .put(`/api/v1/categories/${categoryId}/budget`)
      .send({ amount: '1000', year: 2026, month: 6 })
      .expect(200);

    const expense = (amount: string) =>
      alice.agent
        .post('/api/v1/movements')
        .send({
          type: 'EXPENSE',
          amount,
          description: 'gasto',
          categoryId,
          occurredAt: '2026-06-10',
        })
        .expect(201);

    // 70% -> no alert
    const r1 = await expense('700');
    expect(r1.body.meta.budgetAlerts).toHaveLength(0);

    // 85% -> WARNING_80
    const r2 = await expense('150');
    expect(r2.body.meta.budgetAlerts).toHaveLength(1);
    expect(r2.body.meta.budgetAlerts[0]).toMatchObject({ alert: 'WARNING_80', usagePercent: 85 });

    // 105% -> CRITICAL_100
    const r3 = await expense('200');
    expect(r3.body.meta.budgetAlerts[0]).toMatchObject({
      alert: 'CRITICAL_100',
      usagePercent: 105,
    });
  });

  it('does not alert for expenses in a different month', async () => {
    const categoryId = await createCategory(alice, 'Alimentación');
    await alice.agent
      .put(`/api/v1/categories/${categoryId}/budget`)
      .send({ amount: '1000', year: 2026, month: 6 })
      .expect(200);

    // Expense in July: no budget for that month -> no alert.
    const res = await alice.agent
      .post('/api/v1/movements')
      .send({
        type: 'EXPENSE',
        amount: '5000',
        description: 'julio',
        categoryId,
        occurredAt: '2026-07-10',
      })
      .expect(201);
    expect(res.body.meta.budgetAlerts).toHaveLength(0);
  });

  it('lists monthly status across categories', async () => {
    const food = await createCategory(alice, 'Alimentación');
    await createCategory(alice, 'Transporte');
    await alice.agent
      .put(`/api/v1/categories/${food}/budget`)
      .send({ amount: '1000', year: 2026, month: 6 })
      .expect(200);
    await alice.agent
      .post('/api/v1/movements')
      .send({
        type: 'EXPENSE',
        amount: '900',
        description: 'x',
        categoryId: food,
        occurredAt: '2026-06-10',
      })
      .expect(201);

    const res = await alice.agent
      .get('/api/v1/budgets/status')
      .query({ year: 2026, month: 6 })
      .expect(200);

    expect(res.body.data).toHaveLength(2);
    const foodStatus = res.body.data.find((c: { categoryId: string }) => c.categoryId === food);
    expect(foodStatus).toMatchObject({ spent: '900.00', usagePercent: 90, alert: 'WARNING_80' });
  });

  describe('isolation', () => {
    it('prevents setting a budget on another user category (404)', async () => {
      const bob = await registerAgent(app, prisma, 'bob@fintech.co');
      const bobCategory = await createCategory(bob, 'Bob Cat');

      await alice.agent
        .put(`/api/v1/categories/${bobCategory}/budget`)
        .send({ amount: '1000', year: 2026, month: 6 })
        .expect(404);
    });

    it('prevents reading another user category budget (404)', async () => {
      const bob = await registerAgent(app, prisma, 'bob2@fintech.co');
      const bobCategory = await createCategory(bob, 'Bob Cat');
      await alice.agent.get(`/api/v1/categories/${bobCategory}/budget`).expect(404);
    });
  });
});
