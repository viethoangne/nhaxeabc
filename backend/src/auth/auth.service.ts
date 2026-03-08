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
    if (!ok) throw new UnauthorizedException('Sai email hoặc mật khẩu');

    const token = await this.jwt.signAsync({
      sub: user.id, // id STRING
      email: user.email,
    });

    return {
      token,
      user: { id: user.id, email: user.email, name: user.name },
    };
  }

  // Đăng nhập / Đăng ký qua Google (upsert)
  async googleLogin(email: string, name?: string, picture?: string) {
    email = email.trim().toLowerCase();

    const user = await this.prisma.user.upsert({
      where: { email },
      update: {
        ...(name && { name: name.trim() }),
        ...(picture && { picture }),
      },
      create: {
        email,
        name: name?.trim() || '',
        picture: picture || null,
      },
    });

    const token = await this.jwt.signAsync({
      sub: user.id,
      email: user.email,
    });

    return {
      token,
      user: { id: user.id, email: user.email, name: user.name, picture: user.picture },
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
