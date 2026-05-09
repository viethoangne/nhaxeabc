import { Controller, Post, Body } from '@nestjs/common';
import { ContactService } from './contact.service';

@Controller('contact')
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @Post()
async handleContact(
  @Body() body: { name: string; phone: string; email: string; message: string },
) {
  // Gọi hàm handleContact mới (bao gồm cả Lưu DB và Gửi Mail)
  return this.contactService.handleContact(
    body.name,
    body.phone,
    body.email,
    body.message,
  );
}
}