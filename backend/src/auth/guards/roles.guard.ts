import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service'; // 🟢 Thêm Prisma
import { ROLES_KEY } from './roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector, private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) return true; // Không yêu cầu quyền -> Cho qua

    const request = context.switchToHttp().getRequest();
    // 🟢 1. Lấy Thẻ thông hành từ Frontend gửi lên
    const userId = request.headers['x-user-id']; 

    if (!userId) {
      throw new ForbiddenException('Bảo mật: Không tìm thấy Thẻ thông hành (x-user-id)!');
    }

    // 🟢 2. Check Database xem user này là ai, quyền gì
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    
    if (!user || !user.role) {
      throw new ForbiddenException('Bảo mật: Tài khoản không tồn tại hoặc chưa phân quyền!');
    }

    // Gắn user vào request để hàm Ghi Log (AuditLog) phía sau biết ai đang thao tác
    request.user = user;

    // 🟢 3. Đối chiếu quyền
    const hasRole = requiredRoles.includes(user.role);
    if (!hasRole) {
      throw new ForbiddenException(`Bảo mật: Chỉ [${requiredRoles.join(', ')}] mới được truy cập. Bạn đang là [${user.role}].`);
    }

    return true; // Hợp lệ -> Mở cổng
  }
}