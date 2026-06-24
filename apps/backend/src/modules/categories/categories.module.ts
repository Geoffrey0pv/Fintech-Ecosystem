import { Module } from '@nestjs/common';
import { CategoriesService } from './application/categories.service';
import { CATEGORY_REPOSITORY } from './application/ports/category.repository.port';
import { CategoriesController } from './infrastructure/categories.controller';
import { PrismaCategoryRepository } from './infrastructure/persistence/prisma-category.repository';

@Module({
  controllers: [CategoriesController],
  providers: [
    CategoriesService,
    { provide: CATEGORY_REPOSITORY, useClass: PrismaCategoryRepository },
  ],
  exports: [CategoriesService],
})
export class CategoriesModule {}
