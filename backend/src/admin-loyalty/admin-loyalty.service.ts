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

  // --- TÍCH HỢP AI ---
  async suggestVoucherByAI(topic: string, discountLevel: string) {
    try {
      const { OpenAI } = require('openai');
      const groqKey = process.env.GROQ_API_KEY;
      const groq = new OpenAI({
        apiKey: groqKey?.trim(),
        baseURL: "https://api.groq.com/openai/v1",
      });

      const prompt = `Bạn là chuyên gia Marketing cho nhà xe ABC. 
Yêu cầu: Tạo ra MỘT mã giảm giá (voucher) hấp dẫn dựa trên chủ đề "${topic}" và mức giảm giá "${discountLevel}".
Trả về duy nhất dữ liệu dạng JSON hợp lệ, KHÔNG KÈM TEXT NÀO KHÁC (không được có markdown code block).
Cấu trúc JSON:
{
  "code": "Mã viết liền không dấu, in hoa, tối đa 10 ký tự, ví dụ: TET2024",
  "title": "Tiêu đề hấp dẫn ngắn gọn, ví dụ: Đón Tết Xa - Về Nhà Gần",
  "type": "fixed hoặc percent",
  "value": "Số tiền giảm (nếu type là fixed, ví dụ 50000) hoặc phần trăm giảm (ví dụ 20)",
  "maxAmount": "Số tiền giảm tối đa (nếu type là percent, ví dụ: 50000), nếu fixed thì bằng với value",
  "costInPoints": "Số điểm cần thiết để đổi voucher (từ 100 đến 1000 điểm)"
}`;

      const chatCompletion = await groq.chat.completions.create({
        messages: [{ role: "system", content: prompt }],
        model: "llama-3.1-8b-instant",
        temperature: 0.7,
      });

      const responseContent = chatCompletion.choices[0]?.message?.content || "";
      const jsonMatch = responseContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error("AI không trả về JSON hợp lệ.");
    } catch (error: any) {
      console.error("Lỗi AI suggestVoucher:", error);
      return {
        code: "SALE" + Math.floor(Math.random() * 1000),
        title: "Khuyến mãi " + topic,
        type: "percent",
        value: parseInt(discountLevel) || 10,
        maxAmount: 50000,
        costInPoints: 200
      };
    }
  }
}