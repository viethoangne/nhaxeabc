import * as cron from 'node-cron';
import { PrismaService } from '../prisma/prisma.service';

// 🔥 Biến global để dùng trong toàn file
let prisma: PrismaService;

// 🔥 Hàm inject từ main.ts
export function initTripMaintenance(prismaService: PrismaService) {
  prisma = prismaService;

  // debug tránh undefined
  console.log('PRISMA INIT:', !!prisma);
}
// ... (Logic bảo trì của bạn giữ nguyên)
const DAYS_AHEAD = 7;  // Đảm bảo chỉ có chuyến cho đúng 7 ngày (hôm nay + 6 ngày tới)
const DEFAULT_PRICE = 10000;
const DEFAULT_TICKETS = 5;

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
  '00:00:00', // Chuyến Nửa đêm (MỚI THÊM)
  '06:00:00', // Chuyến Sáng
  '12:00:00', // Chuyến Trưa
  '18:00:00', // Chuyến Chiều
  '22:00:00', // Chuyến Đêm
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

// TỰ ĐỘNG TẠO CÁC CHUYẾN KHỨ HỒI (CHIỀU VỀ) CHỐNG TRÙNG LẶP
const ALL_ROUTES: typeof ROUTES = [];
const routeSet = new Set<string>();

for (const route of ROUTES) {
  const key1 = `${route.a}-${route.b}`;
  if (!routeSet.has(key1)) {
    ALL_ROUTES.push(route);
    routeSet.add(key1);
  }

  // Tạo chiều ngược lại
  const key2 = `${route.b}-${route.a}`;
  if (!routeSet.has(key2)) {
    ALL_ROUTES.push({
      a: route.b,
      b: route.a,
      distanceKm: route.distanceKm,
      durationMinutes: route.durationMinutes,
    });
    routeSet.add(key2);
  }
}

