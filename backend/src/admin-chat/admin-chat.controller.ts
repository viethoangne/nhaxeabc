import { Controller, Post, Body, UseGuards, Req, Get, Delete } from '@nestjs/common';
import { AdminChatService } from './admin-chat.service';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/guards/roles.decorator';

@Controller('admin/chat')
@UseGuards(RolesGuard)
export class AdminChatController {
  constructor(private readonly adminChatService: AdminChatService) {}

  @Post()
  @Roles('ADMIN') // Chỉ có ADMIN thực thụ mới có quyền kết nối
  async adminChat(
    @Body() body: { message: string; history: any[] },
    @Req() req: any
  ) {
    const adminId = req.headers['x-user-id']; // Lấy từ Header được kiểm duyệt qua RolesGuard
    const result = await this.adminChatService.handleAdminChat(body.message, body.history, adminId);
    return {
      success: true,
      data: result
    };
  }

  @Get('history')
  @Roles('ADMIN')
  async getHistory(@Req() req: any) {
    const adminId = req.headers['x-user-id'];
    const data = await this.adminChatService.getAdminHistory(adminId);
    return {
      success: true,
      data
    };
  }

  @Delete('history')
  @Roles('ADMIN')
  async deleteHistory(@Req() req: any) {
    const adminId = req.headers['x-user-id'];
    await this.adminChatService.deleteAdminHistory(adminId);
    return {
      success: true,
      message: 'Đã xóa lịch sử chat của Admin thành công'
    };
  }
}
