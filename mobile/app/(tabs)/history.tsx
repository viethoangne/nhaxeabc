import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  TextInput,
  Animated,
  LayoutAnimation,
  Platform,
  UIManager,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { 
  Ticket, Calendar, Clock, ArrowRight,
  Search, X, Armchair, ShieldCheck, User, Phone, SlidersHorizontal,
  Bus, MapPin, Compass, Trash2, ChevronLeft, Copy, Bell, QrCode, Star, Navigation
} from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { apiClient } from '@/constants/api';
import { useAuthStore } from '@/hooks/useAuthStore';
import { useTheme } from '@/hooks/use-theme';
import { TripCardSkeleton } from '@/components/ui/SkeletonLoader';
import EmptyState from '@/components/ui/EmptyState';
import { useTranslation } from '@/hooks/useTranslation';
import TicketDetails from '@/components/lookup/TicketDetails';
import CancelDrawer from '@/components/lookup/CancelDrawer';
import FilterDrawer from '@/components/lookup/FilterDrawer';
import QRTicketModal from '@/components/ticket/QRTicketModal';
import RatingDrawer from '@/components/ticket/RatingDrawer';
import tw from 'twrnc';



const FadeInView = ({ children, index }: { children: React.ReactNode; index: number }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(25)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 350,
        delay: Math.min(index * 60, 400),
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        delay: Math.min(index * 60, 400),
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
      {children}
    </Animated.View>
  );
};

const PulsingDot = ({ color }: { color: string }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 2.2,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 1200,
          useNativeDriver: true,
        })
      ])
    ).start();
  }, [scaleAnim, opacityAnim]);

  return (
    <View style={tw`w-2.5 h-2.5 items-center justify-center mr-1.5`}>
      <Animated.View style={[
        tw`absolute w-2.5 h-2.5 rounded-full`,
        {
          backgroundColor: color,
          transform: [{ scale: scaleAnim }],
          opacity: opacityAnim,
        }
      ]} />
      <View style={[tw`w-1.5 h-1.5 rounded-full`, { backgroundColor: color }]} />
    </View>
  );
};

