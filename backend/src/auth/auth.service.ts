import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService, private jwt: JwtService) {}

  // Đăng ký người dùng
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
      select: { id: true, email: true, name: true, role: true, createdAt: true }, // 🟢 Thêm role ở đây
    });

    return user;
  }

  // Đăng nhập qua email và mật khẩu
  async login(email: string, password: string) {
    email = email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email } });
    
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Sai email hoặc mật khẩu');
    }
    
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Sai email hoặc mật khẩu');

    // 🟢 SỬA TẠI ĐÂY: Phải nhét role vào Token tương tự googleLogin
    const token = await this.jwt.signAsync({
      sub: user.id,
      email: user.email,
      role: user.role, // <-- CỰC KỲ QUAN TRỌNG
    });

    return {
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    };
  }

  // Đăng nhập / Đăng ký qua Google
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
        passwordHash: '', 
        role: 'CUSTOMER',
      },
    });

    const token = await this.jwt.signAsync({
      sub: user.id,
      email: user.email,
      role: user.role, // <-- ĐÃ CÓ (Chuẩn)
    });

    return {
      token,
      user: { 
        id: user.id, 
        email: user.email, 
        name: user.name, 
        picture: user.picture,
        role: user.role 
      },
    };
  }

  // Lấy thông tin người dùng hiện tại
  async me(userId: any) {
    const id = typeof userId === 'string' && !isNaN(Number(userId)) ? Number(userId) : userId;

    return this.prisma.user.findUnique({
      where: { id: id as any },
      select: { 
        id: true, 
        email: true, 
        name: true, 
        role: true,    // 🟢 CỰC KỲ QUAN TRỌNG: Phải lấy role để FE kiểm tra quyền khi F5
        picture: true, 
        createdAt: true 
      },
    });
  }
}