const fs = require('fs');

const path = 'd:\\nha-xe-abc\\mobile\\constants\\translations.ts';
let content = fs.readFileSync(path, 'utf8');

const viKeysToAdd = `,
  "trust": {
    "header": "Cam kết dịch vụ 5 sao",
    "safeTitle": "An toàn tối đa",
    "safeDesc": "Tài xế được đào tạo chuyên nghiệp, xe bảo dưỡng định kỳ",
    "comfortTitle": "Tiện nghi cao cấp",
    "comfortDesc": "Wifi, nước uống, cổng sạc USB, chăn gối mỗi ghế",
    "ontimeTitle": "Đúng giờ cam kết",
    "ontimeDesc": "Khởi hành và đến nơi đúng giờ hoặc hoàn tiền",
    "loyaltyTitle": "LotusMiles VIP",
    "loyaltyDesc": "Tích điểm mỗi chuyến, đổi quà và ưu đãi hấp dẫn",
    "supportTitle": "Hỗ trợ 24/7",
    "supportDesc": "Đội ngũ CSKH trực tuyến mọi lúc, mọi nơi cho bạn",
    "fastTitle": "Đặt vé nhanh chóng",
    "fastDesc": "Chỉ 3 bước đặt vé online, xác nhận ngay tức thì"
  },
  "popular": {
    "header": "Tuyến đường phổ biến",
    "departFrom": "Khởi hành từ",
    "bookingsCount": "{count} lượt đặt"
  },
  "home": {
    "aiBadge": "Trải Nghiệm Công Nghệ Mới",
    "aiTitle": "ĐẶT VÉ THÔNG MINH CÙNG AI",
    "aiDesc": "Trợ lý AI giúp bạn đặt vé, kiểm tra giá, tra cứu chuyến đi hoặc hướng dẫn hủy vé 24/7 tức thì bằng giọng nói & tin nhắn tự nhiên.",
    "aiInstruction": "Nói tự nhiên: \\"Tôi muốn đặt vé đi Đà Lạt sáng mai\\" để chọn ghế & nhận mã QR thanh toán sau 30 giây.",
    "aiSuggestTitle": "Gợi ý vị trí tốt nhất",
    "aiSuggestDesc": "Tự động ghi nhớ thói quen đi lại, sở thích chọn ghế (cạnh cửa sổ, giường dưới) để đề xuất chuyến đi hoàn hảo.",
    "aiBtn": "Thử Chat với AI Ngay",
    "scheduleHeader": "HÀNH TRÌNH KHAI THÁC",
    "scheduleTitle": "Lịch trình chạy hàng ngày",
    "scheduleFrom": "Điểm đi...",
    "scheduleTo": "Điểm đến...",
    "loading": "Đang tải dữ liệu...",
    "routeFrom": "Tuyến đi từ {fromName}",
    "basePrice": "GIÁ VÉ GỐC",
    "noRoutes": "Không tìm thấy tuyến đường phù hợp",
    "noRoutesDesc": "Hãy thử tìm kiếm với các từ khóa hoặc địa điểm khác."
  },
  "loyalty": {
    "myVouchersTitle": "Ưu đãi của bạn",
    "myVouchersDesc": "Các mã giảm giá bạn đang sở hữu và có thể áp dụng khi thanh toán vé",
    "noVouchers": "Bạn chưa sở hữu mã giảm giá nào",
    "redeemNow": "Đổi điểm ngay",
    "statusUsed": "ĐÃ DÙNG",
    "statusAvailable": "KHẢ DỤNG",
    "redeemTitle": "Đổi quà ưu đãi",
    "redeemDesc": "Sử dụng điểm tích lũy của bạn để lấy mã giảm giá trực tiếp vào giá vé xe",
    "noRedeemable": "Hiện tại chưa có chương trình đổi quà nào",
    "discountPercent": "Giảm {value}%",
    "discountAmount": "Giảm {value}đ",
    "maxDiscount": "Tối đa {value}đ",
    "btnRedeem": "ĐỔI QUÀ",
    "historyTitle": "Lịch sử giao dịch điểm",
    "historyDesc": "Nhật ký quá trình cộng điểm đi xe và trừ điểm khi đổi vouchers",
    "noHistory": "Bạn chưa có lịch sử tích điểm nào",
    "cardTitle": "THÀNH VIÊN ABC BUS LINES",
    "cardPoints": "ĐIỂM TÍCH LŨY",
    "cardTrips": "{count} chuyến"
  },
  "filter": {
    "title": "Bộ lọc tìm kiếm",
    "statusSection": "Trạng thái chuyến",
    "typeSection": "Loại vé",
    "reset": "Thiết lập lại",
    "apply": "Áp dụng"
  },
  "ticket": {
    "modalTitle": "Vé điện tử",
    "scanPrompt": "Quét để xác minh vé",
    "statusValid": "Vé hợp lệ - Đã xác nhận",
    "statusCancelled": "Vé đã bị hủy",
    "statusPending": "Chờ xác nhận thanh toán",
    "seats": "Số ghế",
    "total": "Tổng tiền",
    "share": "Chia sẻ vé",
    "shareAlertTitle": "Thông báo",
    "shareAlertDesc": "Chụp màn hình vé để lưu về điện thoại!",
    "save": "Lưu vé",
    "shareMessage": "🎫 Vé xe ABC - Mã đơn: #{code}\\n💺 Ghế: {seats}\\n"
  },
  "rating": {
    "title": "Đánh giá chuyến đi",
    "subTitle": "Đánh giá của bạn giúp chúng tôi cải thiện dịch vụ tốt hơn mỗi ngày 🙏",
    "thankYou": "Cảm ơn bạn!",
    "starPrompt": "Chọn số sao đánh giá",
    "star1": "Rất tệ 😞",
    "star2": "Tệ 😕",
    "star3": "Bình thường 😐",
    "star4": "Tốt 😊",
    "star5": "Tuyệt vời! 🤩",
    "missingStarTitle": "Thiếu đánh giá",
    "missingStarDesc": "Vui lòng chọn ít nhất 1 sao để gửi đánh giá!",
    "quickFeedback": "Nhận xét nhanh",
    "commentLabel": "Bình luận thêm (tùy chọn)",
    "commentPlaceholder": "Chia sẻ trải nghiệm của bạn về chuyến đi này...",
    "submitting": "Đang gửi...",
    "submit": "Gửi đánh giá",
    "feedbackSeat": "💺 Ghế thoải mái",
    "feedbackOntime": "⏰ Đúng giờ",
    "feedbackClean": "🚌 Xe sạch sẽ",
    "feedbackDriver": "😊 Tài xế thân thiện",
    "feedbackService": "⭐ Dịch vụ tốt",
    "feedbackSmooth": "🛣️ Chạy êm ái",
    "errorTitle": "Lỗi",
    "errorDefault": "Lỗi gửi đánh giá, vui lòng thử lại."
  }`;

