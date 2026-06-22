import { Controller, Post, Get, Param, Body, ParseIntPipe } from '@nestjs/common';
import { ReviewService } from './review.service';

@Controller('reviews')
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @Post()
  async create(
    @Body() body: {
      orderId: number;
      userId?: string;
      rating: number;
      tags?: string[];
      comment?: string;
    },
  ) {
    return this.reviewService.create(body);
  }

  @Get('check/:orderId')
  async check(@Param('orderId', ParseIntPipe) orderId: number) {
    return this.reviewService.checkByOrderId(orderId);
  }

  @Post('check-batch')
  async checkBatch(@Body() body: { orderIds: number[] }) {
    const reviewedIds = await this.reviewService.checkBatch(body.orderIds || []);
    return { reviewedIds };
  }

  @Get('user/:userId')
  async getByUser(@Param('userId') userId: string) {
    return this.reviewService.getByUserId(userId);
  }

  @Get('stats')
  async getStats() {
    return this.reviewService.getStats();
  }
}
