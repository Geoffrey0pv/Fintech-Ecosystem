import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import {
  CATEGORY_REPOSITORY,
  CategoryEntity,
  CategoryRepositoryPort,
} from './ports/category.repository.port';

export interface CategoryResponse {
  id: string;
  name: string;
  createdAt: string;
}

@Injectable()
export class CategoriesService {
  constructor(@Inject(CATEGORY_REPOSITORY) private readonly repo: CategoryRepositoryPort) {}

  async create(userId: string, dto: CreateCategoryDto): Promise<CategoryResponse> {
    // Uniqueness per user is enforced by a DB constraint -> P2002 -> 409.
    const entity = await this.repo.create(userId, dto.name.trim());
    return this.toResponse(entity);
  }

  async list(userId: string): Promise<CategoryResponse[]> {
    const entities = await this.repo.findAllForUser(userId);
    return entities.map((e) => this.toResponse(e));
  }

  async update(userId: string, id: string, dto: UpdateCategoryDto): Promise<CategoryResponse> {
    const name = dto.name?.trim();
    if (name === undefined) {
      const existing = await this.repo.findByIdForUser(id, userId);
      if (!existing) {
        throw new NotFoundException('Category not found');
      }
      return this.toResponse(existing);
    }
    const entity = await this.repo.updateForUser(id, userId, name);
    if (!entity) {
      throw new NotFoundException('Category not found');
    }
    return this.toResponse(entity);
  }

  /** Ensures the category exists and belongs to the user, or throws 404. */
  async assertOwnership(userId: string, id: string): Promise<CategoryResponse> {
    const entity = await this.repo.findByIdForUser(id, userId);
    if (!entity) {
      throw new NotFoundException('Category not found');
    }
    return this.toResponse(entity);
  }

  async remove(userId: string, id: string): Promise<void> {
    const deleted = await this.repo.deleteForUser(id, userId);
    if (!deleted) {
      throw new NotFoundException('Category not found');
    }
  }

  private toResponse(entity: CategoryEntity): CategoryResponse {
    return { id: entity.id, name: entity.name, createdAt: entity.createdAt.toISOString() };
  }
}
