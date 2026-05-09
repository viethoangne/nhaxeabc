import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { PrismaService } from '../prisma/prisma.service'; // Đảm bảo đường dẫn này đúng với project của bạn

@Injectable()
export class ContactService {
  private readonly logger = new Logger(ContactService.name);

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService // Inject Prisma để dùng DB
  ) {}

  async handleContact(name: string, phone: string, email: string, message: string) {
    try {
      // 1. LƯU VÀO DATABASE TRƯỚC
      const savedContact = await this.prisma.contact.create({
        data: { name, phone, email, message }
      });

      this.logger.log(`✅ Đã lưu liên hệ từ ${name} vào DB (ID: ${savedContact.id})`);

      // 2. GỬI EMAIL THÔNG BÁO (Logic Resend hiện tại của bạn)
      const apiKey = this.configService.get<string>('RESEND_API_KEY');
      if (!apiKey) {
        this.logger.warn('RESEND_API_KEY thiếu, bỏ qua bước gửi mail.');
        return { success: true, db: savedContact, mail: 'skipped' };
      }

      const resend = new Resend(apiKey);
      const { data, error } = await resend.emails.send({
        from: 'Nha Xe ABC <onboarding@resend.dev>',
        to: ['hoanglop10237zz@gmail.com'],
        subject: `[Liên Hệ Mới] ${name} - ${phone}`,
        html: `
          <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h2 style="color: #F56A19;">Yêu cầu liên hệ mới</h2>
            <p><strong>Khách hàng:</strong> ${name}</p>
            <p><strong>SĐT:</strong> ${phone}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Nội dung:</strong> ${message}</p>
            <p style="font-size: 11px; color: #999;">Dữ liệu đã được lưu vào PostgreSQL hệ thống.</p>
          </div>
        `,
      });

      if (error) this.logger.error(`Resend Error: ${error.message}`);

      return { success: true, data: savedContact };

    } catch (e: any) {
      this.logger.error(`Lỗi xử lý liên hệ: ${e.message}`);
      throw new InternalServerErrorException('Không thể xử lý yêu cầu liên hệ.');
    }
  }
}