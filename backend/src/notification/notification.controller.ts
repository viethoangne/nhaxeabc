import { Controller, Get, Post, Body, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { NotificationService } from './notification.service';

@Controller('notification')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Post('token')
  @HttpCode(HttpStatus.OK)
  async registerToken(@Body() body: { userId: string; token: string }) {
    return this.notificationService.registerToken(body.userId, body.token);
  }

  @Get(':userId')
  async getUserNotifications(@Param('userId') userId: string) {
    return this.notificationService.getUserNotifications(userId);
  }

  @Post('read-all/:userId')
  @HttpCode(HttpStatus.OK)
  async markAllRead(@Param('userId') userId: string) {
    await this.notificationService.markAllRead(userId);
    return { success: true, message: 'All notifications marked as read' };
  }

  @Post('read/:userId/:id')
  @HttpCode(HttpStatus.OK)
  async markRead(@Param('userId') userId: string, @Param('id') id: string) {
    await this.notificationService.markRead(userId, id);
    return { success: true, message: 'Notification marked as read' };
  }

  @Post('delete/:userId/:id')
  @HttpCode(HttpStatus.OK)
  async deleteNotification(@Param('userId') userId: string, @Param('id') id: string) {
    await this.notificationService.deleteNotification(userId, id);
    return { success: true, message: 'Notification deleted successfully' };
  }

  // Debug/Test Endpoint to trigger a manual push notification
  @Post('test-push')
  @HttpCode(HttpStatus.OK)
  async testPush(@Body() body: { token: string; title: string; content: string }) {
    await this.notificationService.sendPushNotification(body.token, body.title, body.content);
    return { success: true, message: 'Test push notification sent' };
  }
}
