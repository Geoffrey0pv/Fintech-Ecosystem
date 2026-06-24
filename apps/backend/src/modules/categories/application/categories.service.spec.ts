import { NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { CategoriesService } from './categories.service';
import { CategoryEntity, CategoryRepositoryPort } from './ports/category.repository.port';

class InMemoryCategoryRepo implements CategoryRepositoryPort {
  rows: (CategoryEntity & { userId: string })[] = [];

  async create(userId: string, name: string): Promise<CategoryEntity> {
    const row = { id: randomUUID(), name, createdAt: new Date(), userId };
    this.rows.push(row);
    return row;
  }
  async findAllForUser(userId: string): Promise<CategoryEntity[]> {
    return this.rows.filter((r) => r.userId === userId);
  }
  async findByIdForUser(id: string, userId: string): Promise<CategoryEntity | null> {
    return this.rows.find((r) => r.id === id && r.userId === userId) ?? null;
  }
  async updateForUser(id: string, userId: string, name: string): Promise<CategoryEntity | null> {
    const row = this.rows.find((r) => r.id === id && r.userId === userId);
    if (!row) return null;
    row.name = name;
    return row;
  }
  async deleteForUser(id: string, userId: string): Promise<boolean> {
    const idx = this.rows.findIndex((r) => r.id === id && r.userId === userId);
    if (idx < 0) return false;
    this.rows.splice(idx, 1);
    return true;
  }
}

describe('CategoriesService', () => {
  let repo: InMemoryCategoryRepo;
  let service: CategoriesService;
  const userId = 'user-1';

  beforeEach(() => {
    repo = new InMemoryCategoryRepo();
    service = new CategoriesService(repo);
  });

  it('creates and trims the name', async () => {
    const res = await service.create(userId, { name: '  Food  ' });
    expect(res.name).toBe('Food');
  });

  it('lists only the user categories', async () => {
    await service.create(userId, { name: 'A' });
    await service.create('other', { name: 'B' });
    const list = await service.list(userId);
    expect(list).toHaveLength(1);
    expect(list[0].name).toBe('A');
  });

  it('updates the name', async () => {
    const created = await service.create(userId, { name: 'A' });
    const updated = await service.update(userId, created.id, { name: 'B' });
    expect(updated.name).toBe('B');
  });

  it('returns the existing category when update has no name', async () => {
    const created = await service.create(userId, { name: 'A' });
    const updated = await service.update(userId, created.id, {});
    expect(updated.name).toBe('A');
  });

  it('throws NotFound updating a missing/foreign category', async () => {
    await expect(service.update(userId, randomUUID(), { name: 'X' })).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(service.update(userId, randomUUID(), {})).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('removes an owned category and rejects foreign deletion', async () => {
    const created = await service.create(userId, { name: 'A' });
    await expect(service.remove(userId, created.id)).resolves.toBeUndefined();
    await expect(service.remove(userId, created.id)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('assertOwnership returns the category or throws', async () => {
    const created = await service.create(userId, { name: 'A' });
    await expect(service.assertOwnership(userId, created.id)).resolves.toMatchObject({ name: 'A' });
    await expect(service.assertOwnership('other', created.id)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
