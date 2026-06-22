import * as cron from 'node-cron';
import { PrismaService } from '../prisma/prisma.service';

// 🔥 Biến global để dùng trong toàn file
let prisma: PrismaService;
let isDispatching = false; // 🟢 Biến lock để chống chạy song song gây nghẽn DB pool

// 🔥 Hàm inject từ main.ts
export function initTripMaintenance(prismaService: PrismaService) {
  prisma = prismaService;
  console.log('PRISMA INIT:', !!prisma);
}

const DAYS_AHEAD = 7;
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
  '00:00:00',
  '06:00:00',
  '12:00:00',
  '18:00:00',
  '22:00:00',
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

// Tự động tạo các chuyến khứ hồi (chiều về) chống trùng lặp
const ALL_ROUTES: typeof ROUTES = [];
const routeSet = new Set<string>();

for (const route of ROUTES) {
  const key1 = `${route.a}-${route.b}`;
  if (!routeSet.has(key1)) {
    ALL_ROUTES.push(route);
    routeSet.add(key1);
  }
  const key2 = `${route.b}-${route.a}`;
  if (!routeSet.has(key2)) {
    ALL_ROUTES.push({ a: route.b, b: route.a, distanceKm: route.distanceKm, durationMinutes: route.durationMinutes });
    routeSet.add(key2);
  }
}

function getBusType(distanceKm: number) {
  if (distanceKm <= 500) return 'Limousine';
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
  for (const route of ALL_ROUTES) {
    for (const time of TIME_SLOTS) {
      const departDate = makeVNDate(targetDate, time);
      const arrivalDate = addMinutes(departDate, route.durationMinutes);

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
          busType: getBusType(route.distanceKm) || 'Limousine',
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
        where: { id: trip.id },
        update: { numTickets: DEFAULT_TICKETS },
        create: { tripId: trip.id, numTickets: DEFAULT_TICKETS },
      });
    }
  }
}

// Xoá các chuyến xe đã hết hạn
async function deleteOldTrips() {
  const todayStart = startOfTodayVN();

  const oldTrips = await prisma.trip.findMany({
    where: { departDate: { lt: todayStart } },
    include: {
      outboundOrders: {
        where: {
          paymentStatus: 'PAID',
          bookingStatus: { in: ['CONFIRMED', 'COMPLETED'] },
        },
      },
    },
  });

  const tripIds = oldTrips.map((t) => t.id);
  const ordersToArchive = oldTrips.flatMap((t) => t.outboundOrders.map((order) => order.id));

  if (ordersToArchive.length > 0) {
    await prisma.order.updateMany({
      where: { id: { in: ordersToArchive } },
      data: { bookingStatus: 'ARCHIVED' },
    });
    console.log(`📦 Đã lưu ${ordersToArchive.length} đơn hàng đã thanh toán vào lưu trữ.`);
  }

  if (tripIds.length > 0) {
    await prisma.trip.deleteMany({ where: { id: { in: tripIds } } });
    console.log(`🗑️ Đã xóa ${tripIds.length} chuyến xe đã hết hạn.`);
  }
}

// 🔥 TỰ ĐỘNG XOÁ ĐƠN HÀNG QUÁ HẠN VÀ NHĂNG GHẾ
async function cancelExpiredBookings() {
  const now = new Date();
  try {
    const expiredOrders = await prisma.order.findMany({
      where: {
        paymentStatus: 'PENDING',
        bookingStatus: 'HOLD',
        qrExpiredAt: { lte: now },
      },
      select: { id: true, orderCode: true },
      take: 10,
    });

    for (const order of expiredOrders) {
      try {
        await prisma.$transaction(async (tx) => {
          await tx.orderSeat.deleteMany({ where: { orderId: order.id } });
          await tx.order.delete({ where: { id: order.id } });
          await tx.adminLog.create({
            data: {
              action: 'ORDER_UPDATE',
              entityType: 'ORDER',
              entityId: order.id.toString(),
              details: { reason: 'Bot tự động xoá đơn quá hạn thanh toán, giải phóng ghế.' },
            },
          });
        });
        console.log(`⏳ [Auto-Expire] Đã tự động hủy đơn hàng quá hạn ${order.orderCode} và nhả ghế.`);
      } catch (err: any) {
        if (err?.code !== 'P2025') {
          console.error(`❌ [Auto-Expire] Lỗi xoá đơn ${order.orderCode}:`, err);
        }
      }
    }
  } catch (error) {
    console.error(`❌ [Auto-Expire] Lỗi dọn dẹp đơn hàng quá hạn:`, error);
  }
}

