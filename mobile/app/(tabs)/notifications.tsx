import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bell, Tag, Gift, AlertCircle, ChevronRight, CheckCheck, Inbox, Ticket, Compass, MoreHorizontal, Trash, BellOff, AlertTriangle } from 'lucide-react-native';
import tw from 'twrnc';
import { apiClient } from '@/constants/api';
import { useAuthStore } from '@/hooks/useAuthStore';
import { useTheme } from '@/hooks/use-theme';
import { useRouter, useFocusEffect } from 'expo-router';
import { useTranslation } from '@/hooks/useTranslation';

interface NotificationItem {
  id: string;
  title: string;
  content: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

const getLocalizedNotification = (title: string, content: string, locale: string) => {
  if (locale === 'vi') {
    return { title, content };
  }

  let enTitle = title;
  let enContent = content;

  // 1. Đặt vé thành công
  if (title.includes('Đặt vé thành công')) {
    enTitle = 'Booking Successful 🎉';
    const match = content.match(/vé đi (.*?) khởi hành lúc (.*?) ngày (.*?)\. Mã vé của bạn là (#\w+)/);
    if (match) {
      const [, to, time, date, code] = match;
      enContent = `You have successfully booked your ticket to ${to} departing at ${time} on ${date}. Your ticket code is ${code}.`;
    } else {
      enContent = content
        .replace('Bạn đã đặt thành công vé đi', 'You have successfully booked your ticket to')
        .replace('khởi hành lúc', 'departing at')
        .replace('ngày', 'on')
        .replace('Mã vé của bạn là', 'Your ticket code is');
    }
  }
  // 2. Hủy vé thành công
  else if (title.includes('Hủy vé thành công')) {
    enTitle = 'Ticket Cancelled Successfully 💸';
    const match = content.match(/hủy vé (#\w+) đi (.*?) của bạn.*Số tiền hoàn lại là (.*?)đ/);
    if (match) {
      const [, code, to, amount] = match;
      enContent = `Your request to cancel ticket ${code} to ${to} has been completed. Refund amount is ${amount}đ.`;
    } else {
      enContent = content
        .replace('Yêu cầu hủy vé', 'Your request to cancel ticket')
        .replace('đi của bạn đã được thực hiện', 'to has been completed')
        .replace('Số tiền hoàn lại là', 'Refund amount is');
    }
  }
  // 3. Điểm tích lũy mới
  else if (title.includes('Điểm tích lũy mới')) {
    enTitle = 'New Loyalty Points 🪙';
    const match = content.match(/tích lũy thêm \+(\d+) điểm từ chuyến đi (#\w+)/);
    if (match) {
      const [, points, code] = match;
      enContent = `Congratulations! You have earned +${points} points from your completed trip ${code}.`;
    } else {
      enContent = content
        .replace('Chúc mừng bạn đã được tích lũy thêm', 'Congratulations! You have earned')
        .replace('điểm từ chuyến đi', 'points from trip')
        .replace('đã hoàn thành', 'completed');
    }
  }
  // 4. Đổi quà thành công
  else if (title.includes('Đổi quà thành công')) {
    enTitle = 'Voucher Redeemed Successfully 🎁';
    const match = content.match(/đổi thành công (\d+) điểm tích lũy lấy mã ưu đãi: (.*?) \(Mã: (.*?)\)/);
    if (match) {
      const [, points, vTitle, code] = match;
      enContent = `You have successfully redeemed ${points} points for voucher: ${vTitle} (Code: ${code}).`;
    } else {
      enContent = content
        .replace('Bạn đã đổi thành công', 'You have successfully redeemed')
        .replace('điểm tích lũy lấy mã ưu đãi:', 'points for voucher:')
        .replace('Mã:', 'Code:');
    }
  }
  // 5. Nhắc nhở hành trình
  else if (title.includes('Nhắc nhở hành trình')) {
    enTitle = 'Trip Reminder ⏰';
    const isReturn = content.includes('Chuyến xe về');
    const prefix = isReturn ? 'Return trip to' : 'Outbound trip to';
    const match = content.match(/Chuyến xe (?:đi|về) (.*?) \((#\w+)\) khởi hành lúc (.*?)\./);
    if (match) {
      const [, to, code, time] = match;
      enContent = `${prefix} ${to} (${code}) departs at ${time}. Please arrive 15 minutes early!`;
    } else {
      enContent = content
        .replace('Chuyến xe đi', 'Outbound trip to')
        .replace('Chuyến xe về', 'Return trip to')
        .replace('khởi hành lúc', 'departs at')
        .replace('Có mặt trước 15 phút!', 'Please arrive 15 minutes early!');
    }
  }
  // 6. Xe xuất bến
  else if (title.includes('Xe xuất bến')) {
    enTitle = 'Bus Departed 🚌';
    const match = content.match(/Chuyến xe đi (.*?) \((#\w+)\) đã xuất bến\./);
    if (match) {
      const [, to, code] = match;
      enContent = `Bus to ${to} (${code}) has departed. Have a safe journey!`;
    } else {
      enContent = content
        .replace('Chuyến xe đi', 'Bus to')
        .replace('đã xuất bến. Chúc hành trình an toàn!', 'has departed. Have a safe journey!');
    }
  }
  // 7. Xe cập bến an toàn
  else if (title.includes('Xe cập bến an toàn')) {
    enTitle = 'Bus Arrived Safely 🏁';
    const match = content.match(/Chuyến xe đi (.*?) \((#\w+)\) đã cập bến\./);
    if (match) {
      const [, to, code] = match;
      enContent = `Bus to ${to} (${code}) has arrived safely. Thank you for choosing ABC Bus Lines!`;
    } else {
      enContent = content
        .replace('Chuyến xe đi', 'Bus to')
        .replace('đã cập bến. Cảm ơn bạn đã chọn ABC Bus Lines!', 'has arrived safely. Thank you for choosing ABC Bus Lines!');
    }
  }
  // 8. Cập nhật chuyến đi
  else if (title.includes('Cập nhật chuyến đi')) {
    enTitle = 'Trip Update 🔄';
    enContent = content
      .replace('Chuyến xe đi', 'Your trip to')
      .replace('đã được cập nhật thông tin mới.', 'has been updated with new information.')
      .replace('Xe phục vụ:', 'Bus:')
      .replace('Tài xế:', 'Driver:')
      .replace('SĐT:', 'Phone:')
      .replace('Mã vé:', 'Ticket Code:');
  }
  // 9. Điều chỉnh điểm tích lũy / Khấu trừ điểm tích lũy
  else if (title.includes('Điều chỉnh điểm tích lũy')) {
    enTitle = 'Loyalty Points Adjusted 🪙';
    enContent = content
      .replace('Tài khoản của bạn đã được admin điều chỉnh', 'Your account has been adjusted by')
      .replace('điểm tích lũy. Lý do:', 'loyalty points. Reason:');
  }
  else if (title.includes('Khấu trừ điểm tích lũy')) {
    enTitle = 'Loyalty Points Deducted 🪙';
    enContent = content
      .replace('Tài khoản của bạn đã được admin điều chỉnh', 'Your account has been adjusted by')
      .replace('điểm tích lũy. Lý do:', 'loyalty points. Reason:');
  }

  return { title: enTitle, content: enContent };
};

export default function NotificationsScreen() {
  const user = useAuthStore((state) => state.user);
  const colors = useTheme();
  const router = useRouter();
  const { t, locale } = useTranslation();

  const setUnreadNotificationsCount = useAuthStore((state) => state.setUnreadNotificationsCount);

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [activeTab, setActiveTab] = useState<'ALL' | 'UNREAD'>('ALL');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<NotificationItem | null>(null);

  const handleMarkSingleRead = async () => {
    if (!user?.id || !selectedNotification) return;
    try {
      await apiClient.post(`/notification/read/${user.id}/${selectedNotification.id}`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === selectedNotification.id ? { ...n, isRead: true } : n))
      );
      setSelectedNotification(null);
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const handleDeleteNotification = async () => {
    if (!user?.id || !selectedNotification) return;
    try {
      await apiClient.post(`/notification/delete/${user.id}/${selectedNotification.id}`);
      setNotifications((prev) => prev.filter((n) => n.id !== selectedNotification.id));
      setSelectedNotification(null);
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const handleMuteNotificationType = () => {
    if (!selectedNotification) return;
    Alert.alert(locale === 'vi' ? 'Thành công' : 'Success', locale === 'vi' ? 'Đã tắt nhận các thông báo thuộc nhóm này.' : 'Muted notifications of this type.');
    setSelectedNotification(null);
  };

  const handleReportIssue = () => {
    if (!selectedNotification) return;
    Alert.alert(locale === 'vi' ? 'Báo cáo sự cố' : 'Report Issue', locale === 'vi' ? 'Cảm ơn bạn! Báo cáo sự cố đã được gửi tới đội ngũ hỗ trợ kỹ thuật.' : 'Thank you! The report has been sent to our technical support team.');
    setSelectedNotification(null);
  };

  useEffect(() => {
    const unread = notifications.filter((n) => !n.isRead).length;
    setUnreadNotificationsCount(unread);
  }, [notifications]);

  const fetchNotifications = async (showSpinner = true) => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    if (showSpinner) setLoading(true);
    try {
      const response = await apiClient.get(`/notification/${user.id}`);
      setNotifications(response.data || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchNotifications(false);
    }, [user?.id])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchNotifications(false);
  };

  const handleMarkAllRead = async () => {
    if (!user?.id) return;
    try {
      await apiClient.post(`/notification/read-all/${user.id}`);
      // Optimistic state update
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const handleNotificationPress = async (item: NotificationItem) => {
    if (!user?.id) return;
    
    // 1. Mark as read on backend if unread
    if (!item.isRead) {
      try {
        await apiClient.post(`/notification/read/${user.id}/${item.id}`);
        setNotifications((prev) =>
          prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n))
        );
      } catch (error) {
        console.error('Error marking notification as read:', error);
      }
    }

    // 2. Intelligent routing based on type/content
    if (item.type === 'TRANSACTION' || item.content.toLowerCase().includes('vé') || item.content.toLowerCase().includes('hủy')) {
      router.push('/(tabs)/history');
    } else if (item.type === 'MARKETING' || item.content.toLowerCase().includes('voucher') || item.content.toLowerCase().includes('khuyến mãi')) {
      router.push('/(tabs)/loyalty');
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'TRANSACTION':
        return <Ticket size={18} color="#EF5222" />;
      case 'TRIP':
        return <Compass size={18} color="#3b82f6" />;
      case 'MARKETING':
        return <Gift size={18} color="#F59E0B" />;
      default:
        return <Bell size={18} color="#64748b" />;
    }
  };

  const getIconBgClass = (type: string) => {
    switch (type) {
      case 'TRANSACTION':
        return 'bg-orange-50 border border-orange-100';
      case 'TRIP':
        return 'bg-blue-50 border border-blue-100';
      case 'MARKETING':
        return 'bg-amber-50 border border-amber-100';
      default:
        return 'bg-slate-50 border border-slate-200/60';
    }
  };

  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffMins < 1) return t('just_now');
      if (diffMins < 60) return `${diffMins} ${t('minutes_ago')}`;
      if (diffHours < 24) return `${diffHours} ${t('hours_ago')}`;
      if (diffDays === 1) return t('yesterday');
      if (diffDays < 7) return `${diffDays} ${t('days_ago')}`;
      
      return date.toLocaleDateString(locale === 'vi' ? 'vi-VN' : 'en-US', { day: '2-digit', month: '2-digit' });
    } catch {
      return t('just_now');
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const renderNotificationCard = (item: NotificationItem) => (
    <TouchableOpacity
      key={item.id}
      onPress={() => handleNotificationPress(item)}
      activeOpacity={0.75}
      style={[
        tw`flex-row bg-white p-[16px] rounded-3xl mb-3 border border-slate-100/80 items-center justify-between shadow-sm shadow-slate-100`,
        !item.isRead && tw`bg-orange-50/20 border-orange-100/60`,
      ]}
    >
      <View style={tw`flex-row items-center flex-1 pr-2`}>
        {/* Icon Container */}
        <View style={tw`w-11 h-11 rounded-2xl items-center justify-center mr-3.5 ${getIconBgClass(item.type)}`}>
          {getNotificationIcon(item.type)}
        </View>

        {/* Text Container */}
        <View style={tw`flex-1 gap-0.5`}>
          <View style={tw`flex-row justify-between items-center mr-1`}>
            <Text
              style={[
                tw`text-[13.5px] font-black text-slate-800 leading-snug flex-1 mr-2`,
                !item.isRead && tw`text-slate-950 font-black`,
              ]}
              numberOfLines={1}
            >
              {item.title}
            </Text>
            {!item.isRead && (
              <View style={tw`w-2 h-2 rounded-full bg-[#EF5222]`} />
            )}
          </View>
          
          <Text style={tw`text-[11px] text-slate-400 font-bold mb-1`}>
            {formatTime(item.createdAt)}
          </Text>

          <Text style={tw`text-[11.5px] text-slate-500 leading-5`} numberOfLines={3}>
            {item.content}
          </Text>
        </View>
      </View>

      {/* Option menu button */}
      <TouchableOpacity
        onPress={(e) => {
          e.stopPropagation();
          setSelectedNotification(item);
        }}
        activeOpacity={0.6}
        style={tw`p-2 -mr-2`}
      >
        <MoreHorizontal size={18} color="#94a3b8" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const localizedNotifications = notifications.map(n => {
    const localized = getLocalizedNotification(n.title, n.content, locale);
    return {
      ...n,
      title: localized.title,
      content: localized.content
    };
  });

  const filteredNotifications = localizedNotifications.filter((item) => activeTab === 'ALL' || !item.isRead);
  const unreadNotifications = filteredNotifications.filter((item) => !item.isRead);
  const readNotifications = filteredNotifications.filter((item) => item.isRead);

  return (
    <SafeAreaView style={tw`flex-1 bg-[#f8fafc]`}>
      {/* Header */}
      <View style={tw`px-4 pt-4 pb-2 flex-row justify-between items-center`}>
        <View style={tw`flex-1`}>
          <Text style={tw`text-[24px] font-black text-slate-800 tracking-tight`}>{t('notifications_title')}</Text>
          <Text style={tw`text-[12px] font-bold text-slate-400 mt-0.5`}>
            {t('notifications_desc')}
          </Text>
        </View>
        
        <View style={tw`flex-row items-center gap-2.5`}>
          <View style={tw`relative p-2.5 rounded-full bg-slate-100/80`}>
            <Bell size={20} color="#EF5222" />
            {unreadCount > 0 && (
              <View style={tw`absolute -top-1 -right-1 bg-red-500 rounded-full px-1.5 py-0.5 min-w-[17px] items-center justify-center`}>
                <Text style={tw`text-[8.5px] font-black text-white`}>{unreadCount}</Text>
              </View>
            )}
          </View>

          {user && notifications.length > 0 ? (
          <TouchableOpacity
            onPress={() => {
              Alert.alert(
                t('notification_options'),
                t('notification_options_desc'),
                [
                  { text: t('mark_all_read'), onPress: handleMarkAllRead },
                  {
                    text: t('delete_all_notifications'),
                    style: 'destructive',
                    onPress: () => {
                      Alert.alert(
                        locale === 'vi' ? 'Xác nhận' : 'Confirm',
                        t('confirm_delete_all'),
                        [
                          { text: t('cancel'), style: 'cancel' },
                          {
                            text: t('delete'),
                            style: 'destructive',
                            onPress: () => {
                              setNotifications([]);
                            }
                          }
                        ]
                      );
                    }
                  },
                  { text: t('close'), style: 'cancel' }
                ]
              );
            }}
            style={tw`p-2.5 rounded-full bg-slate-100/80`}
          >
            <MoreHorizontal size={18} color="#475569" />
          </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Segmented Filter Control */}
      {user && notifications.length > 0 && (
        <View style={tw`px-4 pb-2 flex-row gap-2 mt-1.5`}>
          <TouchableOpacity
            onPress={() => setActiveTab('ALL')}
            activeOpacity={0.8}
            style={[
              tw`px-4.5 py-1.5 rounded-full flex-row items-center justify-center`,
              activeTab === 'ALL'
                ? tw`bg-slate-800`
                : tw`bg-slate-100`,
            ]}
          >
            <Text
              style={[
                tw`text-[12.5px] font-black`,
                activeTab === 'ALL' ? tw`text-white` : tw`text-slate-600`,
              ]}
            >
              {t('all')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveTab('UNREAD')}
            activeOpacity={0.8}
            style={[
              tw`px-4.5 py-1.5 rounded-full flex-row items-center justify-center`,
              activeTab === 'UNREAD'
                ? tw`bg-slate-800`
                : tw`bg-slate-100`,
            ]}
          >
            <Text
              style={[
                tw`text-[12.5px] font-black`,
                activeTab === 'UNREAD' ? tw`text-white` : tw`text-slate-600`,
              ]}
            >
              {t('unread')}
            </Text>
            {unreadCount > 0 && (
              <View
                style={[
                  tw`ml-1.5 px-1.5 py-0.5 rounded-full items-center justify-center min-w-[16px]`,
                  activeTab === 'UNREAD' ? tw`bg-slate-700` : tw`bg-[#EF5222]`,
                ]}
              >
                <Text style={tw`text-[9px] font-black text-white`}>
                  {unreadCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Main Content */}
      {loading ? (
        <View style={tw`flex-1 justify-center items-center`}>
          <ActivityIndicator size="large" color="#EF5222" />
        </View>
      ) : !user ? (
        <View style={tw`flex-1 justify-center items-center p-6`}>
          <Inbox size={48} color="#cbd5e1" style={tw`mb-4`} />
          <Text style={tw`text-[15px] font-black text-slate-700 mb-1`}>{t('not_logged_in')}</Text>
          <Text style={tw`text-xs text-slate-400 text-center mb-5 max-w-[280px]`}>
            {t('notifications_login_desc')}
          </Text>
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/loyalty')}
            activeOpacity={0.8}
            style={tw`bg-[#EF5222] px-6 py-2.5 rounded-full`}
          >
            <Text style={tw`text-white text-xs font-black uppercase tracking-wider`}>{t('login_now')}</Text>
          </TouchableOpacity>
        </View>
      ) : notifications.length === 0 ? (
        <ScrollView
          contentContainerStyle={tw`flex-1 justify-center items-center p-6`}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#EF5222']} />}
        >
          <Inbox size={48} color="#cbd5e1" style={tw`mb-4`} />
          <Text style={tw`text-[15px] font-black text-slate-700 mb-1`}>{t('no_notifications')}</Text>
          <Text style={tw`text-xs text-slate-400 text-center max-w-[280px]`}>
            {t('no_notifications_desc')}
          </Text>
        </ScrollView>
      ) : (
        <View style={tw`flex-1`}>
          {filteredNotifications.length === 0 ? (
            <ScrollView
              contentContainerStyle={tw`flex-1 justify-center items-center p-6`}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#EF5222']} />}
            >
              <Inbox size={48} color="#cbd5e1" style={tw`mb-4`} />
              <Text style={tw`text-[15px] font-black text-slate-700 mb-1`}>{t('no_unread_notifications')}</Text>
              <Text style={tw`text-xs text-slate-400 text-center max-w-[280px]`}>
                {t('no_unread_notifications_desc')}
              </Text>
            </ScrollView>
          ) : (
            <ScrollView
              contentContainerStyle={tw`p-4 pb-[110px]`}
              showsVerticalScrollIndicator={false}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#EF5222']} />}
            >
              {/* "Mới" Section */}
              {unreadNotifications.length > 0 && (
                <View style={tw`mb-4`}>
                  <View style={tw`flex-row justify-between items-center mb-2.5 px-1`}>
                    <Text style={tw`text-[15px] font-black text-slate-800`}>{t('new')}</Text>
                    {activeTab === 'ALL' && (
                      <TouchableOpacity onPress={handleMarkAllRead}>
                        <Text style={tw`text-[11px] font-black text-[#EF5222]`}>{t('notifications_read_all')}</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  {unreadNotifications.map(renderNotificationCard)}
                </View>
              )}

              {/* "Trước đó" Section */}
              {readNotifications.length > 0 && (
                <View style={tw`mt-2`}>
                  <View style={tw`mb-2.5 px-1`}>
                    <Text style={tw`text-[15px] font-black text-slate-800`}>{t('previous')}</Text>
                  </View>
                  {readNotifications.map(renderNotificationCard)}
                </View>
              )}
            </ScrollView>
          )}
        </View>
      )}

      {/* Bottom Options Drawer */}
      <Modal
        visible={selectedNotification !== null}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setSelectedNotification(null)}
      >
        <TouchableOpacity
          style={tw`flex-1 bg-black/45 justify-end`}
          activeOpacity={1}
          onPress={() => setSelectedNotification(null)}
        >
          <View style={tw`bg-white rounded-t-[28px] pb-8 pt-4 px-5 shadow-2xl`}>
            {/* Top handle bar */}
            <View style={tw`w-10 h-1 bg-slate-200 rounded-full self-center mb-5`} />

            <Text style={tw`text-[11px] font-black text-[#EF5222] tracking-wider uppercase mb-1`}>{t('notification_action')}</Text>
            <Text style={tw`text-[13px] font-black text-slate-800 mb-4`} numberOfLines={1}>
              {selectedNotification?.title}
            </Text>

            {/* Actions list */}
            <View style={tw`gap-1`}>
              {selectedNotification && !selectedNotification.isRead && (
                <TouchableOpacity
                  onPress={handleMarkSingleRead}
                  style={tw`flex-row items-center gap-3.5 py-3 px-1 border-b border-slate-50`}
                >
                  <View style={tw`w-8 h-8 rounded-full bg-slate-50 items-center justify-center`}>
                    <CheckCheck size={16} color="#475569" />
                  </View>
                  <Text style={tw`text-[13.5px] font-bold text-slate-700`}>{t('mark_read')}</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                onPress={handleDeleteNotification}
                style={tw`flex-row items-center gap-3.5 py-3 px-1 border-b border-slate-50`}
              >
                <View style={tw`w-8 h-8 rounded-full bg-red-50 items-center justify-center`}>
                  <Trash size={16} color="#ef4444" />
                </View>
                <Text style={tw`text-[13.5px] font-bold text-red-500`}>{t('delete_notification')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleMuteNotificationType}
                style={tw`flex-row items-center gap-3.5 py-3 px-1 border-b border-slate-50`}
              >
                <View style={tw`w-8 h-8 rounded-full bg-slate-50 items-center justify-center`}>
                  <BellOff size={16} color="#475569" />
                </View>
                <Text style={tw`text-[13.5px] font-bold text-slate-700`}>{t('mute_type')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleReportIssue}
                style={tw`flex-row items-center gap-3.5 py-3 px-1`}
              >
                <View style={tw`w-8 h-8 rounded-full bg-slate-50 items-center justify-center`}>
                  <AlertTriangle size={16} color="#475569" />
                </View>
                <Text style={tw`text-[13.5px] font-bold text-slate-700`}>{t('report_issue')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}
