// src/app.module.ts
import { Module } from '@nestjs/common';
import { ScheduleModule } from './schedule/schedule.module'; 
import { ScheduleModule as CronScheduleModule } from '@nestjs/schedule';
import { ChuyenXeModule } from './chuyen-xe/chuyen-xe.module';
import { PrismaModule } from './prisma/prisma.module';
import { PaymentModule } from './payment/payment.module';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { LookupModule } from './lookup/lookup.module'; // 1. Import LookupModule mới tạo
import { ContactModule } from './contact/contact.module'; // 1. Import module mới
import { HistoryModule } from './history/history.module'; // Thêm dòng này
import { LoyaltyModule } from './loyalty/loyalty.module'; // Thêm dòng này
import { CancelModule } from './cancel/cancel.module';
import { OtpModule } from './otp/otp.module';
import { ChatModule } from './chat/chat.module';
import { AdminDashboardModule } from './admin-dashboard/admin-dashboard.module';
import { AdminTripsModule } from './admin-trips/admin-trips.module'; // 🟢 1. THÊM DÒNG NÀY
import { AuditLogModule } from './audit-log/audit-log.module';
import { AdminOrdersModule } from './admin-orders/admin-orders.module';
import { AdminCustomersModule } from './admin-customers/admin-customers.module';
import { AdminLoyaltyModule } from './admin-loyalty/admin-loyalty.module';

@Module({
  imports: [
    AuthModule,
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    ChuyenXeModule,
    PaymentModule,
    ScheduleModule,
    LookupModule, // 2. Thêm vào mảng imports để NestJS kích hoạt các Route của Lookup
    ContactModule, // 2. Đưa vào đây
    HistoryModule, // Thêm dòng này
    LoyaltyModule,
    CronScheduleModule.forRoot(),
    CancelModule, // Thêm dòng này vào
    OtpModule, // <--- THÊM VÀO ĐÂY để kích hoạt Controller và Service của OTP
    ChatModule,
    AdminDashboardModule,
    AdminTripsModule, // 🟢 2. THÊM VÀO ĐÂY LÀ XONG!
    AuditLogModule,
    AdminOrdersModule,
    AdminCustomersModule,
    AdminLoyaltyModule
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}