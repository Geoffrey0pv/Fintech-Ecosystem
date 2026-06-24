import { Module } from '@nestjs/common';
import { BUDGET_ALERT_PROVIDER } from '../../shared/application/ports/budget-alert.port';
import { CategoriesModule } from '../categories/categories.module';
import { BudgetsService } from './application/budgets.service';
import { BUDGET_REPOSITORY } from './application/ports/budget.repository.port';
import { BudgetsController } from './infrastructure/budgets.controller';
import { PrismaBudgetRepository } from './infrastructure/persistence/prisma-budget.repository';

@Module({
  imports: [CategoriesModule],
  controllers: [BudgetsController],
  providers: [
    BudgetsService,
    { provide: BUDGET_REPOSITORY, useClass: PrismaBudgetRepository },
    // Expose BudgetsService under the neutral alert-provider token for movements.
    { provide: BUDGET_ALERT_PROVIDER, useExisting: BudgetsService },
  ],
  exports: [BudgetsService, BUDGET_ALERT_PROVIDER],
})
export class BudgetsModule {}
