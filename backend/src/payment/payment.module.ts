import { Module } from '@nestjs/common';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { PrismaModule } from '../prisma/prisma.module';
import { MailerModule } from '@nestjs-modules/mailer';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { OtpModule } from '../otp/otp.module'; // 1. IMPORT ĐƯỜNG DẪN TỚI OTP MODULE

@Module({
  imports: [
    PrismaModule,
    OtpModule, // <--- THÊM VÀO ĐÂY LÀ XONG!
    // Cấu hình MailerModule đồng bộ với ConfigService để lấy biến môi trường
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (config: ConfigService) => ({
        transport: {
          host: 'smtp.gmail.com',
          port: 465,
          secure: true, // Cổng 465 yêu cầu secure: true (SSL)
          auth: {
            user: config.get<string>('MAIL_USER'), // hoanglop10237zz@gmail.com
            pass: config.get<string>('MAIL_PASS'), // xbmkqszcazhuwkss
          },
        },
        defaults: {
          from: `"NHÀ XE ABC" <${config.get<string>('MAIL_USER')}>`,
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [PaymentController],
  providers: [PaymentService],
  exports: [PaymentService], 
})
export class PaymentModule {}