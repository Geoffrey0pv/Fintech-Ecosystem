import { Body, Controller, Get, HttpCode, Post, Req, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import { CookieOptions, Request, Response } from 'express';
import { CurrentUser } from '../../../shared/infrastructure/http/decorators/current-user.decorator';
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
} from '../../../shared/infrastructure/security/jwt-auth.guard';
import { Public } from '../../../shared/infrastructure/security/public.decorator';
import { TokenService } from '../../../shared/infrastructure/security/token.service';
import { AuthResult, AuthService, PublicUser } from '../application/auth.service';
import { LoginDto } from '../application/dto/login.dto';
import { RegisterDto } from '../application/dto/register.dto';

const REFRESH_PATH = '/api/v1/auth';

@Controller('auth')
export class AuthController {
  private readonly cookieSecure: boolean;

  constructor(
    private readonly authService: AuthService,
    private readonly tokenService: TokenService,
    config: ConfigService,
  ) {
    this.cookieSecure = config.get<string>('COOKIE_SECURE') === 'true';
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<PublicUser> {
    const result = await this.authService.register(dto);
    this.setAuthCookies(res, result);
    return result.user;
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(200)
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<PublicUser> {
    const result = await this.authService.login(dto);
    this.setAuthCookies(res, result);
    return result.user;
  }

  @Public()
  @HttpCode(200)
  @Post('refresh')
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<PublicUser> {
    const raw = req.cookies?.[REFRESH_TOKEN_COOKIE];
    const result = await this.authService.refresh(raw);
    this.setAuthCookies(res, result);
    return result.user;
  }

  @HttpCode(204)
  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<void> {
    await this.authService.logout(req.cookies?.[REFRESH_TOKEN_COOKIE]);
    res.clearCookie(ACCESS_TOKEN_COOKIE, this.cookieBase('/'));
    res.clearCookie(REFRESH_TOKEN_COOKIE, this.cookieBase(REFRESH_PATH));
  }

  @Get('me')
  me(@CurrentUser() userId: string): Promise<PublicUser> {
    return this.authService.me(userId);
  }

  private setAuthCookies(res: Response, result: AuthResult): void {
    res.cookie(ACCESS_TOKEN_COOKIE, result.accessToken, {
      ...this.cookieBase('/'),
      maxAge: this.tokenService.accessTtlSeconds * 1000,
    });
    res.cookie(REFRESH_TOKEN_COOKIE, result.refreshToken, {
      ...this.cookieBase(REFRESH_PATH),
      maxAge: this.tokenService.refreshTtlSeconds * 1000,
    });
  }

  private cookieBase(path: string): CookieOptions {
    return {
      httpOnly: true,
      secure: this.cookieSecure,
      sameSite: 'strict',
      path,
    };
  }
}
