export const CATEGORY_REPOSITORY = Symbol('CATEGORY_REPOSITORY');

export interface CategoryEntity {
  id: string;
  name: string;
  createdAt: Date;
}

export interface CategoryRepositoryPort {
  create(userId: string, name: string): Promise<CategoryEntity>;
  findAllForUser(userId: string): Promise<CategoryEntity[]>;
  findByIdForUser(id: string, userId: string): Promise<CategoryEntity | null>;
  updateForUser(id: string, userId: string, name: string): Promise<CategoryEntity | null>;
  deleteForUser(id: string, userId: string): Promise<boolean>;
}
