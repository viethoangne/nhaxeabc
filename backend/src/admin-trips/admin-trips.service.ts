import { Injectable, NotFoundException, ConflictException, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { startOfDay, endOfDay } from 'date-fns';
import { AuditLogService } from '../audit-log/audit-log.service';
import { Cron, CronExpression } from '@nestjs/schedule'; // 🟢 BẮT BUỘC IMPORT CÁI NÀY

const STATIONS: Record<string, string> = {
  'Hà Nội': 'Bến xe Mỹ Đình',
  'TP. Hồ Chí Minh': 'Bến xe Miền Đông mới',
  'Đà Nẵng': 'Bến xe Trung tâm Đà Nẵng',
  'Nha Trang': 'Bến xe phía Nam Nha Trang',
  'Đà Lạt': 'Bến xe Liên tỉnh Đà Lạt',
  'Vũng Tàu': 'Bến xe Vũng Tàu',
  'Phan Thiết': 'Bến xe Phan Thiết',
  'Cần Thơ': 'Bến xe Trung tâm Cần Thơ',
};

const TIME_SLOTS = [
  '05:00:00', '06:00:00', '07:00:00', '08:00:00',
  '09:00:00', '10:00:00', '11:00:00', '12:00:00',
  '13:00:00', '14:00:00', '15:00:00', '16:00:00',
  '17:00:00', '18:00:00', '19:00:00', '20:00:00',
  '21:00:00', '22:00:00', '23:00:00', '24:00:00',
];

const ROUTES = [
  { a: 'Hà Nội', b: 'Đà Nẵng', distanceKm: 760, durationMinutes: 840 },
  { a: 'Hà Nội', b: 'TP. Hồ Chí Minh', distanceKm: 1700, durationMinutes: 1800 },
  { a: 'Hà Nội', b: 'Nha Trang', distanceKm: 1290, durationMinutes: 1440 },
  { a: 'Hà Nội', b: 'Đà Lạt', distanceKm: 1480, durationMinutes: 1600 },
  { a: 'Hà Nội', b: 'Vũng Tàu', distanceKm: 1750, durationMinutes: 1850 },
  { a: 'Hà Nội', b: 'Phan Thiết', distanceKm: 1540, durationMinutes: 1700 },
  { a: 'Hà Nội', b: 'Cần Thơ', distanceKm: 1870, durationMinutes: 1950 },

  { a: 'TP. Hồ Chí Minh', b: 'Đà Lạt', distanceKm: 310, durationMinutes: 390 },
  { a: 'TP. Hồ Chí Minh', b: 'Cần Thơ', distanceKm: 170, durationMinutes: 180 },
  { a: 'TP. Hồ Chí Minh', b: 'Vũng Tàu', distanceKm: 100, durationMinutes: 120 },
  { a: 'TP. Hồ Chí Minh', b: 'Nha Trang', distanceKm: 430, durationMinutes: 510 },
  { a: 'TP. Hồ Chí Minh', b: 'Đà Nẵng', distanceKm: 960, durationMinutes: 1080 },
  { a: 'TP. Hồ Chí Minh', b: 'Phan Thiết', distanceKm: 190, durationMinutes: 240 },

  { a: 'Đà Lạt', b: 'Nha Trang', distanceKm: 140, durationMinutes: 180 },
  { a: 'Đà Lạt', b: 'Đà Nẵng', distanceKm: 660, durationMinutes: 780 },
  { a: 'Đà Lạt', b: 'Vũng Tàu', distanceKm: 300, durationMinutes: 360 },
  { a: 'Đà Lạt', b: 'Phan Thiết', distanceKm: 160, durationMinutes: 210 },
  { a: 'Đà Lạt', b: 'Cần Thơ', distanceKm: 470, durationMinutes: 540 },

  { a: 'Nha Trang', b: 'Phan Thiết', distanceKm: 250, durationMinutes: 240 },
  { a: 'Nha Trang', b: 'Cần Thơ', distanceKm: 600, durationMinutes: 720 },
  { a: 'Nha Trang', b: 'Đà Nẵng', distanceKm: 530, durationMinutes: 630 },
  { a: 'Nha Trang', b: 'Vũng Tàu', distanceKm: 360, durationMinutes: 420 },

  { a: 'Cần Thơ', b: 'Đà Nẵng', distanceKm: 950, durationMinutes: 1080 },
  { a: 'Cần Thơ', b: 'Vũng Tàu', distanceKm: 220, durationMinutes: 240 },
  { a: 'Cần Thơ', b: 'Phan Thiết', distanceKm: 380, durationMinutes: 420 },

  { a: 'Đà Nẵng', b: 'Vũng Tàu', distanceKm: 870, durationMinutes: 1020 },
  { a: 'Đà Nẵng', b: 'Phan Thiết', distanceKm: 790, durationMinutes: 900 },

  { a: 'Vũng Tàu', b: 'Phan Thiết', distanceKm: 180, durationMinutes: 210 },
];

@Injectable()
export class AdminTripsService implements OnModuleInit {
  private readonly logger = new Logger('Bot-Dieu-Phoi');
  constructor(
    private prisma: PrismaService,
    private auditLogService: AuditLogService
  ) {}
  // 🟢 DÁN ĐOẠN NÀY VÀO: Hàm này sẽ tự động chạy 1 lần duy nhất ngay khi server Backend vừa bật lên
  async onModuleInit() {
    this.logger.log('⚡ Server vừa khởi động: Tiến hành rà soát và bù đắp thời gian thực...');
    
    // 1. Quét và gán tài xế cho các chuyến bị lỡ trước tiên (để có tài xế)
    await this.autoAssignUpcomingTrips();

    // 2. Quét và cập nhật trạng thái chuyến xe/tài xế bị lỡ trong lúc server tắt
    await this.autoUpdateRealtimeStatuses();
    
    this.logger.log('✅ Rà soát hoàn tất! Hệ thống đã bắt kịp thời gian thực.');
  }

  async getAllTrips(dateStr?: string) {
    const targetDate = dateStr ? new Date(dateStr) : new Date();
    return this.prisma.trip.findMany({
      where: {
        departDate: { gte: startOfDay(targetDate), lte: endOfDay(targetDate) },
      },
      include: {
        tickets: true, 
        _count: { select: { orderSeats: true } },
        // 🟢 BẮT BUỘC THÊM 2 DÒNG NÀY ĐỂ API TRẢ VỀ TÊN TÀI VÀ BIỂN SỐ
        driver: { select: { name: true } },
        bus: { select: { plateNumber: true } }
      },
      orderBy: { departDate: 'asc' },
    });
  }

  async updateStatus(id: string, status: string, adminId: string) {
    const tripId = Number(id);
    const trip = await this.prisma.trip.findUnique({ where: { id: tripId } });
    if (!trip) throw new NotFoundException('Không tìm thấy chuyến xe');
    return this.prisma.trip.update({
      where: { id: tripId },
      data: { status: status as any }
    });
  }

  async createManualTrip(data: any) {
    const { from, to, departDate, price } = data;
    const departDateObj = new Date(departDate);
    const now = new Date();
  
    // 1. ĐIỀU KIỆN: Chỉ tạo trước giờ khởi hành ít nhất 48 tiếng
    const fortyEightHoursInMs = 48 * 60 * 60 * 1000;
    if (departDateObj.getTime() - now.getTime() < fortyEightHoursInMs) {
      throw new Error('Chỉ được phép tạo chuyến xe thủ công trước giờ khởi hành ít nhất 48 tiếng.');
    }
  
    // 2. TÌM KIẾM THÔNG TIN TUYẾN (Distance & Duration)
    const routeInfo = ROUTES.find(r => 
      (r.a === from && r.b === to) || (r.a === to && r.b === from)
    );
  
    if (!routeInfo) throw new Error('Tuyến đường này hiện chưa được hỗ trợ vận tải.');
  
    // 3. KIỂM TRA TRÙNG LẶP (Duplicate Check)
    const existingTrip = await this.prisma.trip.findFirst({
      where: { from, to, departDate: departDateObj, status: { not: 'CANCELLED' } }
    });
    if (existingTrip) throw new Error('Đã có chuyến xe chạy cùng giờ trên tuyến này.');
  
    // 4. TÍNH TOÁN DỮ LIỆU ĐẾN (Arrival Date)
    const arrivalDate = new Date(departDateObj.getTime() + routeInfo.durationMinutes * 60000);
  
    // 5. TẠO CHUYẾN
    return this.prisma.trip.create({
      data: {
        from,
        to,
        departDate: departDateObj,
        arrivalDate,
        distanceKm: routeInfo.distanceKm,
        durationMinutes: routeInfo.durationMinutes,
        pickupPoint: STATIONS[from as keyof typeof STATIONS] || 'Đang cập nhật',
        dropoffPoint: STATIONS[to as keyof typeof STATIONS] || 'Đang cập nhật',
        busType: 'Limousine 22 phòng',
        price: price || 100000,
        status: 'PUBLISHED'
      }
    });
  }
  async getTripDetail(id: string) {
    const tripId = Number(id);
    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        driver: true, 
        bus: true,    
        outboundOrders: {
          where: { bookingStatus: { in: ['CONFIRMED', 'COMPLETED'] } },
          include: { seats: true } // 🟢 BẮT BUỘC THÊM DÒNG NÀY ĐỂ LẤY GHẾ
        }
      }
    });
    if (!trip) throw new NotFoundException('Không tìm thấy chuyến xe');
    return trip;
  }

  async toggleSeatLock(tripIdStr: string, seatId: string, isLocked: boolean, adminId: string) {
    const tripId = Number(tripIdStr);
    const trip = await this.prisma.trip.findUnique({ where: { id: tripId } });
    if (!trip) throw new NotFoundException('Không tìm thấy chuyến');
    
    let lockedSeats = Array.isArray((trip as any).lockedSeats) ? [...(trip as any).lockedSeats] : [];
    if (isLocked) {
      if (!lockedSeats.includes(seatId)) lockedSeats.push(seatId);
    } else {
      lockedSeats = lockedSeats.filter(s => s !== seatId);
    }
    await this.prisma.trip.update({
      where: { id: tripId },
      data: { lockedSeats: lockedSeats as any } 
    });
    return { success: true, lockedSeats };
  }

  // --- BỘ NÃO ĐIỀU PHỐI (DISPATCH ENGINE) ---

  // Trong src/admin-trips/admin-trips.service.ts

  async getSuggestedDrivers(tripId: number) {
    const trip = await this.prisma.trip.findUnique({ where: { id: tripId } });
    if (!trip) throw new NotFoundException('Không tìm thấy chuyến xe');

    // 1. TÍNH TOÁN QUỸ THỜI GIAN "GẮT"
    const PREP_TIME = 30 * 60 * 1000; // 30 phút chuẩn bị trước khi xe chạy
    const REST_TIME = 2 * 60 * 60 * 1000; // Bắt buộc nghỉ 2 tiếng sau khi xe đến nơi
    const tripDuration = (trip.durationMinutes || 240) * 60000; // Thời gian chạy (mặc định 4h nếu ko có)

    // Khung giờ mà tài xế BẮT BUỘC PHẢI TRỐNG LỊCH cho chuyến này
    const requiredStartTime = new Date(trip.departDate.getTime() - PREP_TIME);
    const requiredEndTime = new Date(trip.departDate.getTime() + tripDuration + REST_TIME);
    const forwardRoute = `${trip.from} ➔ ${trip.to}`;
    const backwardRoute = `${trip.to} ➔ ${trip.from}`;
    

    // 2. QUERY TÌM TÀI XẾ ĐỦ ĐIỀU KIỆN
    return this.prisma.driver.findMany({
      where: {
        status: 'AVAILABLE',
        
        // 🟢 ĐIỀU KIỆN 1: Tài xế phải thuộc biên chế của cặp tuyến này
        OR: [
          { routeCode: forwardRoute },
          { routeCode: backwardRoute },
          { routeCode: 'ALL' }
        ],

        // 🟢 ĐIỀU KIỆN 2: Xe của tài xế đó HIỆN TẠI đang đậu ở bến xuất phát của chuyến đi
        defaultBus: {
          currentLocation: trip.from
        },

        // ĐIỀU KIỆN 3: Chống đụng lịch (GIỮ NGUYÊN CODE CŨ CỦA BẠN TỪ ĐOẠN NÀY...)
        assignments: {
          none: {
            status: { not: 'CANCELLED' }, 
            tripId: { not: tripId },
            AND: [
              // Logic check đụng giờ: Chuyến cũ bắt đầu trước khi chuyến mới kết thúc, 
              // VÀ Chuyến cũ kết thúc sau khi chuyến mới bắt đầu
              { startTime: { lt: requiredEndTime } },
              { endTime: { gt: requiredStartTime } }
            ]
          }
        }
      },
      select: {
        id: true,
        driverCode: true,
        name: true,
        phone: true,
        baseLocation: true,
        routeCode: true,
        defaultBusId: true // 🟢 BẠN THÊM DÒNG NÀY VÀO LÀ XONG!
      },
      orderBy: {
        createdAt: 'asc' // Ưu tiên những tài xế cũ/hoạt động lâu
      }
    });
    
  }
  async getSuggestedBuses(tripId: number) {
    const trip = await this.prisma.trip.findUnique({ where: { id: tripId } });
    if (!trip) throw new NotFoundException('Không tìm thấy chuyến xe');

    // 🟢 TẠO CẶP TUYẾN 2 CHIỀU BẰNG TÊN ĐẦY ĐỦ (Bỏ hẳn logic getCode viết tắt cũ)
    const forwardRoute = `${trip.from} ➔ ${trip.to}`;
    const backwardRoute = `${trip.to} ➔ ${trip.from}`;

    // Tính toán thời gian chuẩn bị và thời gian đến
    const PREP_TIME_MS = 30 * 60 * 1000; 
    const startTime = new Date(trip.departDate.getTime() - PREP_TIME_MS);
    const arrivalTime = trip.arrivalDate || new Date(trip.departDate.getTime() + (trip.durationMinutes * 60000));

    return this.prisma.bus.findMany({
      where: {
        status: 'READY',
        
        // 🟢 ĐIỀU KIỆN 1: Xe hiện tại bắt buộc phải đang đậu ở Bến xuất phát
        currentLocation: trip.from,

        // 🟢 ĐIỀU KIỆN 2: Xe thuộc biên chế của tuyến này (Chạy được cả chiều đi và về)
        OR: [
          { routeCode: forwardRoute },
          { routeCode: backwardRoute },
          { routeCode: 'ALL' } // Hoặc là xe tăng cường chạy mọi tuyến
        ],

        // 🟢 ĐIỀU KIỆN 3: Thuật toán chống đụng giờ (Không xếp xe đang có lịch chạy chuyến khác)
        trips: {
          none: {
            id: { not: tripId }, // Bỏ qua chính chuyến xe đang mở để tránh tự đụng chính mình
            AND: [
              { departDate: { lt: arrivalTime } },
              { OR: [{ arrivalDate: { gt: startTime } }, { departDate: { gt: startTime } }] }
            ]
          }
        }
      },
      select: { id: true, busCode: true, plateNumber: true, busType: true, capacity: true }
    });
  }
  // 🔴 Đã sửa lỗi cú pháp: Xóa chữ "function" ở đây
  async assignTripResources(tripId: number, data: { driverId?: number, busId?: number, price?: number, status?: string }, adminId: string) {
    const trip = await this.prisma.trip.findUnique({ where: { id: tripId } });
    if (!trip) throw new NotFoundException('Không tìm thấy chuyến xe');

    // 🟢 THÊM LOGIC CHẶN GÁN TÀI XẾ KHI XE ĐÃ CHẠY HOẶC HOÀN THÀNH
    if (trip.status === 'RUNNING' || trip.status === 'COMPLETED') {
      throw new ConflictException('Không thể thay đổi tài xế/xe cho chuyến đi đã khởi hành hoặc hoàn thành.');
    }

    const PREP_TIME_MS = 30 * 60 * 1000;
    const REST_TIME_MS = 2 * 60 * 60 * 1000; // 2 tiếng nghỉ ngơi bắt buộc
    
    const startTime = new Date(trip.departDate.getTime() - PREP_TIME_MS);
    const arrivalTime = trip.arrivalDate || new Date(trip.departDate.getTime() + (trip.durationMinutes * 60000));
    const safeEndTime = new Date(arrivalTime.getTime() + REST_TIME_MS);
  
    // Dùng Interactive Transaction để lock dữ liệu
    return this.prisma.$transaction(async (tx) => {
      // 1. KIỂM TRA GẮT: Tài xế có bị ai khác lấy mất trong tích tắc không?
      if (data.driverId) {
        const conflictingAssignment = await tx.driverAssignment.findFirst({
          where: {
            driverId: Number(data.driverId),
            status: { not: 'CANCELLED' },
            tripId: { not: tripId }, // Bỏ qua chuyến hiện tại nếu đang re-assign
            AND: [
              { startTime: { lt: safeEndTime } },
              { endTime: { gt: startTime } }
            ]
          }
        });
  
        if (conflictingAssignment) {
          throw new ConflictException(`Lỗi điều phối: Tài xế này đã được phân công cho chuyến xe khác chồng chéo thời gian!`);
        }
      }
  
      // 2. Cập nhật Trip
      const updatedTrip = await tx.trip.update({
        where: { id: tripId },
        data: {
          busId: data.busId ? Number(data.busId) : null,
          driverId: data.driverId ? Number(data.driverId) : null,
          price: data.price ? Number(data.price) : undefined,
          status: data.status as any,
        }
      });
  
      // 3. Cập nhật Bảng Phân Công (DriverAssignment)
      if (data.driverId) {
        await tx.driverAssignment.upsert({
          where: { tripId: tripId },
          update: { 
            driverId: Number(data.driverId), 
            startTime, 
            endTime: arrivalTime,
            status: 'ASSIGNED'
          },
          create: {
            tripId: tripId,
            driverId: Number(data.driverId),
            startTime: startTime,
            endTime: arrivalTime,
            status: 'ASSIGNED'
          }
        });
      } else {
        await tx.driverAssignment.deleteMany({ where: { tripId: tripId } });
      }
      if (adminId) {
        await this.auditLogService.logAction(
          adminId, 
          'ASSIGN_RESOURCE', 
          'TRIP', 
          tripId.toString(), 
          { 
            reason: 'Cập nhật phân công tài xế/xe',
            driverId: data.driverId,
            busId: data.busId,
            status: data.status
          }
        );
      }
  
      return updatedTrip;
    });
  }

  // --- HÀM NẠP 1.000 TÀI XẾ ---
  // Trong src/admin-trips/admin-trips.service.ts

  async seed1000DriversAndBuses() {
    const locations = ['TP. Hồ Chí Minh', 'Hà Nội', 'Đà Lạt', 'Nha Trang', 'Cần Thơ', 'Đà Nẵng', 'Vũng Tàu', 'Phan Thiết'];
    const ho = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Huỳnh', 'Phan', 'Vũ', 'Võ', 'Đặng'];
    const tenDem = ['Văn', 'Hữu', 'Minh', 'Đức', 'Thành', 'Quang', 'Anh', 'Hải'];
    const ten = ['Long', 'Hải', 'Quang', 'Tuấn', 'Dũng', 'Thắng', 'Phong', 'Sơn', 'Nam', 'Trung'];

    const createdCount = await this.prisma.$transaction(async (tx) => {
      let count = 0;
      for (let i = 1; i <= 1000; i++) {
        const province = locations[i % locations.length];
        const fullName = `${ho[Math.floor(Math.random() * ho.length)]} ${tenDem[Math.floor(Math.random() * tenDem.length)]} ${ten[Math.floor(Math.random() * ten.length)]}`;
        
        // Sinh biển số tịnh tiến (Đảm bảo 100% không bao giờ trùng lặp)
        const prefix = ['51B', '29B', '49B', '79B', '65B', '43B', '72B', '86B'][i % 8];
        const baseNum = 10000 + i; // Tạo dải số từ 10001 đến 11000
        const plateStr = String(baseNum);
        const plate = `${prefix}-${plateStr.slice(0,3)}.${plateStr.slice(3,5)}`;
        // Kết quả sẽ sinh ra các biển số rất đẹp như: 51B-100.01, 29B-100.02...

       // 🟢 TẠO XE: Dùng uuid để làm busCode không bao giờ trùng
       const newBus = await tx.bus.create({
        data: {
          busCode: `XE-${Date.now().toString().slice(-4)}-${i}`, // 🟢 Đổi dòng này
          plateNumber: plate,
          busType: 'Limousine 22 phòng',
          capacity: 22,
          status: 'READY'
        }
      });

      // 🟢 TẠO TÀI XẾ: Dùng uuid làm driverCode
      await tx.driver.create({
        data: {
          driverCode: `TX-${Date.now().toString().slice(-4)}-${i}`, // 🟢 Đổi dòng này
          name: fullName,
          phone: `09${Math.floor(10000000 + Math.random() * 90000000)}`,
          baseLocation: province,
          routeCode: 'ALL',
          status: 'AVAILABLE',
          licenseNo: `E-${Math.floor(10000 + Math.random() * 90000)}`,
          defaultBusId: newBus.id
        }
      });
        count++;
      }
      return count;
    }, {
      timeout: 100000
    });

    return { message: `Đã nạp ${createdCount} cặp (Tài xế + Xe Limousine 22 phòng) thành công!` };
  }
  // --- QUẢN LÝ TÀI XẾ (CRUD) ---

  // 🟢 HÀM MỚI: Load danh sách tài xế phân trang (Chống đơ UI khi có 1000 tài xế)
  // 🟢 ĐÃ CẬP NHẬT: Thêm query status
  // 🟢 HÀM 1 ĐÃ SỬA: Thêm include defaultBus để lấy thông tin Xe
  // 🟢 Bổ sung busStatus vào khai báo tham số của hàm
  async getDriversPaginated(query: { page?: number; limit?: number; search?: string; routeCode?: string; status?: string; baseLocation?: string; busStatus?: string }) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;
  
    const whereCondition: any = {};
    
    // 1. Lọc theo Tuyến xe (Thông minh: Lấy CẢ 2 CHIỀU ĐI VÀ VỀ)
    if (query.routeCode && query.routeCode !== 'TẤT CẢ') {
      // Tách chuỗi "Hà Nội ➔ Đà Nẵng" thành 2 điểm
      const parts = query.routeCode.split(' ➔ ');
      if (parts.length === 2) {
        const [from, to] = parts;
        const reverseRoute = `${to} ➔ ${from}`; // Đảo ngược thành "Đà Nẵng ➔ Hà Nội"
        
        // Lọc tài xế có tuyến là A->B HOẶC B->A
        whereCondition.routeCode = {
          in: [query.routeCode, reverseRoute] 
        };
      } else {
        whereCondition.routeCode = query.routeCode;
      }
    }

    // 2. Lọc theo Trạng thái (Sẵn sàng/Đang chạy)
    if (query.status && query.status !== 'ALL') {
      whereCondition.status = query.status;
    }
  
    // 3. Lọc theo Khu vực
    if (query.baseLocation && query.baseLocation !== 'ALL') {
      whereCondition.baseLocation = query.baseLocation;
    }

    // 4. 🟢 BỔ SUNG LOGIC LỌC TÌNH TRẠNG GẮN XE (HAS_BUS / NO_BUS)
    if (query.busStatus === 'HAS_BUS') {
      whereCondition.defaultBusId = { not: null }; // Chỉ lấy người ĐÃ CÓ ID xe
    } else if (query.busStatus === 'NO_BUS') {
      whereCondition.defaultBusId = null; // Chỉ lấy người CHƯA CÓ ID xe
    }
  
    // 5. Tìm kiếm Text
    if (query.search) {
      whereCondition.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { driverCode: { contains: query.search, mode: 'insensitive' } },
        { phone: { contains: query.search } }
      ];
    }
    
   // Tìm đến hàm getDriversPaginated trong admin-trips.service.ts
