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
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../../../shared/infrastructure/http/decorators/current-user.decorator';
import { MetaEnvelope } from '../../../shared/application/meta-envelope';
import {
  BalanceResponse,
  MovementResponse,
  MovementsService,
} from '../application/movements.service';
import { BalanceQueryDto } from '../application/dto/balance-query.dto';
import { CreateMovementDto } from '../application/dto/create-movement.dto';
import { QueryMovementsDto } from '../application/dto/query-movements.dto';
import { UpdateMovementDto } from '../application/dto/update-movement.dto';

@Controller('movements')
export class MovementsController {
  constructor(private readonly movements: MovementsService) {}

  @Post()
  create(@CurrentUser() userId: string, @Body() dto: CreateMovementDto): Promise<MovementResponse> {
    return this.movements.create(userId, dto);
  }

  @Get()
  list(
    @CurrentUser() userId: string,
    @Query() query: QueryMovementsDto,
  ): Promise<MetaEnvelope<MovementResponse[]>> {
    return this.movements.list(userId, query);
  }

  // Declared before ':id' so "balance" is not captured as an id.
  @Get('balance')
  balance(
    @CurrentUser() userId: string,
    @Query() query: BalanceQueryDto,
  ): Promise<BalanceResponse> {
    return this.movements.balance(userId, query);
  }

  @Get(':id')
  getById(
    @CurrentUser() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<MovementResponse> {
    return this.movements.getById(userId, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMovementDto,
  ): Promise<MovementResponse> {
    return this.movements.update(userId, id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@CurrentUser() userId: string, @Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.movements.remove(userId, id);
  }
}
