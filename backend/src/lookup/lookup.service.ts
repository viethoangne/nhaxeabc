import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LookupService {
  constructor(private prisma: PrismaService) {}

  async findTicket(orderCode: string, phone: string) {
    const ticket = await this.prisma.order.findUnique({
      where: { orderCode: orderCode },
      include: {
        seats: true,
        outboundTrip: true,
        returnTrip: true
      }
    });
  
    // Kiểm tra: Nếu không có vé HOẶC số điện thoại khách hàng không khớp
    if (!ticket || ticket.customerPhone !== phone) {
      throw new NotFoundException('Không tìm thấy vé');
    }
  
    return ticket;
  }
}