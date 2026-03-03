import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService, private jwt: JwtService) {}

  // Đăng ký người dùng qua email và mật khẩu
  async register(email: string, password: string, name?: string) {
    email = email.trim().toLowerCase();

    const exists = await this.prisma.user.findUnique({ where: { email } });
    if (exists) throw new BadRequestException('Email đã tồn tại');

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await this.prisma.user.create({
      data: {
        email,
        name: name?.trim() || null,
        passwordHash,
      },
      select: { id: true, email: true, name: true, createdAt: true },
    });

    return user;
  }

  // Đăng nhập người dùng qua email và mật khẩu
  async login(email: string, password: string) {
    email = email.trim().toLowerCase();

    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new UnauthorizedException('Sai email hoặc mật khẩu');

    if (!user.passwordHash) {
      throw new UnauthorizedException('Sai email hoặc mật khẩu');
    }
    
    const ok = await bcrypt.compare(password, user.passwordHash);    

    const token = await this.jwt.signAsync({
      sub: user.id, // id STRING
      email: user.email,
    });

    return {
      token,
      user: { id: user.id, email: user.email, name: user.name },
    };
  }

  // Đăng nhập qua Google
  async googleLogin(email: string) {
    email = email.trim().toLowerCase();

    let user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      user = await this.prisma.user.create({
        data: { email, name: '', passwordHash: '' }, // Mặc định không có mật khẩu
      });
    }

    const token = await this.jwt.signAsync({
      sub: user.id,
      email: user.email,
    });

    return {
      token,
      user: { id: user.id, email: user.email, name: user.name },
    };
  }

  // Đăng ký người dùng qua Google (mới)
  async googleRegister(email: string) {
    email = email.trim().toLowerCase();

    let user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      user = await this.prisma.user.create({
        data: { email, name: '', passwordHash: '' }, // Mặc định không có mật khẩu
      });
    }

    const token = await this.jwt.signAsync({
      sub: user.id,
      email: user.email,
    });

    return {
      token,
      user: { id: user.id, email: user.email, name: user.name },
    };
  }

  // Lấy thông tin người dùng
  async me(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId as any },
      select: { id: true, email: true, name: true, createdAt: true },
    });
  }
}
