import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Put, Query } from '@nestjs/common';
import { CurrentUser } from '../../../shared/infrastructure/http/decorators/current-user.decorator';
import { BudgetsService, BudgetStatus } from '../application/budgets.service';
import { BudgetStatusQueryDto } from '../application/dto/budget-status-query.dto';
import { UpsertBudgetDto } from '../application/dto/upsert-budget.dto';

@Controller()
export class BudgetsController {
  constructor(private readonly budgets: BudgetsService) {}

  @Put('categories/:categoryId/budget')
  @HttpCode(200)
  upsert(
    @CurrentUser() userId: string,
    @Param('categoryId', ParseUUIDPipe) categoryId: string,
    @Body() dto: UpsertBudgetDto,
  ): Promise<BudgetStatus> {
    return this.budgets.upsert(userId, categoryId, dto);
  }

  @Get('categories/:categoryId/budget')
  getCategoryStatus(
    @CurrentUser() userId: string,
    @Param('categoryId', ParseUUIDPipe) categoryId: string,
    @Query() query: BudgetStatusQueryDto,
  ): Promise<BudgetStatus> {
    return this.budgets.getCategoryStatus(userId, categoryId, query);
  }

  @Get('budgets/status')
  getMonthlyStatus(
    @CurrentUser() userId: string,
    @Query() query: BudgetStatusQueryDto,
  ): Promise<BudgetStatus[]> {
    return this.budgets.getMonthlyStatus(userId, query);
  }
}
