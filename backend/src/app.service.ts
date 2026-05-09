import { Injectable } from '@nestjs/common';
import i18next from './config/i18n'; // Import i18next

@Injectable()
export class AppService {
  getHello(): string {
    return i18next.t('greeting'); // Trả về thông điệp đã được dịch
  }
}