const [total, data] = await this.prisma.$transaction([
  this.prisma.driver.count({ where: whereCondition }),
  this.prisma.driver.findMany({
    where: whereCondition,
    skip,
    take: limit,
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { assignments: true } },
      defaultBus: true,
      // 🟢 THÊM ĐOẠN NÀY ĐỂ LẤY CHUYẾN ĐI HIỆN TẠI
      assignments: {
        where: { 
          status: 'ASSIGNED',
          endTime: { gte: new Date() } // Chỉ lấy các chuyến chưa kết thúc
        },
        include: { trip: true }, // Lấy chi tiết điểm đi/đến
        orderBy: { startTime: 'asc' },
        take: 1
      }
    }
  })
]);
  
    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }
  // 🟢 HÀM FIX DỮ LIỆU: Phân bổ lại tuyến cho 1000 tài xế cũ
  // 🟢 HÀM FIX DỮ LIỆU ĐÃ SỬA: Phân bổ tuyến theo ĐÚNG Khu vực gốc (baseLocation)
  async fixDriverRoutes() {
    const drivers = await this.prisma.driver.findMany();
    let count = 0;
    
    for (const driver of drivers) {
      // 1. Lọc ra danh sách CHỈ CÁC TUYẾN có đi qua Khu vực gốc của tài xế
      const validRoutes = ROUTES.filter(r => 
        r.a === driver.baseLocation || r.b === driver.baseLocation
      );
      
      // Nếu tìm thấy tuyến hợp lệ
      if (validRoutes.length > 0) {
        // 2. Bốc ngẫu nhiên 1 tuyến trong danh sách hợp lệ đó
        const randomRoute = validRoutes[Math.floor(Math.random() * validRoutes.length)];
        
        // 3. Xếp chiều đi: Chiều mặc định luôn xuất phát từ Bến gốc của tài xế
        const routeName = randomRoute.a === driver.baseLocation 
          ? `${randomRoute.a} ➔ ${randomRoute.b}` 
          : `${randomRoute.b} ➔ ${randomRoute.a}`;
        
        // Cập nhật DB
        await this.prisma.driver.update({
          where: { id: driver.id },
          data: { routeCode: routeName }
        });

        if (driver.defaultBusId) {
          await this.prisma.bus.update({
            where: { id: driver.defaultBusId },
            data: { routeCode: routeName }
          });
        }
        count++;
      }
    }
    return { message: `✅ Đã tái phân bổ chuẩn xác ${count} tài xế vào đúng tuyến thuộc Khu vực gốc!` };
  }
  // Giữ lại hàm cũ phòng trường hợp có chỗ khác đang gọi
  async getAllDrivers() {
    return this.prisma.driver.findMany({
      orderBy: { createdAt: 'desc' }
    });
  }

  // 🟢 HÀM 2 ĐÃ SỬA: Tự động tạo 1 xe Limousine đi kèm khi tạo tài xế
  async createDriver(data: any) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Tạo chiếc xe trước
      const newBus = await tx.bus.create({
        data: {
          busCode: `XE-${Date.now().toString().slice(-4)}`,
          plateNumber: data.plateNumber || `CHƯA-CẤP-${Math.floor(Math.random() * 1000)}`,
          busType: 'Limousine 22 phòng',
          capacity: 22,
          routeCode: data.routeCode || 'ALL',
          currentLocation: data.baseLocation || 'Chưa xác định',
          status: 'READY'
        }
      });

      // 2. Tạo tài xế và gắn ID xe vào
      return tx.driver.create({
        data: {
          driverCode: data.driverCode || `TX-${Date.now().toString().slice(-4)}`,
          name: data.name,
          phone: data.phone,
          licenseNo: data.licenseNo,
          baseLocation: data.baseLocation || 'Chưa xác định',
          routeCode: data.routeCode || 'ALL',
          status: data.status || 'AVAILABLE',
          defaultBusId: newBus.id // 🟢 LIÊN KẾT 1-1 NẰM Ở ĐÂY
        }
      });
    });
  }

  // 🟢 HÀM 3 ĐÃ SỬA: Sửa tài xế thì sửa luôn cả biển số xe
  async updateDriver(id: number, data: any) {
    const driver = await this.prisma.driver.findUnique({ where: { id } });
    
    // Nếu có xe đi kèm và có gửi biển số lên -> Update xe
    if (driver?.defaultBusId && data.plateNumber) {
      await this.prisma.bus.update({
        where: { id: driver.defaultBusId },
        data: { 
          plateNumber: data.plateNumber,
          routeCode: data.routeCode,
          currentLocation: data.baseLocation
        }
      });
    }

    // Update thông tin tài xế
    return this.prisma.driver.update({
      where: { id },
      data: {
        name: data.name,
        phone: data.phone,
        licenseNo: data.licenseNo,
        baseLocation: data.baseLocation,
        routeCode: data.routeCode,
        status: data.status
      }
    });
  }

  async deleteDriver(id: number) {
    return this.prisma.driver.delete({ where: { id } });
  }
  async deleteTrip(id: number, adminId: string) {
    const trip = await this.prisma.trip.findUnique({ 
      where: { id },
      include: { _count: { select: { orderSeats: true } } } 
    });

    if (!trip) throw new NotFoundException('Chuyến xe không tồn tại');
    
    // Chặn xóa nếu đã có khách đặt vé
    if (trip._count.orderSeats > 0) {
      throw new ConflictException('Không thể xóa chuyến xe đã có khách đặt vé. Vui lòng hủy vé trước.');
    }

    return this.prisma.$transaction(async (tx) => {
      // Xóa các phân công tài xế liên quan trước
      await tx.driverAssignment.deleteMany({ where: { tripId: id } });
      
      // Xóa chuyến xe
      const deleted = await tx.trip.delete({ where: { id } });

      // 🟢 GHI NHẬT KÝ HỆ THỐNG
      await tx.adminLog.create({
        data: {
          adminId,
          action: 'TRIP_DELETE',
          entityType: 'TRIP',
          entityId: id.toString(),
          details: { reason: `Xóa chuyến thủ công: ${trip.from} -> ${trip.to}`, data: trip }
        }
      });

      return deleted;
    });
  }
  // 🤖 BOT ĐIỀU PHỐI 1: TỰ ĐỘNG GÁN TÀI XẾ & XE (CHẠY MỖI 10 PHÚT)
  // =========================================================================
  @Cron('0 */10 * * * *') // Cứ 10 phút quét 1 lần
  async autoAssignUpcomingTrips() {
    this.logger.log('🔄 Đang quét các chuyến sắp chạy chưa có tài xế...');
    const now = new Date();
    // Tìm các chuyến trong vòng 24 tiếng TRƯỚC và 12 tiếng TỚI chưa được gán tài hoặc xe
    const twelveHoursLater = new Date(now.getTime() + 12 * 60 * 60 * 1000);
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const upcomingOrphanTrips = await this.prisma.trip.findMany({
      where: {
        status: 'PUBLISHED',
        departDate: { gte: twentyFourHoursAgo, lte: twelveHoursLater },
        OR: [ { driverId: null }, { busId: null } ]
      }
    });

    for (const trip of upcomingOrphanTrips) {
      try {
        let selectedDriverId = trip.driverId;
        let selectedBusId = trip.busId;

        // Nếu thiếu tài xế, tự động tìm tài xế tốt nhất
        if (!selectedDriverId) {
          const suggestedDrivers = await this.getSuggestedDrivers(trip.id);
          if (suggestedDrivers.length > 0) {
            selectedDriverId = suggestedDrivers[0].id; // Lấy người đầu tiên
          }
        }

        // Nếu thiếu xe, tự động tìm xe tốt nhất
        if (!selectedBusId) {
          const suggestedBuses = await this.getSuggestedBuses(trip.id);
          if (suggestedBuses.length > 0) {
            selectedBusId = suggestedBuses[0].id;
          }
        }

        // Nếu tìm đủ cả tài và xe -> Tiến hành gán tự động
        if (selectedDriverId && selectedBusId) {
          await this.assignTripResources(
            trip.id, 
            { driverId: selectedDriverId, busId: selectedBusId, status: 'PUBLISHED' }, 
            'SYSTEM' // Ghi log là do hệ thống làm
          );
          this.logger.log(`✅ [Tự động] Đã gán Tài xế ID:${selectedDriverId} và Xe ID:${selectedBusId} cho chuyến #${trip.id}`);
        }
      } catch (error) {
         this.logger.error(`❌ Lỗi khi tự động gán chuyến #${trip.id}: ${error.message}`);
      }
    }
  }

  // =========================================================================
  // 🤖 BOT ĐIỀU PHỐI 2: TỰ ĐỘNG CHUYỂN TRẠNG THÁI THEO ĐỒNG HỒ (CHẠY MỖI 5 PHÚT)
  // =========================================================================
  @Cron('0 */5 * * * *') // Cứ 5 phút quét 1 lần
  async autoUpdateRealtimeStatuses() {
    const now = new Date();

    // -----------------------------------------------------
    // 1. CHUYẾN NÀO ĐẾN GIỜ ĐI -> ĐỔI THÀNH ĐANG CHẠY (RUNNING) & TÀI XẾ -> ON_TRIP
    // -----------------------------------------------------
    const tripsToStart = await this.prisma.trip.findMany({
      where: { 
        status: 'PUBLISHED', 
        departDate: { lte: now },
        driverId: { not: null }, // 🟢 BẮT BUỘC CÓ TÀI XẾ
        busId: { not: null }     // 🟢 BẮT BUỘC CÓ XE
      }
    });

    for (const trip of tripsToStart) {
      await this.prisma.$transaction([
        this.prisma.trip.update({ where: { id: trip.id }, data: { status: 'RUNNING' } }),
        ...(trip.driverId ? [this.prisma.driver.update({ where: { id: trip.driverId }, data: { status: 'ON_TRIP' } })] : []),
        ...(trip.busId ? [this.prisma.bus.update({ where: { id: trip.busId }, data: { status: 'ON_TRIP' } })] : [])
      ]);
      this.logger.log(`🚀 Chuyến #${trip.id} đã XUẤT BẾN.`);
    }

    // -----------------------------------------------------
    // 2. CHUYẾN NÀO ĐẾN GIỜ ĐẾN NƠI -> ĐỔI THÀNH CẬP BẾN (COMPLETED) & TÀI XẾ -> RESTING
    // -----------------------------------------------------
    const tripsToComplete = await this.prisma.trip.findMany({
      where: { status: 'RUNNING', arrivalDate: { lte: now } }
    });

    for (const trip of tripsToComplete) {
      await this.prisma.$transaction([
        this.prisma.trip.update({ where: { id: trip.id }, data: { status: 'COMPLETED' } }),
        // Cập nhật vị trí hiện tại của xe về bến mới đến, và cho tài xế đi ngủ
        ...(trip.driverId ? [this.prisma.driver.update({ where: { id: trip.driverId }, data: { status: 'RESTING', baseLocation: trip.dropoffPoint } })] : []),
        ...(trip.busId ? [this.prisma.bus.update({ where: { id: trip.busId }, data: { status: 'READY', currentLocation: trip.dropoffPoint } })] : [])
      ]);
      this.logger.log(`🏁 Chuyến #${trip.id} đã CẬP BẾN an toàn.`);
    }

    // -----------------------------------------------------
    // 3. TÀI XẾ NÀO NGHỈ ĐỦ 2 TIẾNG -> ĐỔI THÀNH SẴN SÀNG (AVAILABLE)
    // -----------------------------------------------------
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    
    // Tìm các phân công đã kết thúc quá 2 tiếng mà tài xế vẫn đang RESTING
    const assignmentsToRelease = await this.prisma.driverAssignment.findMany({
      where: { 
        endTime: { lte: twoHoursAgo }, 
        driver: { status: 'RESTING' } 
      },
      include: { driver: true, trip: true }
    });

    for (const assign of assignmentsToRelease) {
      await this.prisma.$transaction([
        this.prisma.driver.update({ where: { id: assign.driverId }, data: { status: 'AVAILABLE' } }),
        ...(assign.trip.busId ? [this.prisma.bus.update({ where: { id: assign.trip.busId }, data: { status: 'READY' } })] : [])
      ]);
      this.logger.log(`☕ Tài xế ${assign.driver.name} đã nghỉ ngơi xong. SẴN SÀNG nhận chuyến mới.`);
    }
  }
  // =======================================================
  // HÀM CẤP CỨU: DỌN DẸP DỮ LIỆU & ĐỒNG BỘ LẠI HỆ THỐNG
  // =======================================================
  async emergencySyncSystem() {
    this.logger.log('🚨 BẮT ĐẦU CHIẾN DỊCH GIẢI CỨU HỆ THỐNG...');
    const now = new Date();

    // 1. Chốt hạ tất cả chuyến đi trong quá khứ thành COMPLETED
    await this.prisma.trip.updateMany({
      where: { arrivalDate: { lte: now }, status: { notIn: ['COMPLETED', 'CANCELLED'] } },
      data: { status: 'COMPLETED' }
    });

    // 2. Chuyển tất cả chuyến đang tới giờ chạy thành RUNNING (Nếu đã có tài xế)
    await this.prisma.trip.updateMany({
      where: { 
        departDate: { lte: now }, 
        arrivalDate: { gt: now }, 
        status: { notIn: ['RUNNING', 'CANCELLED'] },
        driverId: { not: null },
        busId: { not: null }
      },
      data: { status: 'RUNNING' }
    });

    // 3. Đánh thức TẤT CẢ tài xế và xe bị kẹt (reset hết về AVAILABLE / READY)
    await this.prisma.driver.updateMany({ data: { status: 'AVAILABLE' } });
    await this.prisma.bus.updateMany({ data: { status: 'READY' } });

    // 4. Gán lại trạng thái ON_TRIP cho những người ĐANG CHẠY THẬT
    const runningTrips = await this.prisma.trip.findMany({ where: { status: 'RUNNING' } });
    for (const trip of runningTrips) {
      if (trip.driverId) await this.prisma.driver.update({ where: { id: trip.driverId }, data: { status: 'ON_TRIP' } });
      if (trip.busId) await this.prisma.bus.update({ where: { id: trip.busId }, data: { status: 'ON_TRIP' } });
    }

    // 5. Chạy Bot 1 ngay lập tức để lấp đầy các chuyến sắp chạy bị trống
    await this.autoAssignUpcomingTrips();

    this.logger.log('✅ HOÀN TẤT CHIẾN DỊCH! HỆ THỐNG ĐÃ SẠCH SẼ VÀ SẴN SÀNG.');
    return { message: 'Đã dọn dẹp dữ liệu, giải phóng tài xế kẹt và tự động gán xe mới thành công!' };
  }
  // =======================================================
  // 💣 HÀM HỦY DIỆT: RESET TRẮNG TOÀN BỘ DỮ LIỆU
  // =======================================================
  async factoryResetDatabase() {
    this.logger.warn('💣 ĐANG XÓA TOÀN BỘ DỮ LIỆU VẬN HÀNH...');
    
    // Dùng Transaction để xóa theo đúng thứ tự (tránh lỗi khóa ngoại)
    await this.prisma.$transaction([
      this.prisma.driverAssignment.deleteMany(),
      this.prisma.orderSeat.deleteMany(),
      this.prisma.ticket.deleteMany(),
      this.prisma.order.deleteMany(),
      this.prisma.trip.deleteMany(),
      this.prisma.driver.deleteMany(),
      this.prisma.bus.deleteMany(),
    ]);

    this.logger.log('✅ ĐÃ XÓA TRẮNG DỮ LIỆU THÀNH CÔNG!');
    return { message: 'Đã dọn sạch toàn bộ Chuyến xe, Tài xế, Xe khách và Đơn vé cũ!' };
  }
}