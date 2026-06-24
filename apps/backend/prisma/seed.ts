import { PrismaClient, Prisma } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const email = (process.env.SEED_USER_EMAIL ?? 'demo@fintech.co').toLowerCase();
  const password = process.env.SEED_USER_PASSWORD ?? 'Demo1234!';
  const passwordHash = await argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, passwordHash },
  });
  console.log(`Seeded user: ${email}`);

  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth() + 1;

  const food = await prisma.category.upsert({
    where: { userId_name: { userId: user.id, name: 'Alimentación' } },
    update: {},
    create: { userId: user.id, name: 'Alimentación' },
  });
  const transport = await prisma.category.upsert({
    where: { userId_name: { userId: user.id, name: 'Transporte' } },
    update: {},
    create: { userId: user.id, name: 'Transporte' },
  });

  await prisma.budget.upsert({
    where: { categoryId_year_month: { categoryId: food.id, year, month } },
    update: { amount: new Prisma.Decimal('800000.00') },
    create: {
      userId: user.id,
      categoryId: food.id,
      amount: new Prisma.Decimal('800000.00'),
      year,
      month,
    },
  });
  await prisma.budget.upsert({
    where: { categoryId_year_month: { categoryId: transport.id, year, month } },
    update: { amount: new Prisma.Decimal('300000.00') },
    create: {
      userId: user.id,
      categoryId: transport.id,
      amount: new Prisma.Decimal('300000.00'),
      year,
      month,
    },
  });

  const existingMovements = await prisma.financialMovement.count({ where: { userId: user.id } });
  if (existingMovements === 0) {
    const day = (d: number) => new Date(Date.UTC(year, month - 1, d));
    await prisma.financialMovement.createMany({
      data: [
        {
          userId: user.id,
          type: 'INCOME',
          amount: new Prisma.Decimal('3200000.00'),
          description: 'Salario',
          occurredAt: day(1),
        },
        {
          userId: user.id,
          categoryId: food.id,
          type: 'EXPENSE',
          amount: new Prisma.Decimal('650000.00'),
          description: 'Mercado mensual',
          occurredAt: day(5),
        },
        {
          userId: user.id,
          categoryId: transport.id,
          type: 'EXPENSE',
          amount: new Prisma.Decimal('120000.00'),
          description: 'Transporte público',
          occurredAt: day(7),
        },
      ],
    });
    console.log('Seeded demo categories, budgets and movements');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
