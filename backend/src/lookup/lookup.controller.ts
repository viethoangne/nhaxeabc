import { Controller, Get, Query } from '@nestjs/common';
import { LookupService } from './lookup.service';
import { LookupQueryDto } from './dto/lookup-query.dto';

@Controller('lookup')
export class LookupController {
  constructor(private readonly lookupService: LookupService) {}

  @Get()
  async getTicketDetails(@Query() query: LookupQueryDto) {
    // File: backend/src/lookup/lookup.controller.ts
return this.lookupService.findTicket(query.orderCode, query.phone);
  }
}