export default function HistoryScreen() {
  const router = useRouter();
  const colors = useTheme();
  const user = useAuthStore((state) => state.user);
  const unreadCount = useAuthStore((state) => state.unreadNotificationsCount);
  const { t, locale } = useTranslation();
  const insets = useSafeAreaInsets();
  
  const [statusFilter, setStatusFilter] = useState<'all' | 'upcoming' | 'ongoing' | 'completed' | 'cancelled'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'oneway' | 'round'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);

  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [isCancelDrawerOpen, setIsCancelDrawerOpen] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState('');
  const [confirmPhone, setConfirmPhone] = useState('');
  const [isAgreed, setIsAgreed] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);

  // States for QR modal
  const [qrOrder, setQrOrder] = useState<any>(null);
  const [isQrModalVisible, setIsQrModalVisible] = useState(false);

  // States for Rating drawer
  const [ratingOrder, setRatingOrder] = useState<any>(null);
  const [isRatingDrawerVisible, setIsRatingDrawerVisible] = useState(false);
  const [reviewedOrderIds, setReviewedOrderIds] = useState<Set<number>>(new Set());

  const handleCopyCode = async (code: string) => {
    await Clipboard.setStringAsync(code);
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      // Ignore
    }
    Alert.alert(locale === 'vi' ? 'Đã sao chép' : 'Copied', locale === 'vi' ? `Đã sao chép mã vé #${code} vào bộ nhớ tạm.` : `Copied ticket code #${code} to clipboard.`);
  };

  const getRefundPolicy = (ticket: any) => {
    if (!ticket) return { canCancel: false, refundPercent: 0 };
    const rawDepartureDate = ticket.outboundDepartDateSnapshot || ticket.date;
    if (!rawDepartureDate) return { canCancel: false, refundPercent: 0 };

    const departureTime = new Date(rawDepartureDate).getTime();
    const now = Date.now();
    const timeDiffHours = (departureTime - now) / (1000 * 60 * 60);

    if (timeDiffHours >= 24) return { canCancel: true, refundPercent: 100 };
    if (timeDiffHours >= 12) return { canCancel: true, refundPercent: 50 };
    return { canCancel: false, refundPercent: 0 };
  };

  const handleCancelTicket = async () => {
    if (!selectedTicket) return;
    if (!confirmEmail.trim() || !confirmPhone.trim()) {
      Alert.alert(locale === 'vi' ? 'Lỗi' : 'Error', locale === 'vi' ? 'Vui lòng điền đầy đủ Email và Số điện thoại' : 'Please fill in both Email and Phone Number');
      return;
    }

    if (confirmPhone.trim() !== selectedTicket.customerPhone) {
      Alert.alert(locale === 'vi' ? 'Lỗi' : 'Error', locale === 'vi' ? 'Số điện thoại xác nhận không khớp với thông tin vé' : 'Confirmation phone number does not match ticket details');
      return;
    }

    if (!isAgreed) {
      Alert.alert(locale === 'vi' ? 'Lỗi' : 'Error', locale === 'vi' ? 'Bạn phải đồng ý với quy định hủy vé' : 'You must agree to the ticket cancellation terms');
      return;
    }

    setCancelLoading(true);
    try {
      const response = await apiClient.post('/cancel-ticket', {
        orderCode: selectedTicket.orderCode,
        phone: confirmPhone.trim(),
        email: confirmEmail.trim(),
      });

      Alert.alert(locale === 'vi' ? 'Thành công' : 'Success', response.data?.message || (locale === 'vi' ? 'Yêu cầu hủy vé của bạn đã được thực hiện.' : 'Your ticket cancellation request has been processed.'));
      
      // Cập nhật trạng thái vé trong danh sách bookings
      setBookings((prev) => 
        prev.map((b) => b.id === selectedTicket.id ? { ...b, bookingStatus: 'CANCELLED' } : b)
      );
      
      // Cập nhật trạng thái vé trong modal đang mở
      setSelectedTicket((prev: any) => ({ ...prev, bookingStatus: 'CANCELLED' }));
      
      setIsCancelDrawerOpen(false);
      setConfirmEmail('');
      setConfirmPhone('');
      setIsAgreed(false);
    } catch (error: any) {
      console.error('Lỗi khi hủy vé:', error);
      const errorMsg = error.response?.data?.message || 'Có lỗi xảy ra khi gửi yêu cầu hủy vé.';
      Alert.alert(locale === 'vi' ? 'Thất bại' : 'Failed', errorMsg);
    } finally {
      setCancelLoading(false);
    }
  };

  const fetchHistory = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const res = await apiClient.get(`/payment/history/${user.id}`);
      const historyData = res.data?.data || res.data || [];
      // Sắp xếp vé mới nhất lên đầu
      const sorted = [...historyData].sort((a, b) => {
        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();
        return dateB - dateA;
      });
      setBookings(sorted);

      // Check which completed orders are already reviewed
      const completedIds = sorted
        .filter((b: any) => {
          const dep = b.outboundDepartDateSnapshot || b.date;
          if (!dep) return false;
          const dep_t = new Date(dep).getTime();
          const dur = b.outboundDurationMinutesSnapshot || 240;
          return Date.now() > dep_t + dur * 60000 && b.bookingStatus !== 'CANCELLED';
        })
        .map((b: any) => b.id);

      if (completedIds.length > 0) {
        try {
          const reviewRes = await apiClient.post('/reviews/check-batch', { orderIds: completedIds });
          const reviewed: number[] = reviewRes.data?.reviewedIds || [];
          setReviewedOrderIds(new Set(reviewed));
        } catch {
          // Non-critical — ignore if review endpoint not available
        }
      }
    } catch (error) {
      console.error('Lỗi lấy lịch sử đặt vé:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBooking = async (bookingId: string) => {
    Alert.alert(
      locale === 'vi' ? 'Xác nhận xóa' : 'Confirm Delete',
      locale === 'vi' ? 'Bạn có chắc chắn muốn xóa lịch sử đặt vé này khỏi danh sách của bạn?' : 'Are you sure you want to remove this booking history from your list?',
      [
        { text: locale === 'vi' ? 'Hủy' : 'Cancel', style: 'cancel' },
        {
          text: locale === 'vi' ? 'Xóa' : 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiClient.delete(`/history/${bookingId}`);
              setBookings((prev) => prev.filter((b) => b.id !== bookingId));
            } catch (error) {
              console.error('Lỗi khi xóa vé:', error);
              Alert.alert(locale === 'vi' ? 'Lỗi' : 'Error', locale === 'vi' ? 'Không thể xóa vé lúc này. Vui lòng thử lại sau.' : 'Cannot delete ticket right now. Please try again later.');
            }
          },
        },
      ]
    );
  };

  useEffect(() => {
    if (user?.id) {
      fetchHistory();
    }
  }, [user]);

  const getTicketStatus = (b: any) => {
    const currentStatus = b.bookingStatus?.toUpperCase();
    if (currentStatus === 'CANCELLED') return 'cancelled';

    const departAt = b.outboundDepartDateSnapshot || b.outboundTrip?.departDate || b.date;
    if (!departAt) return 'completed';

    const now = Date.now();
    const departTime = new Date(departAt).getTime();
    
    const durationMin = b.outboundDurationMinutesSnapshot || b.outboundTrip?.durationMinutes || 240;
    const arrivalTime = departTime + durationMin * 60000;

    if (departTime > now) return 'upcoming';
    if (now >= departTime && now <= arrivalTime) return 'ongoing';
    return 'completed';
  };

  // Áp dụng bộ lọc và tìm kiếm giống bản Web
  const filteredBookings = bookings.filter((b) => {
    // 1. Lọc theo Loại vé (typeFilter)
    if (typeFilter !== 'all') {
      const isRound = b.tripType === 'round' || !!b.returnDate;
      if (typeFilter === 'oneway' && isRound) return false;
      if (typeFilter === 'round' && !isRound) return false;
    }

    // 2. Lọc theo Trạng thái (statusFilter)
    if (statusFilter !== 'all') {
      const ticketStatus = getTicketStatus(b);
      if (ticketStatus !== statusFilter) return false;
    }

    // 3. Lọc theo Tìm kiếm từ khóa (Mã đơn hàng, Điểm đi, Điểm đến)
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase().trim();
      const orderCodeMatch = b.orderCode?.toLowerCase().includes(q);
      const fromMatch = b.from?.toLowerCase().includes(q);
      const toMatch = b.to?.toLowerCase().includes(q);
      const nameMatch = b.customerName?.toLowerCase().includes(q);
      return orderCodeMatch || fromMatch || toMatch || nameMatch;
    }

    return true;
  });

  if (!user) {
    return (
      <SafeAreaView style={[tw`flex-1 justify-center items-center p-6`, { backgroundColor: colors.background }]}>
        <EmptyState
          title={t('booking_history')}
          description={t('empty_history_desc')}
          icon={<Ticket size={36} color={colors.primary} />}
          actionLabel={t('login_now')}
          onAction={() => router.push('/(tabs)/loyalty' as any)}
        />
      </SafeAreaView>
    );
  }

  const renderTicketItem = ({ item, index }: { item: any; index: number }) => {
    const isCancelled = item.bookingStatus === 'CANCELLED';
    const isRoundTrip = item.tripType === 'round' || !!item.returnDate;
    
    // Trạng thái chuyến
    const ticketStatus = getTicketStatus(item);

    // Phân loại ghế đi/về
    const outboundSeats = item.seats?.filter((s: any) => s.tripDirection === 'outbound') || item.seats || [];
    const returnSeats = item.seats?.filter((s: any) => s.tripDirection === 'return') || [];

    const renderTimelineSegment = (
      title: string, 
      from: string, 
      to: string, 
      dateStr: string, 
      seats: any[], 
      durationMin: number = 240
    ) => {
      if (!dateStr) return null;
      const dTime = new Date(dateStr);
      const arrTime = new Date(dTime.getTime() + durationMin * 60000);
      
      const deptTimeStr = dTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false });
      const arrTimeStr = arrTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false });
      const dateDisplay = dTime.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
      const arrDateDisplay = arrTime.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
      const durationStr = `${Math.floor(durationMin / 60)}h${durationMin % 60 > 0 ? `${durationMin % 60}m` : '00'}`;

      return (
        <View style={tw`mb-4`}>
          {/* Sub-header inside card */}
          <View style={tw`flex-row items-center gap-2 mb-3.5`}>
            <View style={tw`flex-row items-center gap-1 bg-orange-50 px-2.5 py-0.8 rounded-lg border border-orange-100`}>
              <Bus size={11} color="#EF5222" />
              <Text style={tw`text-[10px] font-black text-[#EF5222] uppercase tracking-wider`}>{title}</Text>
            </View>
            <View style={tw`w-1 h-1 rounded-full bg-slate-300`} />
            <View style={tw`bg-slate-50 px-2 py-0.8 rounded-lg border border-slate-200/50`}>
              <Text style={tw`text-[10px] font-bold text-slate-500`}>Limousine</Text>
            </View>
            <View style={tw`flex-1 h-px bg-slate-100`} />
          </View>
 
          {/* Visual Timeline */}
          <View style={tw`flex-row items-stretch`}>
            {/* Times Column */}
            <View style={tw`w-[80px] justify-between py-1 items-end pr-3`}>
              <Text style={tw`text-[17px] font-black text-slate-900 leading-none`}>{deptTimeStr}</Text>
              <View style={tw`bg-orange-50/50 px-1.5 py-0.5 rounded border border-orange-100 my-1.5`}>
                <Text style={tw`text-[9px] font-bold text-slate-500`}>{durationStr}</Text>
              </View>
              <Text style={tw`text-[17px] font-black text-slate-900 leading-none`}>{arrTimeStr}</Text>
            </View>

            {/* Vertical Line art indicator */}
            <View style={tw`items-center justify-between py-1.5 relative px-2`}>
              <View style={tw`w-3 h-3 rounded-full border-2 bg-white border-orange-500 z-10 shadow-sm`} />
              <View style={tw`w-[1.5px] flex-grow bg-slate-200 border-dashed border-l border-slate-300 my-1`} />
              <View style={tw`w-3 h-3 rounded-full border-2 bg-white border-slate-400 z-10 shadow-sm`} />
            </View>

            {/* Destinations & Dates Column */}
            <View style={tw`flex-1 justify-between py-0.5 pl-3`}>
              <View>
                <Text style={tw`text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5`}>{t('historyPage.departure')}</Text>
                <Text style={tw`text-[14px] font-black text-slate-800 leading-none`}>{from}</Text>
                <Text style={tw`text-[10px] font-bold text-slate-400 mt-1`}>{dateDisplay}</Text>
              </View>

              <View style={tw`mt-4`}>
                <Text style={tw`text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5`}>{t('historyPage.destination')}</Text>
                <View style={tw`flex-row items-center gap-1`}>
                  <MapPin size={11} color="#EF5222" />
                  <Text style={tw`text-[14px] font-black text-slate-800 leading-none`}>{to}</Text>
                </View>
                <Text style={tw`text-[10px] font-bold text-slate-400 mt-1`}>{arrDateDisplay}</Text>
              </View>
            </View>
          </View>
        </View>
      );
    };

    return (
      <FadeInView index={index}>
        <View style={tw`mb-5`}>
          <View style={[
            tw`rounded-3xl border border-slate-200 bg-white overflow-hidden`,
            {
              shadowColor: '#64748b',
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.05,
              shadowRadius: 12,
              elevation: 2,
            }
          ]}>
            
            {/* Card Header Segment */}
            <View style={tw`flex-row justify-between items-center px-5 py-4 bg-slate-50/50 border-b border-slate-100`}>
              <View style={tw`flex-row items-center gap-2`}>
                <View style={tw`w-7 h-7 rounded-xl bg-orange-50 items-center justify-center`}>
                  <Ticket size={14} color="#EF5222" />
                </View>
                <Text style={tw`text-[13px] font-black text-slate-900`}>#{item.orderCode}</Text>
                <TouchableOpacity
                  onPress={() => handleCopyCode(item.orderCode)}
                  activeOpacity={0.65}
                  style={tw`p-1.2 bg-slate-100/80 rounded-lg`}
                >
                  <Copy size={11} color="#64748b" />
                </TouchableOpacity>
              </View>

              {/* Status & Type Badges */}
              <View style={tw`flex-row items-center gap-1.5`}>
                <Text style={[
                  tw`text-[9.5px] font-black px-2 py-0.8 rounded-lg border`,
                  isRoundTrip 
                    ? tw`bg-purple-50 text-purple-600 border-purple-100` 
                    : tw`bg-blue-50 text-blue-600 border-blue-100`
                ]}>
                  {isRoundTrip ? t('historyPage.roundTrip') : t('historyPage.oneWay')}
                </Text>
                
                {isCancelled ? (
                  <Text style={tw`text-[9.5px] font-black px-2 py-0.8 rounded-lg bg-red-50 text-red-600 border border-red-100`}>{t('historyPage.statusCancelled')}</Text>
                ) : ticketStatus === 'upcoming' ? (
                  <View style={tw`flex-row items-center bg-orange-50 px-2 py-0.8 rounded-lg border border-orange-100`}>
                    <PulsingDot color="#EF5222" />
                    <Text style={tw`text-[9.5px] font-black text-orange-600`}>{t('historyPage.statusUpcoming')}</Text>
                  </View>
                ) : ticketStatus === 'ongoing' ? (
                  <View style={tw`flex-row items-center bg-blue-50 px-2 py-0.8 rounded-lg border border-blue-100`}>
                    <PulsingDot color="#3b82f6" />
                    <Text style={tw`text-[9.5px] font-black text-blue-600`}>{t('historyPage.statusOngoing')}</Text>
                  </View>
                ) : (
                  <Text style={tw`text-[9.5px] font-black px-2 py-0.8 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100`}>{t('historyPage.statusCompleted')}</Text>
                )}
              </View>
            </View>

            {/* Card Body Segment */}
            <View style={tw`px-5 py-4`}>
              {/* Journey Timelines */}
              {renderTimelineSegment(t('historyPage.outboundTrip'), item.from, item.to, item.outboundDepartDateSnapshot || item.date, outboundSeats, item.outboundDurationMinutesSnapshot || 240)}
              
              {isRoundTrip && renderTimelineSegment(t('historyPage.returnTrip'), item.to, item.from, item.returnDepartDateSnapshot || item.returnDate || item.date, returnSeats, item.returnDurationMinutesSnapshot || 240)}

              {/* Inner card with seats */}
              <View style={tw`bg-slate-50 border border-slate-200/60 rounded-2xl p-4 mb-3.5`}>
                <View style={tw`flex-row justify-between items-center`}>
                  <View style={tw`flex-row items-center gap-2`}>
                    <Compass size={13} color="#EF5222" />
                    <Text style={tw`text-[11.5px] font-bold text-slate-500`}>
                      {isRoundTrip ? t('historyPage.seatsOutbound') : t('historyPage.seatsNumber')}
                    </Text>
                  </View>
                  <Text style={tw`text-[14px] font-black text-[#EF5222]`}>
                    {outboundSeats.length > 0 ? outboundSeats.map((s: any) => s.seatNumber).join(', ') : '--'}
                  </Text>
                </View>
                
                {isRoundTrip && (
                  <View style={tw`flex-row justify-between items-center mt-3 pt-3 border-t border-slate-200/60`}>
                    <View style={tw`flex-row items-center gap-2`}>
                      <Compass size={13} color="#EF5222" />
                      <Text style={tw`text-[11.5px] font-bold text-slate-500`}>{t('historyPage.seatsReturn')}</Text>
                    </View>
                    <Text style={tw`text-[14px] font-black text-[#EF5222]`}>
                      {returnSeats.length > 0 ? returnSeats.map((s: any) => s.seatNumber).join(', ') : '--'}
                    </Text>
                  </View>
                )}
              </View>

              {/* Ticket Divider with Punch Holes */}
              <View style={tw`relative my-2.5 flex-row items-center justify-between`}>
                {/* Left Punch Hole */}
                <View style={[tw`w-3.5 h-3.5 rounded-full border border-slate-200/50 absolute z-20`, { left: -28, backgroundColor: colors.background || '#f8fafc' }]} />
                
                {/* Dotted Line */}
                <View style={tw`flex-1 h-px border-t border-dashed border-slate-200`} />

                {/* Right Punch Hole */}
                <View style={[tw`w-3.5 h-3.5 rounded-full border border-slate-200/50 absolute z-20`, { right: -28, backgroundColor: colors.background || '#f8fafc' }]} />
              </View>

              {/* Passenger Details & Total Price Row */}
              <View style={tw`flex-row justify-between items-center mt-2`}>
                <View style={tw`gap-1`}>
                  <View style={tw`flex-row items-center gap-1.5`}>
                    <User size={12} color="#64748b" />
                    <Text style={tw`text-[12px] font-bold text-slate-600`}>{item.customerName}</Text>
                  </View>
                  <View style={tw`flex-row items-center gap-1.5`}>
                    <Phone size={12} color="#64748b" />
                    <Text style={tw`text-[11.5px] font-bold text-slate-400`}>
                      {item.customerPhone.replace(/(\d{4})(\d{3})(\d{3})/, '$1 $2 $3')}
                    </Text>
                  </View>
                </View>

                <View style={tw`flex-row items-center gap-2.5`}>
                  <View style={tw`items-end`}>
                    <Text style={tw`text-[9px] font-bold text-slate-400 uppercase tracking-widest`}>{t('historyPage.totalPayment')}</Text>
                    <Text style={tw`text-[17px] font-black text-[#EF5222] mt-0.5`}>
                      {Number(item.amount).toLocaleString('vi-VN')} đ
                    </Text>
                  </View>
                  
                  {/* Cancel / Delete Booking Button */}
                  <TouchableOpacity
                    onPress={() => handleDeleteBooking(item.id)}
                    activeOpacity={0.7}
                    style={tw`p-2.5 text-slate-400 bg-slate-50 hover:bg-rose-50 rounded-2xl border border-slate-200/60 hover:border-rose-200`}
                  >
                    <Trash2 size={14} color="#64748b" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Action buttons */}
            <View style={tw`border-t border-slate-100`}>
              {/* Row 1: QR + Track (for confirmed, non-cancelled) */}
              {!isCancelled && (
                <View style={tw`flex-row`}>
                  {/* QR Ticket button */}
                  <TouchableOpacity
                    onPress={() => {
                      setQrOrder(item);
                      setIsQrModalVisible(true);
                    }}
                    activeOpacity={0.85}
                    style={tw`flex-1 py-3 items-center justify-center flex-row gap-1.5 border-r border-slate-100`}
                  >
                    <QrCode color="#3b82f6" size={14} />
                    <Text style={tw`text-blue-600 text-[12px] font-black`}>{locale === 'vi' ? 'Vé QR' : 'QR Ticket'}</Text>
                  </TouchableOpacity>

                  {/* Track button — only for ongoing */}
                  {ticketStatus === 'ongoing' && (
                    <TouchableOpacity
                      onPress={() => {
                        router.push({
                          pathname: '/tracking/[orderId]',
                          params: {
                            orderId: item.id.toString(),
                            orderCode: item.orderCode,
                            from: item.from,
                            to: item.to,
                            departDate: item.outboundDepartDateSnapshot || item.date,
                            durationMinutes: (item.outboundDurationMinutesSnapshot || 240).toString(),
                            driverName: item.outboundTrip?.driverName || '',
                            driverPhone: '',
                            busPlate: item.outboundTrip?.busPlate || '',
                            busType: item.outboundBusTypeSnapshot || '',
                            pickupPoint: item.outboundPickupPointSnapshot || '',
                            dropoffPoint: item.outboundDropoffPointSnapshot || '',
                          },
                        } as any);
                      }}
                      activeOpacity={0.85}
                      style={tw`flex-1 py-3 items-center justify-center flex-row gap-1.5`}
                    >
                      <Navigation color="#10b981" size={14} />
                      <Text style={tw`text-emerald-600 text-[12px] font-black`}>{locale === 'vi' ? 'Theo dõi xe' : 'Track Bus'}</Text>
                    </TouchableOpacity>
                  )}

                  {/* Rate button — only for completed and not yet rated */}
                  {ticketStatus === 'completed' && !reviewedOrderIds.has(item.id) && (
                    <TouchableOpacity
                      onPress={() => {
                        setRatingOrder(item);
                        setIsRatingDrawerVisible(true);
                      }}
                      activeOpacity={0.85}
                      style={tw`flex-1 py-3 items-center justify-center flex-row gap-1.5`}
                    >
                      <Star color="#f59e0b" size={14} fill="#f59e0b" />
                      <Text style={tw`text-amber-600 text-[12px] font-black`}>{locale === 'vi' ? 'Đánh giá' : 'Rate'}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {/* Row 2: Detail button */}
              <TouchableOpacity
                onPress={() => {
                  setSelectedTicket(item);
                }}
                activeOpacity={0.85}
                style={tw`w-full bg-[#EF5222] py-3.5 items-center justify-center flex-row gap-1.5`}
              >
                <ShieldCheck color="#ffffff" size={14} />
                <Text style={tw`text-white text-[12.5px] font-black uppercase tracking-wider`}>
                  {locale === 'vi' ? 'Xem chi tiết vé' : 'View Details'}
                </Text>
              </TouchableOpacity>
            </View>

          </View>
        </View>
      </FadeInView>
    );
  };

  return (
    <SafeAreaView style={[tw`flex-1`, { backgroundColor: colors.background }]}>
      
      {/* ── HEADER CẢI TIẾN CAO CẤP MÀU CAM CHỦ ĐẠO ── */}
      <View style={tw`px-5 pt-5 pb-4 border-b border-orange-100/50 bg-white dark:bg-slate-900`}>
        <View style={tw`flex-row items-center gap-3`}>
          <View style={[tw`w-10 h-10 rounded-2xl items-center justify-center border`, { backgroundColor: 'rgba(239, 82, 34, 0.1)', borderColor: 'rgba(239, 82, 34, 0.2)' }]}>
            <Ticket size={20} color="#EF5222" strokeWidth={2.5} />
          </View>
          <View style={tw`flex-1`}>
            <Text style={[tw`text-[22px] font-black tracking-tight`, { color: colors.text }]}>
              {t('booking_history')}
            </Text>
            <Text style={[tw`text-[11.5px] font-bold mt-0.5`, { color: colors.textSecondary }]}>
              {t('historyPage.subtitle')}
            </Text>
          </View>
        </View>
      </View>

      {/* ── BỘ LỌC TÌM KIẾM CẢI TIẾN THẨM MỸ ── */}
      <View style={tw`px-5 py-3 flex-row items-center gap-3 bg-white dark:bg-slate-900`}>
        {/* Ô tìm kiếm */}
        <View style={tw`flex-1 flex-row items-center bg-orange-50/30 dark:bg-slate-800/40 rounded-2xl px-4 py-2.5 border border-orange-100/80`}>
          <Search size={16} color="#EF5222" style={tw`mr-2.5`} />
          <TextInput
            placeholder={locale === 'vi' ? 'Tìm mã vé hoặc địa điểm...' : 'Search by code or location...'}
            placeholderTextColor="#a1a1aa"
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={tw`flex-1 text-[13.5px] font-bold text-slate-800 dark:text-slate-100 p-0`}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={tw`p-1`}>
              <X size={15} color="#94a3b8" />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Nút Toggle Bộ lọc */}
        <TouchableOpacity
          onPress={() => setIsFilterExpanded(true)}
          activeOpacity={0.8}
          style={[
            tw`h-[44px] w-[44px] rounded-2xl border items-center justify-center relative shadow-sm`,
            statusFilter !== 'all' || typeFilter !== 'all'
              ? { backgroundColor: '#EF5222', borderColor: '#EF5222' }
              : { backgroundColor: 'white', borderColor: '#fed7aa' }
          ]}
        >
          <SlidersHorizontal 
            size={18} 
            color={statusFilter !== 'all' || typeFilter !== 'all' ? '#ffffff' : '#EF5222'} 
          />
          {/* Chấm tròn báo hiệu đang bật bộ lọc */}
          {(statusFilter !== 'all' || typeFilter !== 'all') && (
            <View style={tw`absolute -top-1 -right-1 w-3 h-3 rounded-full bg-amber-400 border-2 border-white`} />
          )}
        </TouchableOpacity>
      </View>

      {/* Chips hiển thị bộ lọc đang hoạt động */}
      {(statusFilter !== 'all' || typeFilter !== 'all') && (
        <View style={tw`px-4 pb-2.5`}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={tw`flex-row`}>
            {statusFilter !== 'all' && (
              <TouchableOpacity
                onPress={() => setStatusFilter('all')}
                activeOpacity={0.8}
                style={tw`flex-row items-center bg-orange-50 px-3 py-1.5 rounded-full border border-orange-100 mr-2`}
              >
                <Text style={tw`text-[11px] font-black text-[#EF5222] mr-1`}>
                  {statusFilter === 'upcoming' ? t('historyPage.statusUpcoming') :
                   statusFilter === 'ongoing' ? t('historyPage.statusOngoing') :
                   statusFilter === 'completed' ? t('historyPage.statusCompleted') : t('historyPage.statusCancelled')}
                </Text>
                <X size={10} color="#EF5222" />
              </TouchableOpacity>
            )}
            
            {typeFilter !== 'all' && (
              <TouchableOpacity
                onPress={() => setTypeFilter('all')}
                activeOpacity={0.8}
                style={tw`flex-row items-center bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200 mr-2`}
              >
                <Text style={tw`text-[11px] font-black text-slate-700 mr-1`}>
                  {typeFilter === 'oneway' ? t('historyPage.oneWay') : t('historyPage.roundTrip')}
                </Text>
                <X size={10} color="#64748b" />
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={() => {
                setStatusFilter('all');
                setTypeFilter('all');
              }}
              style={tw`px-3 py-1.5 rounded-full bg-slate-50 border border-slate-100`}
            >
              <Text style={tw`text-[11px] font-black text-slate-400`}>{t('historyPage.clearFilter')}</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}

      {/* Drawer Bộ lọc */}
      <FilterDrawer
        isOpen={isFilterExpanded}
        onClose={() => setIsFilterExpanded(false)}
        initialStatus={statusFilter}
        initialType={typeFilter}
        onApply={(s, t) => {
          setStatusFilter(s);
          setTypeFilter(t);
        }}
      />

      {/* Body List */}
      {loading ? (
        <ScrollView style={tw`p-4`} showsVerticalScrollIndicator={false}>
          <TripCardSkeleton />
          <TripCardSkeleton />
          <TripCardSkeleton />
        </ScrollView>
      ) : filteredBookings.length === 0 ? (
        <View style={tw`flex-grow justify-center items-center`}>
          <EmptyState
            title={locale === 'vi' ? 'Trống trải quá...' : 'Quite empty here...'}
            description={
              searchQuery || statusFilter !== 'all' || typeFilter !== 'all'
                ? (locale === 'vi' ? 'Không tìm thấy vé xe phù hợp với bộ lọc hiện tại.' : 'No tickets found matching the current filters.')
                : t('historyPage.noTrips')
            }
            icon={<Ticket size={32} color={colors.textSecondary} />}
            actionLabel={searchQuery || statusFilter !== 'all' || typeFilter !== 'all' ? (locale === 'vi' ? 'Đặt lại bộ lọc' : 'Reset filters') : (locale === 'vi' ? 'Đặt vé ngay' : 'Book now')}
            onAction={() => {
              if (searchQuery || statusFilter !== 'all' || typeFilter !== 'all') {
                setSearchQuery('');
                setStatusFilter('all');
                setTypeFilter('all');
              } else {
                router.push('/');
              }
            }}
          />
        </View>
      ) : (
        <FlatList
          data={filteredBookings}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={tw`p-4 pb-[110px]`}
          refreshing={loading}
          onRefresh={fetchHistory}
          showsVerticalScrollIndicator={false}
          renderItem={renderTicketItem}
        />
      )}

      {/* Modal chi tiết vé */}
      <Modal
        visible={!!selectedTicket}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setSelectedTicket(null)}
      >
        <View style={[tw`flex-1 bg-[#f8fafc]`, { paddingTop: insets.top }]}>
          {/* Header of Modal */}
          <View style={tw`px-6 py-4 flex-row items-center border-b border-slate-100 bg-white`}>
            <TouchableOpacity
              onPress={() => setSelectedTicket(null)}
              activeOpacity={0.7}
              style={tw`p-1 mr-3`}
            >
              <X size={24} color="#64748b" />
            </TouchableOpacity>
            <Text style={tw`text-[17px] font-black text-slate-800`}>{locale === 'vi' ? 'Chi tiết vé xe của bạn' : 'Your Ticket Details'}</Text>
          </View>

          <ScrollView style={tw`flex-1`} contentContainerStyle={tw`p-5 pb-12`}>
            {selectedTicket && (
              <TicketDetails
                ticketInfo={selectedTicket}
                refundPolicy={getRefundPolicy(selectedTicket)}
                onRequestCancel={() => setIsCancelDrawerOpen(true)}
              />
            )}
          </ScrollView>
        </View>
      </Modal>

      {/* Drawer hủy vé */}
      {selectedTicket && (
        <CancelDrawer
          isOpen={isCancelDrawerOpen}
          onClose={() => setIsCancelDrawerOpen(false)}
          ticketInfo={selectedTicket}
          refundPolicy={getRefundPolicy(selectedTicket)}
          confirmEmail={confirmEmail}
          setConfirmEmail={setConfirmEmail}
          confirmPhone={confirmPhone}
          setConfirmPhone={setConfirmPhone}
          isAgreed={isAgreed}
          setIsAgreed={setIsAgreed}
          cancelLoading={cancelLoading}
          onCancelConfirm={handleCancelTicket}
        />
      )}

      {/* QR Ticket Modal */}
      <QRTicketModal
        visible={isQrModalVisible}
        onClose={() => setIsQrModalVisible(false)}
        order={qrOrder}
      />

      {/* Rating Drawer */}
      <RatingDrawer
        visible={isRatingDrawerVisible}
        onClose={() => setIsRatingDrawerVisible(false)}
        onSubmitted={() => {
          // Mark this order as reviewed locally
          if (ratingOrder) {
            setReviewedOrderIds((prev) => new Set([...prev, ratingOrder.id]));
          }
        }}
        order={ratingOrder}
        userId={user?.id}
      />
    </SafeAreaView>
  );
}