function getBusType(distanceKm: number) {
  if (distanceKm <= 500) return 'Limousine';// Thêm default nếu > 500km
}

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function formatVNDate(date: Date) {
  const vn = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
  const y = vn.getFullYear();
  const m = String(vn.getMonth() + 1).padStart(2, '0');
  const d = String(vn.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function makeVNDate(date: Date, time: string) {
  const dateStr = formatVNDate(date);
  return new Date(`${dateStr}T${time}+07:00`);
}

function startOfTodayVN() {
  const todayStr = formatVNDate(new Date());
  return new Date(`${todayStr}T00:00:00+07:00`);
}

function addDays(base: Date, days: number) {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

// Lưu chuyến xe vào cơ sở dữ liệu
async function ensureTripsForDate(targetDate: Date) {
  // Lặp qua mảng ALL_ROUTES để tạo cả 2 chiều đi và về
  for (const [index, route] of ALL_ROUTES.entries()) {
    for (const time of TIME_SLOTS) {
      const departDate = makeVNDate(targetDate, time); // Tạo thời gian xuất phát cho chuyến xe
      const arrivalDate = addMinutes(departDate, route.durationMinutes); // Tính thời gian đến

      // Tạo chuyến xe mới
      const trip = await prisma.trip.upsert({
        where: {
          trip_lookup: {
            from: route.a,
            to: route.b,
            departDate,
            pickupPoint: STATIONS[route.a],
            dropoffPoint: STATIONS[route.b],
          },
        },
        update: {
          arrivalDate,
          arrivalTime: arrivalDate,
          busType: getBusType(route.distanceKm) || 'Limousine', // Đảm bảo busType được sinh tự động
          distanceKm: route.distanceKm,
          durationMinutes: route.durationMinutes,
          price: DEFAULT_PRICE,
          pickupPoint: STATIONS[route.a],
          dropoffPoint: STATIONS[route.b],
        },
        create: {
          from: route.a,
          to: route.b,
          departDate,
          arrivalDate,
          arrivalTime: arrivalDate,
          returnDate: null,
          busType: getBusType(route.distanceKm) || 'Limousine', 
          distanceKm: route.distanceKm,
          durationMinutes: route.durationMinutes,
          pickupPoint: STATIONS[route.a],
          dropoffPoint: STATIONS[route.b],
          price: DEFAULT_PRICE,
        },
      });

      await prisma.ticket.upsert({
        where: { id: trip.id }, // Thay vì tripId, sử dụng id của trip
        update: { numTickets: DEFAULT_TICKETS },
        create: {
          tripId: trip.id,
          numTickets: DEFAULT_TICKETS,
        },
      });
    }
  }
}

// Xoá các chuyến xe đã hết hạn
async function deleteOldTrips() {
  const todayStart = startOfTodayVN();

  const oldTrips = await prisma.trip.findMany({
    where: {
      departDate: {
        lt: todayStart,
      },
    },
    include: {
      outboundOrders: true, 
    },
  });

  const tripIds = oldTrips.map((t) => t.id);
  const ordersToArchive = oldTrips.flatMap((t) => t.outboundOrders.map((order) => order.id)); 

  if (ordersToArchive.length > 0) {
    await prisma.order.updateMany({
      where: {
        id: { in: ordersToArchive },
      },
      data: {
        bookingStatus: 'ARCHIVED', 
      },
    });

    console.log(`📦 Đã lưu ${ordersToArchive.length} đơn hàng vào lưu trữ.`);
  }

  // Xóa các chuyến xe đã hết hạn
  if (tripIds.length > 0) {
    await prisma.trip.deleteMany({
      where: {
        id: { in: tripIds },
      },
    });

    console.log(`🗑️ Đã xóa ${tripIds.length} chuyến xe đã hết hạn.`);
  }
}

// 🟢 HÀM MỚI: Tự động hoàn thành chuyến và cập nhật vị trí Xe/Tài xế
async function autoCompleteTrips() {
  const now = new Date();
  console.log(`[Auto-Complete] Đang kiểm tra chuyến về bến lúc ${now.toLocaleTimeString('vi-VN')}...`);

  // Lấy các chuyến đang ở trạng thái PUBLISHED hoặc RUNNING mà giờ arrivalDate đã qua
  const arrivedTrips = await prisma.trip.findMany({
    where: {
      status: { in: ['PUBLISHED', 'RUNNING'] }, // Bạn có thể thêm RUNNING nếu có xài
      arrivalDate: { lte: now }
    }
  });

  if (arrivedTrips.length === 0) return;

  for (const trip of arrivedTrips) {
    try {
      await prisma.$transaction(async (tx) => {
        // 1. Cập nhật chuyến thành COMPLETED
        await tx.trip.update({
          where: { id: trip.id },
          data: { status: 'COMPLETED' }
        });

        // 2. Chuyển vị trí xe về tỉnh điểm đến (trip.to)
        if (trip.busId) {
          await tx.bus.update({
            where: { id: trip.busId },
            data: { currentLocation: trip.to }
          });
        }

        // 3. Chuyển vị trí tài xế về tỉnh điểm đến và cho nghỉ ngơi
        if (trip.driverId) {
          await tx.driver.update({
            where: { id: trip.driverId },
            data: { 
              baseLocation: trip.to,
              status: 'RESTING' 
            }
          });
        }
      });
      console.log(`✅ [Auto-Complete] Đã tự động cập bến chuyến ${trip.id} từ ${trip.from} -> ${trip.to}`);
    } catch (error) {
      console.error(`❌ [Auto-Complete] Lỗi cập bến chuyến ${trip.id}:`, error);
    }
  }
}

// 🔥 HÀM MỚI: TỰ ĐỘNG ĐIỀU PHỐI (CHẠY MỖI PHÚT)
async function autoDispatchTrips() {
  const now = new Date();

  try {
    // ---------------------------------------------------------
    // 0. TỰ ĐỘNG PHÂN CÔNG TÀI & XE (TRƯỚC 10 TIẾNG)
    // ---------------------------------------------------------
    const tenHoursFromNow = new Date(now.getTime() + 10 * 60 * 60 * 1000);
    
    // Tìm các chuyến chưa có tài xế, và sắp chạy trong vòng 10 tiếng tới
    const tripsNeedsAssignment = await prisma.trip.findMany({
      where: {
        status: 'PUBLISHED',
        driverId: null, // Chưa được ai phân công
        departDate: { lte: tenHoursFromNow, gt: now }
      }
    });

    for (const trip of tripsNeedsAssignment) {
      
      // 🟢 1. TẠO CHUỖI TUYẾN 2 CHIỀU ĐỂ KIỂM TRA ĐỐI CHIẾU
      const forwardRoute = `${trip.from} ➔ ${trip.to}`;
      const backwardRoute = `${trip.to} ➔ ${trip.from}`;

      // Tìm 1 bác tài đang rảnh ở ĐÚNG TỈNH ĐÓ, CÓ SẴN XE và ĐÚNG TUYẾN BIÊN CHẾ
      const availableDriver = await prisma.driver.findFirst({
        where: {
          status: 'AVAILABLE',
          baseLocation: trip.from,
          
          // 🟢 2. KHÓA CHẶT: CHỈ LẤY TÀI XẾ THUỘC ĐÚNG TUYẾN NÀY (HOẶC XE TĂNG CƯỜNG 'ALL')
          OR: [
            { routeCode: forwardRoute },
            { routeCode: backwardRoute },
            { routeCode: 'ALL' }
          ],

          defaultBusId: { not: null }, // Đảm bảo tài xế này có xe
          assignments: {
            none: { // Đảm bảo không bị kẹt lịch chuyến khác
              status: { not: 'CANCELLED' },
              AND: [
                { startTime: { lt: new Date(trip.departDate.getTime() + (trip.durationMinutes * 60000) + 2*3600000) } },
                { endTime: { gt: new Date(trip.departDate.getTime() - 1800000) } }
              ]
            }
          }
        }
      });

      // Nếu tìm thấy bác tài phù hợp, chốt luôn!
      if (availableDriver && availableDriver.defaultBusId) {
        await prisma.$transaction(async (tx) => {
          // 1. Cập nhật chuyến
          await tx.trip.update({
            where: { id: trip.id },
            data: {
              driverId: availableDriver.id,
              busId: availableDriver.defaultBusId
            }
          });

          // 2. Lưu vào bảng phân công để khóa lịch bác tài này lại
          await tx.driverAssignment.create({
            data: {
              tripId: trip.id,
              driverId: availableDriver.id,
              startTime: new Date(trip.departDate.getTime() - 30 * 60 * 1000), // Tính lương trước 30p
              endTime: new Date(trip.departDate.getTime() + (trip.durationMinutes * 60000)),
              status: 'ASSIGNED'
            }
          });
          // ... code tạo driverAssignment cũ ...

          // 🟢 1. GHI LOG BOT PHÂN CÔNG
          await tx.adminLog.create({
            data: {
              action: 'AUTO_DISPATCH',
              entityType: 'TRIP',
              entityId: trip.id.toString(),
              details: { 
                reason: `Bot tự động phân công tài xế ${availableDriver.driverCode}`,
                driverId: availableDriver.id,
                busId: availableDriver.defaultBusId
              }
            }
          });
        });
        console.log(`🤖 [Auto-Assign] Đã tự động điều tài xế ${availableDriver.driverCode} cho chuyến đi ${trip.from} -> ${trip.to}`);
      }
    }

    // ---------------------------------------------------------
    // 1. TỰ ĐỘNG XUẤT BẾN (CHUYỂN SANG RUNNING) & CHỐT VÉ
    // ---------------------------------------------------------
    const tripsToStart = await prisma.trip.findMany({
      where: {
        status: 'PUBLISHED',
        departDate: { lte: now }, // Giờ khởi hành <= Giờ hiện tại
        driverId: { not: null },
        busId: { not: null }
      }
    });

    if (tripsToStart.length > 0) {
      for (const trip of tripsToStart) {
        await prisma.$transaction(async (tx) => {
          // A. Chuyển trạng thái Chuyến xe & Tài xế
          await tx.trip.update({
            where: { id: trip.id },
            data: { status: 'RUNNING' }
          });

          if (trip.driverId) {
            await tx.driver.update({
              where: { id: trip.driverId },
              data: { status: 'ON_TRIP' }
            });
          }
          // ... code đổi status tài xế cũ ...

          // 🟢 2. GHI LOG BOT XUẤT BẾN
          await tx.adminLog.create({
            data: {
              action: 'TRIP_UPDATE',
              entityType: 'TRIP',
              entityId: trip.id.toString(),
              details: { reason: `Bot xác nhận xe xuất bến (Chuyển trạng thái RUNNING)` }
            }
          });

          // B. 🟢 TỰ ĐỘNG CHỐT ĐƠN HÀNG: Cập nhật các đơn đã thanh toán thành COMPLETED
          await tx.order.updateMany({
            where: { 
              outboundTripId: trip.id,
              paymentStatus: 'PAID',
              bookingStatus: { not: 'CANCELLED' } // Không đụng tới vé đã huỷ
            },
            data: { bookingStatus: 'COMPLETED' }
          });

          // C. 🟢 TỰ ĐỘNG SOÁT GHẾ: Cập nhật tất cả các ghế đã giữ của chuyến này
          await tx.orderSeat.updateMany({
            where: { tripId: trip.id },
            data: { isCheckedIn: true, checkInTime: now }
          });
          
        });
        console.log(`🚀 [Auto] Chuyến ${trip.id} (${trip.from} -> ${trip.to}) đã XUẤT BẾN và Chốt toàn bộ vé thành công.`);
      }
    }

    // 2. TỰ ĐỘNG CẬP BẾN (CHUYỂN SANG COMPLETED)
    // ---------------------------------------------------------
    const tripsToComplete = await prisma.trip.findMany({
      where: {
        status: 'RUNNING', 
        arrivalDate: { lte: now } // Giờ đến <= Giờ hiện tại
      }
    });

    if (tripsToComplete.length > 0) {
      for (const trip of tripsToComplete) {
        await prisma.$transaction(async (tx) => {
          await tx.trip.update({
            where: { id: trip.id },
            data: { status: 'COMPLETED' }
          });

          if (trip.busId) {
            await tx.bus.update({
              where: { id: trip.busId },
              data: { currentLocation: trip.to }
            });
          }

          if (trip.driverId) {
            await tx.driver.update({
              where: { id: trip.driverId },
              data: { 
                baseLocation: trip.to,
                status: 'RESTING' 
              }
            });
          }

          // 🟢 BÁC DÁN ĐOẠN GHI LOG VÀO ĐÚNG CHỖ NÀY NHÉ (VẪN NẰM TRONG tx)
          await tx.adminLog.create({
            data: {
              action: 'AUTO_COMPLETED',
              entityType: 'TRIP',
              entityId: trip.id.toString(),
              details: { reason: `Bot xác nhận xe cập bến an toàn (Chuyển trạng thái COMPLETED và xoay vòng xe)` }
            }
          });

        }); // <-- ĐÂY LÀ DẤU ĐÓNG CỦA BLOCK tx
        console.log(`✅ [Auto] Chuyến ${trip.id} (${trip.from} -> ${trip.to}) đã CẬP BẾN.`);
      }
    }
    
  } catch (error) {
    console.error(`❌ [Auto-Dispatch] Lỗi trong quá trình tự động:`, error);
  }
  // ... code đổi vị trí baseLocation tài xế cũ ...
}

export async function syncTrips() {
  console.log('🔄 Bắt đầu đồng bộ chuyến xe...');

  // Xóa các chuyến cũ
  await deleteOldTrips();

  const today = new Date();
  // Vòng lặp từ 0 đến 6 (tổng cộng 7 ngày) - Sang ngày 8 không có vé
  for (let i = 0; i < DAYS_AHEAD; i++) {
    await ensureTripsForDate(addDays(today, i));
  }

  // Cập nhật tất cả các chuyến xe có busType là null thành 'Limousine'
  await prisma.trip.updateMany({
    where: {
      busType: null,
    },
    data: {
      busType: 'Limousine',
    },
  });

  console.log('✅ Đồng bộ chuyến xe xong.');
}

export function startTripMaintenance() {
  syncTrips().catch(console.error);

  cron.schedule(
    '5 0 * * *',
    async () => {
      await syncTrips();
    },
    {
      timezone: 'Asia/Ho_Chi_Minh',
    },
  );

  // 🟢 THÊM CRON JOB MỚI NÀY VÀO ĐÂY ĐỂ CHẠY HÀM AUTO MỖI PHÚT
  cron.schedule(
    '* * * * *', 
    async () => {
      await autoDispatchTrips();
    },
    {
      timezone: 'Asia/Ho_Chi_Minh',
    }
  );
}