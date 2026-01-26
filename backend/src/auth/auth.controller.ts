import { Body, Controller, Post } from '@nestjs/common';

@Controller('api/auth')
export class AuthController {

  @Post('login')
  login(@Body() body: { username: string; password: string }) {
    const { username, password } = body;

    // demo – sau này nối DB
    if (username === 'admin' && password === '123456') {
      return {
        success: true,
        user: {
          id: 1,
          username: 'admin',
          name: 'Quản trị viên',
        },
        token: 'demo-jwt-token',
      };
    }

    return {
      success: false,
      message: 'Sai tài khoản hoặc mật khẩu',
    };
  }
}
