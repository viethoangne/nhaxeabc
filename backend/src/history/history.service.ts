import { Injectable, NotFoundException } from '@nestjs/common';

@Injectable()
export class HistoryService {
  constructor(
    // Inject Database Service/Repository của bạn vào đây (Prisma, TypeORM, Mongoose...)
  ) {}

  async deleteHistoryRecord(id: string) {
    try {
      console.log(`Đang thực hiện xóa lịch sử có ID: ${id}`);

      // ==========================================
      // THỰC HIỆN XÓA TRONG DATABASE TẠI ĐÂY
      // ==========================================
      
      // Ví dụ Prisma:
      // await this.prisma.booking.delete({ where: { id } });

      return {
        success: true,
        message: 'Đã xóa lịch sử thành công!',
      };

    } catch (error) {
      console.error('Lỗi khi xóa lịch sử:', error);
      throw error; 
    }
  }
}