import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

interface OtpData { code: string; expiresAt: number; }

@Injectable()
export class OtpService {
  private otpStore = new Map<string, OtpData>();
  
  // THÊM MỚI: Bộ nhớ lưu các email ĐÃ XÁC THỰC (Lưu trong 30 phút)
  private verifiedEmails = new Map<string, number>(); 
  
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER, // LẤY TỪ FILE .ENV
        pass: process.env.EMAIL_PASS, // LẤY TỪ FILE .ENV
      },
    });
  }

  async sendOtp(email: string) {
    if (!email) throw new BadRequestException('Vui lòng cung cấp email!');

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    this.otpStore.set(email, {
      code: otpCode,
      expiresAt: Date.now() + 5 * 60 * 1000, 
    });

    const mailOptions = {
      from: '"NHÀ XE ABC" <hoanglop10237zz@gmail.com>',
      to: email,
      subject: 'Mã xác thực OTP của bạn',
      html: `
        <div style="font-family: sans-serif; padding: 20px;">
          <h2>Xác thực Email đặt vé</h2>
          <p>Mã OTP của bạn là: <strong style="color: #ea580c; font-size: 24px;">${otpCode}</strong></p>
          <p>Mã này có hiệu lực trong 60 Giây.</p>
        </div>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      return { message: 'Gửi OTP thành công!' };
    } catch (error) {
      // THÊM DÒNG NÀY ĐỂ XEM LỖI NODEMAILER LÀ GÌ
      console.error('LỖI GỬI MAIL CHI TIẾT:', error); 
      throw new InternalServerErrorException('Không thể gửi email lúc này!');
    }
  }

  // HÀM MỚI: Dùng để xác thực ngay lập tức trên giao diện
  verifyOtpRightAway(email: string, otpToVerify: string) {
    const savedOtpData = this.otpStore.get(email);

    if (!savedOtpData) throw new BadRequestException('Mã OTP không tồn tại hoặc chưa được gửi!');
    if (Date.now() > savedOtpData.expiresAt) {
      this.otpStore.delete(email);
      throw new BadRequestException('Mã OTP đã hết hạn!');
    }
    if (savedOtpData.code !== otpToVerify) throw new BadRequestException('Mã OTP không chính xác!');

    // Nếu đúng -> Xóa mã đi và Đánh dấu là "Đã xác thực" trong 30 phút
    this.otpStore.delete(email);
    this.verifiedEmails.set(email, Date.now() + 30 * 60 * 1000); 

    return { success: true, message: 'Xác thực thành công!' };
  }

  // HÀM MỚI: Dùng cho module Thanh Toán kiểm tra xem email đã xác thực chưa
  isEmailVerified(email: string): boolean {
    const expireTime = this.verifiedEmails.get(email);
    if (!expireTime) return false;
    
    if (Date.now() > expireTime) {
      this.verifiedEmails.delete(email); // Hết 30 phút thì xóa
      return false;
    }
    return true; // Đã xác thực
  }
}