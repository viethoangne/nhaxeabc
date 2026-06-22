const fs = require('fs');
const path = require('path');

const viPath = path.join(__dirname, '../../web/messages/vi.json');
const enPath = path.join(__dirname, '../../web/messages/en.json');
const outputPath = path.join(__dirname, '../constants/translations.ts');

const viRaw = fs.readFileSync(viPath, 'utf8');
const enRaw = fs.readFileSync(enPath, 'utf8');

const viJson = JSON.parse(viRaw);
const enJson = JSON.parse(enRaw);

// Add custom labels that were defined in the mobile implementation plan
viJson.settings_title = 'Cài đặt hệ thống';
viJson.theme = 'Giao diện';
viJson.language = 'Ngôn ngữ';
viJson.theme_light = 'Giao diện Sáng';
viJson.theme_dark = 'Giao diện Tối';
viJson.lang_vi = 'Tiếng Việt';
viJson.lang_en = 'English';

// Mobile notifications translation
viJson.notifications_title = 'Thông báo';
viJson.notifications_desc = 'Cập nhật hành trình, vé xe và ưu đãi dành riêng cho bạn';
viJson.not_logged_in = 'Chưa đăng nhập';
viJson.notifications_login_desc = 'Đăng nhập tài khoản để xem các thông báo hành trình cá nhân của bạn.';
viJson.login_now = 'Đăng nhập ngay';
viJson.no_notifications = 'Không có thông báo mới';
viJson.no_notifications_desc = 'Các thông báo ưu đãi và chuyến đi sẽ được gửi đến đây khi có thông tin mới nhất.';
viJson.all = 'Tất cả';
viJson.unread = 'Chưa đọc';
viJson.new = 'Mới';
viJson.previous = 'Trước đó';
viJson.notifications_read_all = 'Đọc tất cả';
viJson.no_unread_notifications = 'Không có thông báo chưa đọc';
viJson.no_unread_notifications_desc = 'Tuyệt vời! Bạn đã đọc toàn bộ thông báo.';
viJson.notification_options = 'Tùy chọn thông báo';
viJson.notification_options_desc = 'Chọn tác vụ bạn muốn thực hiện:';
viJson.mark_all_read = 'Đánh dấu tất cả đã đọc';
viJson.delete_all_notifications = 'Xóa toàn bộ thông báo';
viJson.confirm_delete_all = 'Bạn có chắc chắn muốn xóa toàn bộ thông báo?';
viJson.cancel = 'Hủy';
viJson.delete = 'Xóa';
viJson.close = 'Đóng';
viJson.notification_action = 'Chức năng thông báo';
viJson.mark_read = 'Đánh dấu là đã đọc';
viJson.delete_notification = 'Xóa thông báo này';
viJson.mute_type = 'Tắt thông báo loại này';
viJson.report_issue = 'Báo cáo sự cố cho Đội ngũ hỗ trợ';
viJson.just_now = 'Vừa xong';
viJson.minutes_ago = 'phút trước';
viJson.hours_ago = 'giờ trước';
viJson.yesterday = 'Hôm qua';
viJson.days_ago = 'ngày trước';

// Grid navigation translation
viJson.buy_tickets = 'Mua vé';
viJson.lookup_title = 'Tra cứu';
viJson.news_title = 'Tin tức';
viJson.about_title = 'Giới thiệu';

// Mobile booking / history custom empty state
viJson.empty_history_desc = 'Vui lòng đăng nhập tài khoản Google để đồng bộ và xem toàn bộ lịch sử vé xe đã đặt của bạn.';

// English equivalents
enJson.settings_title = 'System Settings';
enJson.theme = 'Theme';
enJson.language = 'Language';
enJson.theme_light = 'Light Mode';
enJson.theme_dark = 'Dark Mode';
enJson.lang_vi = 'Vietnamese';
enJson.lang_en = 'English';

enJson.notifications_title = 'Notifications';
enJson.notifications_desc = 'Updates on journeys, tickets, and private offers';
enJson.not_logged_in = 'Not Logged In';
enJson.notifications_login_desc = 'Please log in to view your personal journey notifications.';
enJson.login_now = 'Log In Now';
enJson.no_notifications = 'No new notifications';
enJson.no_notifications_desc = 'Promos and trip notifications will appear here when available.';
enJson.all = 'All';
enJson.unread = 'Unread';
enJson.new = 'New';
enJson.previous = 'Previous';
enJson.notifications_read_all = 'Read all';
enJson.no_unread_notifications = 'No unread notifications';
enJson.no_unread_notifications_desc = 'Great! You have read all notifications.';
enJson.notification_options = 'Notification Options';
enJson.notification_options_desc = 'Select an action to perform:';
enJson.mark_all_read = 'Mark all as read';
enJson.delete_all_notifications = 'Delete all notifications';
enJson.confirm_delete_all = 'Are you sure you want to delete all notifications?';
enJson.cancel = 'Cancel';
enJson.delete = 'Delete';
enJson.close = 'Close';
enJson.notification_action = 'Notification Actions';
enJson.mark_read = 'Mark as read';
enJson.delete_notification = 'Delete this notification';
enJson.mute_type = 'Mute notifications of this type';
enJson.report_issue = 'Report issue to support team';
enJson.just_now = 'Just now';
enJson.minutes_ago = 'minutes ago';
enJson.hours_ago = 'hours ago';
enJson.yesterday = 'Yesterday';
enJson.days_ago = 'days ago';

enJson.buy_tickets = 'Buy Tickets';
enJson.lookup_title = 'Lookup';
enJson.news_title = 'News';
enJson.about_title = 'About Us';

enJson.empty_history_desc = 'Please sign in with Google to sync and view your complete ticket booking history.';

const fileContent = `export const translations = {
  vi: ${JSON.stringify(viJson, null, 2)},
  en: ${JSON.stringify(enJson, null, 2)}
};
`;

fs.writeFileSync(outputPath, fileContent, 'utf8');
console.log('Successfully generated translations.ts with grid titles!');
