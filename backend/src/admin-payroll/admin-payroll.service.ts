import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';

@Injectable()
export class AdminPayrollService {
  constructor(
    private prisma: PrismaService,
    private auditLogService: AuditLogService
  ) {}

  /**
   * Tính toán bảng lương cho tất cả tài xế trong khoảng thời gian đã chọn
   * @param startDate ISO String ngày bắt đầu (e.g. 2026-05-01T00:00:00.000Z)
   * @param endDate ISO String ngày kết thúc (e.g. 2026-05-31T23:59:59.999Z)
   */
  async calculatePayroll(startDateStr: string, endDateStr: string) {
    if (!startDateStr || !endDateStr) {
      throw new BadRequestException('Vui lòng chọn đầy đủ thời gian bắt đầu và kết thúc!');
    }

    const start = new Date(startDateStr);
    const end = new Date(endDateStr);
    const now = new Date();

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new BadRequestException('Định dạng thời gian không hợp lệ!');
    }

    // Chỉ tính lương cho các chuyến đã thực chạy trong quá khứ (<= thời điểm hiện tại now)
    const endLimit = end < now ? end : now;

    // Lấy toàn bộ danh sách tài xế
    const drivers: any[] = await this.prisma.driver.findMany({
      include: {
        defaultBus: true,
        // Lấy tất cả phân công chuyến chạy hợp lệ đã diễn ra (không tính tương lai)
        assignments: {
          where: {
            status: { in: ['ASSIGNED', 'CONFIRMED', 'COMPLETED'] },
            endTime: {
              gte: start,
              lte: endLimit,
            },
          },

          include: {
            trip: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });



    // Tính toán bảng lương chi tiết cho mỗi driver
    const payrollDetails = drivers.map((driver) => {
      const completedAssignments = driver.assignments || [];
      const tripCount = completedAssignments.length;
      
      // Tổng quãng đường Km đã chạy
      const totalDistance = completedAssignments.reduce(
        (sum, item) => sum + (item.trip?.distanceKm || 0),
        0
      );

      // Lương tính theo chuyến chạy (Km * salaryPerKm)
      const distanceSalary = totalDistance * driver.salaryPerKm;

      // Tổng lương thực nhận = lương cơ bản + lương chuyến chạy
      const totalSalary = driver.baseSalary + distanceSalary;

      // Tạo lịch sử danh sách các chuyến chạy chi tiết để admin dễ kiểm đối chiếu
      const tripsLog = completedAssignments.map((a) => ({
        assignmentId: a.id,
        tripId: a.tripId,
        from: a.trip?.from || 'Chưa rõ',
        to: a.trip?.to || 'Chưa rõ',
        departDate: a.trip?.departDate || null,
        distanceKm: a.trip?.distanceKm || 0,
        earnedAmount: (a.trip?.distanceKm || 0) * driver.salaryPerKm,
      })).sort((a, b) => {
        const timeA = a.departDate ? new Date(a.departDate).getTime() : 0;
        const timeB = b.departDate ? new Date(b.departDate).getTime() : 0;
        return timeA - timeB;
      });

      return {
        driverId: driver.id,
        driverCode: driver.driverCode,
        name: driver.name,
        phone: driver.phone,
        licenseNo: driver.licenseNo || 'Chưa cập nhật',
        baseLocation: driver.baseLocation,
        routeCode: driver.routeCode,
        status: driver.status,
        defaultBus: driver.defaultBus?.plateNumber || 'Chưa gán xe',
        
        // Cấu hình lương
        baseSalary: driver.baseSalary,
        salaryPerKm: driver.salaryPerKm,

        // Kết quả công tác & Tính toán lương chuẩn csdl
        tripCount,
        totalDistance,
        distanceSalary,
        totalSalary,
        tripsLog,
      };
    });

    // Tính toán các chỉ số thống kê tổng hợp toàn hệ thống
    const systemStats = payrollDetails.reduce(
      (stats, d) => {
        stats.totalSalaryPaid += d.totalSalary;
        stats.totalDistanceRun += d.totalDistance;
        stats.totalTripsCompleted += d.tripCount;
        return stats;
      },
      { totalSalaryPaid: 0, totalDistanceRun: 0, totalTripsCompleted: 0 }
    );

    // Tìm tài xế cống hiến chạy nhiều Km nhất
    let topDriver: any = null;
    if (payrollDetails.length > 0) {
      topDriver = [...payrollDetails].sort((a, b) => b.totalDistance - a.totalDistance)[0];
    }


    return {
      stats: {
        ...systemStats,
        topDriverName: topDriver ? topDriver.name : 'Không có',
        topDriverKm: topDriver ? topDriver.totalDistance : 0,
        averageDistancePerDriver: payrollDetails.length > 0 
          ? Math.round(systemStats.totalDistanceRun / payrollDetails.length) 
          : 0,
      },
      payroll: payrollDetails,
    };
  }

  /**
   * Cập nhật cấu hình lương cứng và đơn giá trên mỗi Km cho một tài xế
   */
  async updateSalaryConfig(driverId: number, baseSalary: number, salaryPerKm: number, adminId?: string) {
    if (baseSalary === undefined || salaryPerKm === undefined) {
      throw new BadRequestException('Vui lòng truyền đầy đủ Lương cơ bản và Đơn giá Km!');
    }

    if (baseSalary < 0 || salaryPerKm < 0) {
      throw new BadRequestException('Lương cơ bản và Đơn giá Km không được phép âm!');
    }

    const driver = await this.prisma.driver.findUnique({
      where: { id: driverId },
    });

    if (!driver) {
      throw new BadRequestException('Không tìm thấy tài xế trên hệ thống!');
    }

    const updatedDriver = await this.prisma.driver.update({
      where: { id: driverId },
      data: {
        baseSalary,
        salaryPerKm,
      },
    });

    // Ghi nhận lịch sử thao tác vào Nhật ký hệ thống (Audit Log)
    const finalAdminId = adminId || 'SYSTEM';
    await this.auditLogService.logAction(
      finalAdminId,
      'UPDATE_SALARY',
      'DRIVER',
      driverId.toString(),
      {
        driverName: driver.name,
        driverCode: driver.driverCode,
        oldBaseSalary: driver.baseSalary,
        oldSalaryPerKm: driver.salaryPerKm,
        newBaseSalary: baseSalary,
        newSalaryPerKm: salaryPerKm,
        reason: `Cấu hình lại lương tài xế ${driver.name}: Lương cứng từ ${driver.baseSalary.toLocaleString('vi-VN')}đ ➔ ${baseSalary.toLocaleString('vi-VN')}đ, đơn giá từ ${driver.salaryPerKm.toLocaleString('vi-VN')}đ/Km ➔ ${salaryPerKm.toLocaleString('vi-VN')}đ/Km.`
      }
    );

    return updatedDriver;
  }
}
