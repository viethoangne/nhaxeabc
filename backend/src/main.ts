import cookieParser from 'cookie-parser';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Sử dụng cookie-parser để xử lý cookie
  app.use(cookieParser());

  // Cấu hình CORS để frontend có thể kết nối
  app.enableCors({
    origin: 'http://localhost:3000', // URL frontend
    credentials: true,                // Cho phép gửi cookie với yêu cầu
  });

  await app.listen(3001);
}
bootstrap();