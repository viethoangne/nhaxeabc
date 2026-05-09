import { Controller, Post, Body, Get, Query, Delete } from '@nestjs/common'; // Thêm Delete
import { ChatService } from './chat.service';

@Controller('chat') // hoặc @Controller('chat') tùy hệ thống của bạn
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  async chat(@Body() body: { message: string; history: any[]; userId?: string }) {
    return this.chatService.handleChat(body.message, body.history, body.userId);
  }

  @Get('history')
  async getHistory(@Query('userId') userId: string) {
    if (!userId) return [];
    return this.chatService.getHistory(userId);
  }

  // THÊM ROUTE NÀY ĐỂ NHẬN YÊU CẦU XÓA TỪ FRONTEND
  @Delete('history')
  async deleteHistory(@Query('userId') userId: string) {
    return this.chatService.deleteHistory(userId);
  }
}