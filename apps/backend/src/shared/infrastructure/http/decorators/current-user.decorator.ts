import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthenticatedRequest } from '../../security/jwt-auth.guard';

/**
 * Injects the authenticated user's id, sourced exclusively from the verified
 * JWT. This is the single source of identity for tenant isolation.
 */
export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): string => {
  const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
  return request.user.userId;
});