// 🔥 TỰ ĐỘNG ĐIỀU PHỐI (CHẠY MỖI PHÚT)
async function autoDispatchTrips() {
  if (isDispatching) {
    console.log('⏳ [Auto-Dispatch] Tiến trình cũ đang chạy, bỏ qua lần này để tránh nghẽn DB pool.');
    return;
  }
  isDispatching = true;

  // 🟢 Hard timeout 55s: nếu chạy quá lâu thì tự reset lock, tránh kẹt vĩnh viễn
  const lockTimeout = setTimeout(() => {
    if (isDispatching) {
      console.warn('⚠️ [Auto-Dispatch] Hard timeout 55s — tự reset lock isDispatching.');
      isDispatching = false;
    }
  }, 55_000);

  const now = new Date();

  try {
    // 1. Dọn dẹp giữ chỗ quá hạn
    await cancelExpiredBookings();

    // 2. Tự động phân công tài & xe (trước 168 tiếng)
    const oneHundredSixtyEightHoursFromNow = new Date(now.getTime() + 168 * 60 * 60 * 1000);
    const tripsNeedsAssignment = await prisma.trip.findMany({
      where: {
        status: 'PUBLISHED',
        driverId: null,
        departDate: { lte: oneHundredSixtyEightHoursFromNow, gt: now },
      },
      take: 10,
    });

    for (const trip of tripsNeedsAssignment) {
      const forwardRoute = `${trip.from} ➔ ${trip.to}`;
      const backwardRoute = `${trip.to} ➔ ${trip.from}`;

      const availableDriver = await prisma.driver.findFirst({
        where: {
          status: 'AVAILABLE',
          baseLocation: trip.from,
          OR: [
            { routeCode: forwardRoute },
            { routeCode: backwardRoute },
            { routeCode: 'ALL' },
          ],
          defaultBusId: { not: null },
          assignments: {
            none: {
              status: { not: 'CANCELLED' },
              AND: [
                { startTime: { lt: new Date(trip.departDate.getTime() + trip.durationMinutes * 60000 + 2 * 3600000) } },
                { endTime: { gt: new Date(trip.departDate.getTime() - 1800000) } },
              ],
            },
          },
        },
      });

      if (availableDriver && availableDriver.defaultBusId) {
        await prisma.$transaction(async (tx) => {
          await tx.trip.update({
            where: { id: trip.id },
            data: { driverId: availableDriver.id, busId: availableDriver.defaultBusId },
          });
          await tx.driverAssignment.create({
            data: {
              tripId: trip.id,
              driverId: availableDriver.id,
              startTime: new Date(trip.departDate.getTime() - 30 * 60 * 1000),
              endTime: new Date(trip.departDate.getTime() + trip.durationMinutes * 60000),
              status: 'ASSIGNED',
            },
          });
          await tx.adminLog.create({
            data: {
              action: 'AUTO_DISPATCH',
              entityType: 'TRIP',
              entityId: trip.id.toString(),
              details: {
                reason: `Bot tự động phân công tài xế ${availableDriver.driverCode}`,
                driverId: availableDriver.id,
                busId: availableDriver.defaultBusId,
              },
            },
          });
        });
        console.log(`🤖 [Auto-Assign] Đã điều tài xế ${availableDriver.driverCode} cho chuyến ${trip.from} -> ${trip.to}`);
      }
    }

    // 3. Gửi nhắc nhở khởi hành (45-75 phút trước)
    const reminderWindowStart = new Date(now.getTime() + 45 * 60 * 1000);
    const reminderWindowEnd = new Date(now.getTime() + 75 * 60 * 1000);

    for (const order of await prisma.order.findMany({
      where: { paymentStatus: 'PAID', bookingStatus: 'CONFIRMED', outboundDepartDateSnapshot: { gte: reminderWindowStart, lte: reminderWindowEnd } },
      take: 10,
    })) {
      if (order.userId) {
        const exists = await prisma.notification.findFirst({ where: { userId: order.userId, title: 'Nhắc nhở hành trình ⏰', content: { contains: `#${order.orderCode}` } } });
        if (!exists) {
          const t = order.outboundDepartDateSnapshot ? new Date(order.outboundDepartDateSnapshot).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '';
          await prisma.notification.create({ data: { userId: order.userId, title: 'Nhắc nhở hành trình ⏰', content: `Chuyến xe đi ${order.to} (#${order.orderCode}) khởi hành lúc ${t}. Có mặt trước 15 phút!`, type: 'TRIP', isRead: false } });
        }
      }
    }

    for (const order of await prisma.order.findMany({
      where: { paymentStatus: 'PAID', bookingStatus: 'CONFIRMED', tripType: 'round', returnDepartDateSnapshot: { gte: reminderWindowStart, lte: reminderWindowEnd } },
      take: 10,
    })) {
      if (order.userId) {
        const exists = await prisma.notification.findFirst({ where: { userId: order.userId, title: 'Nhắc nhở hành trình ⏰', content: { contains: `#${order.orderCode}` } } });
        if (!exists) {
          const t = order.returnDepartDateSnapshot ? new Date(order.returnDepartDateSnapshot).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '';
          await prisma.notification.create({ data: { userId: order.userId, title: 'Nhắc nhở hành trình ⏰', content: `Chuyến xe về ${order.to} (#${order.orderCode}) khởi hành lúc ${t}. Có mặt trước 15 phút!`, type: 'TRIP', isRead: false } });
        }
      }
    }

    // 4. Tự động xuất bến (PUBLISHED → RUNNING)
    const tripsToStart = await prisma.trip.findMany({
      where: { status: 'PUBLISHED', departDate: { lte: now }, driverId: { not: null }, busId: { not: null } },
      take: 10,
    });

    for (const trip of tripsToStart) {
      await prisma.$transaction(async (tx) => {
        await tx.trip.update({ where: { id: trip.id }, data: { status: 'RUNNING' } });
        if (trip.driverId) await tx.driver.update({ where: { id: trip.driverId }, data: { status: 'ON_TRIP' } });
        await tx.adminLog.create({ data: { action: 'TRIP_UPDATE', entityType: 'TRIP', entityId: trip.id.toString(), details: { reason: 'Bot xác nhận xe xuất bến (RUNNING)' } } });

        const passengerOrders = await tx.order.findMany({ where: { OR: [{ outboundTripId: trip.id }, { returnTripId: trip.id }], paymentStatus: 'PAID', bookingStatus: { not: 'CANCELLED' } } });
        for (const order of passengerOrders) {
          if (order.userId) await tx.notification.create({ data: { userId: order.userId, title: 'Xe xuất bến 🚌', content: `Chuyến xe đi ${trip.to} (#${order.orderCode}) đã xuất bến. Chúc hành trình an toàn!`, type: 'TRIP', isRead: false } });
        }
      });
      console.log(`🚀 [Auto] Chuyến ${trip.id} (${trip.from} -> ${trip.to}) XUẤT BẾN.`);
    }

    // 5. Tự động cập bến (RUNNING → COMPLETED)
    const tripsToComplete = await prisma.trip.findMany({
      where: { status: 'RUNNING', arrivalDate: { lte: now } },
      take: 10,
    });

    for (const trip of tripsToComplete) {
      await prisma.$transaction(async (tx) => {
        await tx.trip.update({ where: { id: trip.id }, data: { status: 'COMPLETED' } });
        if (trip.busId) await tx.bus.update({ where: { id: trip.busId }, data: { currentLocation: trip.to, status: 'READY' } });
        if (trip.driverId) {
          await tx.driver.update({ where: { id: trip.driverId }, data: { baseLocation: trip.to, status: 'RESTING' } });
          await tx.driverAssignment.updateMany({ where: { tripId: trip.id, driverId: trip.driverId }, data: { status: 'COMPLETED' } });
        }
        await tx.adminLog.create({ data: { action: 'AUTO_COMPLETED', entityType: 'TRIP', entityId: trip.id.toString(), details: { reason: 'Bot xác nhận xe cập bến an toàn (COMPLETED)' } } });
        await tx.order.updateMany({ where: { outboundTripId: trip.id, tripType: 'oneway', paymentStatus: 'PAID', bookingStatus: { not: 'CANCELLED' } }, data: { bookingStatus: 'COMPLETED' } });

        const passengerOrders = await tx.order.findMany({ where: { OR: [{ outboundTripId: trip.id }, { returnTripId: trip.id }], paymentStatus: 'PAID', bookingStatus: { not: 'CANCELLED' } } });
        for (const order of passengerOrders) {
          if (order.userId) await tx.notification.create({ data: { userId: order.userId, title: 'Xe cập bến an toàn 🏁', content: `Chuyến xe đi ${trip.to} (#${order.orderCode}) đã cập bến. Cảm ơn bạn đã chọn ABC Bus Lines!`, type: 'TRIP', isRead: false } });
        }
      });
      console.log(`✅ [Auto] Chuyến ${trip.id} (${trip.from} -> ${trip.to}) CẬP BẾN.`);
    }

    // 6. Tài xế nghỉ đủ 2 tiếng → AVAILABLE
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    const assignmentsToRelease = await prisma.driverAssignment.findMany({
      where: { endTime: { lte: twoHoursAgo }, driver: { status: 'RESTING' } },
      include: { driver: true, trip: true },
      take: 10,
    });

    for (const assign of assignmentsToRelease) {
      await prisma.$transaction(async (tx) => {
        await tx.driver.update({ where: { id: assign.driverId }, data: { status: 'AVAILABLE' } });
        if (assign.trip.busId) await tx.bus.update({ where: { id: assign.trip.busId }, data: { status: 'READY' } });
      });
      console.log(`☕ [Auto] Tài xế ${assign.driver.name} nghỉ xong. SẴN SÀNG nhận chuyến mới.`);
    }

  } catch (error: any) {
    // 🟢 P1017 = Railway đóng kết nối idle — tự động reconnect
    if (error?.code === 'P1017' || error?.message?.includes('Server has closed the connection')) {
      console.warn('⚠️ [Auto-Dispatch] Kết nối DB bị đóng (P1017). Đang reconnect...');
      try {
        await prisma.$connect();
        console.log('✅ [Auto-Dispatch] Reconnect thành công. Sẽ thử lại ở lần cron tiếp theo.');
      } catch (reconnectErr) {
        console.error('❌ [Auto-Dispatch] Reconnect thất bại:', reconnectErr);
      }
    } else {
      console.error('❌ [Auto-Dispatch] Lỗi trong quá trình tự động:', error);
    }
  } finally {
    clearTimeout(lockTimeout);
    isDispatching = false; // 🟢 Giải phóng lock
  }
}

export async function syncTrips() {
  console.log('🔄 Bắt đầu đồng bộ chuyến xe...');

  await deleteOldTrips();

  const today = new Date();
  for (let i = 0; i < DAYS_AHEAD; i++) {
    await ensureTripsForDate(addDays(today, i));
  }

  await prisma.trip.updateMany({
    where: { busType: null },
    data: { busType: 'Limousine' },
  });

  console.log('✅ Đồng bộ chuyến xe xong.');
}

export function startTripMaintenance() {
  // Cron hàng ngày lúc 00:05 — tạo/xóa chuyến
  cron.schedule(
    '5 0 * * *',
    async () => { await syncTrips(); },
    { timezone: 'Asia/Ho_Chi_Minh' },
  );

  // Cron mỗi phút — điều phối tự động
  cron.schedule(
    '* * * * *',
    async () => { await autoDispatchTrips(); },
    { timezone: 'Asia/Ho_Chi_Minh' },
  );
}