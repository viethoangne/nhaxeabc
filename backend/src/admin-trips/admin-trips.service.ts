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
  ) { }
  onModuleInit() {
    // Chạy bất đồng bộ (fire-and-forget) để tránh block cổng 3001 lúc startup khi kết nối DB qua internet
    setImmediate(async () => {
      this.logger.log('⚡ Server vừa khởi động: Tiến hành rà soát và bù đắp thời gian thực...');
      try {
        // 1. Quét và gán tài xế cho các chuyến bị lỡ trước tiên (để có tài xế)
        await this.autoAssignUpcomingTrips();

        // 2. Quét và cập nhật trạng thái chuyến xe/tài xế bị lỡ trong lúc server tắt
        await this.autoUpdateRealtimeStatuses();

        this.logger.log('✅ Rà soát hoàn tất! Hệ thống đã bắt kịp thời gian thực.');
      } catch (err: any) {
        this.logger.error(`❌ Lỗi khi rà soát thời gian thực lúc startup: ${err.message}`);
      }
    });
  }

  async getAllTrips(dateStr?: string) {
    const targetDate = dateStr ? new Date(`${dateStr}T00:00:00`) : new Date();
    const start = new Date(targetDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(targetDate);
    end.setHours(23, 59, 59, 999);

    return this.prisma.trip.findMany({
      where: {
        departDate: { gte: start, lte: end },
      },
      include: {
        tickets: true,
        _count: { select: { orderSeats: true } },
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

    // 2. LẤY TOÀN BỘ TÀI XẾ THUỘC TUYẾN/KHU VỰC
    const allDrivers = await this.prisma.driver.findMany({
      where: {
        OR: [
          { routeCode: forwardRoute },
          { routeCode: backwardRoute },
          { routeCode: 'ALL' }
        ]
      },
      select: {
        id: true,
        driverCode: true,
        name: true,
        phone: true,
        baseLocation: true,
        routeCode: true,
        defaultBusId: true,
        status: true,
        _count: { select: { assignments: true } },
        assignments: {
          where: {
            status: { not: 'CANCELLED' },
            tripId: { not: tripId },
            AND: [
              { startTime: { lt: requiredEndTime } },
              { endTime: { gt: requiredStartTime } }
            ]
          },
          include: { trip: true }
        }
      }
    });

    // 3. PHÂN LOẠI XUNG ĐỘT (CONFLICT HUD) & CÂN BẰNG TẢI (WORKLOAD BALANCING)
    const result = allDrivers.map(d => {
      const isConflicting = d.assignments.length > 0;
      let conflictReason = '';
      if (isConflicting) {
        const conflictTrip = d.assignments[0].trip;
        conflictReason = `Đang chạy chuyến #${conflictTrip.id} (${conflictTrip.from} ➔ ${conflictTrip.to}) lúc ${new Date(conflictTrip.departDate).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
      } else if (d.status !== 'AVAILABLE') {
        conflictReason = `Tài xế đang ở trạng thái nghỉ/bận: ${d.status}`;
      }

      return {
        id: d.id,
        driverCode: d.driverCode,
        name: d.name,
        phone: d.phone,
        baseLocation: d.baseLocation,
        routeCode: d.routeCode,
        defaultBusId: d.defaultBusId,
        status: d.status,
        workloadCount: d._count.assignments,
        isConflicting: isConflicting || d.status !== 'AVAILABLE',
        conflictReason
      };
    });

    // 🟢 SẮP XẾP CHUẨN ĐỒ ÁN: Ưu tiên người KHÔNG xung đột lên đầu, sau đó sắp xếp theo workloadCount tăng dần (Cân bằng tải - ai chạy ít chuyến được ưu tiên nhận chuyến trước)
    result.sort((a, b) => {
      if (a.isConflicting && !b.isConflicting) return 1;
      if (!a.isConflicting && b.isConflicting) return -1;
      return a.workloadCount - b.workloadCount;
    });

    return result;
  }

  async getSuggestedBuses(tripId: number) {
    const trip = await this.prisma.trip.findUnique({ where: { id: tripId } });
    if (!trip) throw new NotFoundException('Không tìm thấy chuyến xe');

    const forwardRoute = `${trip.from} ➔ ${trip.to}`;
    const backwardRoute = `${trip.to} ➔ ${trip.from}`;

    const PREP_TIME_MS = 30 * 60 * 1000;
    const startTime = new Date(trip.departDate.getTime() - PREP_TIME_MS);
    const arrivalTime = trip.arrivalDate || new Date(trip.departDate.getTime() + (trip.durationMinutes * 60000));

    const allBuses = await this.prisma.bus.findMany({
      where: {
        OR: [
          { routeCode: forwardRoute },
          { routeCode: backwardRoute },
          { routeCode: 'ALL' }
        ]
      },
      select: {
        id: true,
        busCode: true,
        plateNumber: true,
        busType: true,
        capacity: true,
        status: true,
        currentLocation: true,
        trips: {
          where: {
            id: { not: tripId },
            status: { not: 'CANCELLED' },
            AND: [
              { departDate: { lt: arrivalTime } },
              { OR: [{ arrivalDate: { gt: startTime } }, { departDate: { gt: startTime } }] }
            ]
          }
        }
      }
    });

    const result = allBuses.map(b => {
      const isConflicting = b.trips.length > 0;
      let conflictReason = '';
      if (isConflicting) {
        const conflictTrip = b.trips[0];
        conflictReason = `Đang chạy chuyến #${conflictTrip.id} (${conflictTrip.from} ➔ ${conflictTrip.to})`;
      } else if (b.status !== 'READY') {
        conflictReason = `Xe đang bảo trì/bận: ${b.status}`;
      } else if (b.currentLocation !== trip.from) {
        conflictReason = `Xe đang đậu tại bến ${b.currentLocation}`;
      }

      return {
        id: b.id,
        busCode: b.busCode,
        plateNumber: b.plateNumber,
        busType: b.busType,
        capacity: b.capacity,
        status: b.status,
        currentLocation: b.currentLocation,
        isConflicting: isConflicting || b.status !== 'READY' || b.currentLocation !== trip.from,
        conflictReason
      };
    });

    result.sort((a, b) => {
      if (a.isConflicting && !b.isConflicting) return 1;
      if (!a.isConflicting && b.isConflicting) return -1;
      return 0;
    });

    return result;
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

      // Gửi thông báo đến hành khách khi cập nhật tài xế/xe
      const newDriver = data.driverId ? await tx.driver.findUnique({ where: { id: Number(data.driverId) } }) : null;
      const newBus = data.busId ? await tx.bus.findUnique({ where: { id: Number(data.busId) } }) : null;

      if (newDriver || newBus) {
        const passengerOrders = await tx.order.findMany({
          where: {
            OR: [
              { outboundTripId: tripId },
              { returnTripId: tripId }
            ],
            paymentStatus: 'PAID',
            bookingStatus: { not: 'CANCELLED' }
          }
        });

        for (const order of passengerOrders) {
          if (order.userId) {
            let content = `Chuyến xe đi ${updatedTrip.to} (Mã vé: #${order.orderCode}) đã được cập nhật thông tin mới.`;
            if (newBus) content += ` Xe phục vụ: ${newBus.plateNumber} (${newBus.busType || 'Limousine'}).`;
            if (newDriver) content += ` Tài xế: ${newDriver.name} (SĐT: ${newDriver.driverCode}).`;

            await tx.notification.create({
              data: {
                userId: order.userId,
                title: 'Cập nhật chuyến đi 🔄',
                content,
                type: 'TRIP',
                isRead: false
              }
            });
          }
        }
      }

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
        const plate = `${prefix}-${plateStr.slice(0, 3)}.${plateStr.slice(3, 5)}`;
        // Kết quả sẽ sinh ra các biển số rất đẹp như: 51B-100.01, 29B-100.02...

        // TẠO XE: Dùng uuid để làm busCode không bao giờ trùng
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

    await this.fixDriverRoutes();
    return { message: `Đã nạp ${createdCount} cặp (Tài xế + Xe Limousine 22 phòng) thành công!` };
  }
  // --- QUẢN LÝ TÀI XẾ (CRUD) ---

  // HÀM MỚI: Load danh sách tài xế phân trang (Chống đơ UI khi có 1000 tài xế)
  // ĐÃ CẬP NHẬT: Thêm query status
  // HÀM 1 ĐÃ SỬA: Thêm include defaultBus để lấy thông tin Xe
  // Bổ sung busStatus vào khai báo tham số của hàm
  async getDriversPaginated(query: { page?: number; limit?: number; search?: string; routeCode?: string; status?: string; baseLocation?: string; busStatus?: string; sortBy?: string }) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    const whereCondition: any = { AND: [] };

    // 1. Lọc theo Tuyến xe (Thông minh: Lấy CẢ 2 CHIỀU ĐI VÀ VỀ)
    if (query.routeCode && query.routeCode !== 'TẤT CẢ') {
      // Tách chuỗi "Hà Nội ➔ Đà Nẵng" thành 2 điểm
      const parts = query.routeCode.split(' ➔ ');
      if (parts.length === 2) {
        const [from, to] = parts;
        const reverseRoute = `${to} ➔ ${from}`; // Đảo ngược thành "Đà Nẵng ➔ Hà Nội"

        whereCondition.AND.push({
          routeCode: { in: [query.routeCode, reverseRoute] }
        });
      } else {
        whereCondition.AND.push({ routeCode: query.routeCode });
      }
    }

    // 2. Lọc theo Trạng thái (Sẵn sàng/Đang chạy)
    if (query.status && query.status !== 'ALL') {
      whereCondition.AND.push({ status: query.status });
    }

    // 3. Lọc theo Khu vực
    if (query.baseLocation && query.baseLocation !== 'ALL') {
      whereCondition.AND.push({ baseLocation: query.baseLocation });
    }

    // 4.BỔ SUNG LOGIC LỌC TÌNH TRẠNG GẮN CHUYẾN (Đã có chuyến / Chưa gắn chuyến)
    if (query.busStatus === 'HAS_BUS') {
      // Đã có chuyến: Đang chạy xe trên đường (ON_TRIP) HOẶC đã được phân công chuyến sắp chạy
      whereCondition.AND.push({
        OR: [
          { status: 'ON_TRIP' },
          { assignments: { some: { status: 'ASSIGNED', endTime: { gte: new Date() } } } }
        ]
      });
    } else if (query.busStatus === 'NO_BUS') {
      // Chưa gắn chuyến: KHÔNG chạy xe (not ON_TRIP) VÀ KHÔNG có phân công chuyến sắp chạy
      whereCondition.AND.push({
        status: { not: 'ON_TRIP' },
        assignments: { none: { status: 'ASSIGNED', endTime: { gte: new Date() } } }
      });
    }

    // 5. Tìm kiếm Text
    if (query.search) {
      whereCondition.AND.push({
        OR: [
          { name: { contains: query.search, mode: 'insensitive' } },
          { driverCode: { contains: query.search, mode: 'insensitive' } },
          { phone: { contains: query.search } }
        ]
      });
    }

    // Lấy toàn bộ ID tài xế khớp với bộ lọc để tự sắp xếp & phân trang chính xác
    const allMatchingDrivers = await this.prisma.driver.findMany({
      where: whereCondition,
      orderBy: { createdAt: 'desc' }, // mặc định xếp theo mới nhất
      select: { id: true }
    });
    const matchingDriverIds = allMatchingDrivers.map(d => d.id);
    const total = matchingDriverIds.length;

    // Sắp xếp nâng cao nếu chọn "Chạy nhiều chuyến nhất" theo đúng số chuyến thực tế đã chạy (endTime <= now)
    if (query.sortBy === 'ASSIGNMENTS_DESC') {
      const now = new Date();
      const pastAssignmentsGroup = await this.prisma.driverAssignment.groupBy({
        by: ['driverId'],
        where: {
          driverId: { in: matchingDriverIds },
          status: { in: ['ASSIGNED', 'CONFIRMED', 'COMPLETED'] },
          endTime: { lte: now }
        },
        _count: {
          tripId: true
        }
      });

      const assignmentCountMap: Record<number, number> = {};
      pastAssignmentsGroup.forEach(g => {
        assignmentCountMap[g.driverId] = g._count.tripId || 0;
      });

      // Sắp xếp danh sách ID theo số chuyến giảm dần
      matchingDriverIds.sort((a, b) => {
        const countA = assignmentCountMap[a] || 0;
        const countB = assignmentCountMap[b] || 0;
        return countB - countA;
      });
    }

    const paginatedIds = matchingDriverIds.slice(skip, skip + limit);

    // Lấy chi tiết thông tin các tài xế trong trang hiện tại
    const driversData = await this.prisma.driver.findMany({
      where: {
        id: { in: paginatedIds }
      },
      include: {
        _count: { select: { assignments: true } },
        defaultBus: true,
        assignments: {
          where: {
            status: { in: ['ASSIGNED', 'CONFIRMED'] }
          },
          include: { trip: true },
          orderBy: { startTime: 'asc' },
          take: 1
        }
      }
    });

    // Tái cấu trúc mảng để bảo toàn thứ tự sắp xếp hoàn hảo của paginatedIds
    const data = paginatedIds.map(id => driversData.find(d => d.id === id)).filter(Boolean);

    // ĐỒNG BỘ: Tính toán số chuyến ĐÃ CHẠY THỰC TẾ (endTime <= now) để hiển thị đồng nhất
    const driverIds = data.map((d: any) => d.id);
    const pastCounts = await this.prisma.driverAssignment.groupBy({
      by: ['driverId'],
      where: {
        driverId: { in: driverIds },
        status: { in: ['ASSIGNED', 'CONFIRMED', 'COMPLETED'] },
        endTime: { lte: new Date() }
      },
      _count: true
    });

    const countMap: Record<number, number> = {};
    pastCounts.forEach((pc: any) => {
      countMap[pc.driverId] = pc._count;
    });

    const processedData = data.map((d: any) => ({
      ...d,
      _count: {
        ...d._count,
        assignments: countMap[d.id] || 0
      }
    }));

    return {
      data: processedData,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  //  HÀM FIX DỮ LIỆU: Phân bổ lại tuyến cho 1000 tài xế cũ
  //  HÀM FIX DỮ LIỆU ĐÃ SỬA: Phân bổ tuyến theo ĐÚNG Khu vực gốc (baseLocation)
  async fixDriverRoutes() {
    const drivers = await this.prisma.driver.findMany();
    let count = 0;

    for (const driver of drivers) {
      const baseLoc = driver.baseLocation;
      const isHCM = baseLoc.includes('Hồ Chí Minh') || baseLoc.includes('Sài Gòn') || baseLoc.includes('Miền Đông') || baseLoc.includes('Miền Tây') || baseLoc.includes('An Sương');

      // 1. Lọc ra danh sách CHỈ CÁC TUYẾN có đi qua Khu vực gốc của tài xế (So khớp chuỗi thông minh)
      const validRoutes = ROUTES.filter(r => {
        const matchA = baseLoc.includes(r.a) || (r.a === 'TP. Hồ Chí Minh' && isHCM);
        const matchB = baseLoc.includes(r.b) || (r.b === 'TP. Hồ Chí Minh' && isHCM);
        return matchA || matchB;
      });

      // Nếu tìm thấy tuyến hợp lệ
      if (validRoutes.length > 0) {
        // 2. Bốc ngẫu nhiên 1 tuyến trong danh sách hợp lệ đó
        const randomRoute = validRoutes[Math.floor(Math.random() * validRoutes.length)];

        // 3. Xếp chiều đi: Chiều mặc định luôn xuất phát từ Bến gốc của tài xế
        const matchA = baseLoc.includes(randomRoute.a) || (randomRoute.a === 'TP. Hồ Chí Minh' && isHCM);
        const routeName = matchA
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

  // HÀM 2 ĐÃ SỬA: Tự động tạo 1 xe Limousine đi kèm khi tạo tài xế
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
          defaultBusId: newBus.id // LIÊN KẾT 1-1 NẰM Ở ĐÂY
        }
      });
    });
  }

  //  HÀM 3 ĐÃ SỬA: Sửa tài xế thì sửa luôn cả biển số xe (Hỗ trợ cả trường hợp tài xế cũ chưa có xe)
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
    } else if (!driver?.defaultBusId && data.plateNumber) {
      // Nếu tài xế cũ chưa có xe, tự động tạo xe mới và gán
      const newBus = await this.prisma.bus.create({
        data: {
          busCode: `XE-${Date.now().toString().slice(-4)}`,
          plateNumber: data.plateNumber,
          busType: 'Limousine 22 phòng',
          capacity: 22,
          routeCode: data.routeCode || 'ALL',
          currentLocation: data.baseLocation || 'Chưa xác định',
          status: 'READY'
        }
      });
      await this.prisma.driver.update({
        where: { id },
        data: { defaultBusId: newBus.id }
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

    // 🟢 SIẾT CHẶN BẢO MẬT 1: CẤM XÓA CHUYẾN ĐÃ CÓ KHÁCH ĐẶT VÉ
    if (trip._count.orderSeats > 0) {
      throw new ConflictException('Không thể xóa chuyến xe đã có khách đặt vé. Vui lòng hủy vé trước.');
    }

    const now = new Date();

    // 🟢 SIẾT CHẶN BẢO MẬT 2: CẤM XÓA CHUYẾN ĐÃ QUA GIỜ KHỞI HÀNH (BẤT KỂ CÓ VÉ HAY KHÔNG)
    if (trip.departDate < now) {
      throw new ConflictException('Không thể xóa chuyến xe đã qua mốc giờ khởi hành nhằm bảo toàn tính minh bạch của lịch sử điều phối.');
    }

    // 🟢 SIẾT CHẶN BẢO MẬT 3 (THEO LỆNH ADMIN): CHUYẾN ĐÃ CÓ TÀI + SẮP CHẠY TRONG 42H -> CẤM XÓA TUYỆT ĐỐI (BẤT KỂ CÓ KHÁCH HAY CHƯA)
    const fortyTwoHoursLater = new Date(now.getTime() + 42 * 60 * 60 * 1000);
    if (trip.driverId && trip.departDate >= now && trip.departDate <= fortyTwoHoursLater) {
      throw new ConflictException('Không thể xóa chuyến xe đã được xếp tài xế và sắp khởi hành trong 42 giờ tới nhằm bảo đảm cam kết vận tải với Bác tài và duy trì tính ổn định của lộ trình.');
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Xóa các phân công tài xế liên quan trước
      await tx.driverAssignment.deleteMany({ where: { tripId: id } });

      // 2. Nhả tài xế (Cập nhật trạng thái thành AVAILABLE)
      if (trip.driverId) {
        await tx.driver.update({
          where: { id: trip.driverId },
          data: { status: 'AVAILABLE' }
        });
      }

      // 3. Nhả xe/biển số xe (Cập nhật trạng thái thành READY)
      if (trip.busId) {
        await tx.bus.update({
          where: { id: trip.busId },
          data: { status: 'READY' }
        });
      }

      // 4. Xóa chuyến xe
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
    // 🟢 MỞ RỘNG TẦM NHÌN ĐIỀU PHỐI TỰ ĐỘNG TRONG 168 TIẾNG TỚI (7 NGÀY TỚI) ĐỂ GẮN SỐ LƯỢNG LỚN
    const oneHundredSixtyEightHoursLater = new Date(now.getTime() + 168 * 60 * 60 * 1000);
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const upcomingOrphanTrips = await this.prisma.trip.findMany({
      where: {
        status: 'PUBLISHED',
        departDate: { gte: twentyFourHoursAgo, lte: oneHundredSixtyEightHoursLater },
        OR: [{ driverId: null }, { busId: null }]
      },
      take: 10 // ⚡ Chỉ xử lý tối đa 10 chuyến mỗi lần chạy để tránh nghẽn DB pool
    });

    for (const trip of upcomingOrphanTrips) {
      try {
        let selectedDriverId = trip.driverId;
        let selectedBusId = trip.busId;

        // Nếu thiếu tài xế, tự động tìm tài xế tốt nhất
        if (!selectedDriverId) {
          const suggestedDrivers = await this.getSuggestedDrivers(trip.id);
          const freeDrivers = suggestedDrivers.filter(d => !d.isConflicting);
          if (freeDrivers.length > 0) {
            selectedDriverId = freeDrivers[0].id; // Lấy người đầu tiên
          }
        }

        // Nếu thiếu xe, tự động tìm xe tốt nhất
        if (!selectedBusId) {
          const suggestedBuses = await this.getSuggestedBuses(trip.id);
          const freeBuses = suggestedBuses.filter(b => !b.isConflicting);
          if (freeBuses.length > 0) {
            selectedBusId = freeBuses[0].id;
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

  async autoUpdateRealtimeStatuses() {
    const now = new Date();

    // -----------------------------------------------------
    // 1. CHUYẾN NÀO ĐẾN GIỜ ĐI -> ĐỔI THÀNH ĐANG CHẠY (RUNNING) & TÀI XẾ -> ON_TRIP
    // -----------------------------------------------------
    const tripsToStart = await this.prisma.trip.findMany({
      where: {
        status: 'PUBLISHED',
        departDate: { lte: now },
        driverId: { not: null },
        busId: { not: null }
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
      const dropoff = trip.dropoffPoint || 'Chưa xác định';

      await this.prisma.$transaction(async (tx) => {
        await tx.trip.update({ where: { id: trip.id }, data: { status: 'COMPLETED' } });

        if (trip.driverId) {
          await tx.driver.update({
            where: { id: trip.driverId },
            data: { status: 'RESTING', baseLocation: dropoff }
          });

          // 🟢 ĐỒNG BỘ BẢNG PHÂN CÔNG: Đảm bảo tài xế có bản ghi hoàn thành chuyến để tính chính xác số ca đã chạy
          const assignStartTime = new Date(trip.departDate.getTime() - 30 * 60 * 1000);
          const assignEndTime = trip.arrivalDate || new Date(trip.departDate.getTime() + trip.durationMinutes * 60000);

          const existingAssign = await tx.driverAssignment.findUnique({ where: { tripId: trip.id } });
          if (existingAssign) {
            await tx.driverAssignment.update({
              where: { tripId: trip.id },
              data: { status: 'COMPLETED' }
            });
          } else {
            await tx.driverAssignment.create({
              data: {
                driverId: trip.driverId,
                tripId: trip.id,
                startTime: assignStartTime,
                endTime: assignEndTime,
                status: 'COMPLETED'
              }
            });
          }
        }

        if (trip.busId) {
          await tx.bus.update({
            where: { id: trip.busId },
            data: { status: 'READY', currentLocation: dropoff }
          });
        }
      });

      this.logger.log(`🏁 Chuyến #${trip.id} đã CẬP BẾN an toàn.`);
    }

    // -----------------------------------------------------
    // 3. TÀI XẾ NÀO NGHỈ ĐỦ 2 TIẾNG -> ĐỔI THÀNH SẴN SÀNG (AVAILABLE)
    // -----------------------------------------------------
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

    // 🟢 SỬA LỖI ĐỘNG: Tìm cả những tài xế đang RESTING mà không có chuyến nào đang chạy hoặc chuyến đã xong từ lâu
    const restingDrivers = await this.prisma.driver.findMany({
      where: { status: 'RESTING' },
      include: {
        assignments: {
          where: { endTime: { gt: twoHoursAgo } } // Kiểm tra xem có chuyến nào vừa kết thúc trong vòng 2 tiếng không
        }
      }
    });

    for (const d of restingDrivers) {
      // Nếu không có chuyến nào kết thúc gần đây (tức là đã nghỉ quá 2 tiếng hoặc kẹt dữ liệu cũ) -> Wake up!
      if (d.assignments.length === 0) {
        await this.prisma.driver.update({
          where: { id: d.id },
          data: { status: 'AVAILABLE' }
        });
        this.logger.log(`☕ Tài xế ${d.name} đã hoàn tất nghỉ ngơi. Đã chuyển sang trạng thái SẴN SÀNG.`);
      }
    }
  }

  // =======================================================
  // HÀM CẤP CỨU: DỌN DẸP DỮ LIỆU & ĐỒNG BỘ LẠI HỆ THỐNG
  // =======================================================
  async emergencySyncSystem() {
    this.logger.log('🚨 BẮT ĐẦU CHIẾN DỊCH GIẢI CỨU HỆ THỐNG...');
    const now = new Date();

    // 1. Chốt hạ tất cả chuyến đi trong quá khứ thành COMPLETED
    const pastTrips = await this.prisma.trip.findMany({
      where: { arrivalDate: { lte: now }, status: { notIn: ['COMPLETED', 'CANCELLED'] } }
    });

    for (const trip of pastTrips) {
      await this.prisma.$transaction(async (tx) => {
        await tx.trip.update({ where: { id: trip.id }, data: { status: 'COMPLETED' } });

        // Tạo bảng ghi DriverAssignment nếu có tài xế để đếm chính xác số chuyến
        if (trip.driverId) {
          const assignStartTime = new Date(trip.departDate.getTime() - 30 * 60 * 1000);
          const assignEndTime = trip.arrivalDate || new Date(trip.departDate.getTime() + trip.durationMinutes * 60000);
          const exist = await tx.driverAssignment.findUnique({ where: { tripId: trip.id } });
          if (!exist) {
            await tx.driverAssignment.create({
              data: {
                driverId: trip.driverId,
                tripId: trip.id,
                startTime: assignStartTime,
                endTime: assignEndTime,
                status: 'COMPLETED'
              }
            });
          } else {
            await tx.driverAssignment.update({
              where: { tripId: trip.id },
              data: { status: 'COMPLETED' }
            });
          }
        }
      });
    }

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

    // 3. 🟢 ĐÁNH THỨC TẤT CẢ TÀI XẾ VÀ XE (Reset hết về AVAILABLE / READY)
    await this.prisma.driver.updateMany({ data: { status: 'AVAILABLE' } });
    await this.prisma.bus.updateMany({ data: { status: 'READY' } });

    // 4. Gán lại trạng thái ON_TRIP cho những người ĐANG CHẠY THẬT
    const runningTrips = await this.prisma.trip.findMany({ where: { status: 'RUNNING' } });
    for (const trip of runningTrips) {
      if (trip.driverId) await this.prisma.driver.update({ where: { id: trip.driverId }, data: { status: 'ON_TRIP' } });
      if (trip.busId) await this.prisma.bus.update({ where: { id: trip.busId }, data: { status: 'ON_TRIP' } });
    }

    // 5. Tái phân bổ và chuẩn hóa tuyến đường cho tất cả Bác tài
    await this.fixDriverRoutes();

    // 5.5. 🟢 XÓA PHÂN CÔNG CŨ CỦA CÁC CHUYẾN ĐANG CHẠY (RUNNING) VÀ SẮP CHẠY (PUBLISHED) ĐỂ PHÂN CÔNG LẠI TỪ ĐẦU THEO CHUẨN TUYẾN MỚI
    const activeTrips = await this.prisma.trip.findMany({
      where: { status: { in: ['RUNNING', 'PUBLISHED'] }, departDate: { gt: new Date(now.getTime() - 24 * 3600 * 1000) } }
    });
    for (const t of activeTrips) {
      await this.prisma.driverAssignment.deleteMany({ where: { tripId: t.id } });
      await this.prisma.trip.update({
        where: { id: t.id },
        data: { driverId: null, busId: null, busPlate: null, driverName: null }
      });
    }

    // 5.6 GÁN LẠI CHUẨN XÁC TÀI XẾ THUỘC ĐÚNG TUYẾN CHO CÁC CHUYẾN ĐANG CHẠY
    const runningTripsToAssign = await this.prisma.trip.findMany({ where: { status: 'RUNNING' } });
    for (const t of runningTripsToAssign) {
      const forwardRoute = `${t.from} ➔ ${t.to}`;
      const matchingDrivers = await this.prisma.driver.findMany({
        where: { routeCode: forwardRoute, status: 'AVAILABLE' },
        include: { defaultBus: true },
        take: 1
      });
      if (matchingDrivers.length > 0) {
        const d = matchingDrivers[0];
        if (d.defaultBusId) {
          await this.prisma.trip.update({
            where: { id: t.id },
            data: { driverId: d.id, busId: d.defaultBusId, driverName: d.name, busPlate: d.defaultBus?.plateNumber }
          });
          await this.prisma.driver.update({ where: { id: d.id }, data: { status: 'ON_TRIP' } });
          await this.prisma.bus.update({ where: { id: d.defaultBusId }, data: { status: 'ON_TRIP' } });

          const assignStartTime = new Date(t.departDate.getTime() - 30 * 60 * 1000);
          const assignEndTime = t.arrivalDate || new Date(t.departDate.getTime() + t.durationMinutes * 60000);
          await this.prisma.driverAssignment.create({
            data: {
              driverId: d.id,
              tripId: t.id,
              startTime: assignStartTime,
              endTime: assignEndTime,
              status: 'CONFIRMED'
            }
          });
        }
      }
    }

    // 6. Chạy Bot 1 ngay lập tức để lấp đầy các chuyến sắp chạy bị trống bằng đúng tài xế thuộc tuyến
    await this.autoAssignUpcomingTrips();

    this.logger.log('✅ HOÀN TẤT CHIẾN DỊCH! HỆ THỐNG ĐÃ SẠCH SẼ VÀ SẴN SÀNG.');
    return { message: 'Đã chuẩn hóa tuyến đường cho 1.000 Bác tài và tự động tái phân bổ các chuyến sắp chạy thành công!' };
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