const enKeysToAdd = `,
  "trust": {
    "header": "5-Star Service Commitments",
    "safeTitle": "Maximum Safety",
    "safeDesc": "Professionally trained drivers, periodic bus maintenance",
    "comfortTitle": "Premium Comfort",
    "comfortDesc": "Wifi, water, USB ports, pillows & blankets at each seat",
    "ontimeTitle": "On-Time Commitment",
    "ontimeDesc": "On-time departure & arrival, or get a full refund",
    "loyaltyTitle": "LotusMiles VIP",
    "loyaltyDesc": "Earn points on every trip, redeem gifts & hot offers",
    "supportTitle": "24/7 Customer Support",
    "supportDesc": "Online customer service team anytime, anywhere for you",
    "fastTitle": "Quick Booking",
    "fastDesc": "Only 3 steps to book online with instant confirmation"
  },
  "popular": {
    "header": "Popular Routes",
    "departFrom": "Depart from",
    "bookingsCount": "{count} booking(s)"
  },
  "home": {
    "aiBadge": "Experience New Tech",
    "aiTitle": "SMART BOOKING WITH AI",
    "aiDesc": "AI Assistant helps you book tickets, check prices, search routes, or guide cancellations 24/7 via voice & natural text.",
    "aiInstruction": "Speak naturally: \\"I want to book a ticket to Da Lat tomorrow morning\\" to select seats & get QR payment in 30 seconds.",
    "aiSuggestTitle": "Best Seat Suggestion",
    "aiSuggestDesc": "Automatically remembers travel habits, seat preferences (window, lower bed) to recommend the perfect trip.",
    "aiBtn": "Try AI Chat Now",
    "scheduleHeader": "OPERATIONAL ROUTES",
    "scheduleTitle": "Daily Bus Schedule",
    "scheduleFrom": "Origin...",
    "scheduleTo": "Destination...",
    "loading": "Loading data...",
    "routeFrom": "Routes departing from {fromName}",
    "basePrice": "BASE PRICE",
    "noRoutes": "No matching routes found",
    "noRoutesDesc": "Please try searching with other keywords or locations."
  },
  "loyalty": {
    "myVouchersTitle": "Your Offers",
    "myVouchersDesc": "Discount codes you own which can be applied during ticket checkout",
    "noVouchers": "You don't own any discount codes yet",
    "redeemNow": "Redeem Points Now",
    "statusUsed": "USED",
    "statusAvailable": "AVAILABLE",
    "redeemTitle": "Redeem Offers",
    "redeemDesc": "Use your accumulated points to get discount codes applied directly to ticket prices",
    "noRedeemable": "There are no rewards programs available right now",
    "discountPercent": "Save {value}%",
    "discountAmount": "Save {value}đ",
    "maxDiscount": "Max {value}đ",
    "btnRedeem": "REDEEM",
    "historyTitle": "Points Transaction History",
    "historyDesc": "Log of points earned from trips and deducted for voucher redemption",
    "noHistory": "You have no points history yet",
    "cardTitle": "ABC BUS LINES MEMBER",
    "cardPoints": "ACCUMULATED POINTS",
    "cardTrips": "{count} trip(s)"
  },
  "filter": {
    "title": "Search Filters",
    "statusSection": "Trip Status",
    "typeSection": "Ticket Type",
    "reset": "Reset",
    "apply": "Apply"
  },
  "ticket": {
    "modalTitle": "E-Ticket",
    "scanPrompt": "Scan to verify ticket",
    "statusValid": "Valid - Confirmed",
    "statusCancelled": "Cancelled",
    "statusPending": "Pending Payment Confirmation",
    "seats": "Seats",
    "total": "Total Amount",
    "share": "Share Ticket",
    "shareAlertTitle": "Notice",
    "shareAlertDesc": "Take a screenshot of the ticket to save to your phone!",
    "save": "Save Ticket",
    "shareMessage": "🎫 ABC Ticket - Order Code: #{code}\\n💺 Seats: {seats}\\n"
  },
  "rating": {
    "title": "Rate Trip",
    "subTitle": "Your review helps us improve our service every day 🙏",
    "thankYou": "Thank you!",
    "starPrompt": "Select rating stars",
    "star1": "Very bad 😞",
    "star2": "Bad 😕",
    "star3": "Average 😐",
    "star4": "Good 😊",
    "star5": "Excellent! 🤩",
    "missingStarTitle": "Missing Rating",
    "missingStarDesc": "Please select at least 1 star to submit your review!",
    "quickFeedback": "Quick tags",
    "commentLabel": "Additional comment (optional)",
    "commentPlaceholder": "Share your experience about this trip...",
    "submitting": "Submitting...",
    "submit": "Submit Review",
    "feedbackSeat": "💺 Comfortable Seat",
    "feedbackOntime": "⏰ On Time",
    "feedbackClean": "🚌 Clean Bus",
    "feedbackDriver": "😊 Friendly Driver",
    "feedbackService": "⭐ Good Service",
    "feedbackSmooth": "🛣️ Smooth Ride",
    "errorTitle": "Error",
    "errorDefault": "Failed to submit review, please try again."
  }`;

// Insert viKeysToAdd before the en block starts.
// The en block starts with `en: {` or `  en: {`
const targetVi = `  "redeem_history": "Lịch sử"\n}`;
const replacementVi = `  "redeem_history": "Lịch sử"${viKeysToAdd}\n}`;

if (content.includes(targetVi)) {
  content = content.replace(targetVi, replacementVi);
  console.log('Inserted VI keys successfully!');
} else {
  console.error('Could not find target VI insert spot');
}

// Insert enKeysToAdd before the final closing bracket.
const targetEn = `  "redeem_history": "History"\n}`;
const replacementEn = `  "redeem_history": "History"${enKeysToAdd}\n}`;

if (content.includes(targetEn)) {
  content = content.replace(targetEn, replacementEn);
  console.log('Inserted EN keys successfully!');
} else {
  console.error('Could not find target EN insert spot');
}

fs.writeFileSync(path, content, 'utf8');
console.log('translations.ts updated successfully!');
