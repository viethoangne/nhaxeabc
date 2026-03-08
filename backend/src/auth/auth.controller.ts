import { Body, Controller, Post, Get, Req, Res, UnauthorizedException, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import type { Request, Response } from 'express';
import { JwtAuthGuard } from './jwt-auth.guard';
import { CurrentUser } from './current-user.decorator';
import type { CurrentUserPayload } from './current-user.decorator';


@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() body: { email: string; password: string; name?: string }) {
    return this.authService.register(body.email, body.password, body.name);
  }

  @Post('login')
  async login(@Body() body: { email: string; password: string }, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.login(body.email, body.password);

    res.cookie('access_token', result.token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: false, // true khi deploy với HTTPS
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 ngày
    });

    return { user: result.user };
  }

  @Post('logout')
  async logout(@Req() _req: Request, @Res({ passthrough: true }) res: Response) {
    res.clearCookie('access_token');
    return { ok: true };
  }

  // ✅ CHUẨN NEST: dùng guard, không tự verify trong controller
  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@CurrentUser() user: CurrentUserPayload) {
    // user.userId đã là string từ JwtStrategy.validate()
    return this.authService.me(user.userId);
  }

  @Post('google-login')
  async googleLogin(
    @Body() body: { email: string; name?: string; picture?: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.googleLogin(body.email, body.name, body.picture);

    res.cookie('access_token', result.token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 ngày
    });

    return { user: result.user };
  }
}
