import { Controller, Get, Put, Post, Delete, Param, Body, UseGuards, Request, Query, Headers } from '@nestjs/common';
import { AdminTripsService } from './admin-trips.service';
import { Roles } from '../auth/guards/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';

@Controller('admin/trips')
@UseGuards(RolesGuard)
export class AdminTripsController {
  constructor(private readonly tripsService: AdminTripsService) {}

  // =======================================================
  // 1. CÁC API TĨNH - BẮT BUỘC ĐỂ TRÊN CÙNG
  // =======================================================

  @Get()
  @Roles('ADMIN', 'STAFF')
  async getAllTrips(@Query('date') date?: string) { 
    return this.tripsService.getAllTrips(date);
  }

  @Get('seed-resources')
  async seedResources() {
    await this.tripsService['prisma'].driver.createMany({
      data: [
        { name: 'Nguyễn Văn Long', phone: '0901111111', licenseNo: 'D-12345', status: 'AVAILABLE', driverCode: 'TX001', baseLocation: 'Cần Thơ' },
        { name: 'Trần Đại Quang', phone: '0902222222', licenseNo: 'E-67890', status: 'AVAILABLE', driverCode: 'TX002', baseLocation: 'Đà Lạt' },
        { name: 'Lê Hoàng Hải', phone: '0903333333', licenseNo: 'D-11223', status: 'AVAILABLE', driverCode: 'TX003', baseLocation: 'Sài Gòn' },
      ],
      skipDuplicates: true,
    });

    await this.tripsService['prisma'].bus.createMany({
      data: [
        { plateNumber: '51B-123.45', busType: '22 Cabin VIP', capacity: 22, status: 'READY', busCode: 'XE001' },
        { plateNumber: '65B-678.90', busType: '34 Giường Nằm', capacity: 34, status: 'READY', busCode: 'XE002' },
      ],
      skipDuplicates: true,
    });
    return { message: 'Đã nạp dữ liệu thành công!' };
  }

  @Get('seed-1000-drivers')
  async seed1000Drivers() {
    // 🟢 SỬA LẠI TÊN HÀM GỌI SERVICE Ở ĐÂY
    return this.tripsService.seed1000DriversAndBuses(); 
  }

  // 🟢 ĐÃ CẬP NHẬT: Nhận thêm Query 'status'
  @Get('drivers/paginated')
  @Roles('ADMIN', 'STAFF')
  async getDriversPaginated(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('routeCode') routeCode?: string,
    @Query('status') status?: string, // <-- THÊM DÒNG NÀY
    @Query('baseLocation') baseLocation?: string, // 🟢 THÊM QUERY NÀY
    @Query('busStatus') busStatus?: string // 🟢 1. BẠN BỔ SUNG DÒNG NÀY ĐỂ MỞ CỔNG NHẬN BIẾN
  ) {
    return this.tripsService.getDriversPaginated({
      page: Number(page),
      limit: Number(limit),
      search,
      routeCode,
      status, // <-- THÊM DÒNG NÀY
      baseLocation,
      busStatus // 🟢 2. TRUYỀN NÓ VÀO TRONG SERVICE TẠI ĐÂY LÀ XONG!
    });
  }

  @Get('drivers')
  async getAllDrivers() {
    return this.tripsService.getAllDrivers();
  }

  @Post('drivers')
  async createDriver(@Body() data: any) {
    return this.tripsService.createDriver(data);
  }

  // =======================================================
  // 2. CÁC API ĐỘNG (:id) CÓ HẬU TỐ
  // =======================================================

  @Get(':id/drivers/suggest')
  @Roles('ADMIN', 'STAFF')
  async getSuggestedDrivers(@Param('id') id: string) {
    return this.tripsService.getSuggestedDrivers(Number(id));
  }

  @Get(':id/buses/suggest')
  @Roles('ADMIN', 'STAFF')
  async getSuggestedBuses(@Param('id') id: string) {
    return this.tripsService.getSuggestedBuses(Number(id));
  }

  @Put(':id/assign')
  async assignTrip(
    @Param('id') id: string, 
    @Body() data: any,
    @Headers('x-user-id') adminId: string // 🟢 1. Lấy ID người dùng từ Header của Frontend gửi lên
  ) {
    // 🟢 2. Truyền thêm adminId vào làm tham số thứ 3
    return this.tripsService.assignTripResources(Number(id), data, adminId); 
  }

  @Post(':id/seats/lock')
  @Roles('ADMIN', 'STAFF')
  async toggleSeatLock(
    @Param('id') tripId: string,
    @Body('seatId') seatId: string,
    @Body('isLocked') isLocked: boolean,
    @Request() req: any
  ) {
    const adminId = req.headers['x-user-id'];
    return this.tripsService.toggleSeatLock(tripId, seatId, isLocked, adminId);
  }

  @Put(':id/status')
  @Roles('ADMIN', 'STAFF')
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: string,
    @Request() req: any
  ) {
    const currentUserId = req.headers['x-user-id'] || 'unknown-admin';
    return this.tripsService.updateStatus(id, status, currentUserId);
  }

  @Put('drivers/:id')
  async updateDriver(@Param('id') id: string, @Body() data: any) {
    return this.tripsService.updateDriver(Number(id), data);
  }

  @Delete('drivers/:id')
  async deleteDriver(@Param('id') id: string) {
    return this.tripsService.deleteDriver(Number(id));
  }
  @Get('fix-routes')
  async fixRoutes() {
    return this.tripsService.fixDriverRoutes();
  }
  // 🟢 THÊM API CẤP CỨU NÀY VÀO
  @Get('emergency-sync')
  async emergencySync() {
    return this.tripsService.emergencySyncSystem();
  }
  // 🟢 API KÍCH HOẠT XÓA TRẮNG DỮ LIỆU
  @Get('factory-reset')
  async factoryReset() {
    return this.tripsService.factoryResetDatabase();
  }
  // =======================================================
  // 3. API LẤY CHI TIẾT - ĐỂ DƯỚI CÙNG
  // =======================================================

  @Get(':id')
  @Roles('ADMIN', 'STAFF')
  async getTripDetail(@Param('id') id: string) {
    return this.tripsService.getTripDetail(id);
  }
  @Post('manual')
async createManual(@Body() data: any) {
  return this.tripsService.createManualTrip(data);
}
@Delete(':id')
  async removeTrip(
    @Param('id') id: string,
    @Headers('x-user-id') adminId: string
  ) {
    return this.tripsService.deleteTrip(Number(id), adminId);
  }
}