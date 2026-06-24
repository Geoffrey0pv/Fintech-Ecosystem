import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { CurrentUser } from '../../../shared/infrastructure/http/decorators/current-user.decorator';
import { CategoriesService, CategoryResponse } from '../application/categories.service';
import { CreateCategoryDto } from '../application/dto/create-category.dto';
import { UpdateCategoryDto } from '../application/dto/update-category.dto';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  @Post()
  create(@CurrentUser() userId: string, @Body() dto: CreateCategoryDto): Promise<CategoryResponse> {
    return this.categories.create(userId, dto);
  }

  @Get()
  list(@CurrentUser() userId: string): Promise<CategoryResponse[]> {
    return this.categories.list(userId);
  }

  @Patch(':id')
  update(
    @CurrentUser() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCategoryDto,
  ): Promise<CategoryResponse> {
    return this.categories.update(userId, id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@CurrentUser() userId: string, @Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.categories.remove(userId, id);
  }
}
