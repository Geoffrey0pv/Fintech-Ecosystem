import { Module } from '@nestjs/common';
import { BudgetsModule } from '../budgets/budgets.module';
import { MovementsService } from './application/movements.service';
import { MOVEMENT_REPOSITORY } from './application/ports/movement.repository.port';
import { MovementsController } from './infrastructure/movements.controller';
import { PrismaMovementRepository } from './infrastructure/persistence/prisma-movement.repository';

@Module({
  imports: [BudgetsModule], // provides BUDGET_ALERT_PROVIDER
  controllers: [MovementsController],
  providers: [
    MovementsService,
    { provide: MOVEMENT_REPOSITORY, useClass: PrismaMovementRepository },
  ],
  exports: [MovementsService],
})
export class MovementsModule {}
