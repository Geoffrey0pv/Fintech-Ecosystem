import { PartialType } from '@nestjs/mapped-types';
import { CreateMovementDto } from './create-movement.dto';

/**
 * All fields optional for PATCH; same validation rules apply when present.
 */
export class UpdateMovementDto extends PartialType(CreateMovementDto) {}
