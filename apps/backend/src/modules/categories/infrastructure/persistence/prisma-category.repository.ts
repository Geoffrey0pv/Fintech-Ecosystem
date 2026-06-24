import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/prisma/prisma.service';
import {
  CategoryEntity,
  CategoryRepositoryPort,
} from '../../application/ports/category.repository.port';

@Injectable()
export class PrismaCategoryRepository implements CategoryRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  create(userId: string, name: string): Promise<CategoryEntity> {
    return this.prisma.category.create({
      data: { userId, name },
      select: { id: true, name: true, createdAt: true },
    });
  }

  findAllForUser(userId: string): Promise<CategoryEntity[]> {
    return this.prisma.category.findMany({
      where: { userId },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, createdAt: true },
    });
  }

  findByIdForUser(id: string, userId: string): Promise<CategoryEntity | null> {
    return this.prisma.category.findFirst({
      where: { id, userId },
      select: { id: true, name: true, createdAt: true },
    });
  }

  async updateForUser(id: string, userId: string, name: string): Promise<CategoryEntity | null> {
    const { count } = await this.prisma.category.updateMany({
      where: { id, userId },
      data: { name },
    });
    if (count === 0) {
      return null;
    }
    return this.findByIdForUser(id, userId);
  }

  async deleteForUser(id: string, userId: string): Promise<boolean> {
    const { count } = await this.prisma.category.deleteMany({ where: { id, userId } });
    return count > 0;
  }
}
