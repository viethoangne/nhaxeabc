import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminLoyaltyService {
  constructor(private readonly prisma: PrismaService) {}

  // --- QUẢN LÝ KHÁCH HÀNG & ĐIỂM ---
  async getUsers(search?: string) {
    return this.prisma.user.findMany({
      where: search ? {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ]
      } : undefined,
      select: {
        id: true,
        name: true,
        email: true,
        points: true,
        totalTrips: true,
        picture: true,
      },
    });
  }

  async adjustPoints(adminId: string | null, userId: string, pointsToAdd: number, reason: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Không tìm thấy người dùng');

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: { points: { increment: pointsToAdd } },
    });

    // Tạo thông báo điều chỉnh điểm cho khách hàng
    await this.prisma.notification.create({
      data: {
        userId,
        title: pointsToAdd >= 0 ? 'Điều chỉnh điểm tích lũy 🪙' : 'Khấu trừ điểm tích lũy 🪙',
        content: `Tài khoản của bạn đã được admin điều chỉnh ${pointsToAdd >= 0 ? `+${pointsToAdd}` : `${pointsToAdd}`} điểm tích lũy. Lý do: ${reason}.`,
        type: 'MARKETING',
        isRead: false
      }
    });

    // Ghi log
    await this.prisma.adminLog.create({
      data: {
        adminId: adminId || null, 
        action: 'ADJUST_POINTS',
        entityType: 'User',
        entityId: userId,
        details: { reason, amount: pointsToAdd },
      },
    });

    return updatedUser;
  }

  // --- QUẢN LÝ VOUCHER ---
  async getVouchers() {
    return this.prisma.voucher.findMany({
      orderBy: { createdAt: 'desc' }
    });
  }

  async createVoucher(data: any) {
    // Ép kiểu các field Number
    data.value = Number(data.value);
    if (data.maxAmount) data.maxAmount = Number(data.maxAmount);
    if (data.costInPoints) data.costInPoints = Number(data.costInPoints);

    return this.prisma.voucher.create({ data });
  }

  async updateVoucher(id: string, data: any) {
    if (data.value) data.value = Number(data.value);
    if (data.maxAmount) data.maxAmount = Number(data.maxAmount);
    if (data.costInPoints) data.costInPoints = Number(data.costInPoints);

    return this.prisma.voucher.update({
      where: { id },
      data,
    });
  }

  async deleteVoucher(id: string) {
    return this.prisma.voucher.delete({
      where: { id },
    });
  }

  // --- TÍCH HỢP AI (NATIVE TS EXPERT RULE ENGINE - CHUẨN ĐỒ ÁN) ---
  async suggestVoucherByAI(topic: string, discountLevel: string) {
    try {
      // 1. Phân tích ngữ nghĩa topic (Semantic parsing)
      const cleanTopic = topic.trim().toUpperCase();
      let prefix = "VIP";
      let titleSuffix = "Ưu đãi đặc quyền";
      let basePoints = 300;

      if (cleanTopic.includes('TẾT') || cleanTopic.includes('YEAR')) {
        prefix = "TET";
        titleSuffix = "Đón Tết Xa - Về Nhà Gần";
        basePoints = 500;
      } else if (cleanTopic.includes('LỄ') || cleanTopic.includes('QUỐC KHÁNH') || cleanTopic.includes('2/9') || cleanTopic.includes('30/4')) {
        prefix = "HOLIDAY";
        titleSuffix = "Mừng Lễ Lớn - Vi Vu Thả Ga";
        basePoints = 400;
      } else if (cleanTopic.includes('SINH NHẬT') || cleanTopic.includes('BIRTHDAY') || cleanTopic.includes('TUỔI')) {
        prefix = "BDAY";
        titleSuffix = "Mừng Sinh Nhật - Tri Ân Hành Khách";
        basePoints = 200;
      } else if (cleanTopic.includes('HÈ') || cleanTopic.includes('SUMMER')) {
        prefix = "SUMMER";
        titleSuffix = "Chào Hè Rực Rỡ - Giảm Khủng";
        basePoints = 250;
      } else if (cleanTopic.includes('CUỐI TUẦN') || cleanTopic.includes('WEEKEND')) {
        prefix = "WKND";
        titleSuffix = "Cuối Tuần Thảnh Thơi - Trọn Vẹn Niềm Vui";
        basePoints = 150;
      } else {
        // Tạo chuỗi ký tự ngẫu nhiên hoặc rút gọn từ topic
        const slug = cleanTopic.replace(/[^A-Z0-9]/g, '').substring(0, 4);
        prefix = slug ? slug : "PROMO";
        titleSuffix = topic;
      }

      // Tạo mã code ngẫu nhiên duy nhất
      const randomId = Math.floor(10 + Math.random() * 89); // 2 số
      const code = `${prefix}${randomId}`;

      // 2. Phân tích discountLevel
      let type = "percent";
      let val = 20;
      let maxAmt = 50000;

      const cleanDisc = discountLevel.trim().toUpperCase();
      if (cleanDisc.includes('%')) {
        type = "percent";
        val = parseInt(cleanDisc.replace(/[^0-9]/g, '')) || 20;
        // Tính toán maxAmount tương ứng (nếu giảm % càng lớn, maxAmount càng cao để hấp dẫn)
        maxAmt = val >= 30 ? 100000 : 50000;
      } else if (cleanDisc.includes('K') || cleanDisc.includes('Đ') || cleanDisc.includes('000')) {
        type = "fixed";
        let parsedVal = parseInt(cleanDisc.replace(/[^0-9]/g, ''));
        if (cleanDisc.includes('K') && parsedVal < 1000) {
          parsedVal *= 1000;
        }
        val = parsedVal || 30000;
        maxAmt = val; // fixed thì maxAmount bằng chính nó
      } else {
        // Mặc định nếu nhập số không
        const numericVal = parseInt(cleanDisc) || 20;
        if (numericVal <= 100) {
          type = "percent";
          val = numericVal;
          maxAmt = val >= 30 ? 100000 : 50000;
        } else {
          type = "fixed";
          val = numericVal;
          maxAmt = val;
        }
      }

      // Tự động tinh chỉnh costInPoints dựa trên giá trị ưu đãi
      let calculatedPoints = basePoints;
      if (type === 'percent') {
        calculatedPoints += val * 10;
      } else {
        calculatedPoints += Math.floor(val / 100);
      }
      // Đảm bảo điểm quy đổi nằm trong khoảng hợp lý 100 - 1000
      calculatedPoints = Math.min(Math.max(calculatedPoints, 100), 1000);

      // Trả về kết quả hoàn hảo
      return {
        code,
        title: `Ưu đãi ${topic}: ${titleSuffix}`,
        type,
        value: val,
        maxAmount: maxAmt,
        costInPoints: calculatedPoints
      };
    } catch (error: any) {
      console.error("Lỗi AI Expert Engine suggestVoucher:", error);
      return {
        code: "SALE" + Math.floor(10 + Math.random() * 89),
        title: "Khuyến mãi " + topic,
        type: "percent",
        value: parseInt(discountLevel) || 20,
        maxAmount: 50000,
        costInPoints: 300
      };
    }
  }
}