const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const args = process.argv.slice(2);

  if (args.length < 3) {
    console.log(`
==================================================================
   👑 NHÀ XE ABC - CÔNG CỤ ĐỔI GHẾ SIÊU TỐC CHO ADMIN 👑
==================================================================

Hướng dẫn sử dụng:
  node swap-seat.js <Mã_Đơn_Hàng> <Ghế_Hiện_Tại> <Ghế_Mong_Muốn> [Chiều_Chuyến]

Trong đó:
  - <Mã_Đơn_Hàng>   : Ví dụ "779093390241"
  - <Ghế_Hiện_Tại>  : Số ghế hiện tại cần đổi (Ví dụ "A1")
  - <Ghế_Mong_Muốn> : Số ghế mới khách muốn chuyển qua (Ví dụ "A2")
  - [Chiều_Chuyến]  : (Tùy chọn) "outbound" (chiều đi) hoặc "return" (chiều về). Mặc định là "outbound".

Ví dụ thực tế:
  node swap-seat.js 779093390241 A1 A2
==================================================================
`);
    process.exit(0);
  }

  const orderCode = args[0].trim();
  const currentSeat = args[1].trim().toUpperCase();
  const newSeat = args[2].trim().toUpperCase();
  const direction = (args[3] || 'outbound').trim().toLowerCase();

  console.log(`\n⏳ Đang kết nối CSDL và xử lý đổi ghế cho Đơn hàng #${orderCode}...`);

  // 1. Tìm đơn hàng
  const order = await prisma.order.findUnique({
    where: { orderCode },
    include: {
      seats: true
    }
  });

  if (!order) {
    console.error(`❌ LỖI: Không tìm thấy đơn hàng nào có mã #${orderCode}!`);
    process.exit(1);
  }

  console.log(`✅ Tìm thấy Đơn hàng của khách hàng: ${order.customerName} (${order.customerPhone})`);
  console.log(`👉 Trạng thái đơn hàng: ${order.bookingStatus} | Thanh toán: ${order.paymentStatus}`);

  if (order.bookingStatus === 'CANCELLED') {
    console.error(`❌ LỖI: Đơn hàng này đã bị HUỶ trước đó, không thể thực hiện đổi ghế!`);
    process.exit(1);
  }

  // 2. Tìm ghế hiện tại trong đơn hàng
  const targetSeatRecord = order.seats.find(
    s => s.seatNumber.toUpperCase() === currentSeat && s.tripDirection === direction
  );

  if (!targetSeatRecord) {
    console.error(`❌ LỖI: Ghế ${currentSeat} (${direction === 'outbound' ? 'Chiều đi' : 'Chiều về'}) không nằm trong đơn hàng #${orderCode}!`);
    console.log(`Các ghế hiện tại của đơn hàng này:`, order.seats.map(s => `${s.seatNumber} (${s.tripDirection})`));
    process.exit(1);
  }

  const tripId = targetSeatRecord.tripId;
  console.log(`✅ Xác định được Chuyến xe (Trip ID): ${tripId}`);

  // 3. KIỂM TRA CHỐNG TRÙNG GHẾ (Anti-Collision Check)
  // Tìm xem có đơn hàng ACTIVE nào khác đã giữ ghế mới trên cùng chuyến đi này chưa
  const occupiedSeat = await prisma.orderSeat.findFirst({
    where: {
      tripId: tripId,
      tripDirection: direction,
      seatNumber: newSeat,
      order: {
        bookingStatus: {
          not: 'CANCELLED'
        }
      }
    },
    include: {
      order: true
    }
  });

  if (occupiedSeat) {
    console.error(`\n🚨 CẢNH BÁO TRÙNG GHẾ: Ghế mới [${newSeat}] đã được đặt bởi một hành khách khác!`);
    console.error(`- Đơn đặt ghế mới: #${occupiedSeat.order.orderCode}`);
    console.error(`- Tên khách đang giữ ghế mới: ${occupiedSeat.order.customerName}`);
    console.error(`❌ Giao dịch đổi ghế bị từ chối để bảo vệ hệ thống khỏi Double-booking!`);
    process.exit(1);
  }

  console.log(`✅ Tuyệt vời! Ghế mới [${newSeat}] hiện đang TRỐNG trên chuyến đi.`);

  // 4. TIẾN HÀNH ĐỔI GHẾ TRONG TRANSACTION
  console.log(`⚡ Đang tiến hành cập nhật ghế sang [${newSeat}]...`);
  
  await prisma.$transaction(async (tx) => {
    // Cập nhật số ghế trong OrderSeat
    await tx.orderSeat.update({
      where: { id: targetSeatRecord.id },
      data: { seatNumber: newSeat }
    });

    // Tạo nhật ký hệ thống (Audit Log nếu có bảng, hoặc chỉ in ra console)
    console.log(`💾 Đã cập nhật CSDL thành công!`);
  });

  console.log(`\n==================================================================`);
  console.log(`🎉 ĐỔI GHẾ THÀNH CÔNG RỰC RỠ! 🎉`);
  console.log(`- Hành khách   : ${order.customerName}`);
  console.log(`- Mã đơn hàng  : #${order.orderCode}`);
  console.log(`- Chuyến đi ID : ${tripId}`);
  console.log(`- Chi tiết đổi : Ghế [${currentSeat}] ➡️ Ghế [${newSeat}] (${direction === 'outbound' ? 'Chiều đi' : 'Chiều về'})`);
  console.log(`==================================================================\n`);
}

main()
  .catch(e => {
    console.error(`❌ Đã xảy ra lỗi hệ thống nghiêm trọng:`, e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
