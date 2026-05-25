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
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER, // LẤY TỪ FILE .ENV
        pass: process.env.EMAIL_PASS, // LẤY TỪ FILE .ENV
      },
      // Force IPv4 because cloud environments (e.g. Railway) may block or lack IPv6 routing,
      // which triggers the ENETUNREACH socket connect error.
      family: 4,
      connectionTimeout: 5000,
    } as any);
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

  // THÊM MỚI: Hàm chuẩn đoán để kiểm tra kết nối SMTP
  async testSmtp() {
    const results: any = {};
    
    // Test 1: Port 465 (secure: true, family: 4)
    try {
      const t1 = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
        family: 4,
        connectionTimeout: 5000,
      } as any);
      await t1.verify();
      results.port465_v4 = 'SUCCESS';
    } catch (e: any) {
      results.port465_v4 = e.message || e.toString();
    }

    // Test 2: Port 587 (secure: false, family: 4)
    try {
      const t2 = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
        family: 4,
        connectionTimeout: 5000,
      } as any);
      await t2.verify();
      results.port587_v4 = 'SUCCESS';
    } catch (e: any) {
      results.port587_v4 = e.message || e.toString();
    }

    // Test 3: Port 465 (secure: true, no family option)
    try {
      const t3 = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
        connectionTimeout: 5000,
      } as any);
      await t3.verify();
      results.port465_default = 'SUCCESS';
    } catch (e: any) {
      results.port465_default = e.message || e.toString();
    }

    // Test 4: Port 587 (secure: false, no family option)
    try {
      const t4 = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
        connectionTimeout: 5000,
      } as any);
      await t4.verify();
      results.port587_default = 'SUCCESS';
    } catch (e: any) {
      results.port587_default = e.message || e.toString();
    }

    // Test 5 & 6: Resolving IP manually
    const dns = require('dns').promises;
    let ipv4List: string[] = [];
    try {
      ipv4List = await dns.resolve4('smtp.gmail.com');
      results.resolvedIpv4s = ipv4List;
    } catch (e: any) {
      results.resolvedIpv4s = 'FAILED: ' + (e.message || e.toString());
    }

    if (ipv4List.length > 0) {
      const ip = ipv4List[0];
      
      // Test 5: IP + Port 465 (secure: true, servername: 'smtp.gmail.com')
      try {
        const t5 = nodemailer.createTransport({
          host: ip,
          port: 465,
          secure: true,
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
          },
          tls: {
            servername: 'smtp.gmail.com'
          },
          connectionTimeout: 5000,
        } as any);
        await t5.verify();
        results.ip_port465 = 'SUCCESS';
      } catch (e: any) {
        results.ip_port465 = e.message || e.toString();
      }

      // Test 6: IP + Port 587 (secure: false, servername: 'smtp.gmail.com')
      try {
        const t6 = nodemailer.createTransport({
          host: ip,
          port: 587,
          secure: false,
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
          },
          tls: {
            servername: 'smtp.gmail.com'
          },
          connectionTimeout: 5000,
        } as any);
        await t6.verify();
        results.ip_port587 = 'SUCCESS';
      } catch (e: any) {
        results.ip_port587 = e.message || e.toString();
      }
    }

    return results;
  }
}