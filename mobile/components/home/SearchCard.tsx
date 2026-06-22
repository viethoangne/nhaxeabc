import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  Dimensions,
  ScrollView,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MapPin, Calendar as CalendarIcon, Users, ArrowUpDown, Search, X, ChevronDown, Check } from 'lucide-react-native';
import { useTranslation } from '@/hooks/useTranslation';
import { useBookingStore } from '@/hooks/useBookingStore';
import { useTheme } from '@/hooks/use-theme';
import { LinearGradient } from 'expo-linear-gradient';
import BouncyPressable from '../ui/BouncyPressable';
import tw from 'twrnc';

// Kích hoạt LayoutAnimation trên Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const POPULAR_LOCATIONS = [
  'TP. Hồ Chí Minh',
  'Hà Nội',
  'Đà Lạt',
  'Nha Trang',
  'Cần Thơ',
  'Đà Nẵng',
  'Vũng Tàu',
  'Phan Thiết',
];
export default function SearchCard() {
  const { t, locale } = useTranslation();
  const router = useRouter();
  const colors = useTheme();
  const booking = useBookingStore();

  const [activeModal, setActiveModal] = useState<'from' | 'to' | 'departDate' | 'returnDate' | 'tickets' | 'tripType' | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [calendarMonth, setCalendarMonth] = useState(new Date());

  const filteredLocations = useMemo(() => {
    if (!searchQuery.trim()) return POPULAR_LOCATIONS;
    return POPULAR_LOCATIONS.filter((loc) =>
      loc.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .includes(searchQuery.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''))
    );
  }, [searchQuery]);

  const handleSwap = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.spring);
    const temp = booking.from;
    booking.setSearchParams({ from: booking.to, to: temp });
  };

  const handleSearch = () => {
    if (!booking.from || !booking.to) {
      Alert.alert(t('historyPage.toastInfo') || 'Thông báo', t('search.fillFromTo'));
      return;
    }
    if (booking.from === booking.to) {
      Alert.alert(t('historyPage.toastInfo') || 'Thông báo', t('search.sameFromTo'));
      return;
    }
    if (booking.tripType === 'round' && !booking.returnDate) {
      Alert.alert(t('historyPage.toastInfo') || 'Thông báo', t('search.selectReturnDate'));
      return;
    }
    router.push({
      pathname: '/booking/search-trip' as any,
      params: {
        from: booking.from,
        to: booking.to,
        date: booking.departDate,
        tickets: booking.tickets.toString(),
        tripType: booking.tripType,
        returnDate: booking.returnDate,
      },
    });
  };

  const renderCalendar = (onSelectDate: (dateStr: string) => void, minDateStr?: string) => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const offset = firstDayIndex === 0 ? 6 : firstDayIndex - 1;

    const blanks = Array(offset).fill(null);
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const totalSlots = [...blanks, ...days];

    const todayStr = new Date().toISOString().split('T')[0];
    const targetMinDate = minDateStr || todayStr;

    const prevMonth = () => setCalendarMonth(new Date(year, month - 1, 1));
    const nextMonth = () => setCalendarMonth(new Date(year, month + 1, 1));

    const monthNames = locale === 'vi' ? [
      'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
      'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'
    ] : [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    return (
      <View style={tw`w-full`}>
        <View style={tw`flex-row justify-between items-center mb-4`}>
          <TouchableOpacity onPress={prevMonth} style={[tw`p-2 rounded-lg`, { backgroundColor: colors.backgroundElement }]}>
            <Text style={[tw`text-xs font-bold`, { color: colors.textSecondary }]}>{'<'}</Text>
          </TouchableOpacity>
          <Text style={[tw`text-sm font-extrabold`, { color: colors.text }]}>{monthNames[month]} {year}</Text>
          <TouchableOpacity onPress={nextMonth} style={[tw`p-2 rounded-lg`, { backgroundColor: colors.backgroundElement }]}>
            <Text style={[tw`text-xs font-bold`, { color: colors.textSecondary }]}>{'>'}</Text>
          </TouchableOpacity>
        </View>

        <View style={tw`flex-row justify-between mb-2`}>
          {(locale === 'vi' ? ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'] : ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']).map((w) => (
            <Text key={w} style={[tw`text-center text-[10px] font-black`, { width: (SCREEN_WIDTH - 72) / 7, color: colors.textSecondary }]}>
              {w}
            </Text>
          ))}
        </View>

        <View style={tw`flex-row flex-wrap justify-between gap-y-2`}>
          {totalSlots.map((day, idx) => {
            if (day === null) {
              return <View key={`blank-${idx}`} style={[tw`h-9`, { width: (SCREEN_WIDTH - 72) / 7 }]} />;
            }

            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const isSelected = dateStr === (activeModal === 'departDate' ? booking.departDate : booking.returnDate);
            const isPast = dateStr < targetMinDate;

            return (
              <TouchableOpacity
                key={`day-${day}`}
                disabled={isPast}
                onPress={() => {
                  onSelectDate(dateStr);
                  if (activeModal === 'departDate') {
                    if (booking.tripType === 'round') {
                      setCalendarMonth(booking.returnDate ? new Date(booking.returnDate) : new Date(dateStr));
                      setActiveModal('returnDate');
                    } else {
                      setActiveModal(null);
                    }
                  } else {
                    setActiveModal(null);
                  }
                }}
                style={[
                  tw`h-9 justify-center items-center rounded-lg`,
                  { width: (SCREEN_WIDTH - 72) / 7 },
                  isSelected && { backgroundColor: colors.primary },
                  isPast && tw`opacity-20`
                ]}
              >
                <Text
                  style={[
                    tw`text-xs font-bold`,
                    { color: colors.text },
                    isSelected && { color: '#FFFFFF' },
                    isPast && { color: colors.textSecondary }
                  ]}
                >
                  {day}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  return (
    <View style={tw`mx-4 mt-4.5 z-20`}>
      {/* Khung Tìm Kiếm Xe */}
      <View style={[
        tw`rounded-3xl p-5 border`, 
        { 
          backgroundColor: colors.card, 
          borderColor: colors.border,
          shadowColor: colors.primary, 
          shadowOffset: { width: 0, height: 10 }, 
          shadowOpacity: 0.06, 
          shadowRadius: 20, 
          elevation: 5 
        }
      ]}>
        {/* Toggle Một chiều / Khứ hồi dạng Tab Pill cao cấp */}
        <View style={[
          tw`flex-row rounded-full p-1.5 mb-5.5 self-center border`, 
          { backgroundColor: colors.backgroundElement, borderColor: colors.border }
        ]}>
          <TouchableOpacity
            onPress={() => {
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              booking.setSearchParams({ tripType: 'oneway', returnDate: '' });
            }}
            style={[
              tw`px-6 py-2.5 rounded-full`,
              booking.tripType === 'oneway' && { backgroundColor: '#EF5222' }
            ]}
          >
            <Text style={[
              tw`text-[11.5px] font-black uppercase tracking-wider`, 
              booking.tripType === 'oneway' ? { color: '#ffffff' } : { color: colors.textSecondary }
            ]}>
              {t('search.oneWay')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              booking.setSearchParams({ tripType: 'round' });
            }}
            style={[
              tw`px-6 py-2.5 rounded-full`,
              booking.tripType === 'round' && { backgroundColor: '#EF5222' }
            ]}
          >
            <Text style={[
              tw`text-[11.5px] font-black uppercase tracking-wider`, 
              booking.tripType === 'round' ? { color: '#ffffff' } : { color: colors.textSecondary }
            ]}>
              {t('search.roundTrip')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Form Điểm đi & Điểm đến */}
        <View style={tw`relative mb-4`}>
          {/* Điểm đi */}
          <BouncyPressable
            onPress={() => {
              setSearchQuery('');
              setActiveModal('from');
            }}
            style={[
              tw`flex-row items-center px-4 py-3.5 border rounded-2xl`,
              { backgroundColor: colors.background, borderColor: colors.border }
            ]}
          >
            <View style={[tw`w-9.5 h-9.5 rounded-xl items-center justify-center mr-3`, { backgroundColor: 'rgba(239, 82, 34, 0.08)' }]}>
              <MapPin color={colors.primary} size={17} strokeWidth={2.5} />
            </View>
            <View style={tw`flex-1`}>
              <Text style={[tw`text-[10px] font-black tracking-wider uppercase`, { color: colors.textSecondary }]}>{t('search.from')}</Text>
              <Text style={[tw`text-[15.5px] font-black mt-0.5`, { color: colors.text }]} numberOfLines={1}>
                {booking.from || t('search.selectFrom')}
              </Text>
            </View>
          </BouncyPressable>

          {/* Điểm đến */}
          <BouncyPressable
            onPress={() => {
              setSearchQuery('');
              setActiveModal('to');
            }}
            style={[
              tw`flex-row items-center px-4 py-3.5 border rounded-2xl mt-4`,
              { backgroundColor: colors.background, borderColor: colors.border }
            ]}
          >
            <View style={[tw`w-9.5 h-9.5 rounded-xl items-center justify-center mr-3`, { backgroundColor: 'rgba(234, 179, 8, 0.08)' }]}>
              <MapPin color="#eab308" size={17} strokeWidth={2.5} />
            </View>
            <View style={tw`flex-1`}>
              <Text style={[tw`text-[10px] font-black tracking-wider uppercase`, { color: colors.textSecondary }]}>{t('search.to')}</Text>
              <Text style={[tw`text-[15.5px] font-black mt-0.5`, { color: colors.text }]} numberOfLines={1}>
                {booking.to || t('search.selectTo')}
              </Text>
            </View>
          </BouncyPressable>

          {/* Nút Tráo Đổi Swapper (tròn trịa đè ở giữa góc phải) */}
          <BouncyPressable 
            onPress={handleSwap} 
            style={[
              tw`absolute right-5 top-1/2 -mt-5.5 w-11 h-11 rounded-full justify-center items-center z-10`, 
              { 
                backgroundColor: '#EF5222', 
                borderColor: colors.card,
                borderWidth: 3,
                shadowColor: '#EF5222', 
                shadowOffset: { width: 0, height: 4 }, 
                shadowOpacity: 0.3, 
                shadowRadius: 6, 
                elevation: 4 
              }
            ]}
          >
            <ArrowUpDown color="#ffffff" size={17} strokeWidth={2.5} />
          </BouncyPressable>
        </View>

        {/* Ngày đi */}
        <BouncyPressable 
          onPress={() => {
            setCalendarMonth(booking.departDate ? new Date(booking.departDate) : new Date());
            setActiveModal('departDate');
          }} 
          style={[
            tw`flex-row items-center border rounded-2xl px-4 py-3.5 mb-4`, 
            { backgroundColor: colors.background, borderColor: colors.border }
          ]}
        >
          <View style={[tw`w-9.5 h-9.5 rounded-xl items-center justify-center mr-3`, { backgroundColor: 'rgba(37, 99, 235, 0.08)' }]}>
            <CalendarIcon color="#2563EB" size={17} strokeWidth={2.5} />
          </View>
          <View style={tw`flex-1`}>
            <Text style={[tw`text-[10px] font-black tracking-wider uppercase`, { color: colors.textSecondary }]}>{t('search.departDate')}</Text>
            <Text style={[tw`text-[15px] font-black mt-0.5`, { color: colors.text }]} numberOfLines={1}>
              {booking.departDate ? booking.departDate.split('-').reverse().join('/') : t('search.selectDate')}
            </Text>
          </View>
        </BouncyPressable>

        {/* Ngày về (chỉ hiển thị khi Khứ hồi) */}
        {booking.tripType === 'round' && (
          <BouncyPressable 
            onPress={() => {
              setCalendarMonth(booking.returnDate ? new Date(booking.returnDate) : (booking.departDate ? new Date(booking.departDate) : new Date()));
              setActiveModal('returnDate');
            }} 
            style={[
              tw`flex-row items-center border rounded-2xl px-4 py-3.5 mb-4`, 
              { backgroundColor: colors.background, borderColor: colors.border }
            ]}
          >
            <View style={[tw`w-9.5 h-9.5 rounded-xl items-center justify-center mr-3`, { backgroundColor: 'rgba(124, 58, 237, 0.08)' }]}>
              <CalendarIcon color="#7C3AED" size={17} strokeWidth={2.5} />
            </View>
            <View style={tw`flex-1`}>
              <Text style={[tw`text-[10px] font-black tracking-wider uppercase`, { color: colors.textSecondary }]}>{t('search.returnDate')}</Text>
              <Text style={[tw`text-[15px] font-black mt-0.5`, { color: colors.text }]} numberOfLines={1}>
                {booking.returnDate ? booking.returnDate.split('-').reverse().join('/') : t('search.selectReturnDateTitle')}
              </Text>
            </View>
          </BouncyPressable>
        )}

        {/* Số lượng hành khách */}
        <BouncyPressable 
          onPress={() => setActiveModal('tickets')} 
          style={[
            tw`flex-row items-center border rounded-2xl px-4 py-3.5 mb-5`, 
            { backgroundColor: colors.background, borderColor: colors.border }
          ]}
        >
          <View style={[tw`w-9.5 h-9.5 rounded-xl items-center justify-center mr-3`, { backgroundColor: 'rgba(16, 185, 129, 0.08)' }]}>
            <Users color="#10B981" size={17} strokeWidth={2.5} />
          </View>
          <View style={tw`flex-1`}>
            <Text style={[tw`text-[10px] font-black tracking-wider uppercase`, { color: colors.textSecondary }]}>{t('search.passenger')}</Text>
            <Text style={[tw`text-[15px] font-black mt-0.5`, { color: colors.text }]}>{`${booking.tickets} ${locale === 'vi' ? 'Vé' : 'Ticket(s)'}`}</Text>
          </View>
        </BouncyPressable>

        {/* Nút Tìm kiếm chính */}
        <BouncyPressable
          onPress={handleSearch}
          style={tw`w-full`}
        >
          <LinearGradient
            colors={['#F97316', '#EF5222']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[
              tw`flex-row items-center justify-center py-4 rounded-2xl gap-2`,
              {
                shadowColor: '#EF5222',
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.35,
                shadowRadius: 16,
                elevation: 6
              }
            ]}
          >
            <Search color="#ffffff" size={18} strokeWidth={3} />
            <Text style={tw`text-white text-[15.5px] font-black uppercase tracking-wider`}>{t('search.searchBtn')}</Text>
          </LinearGradient>
        </BouncyPressable>
      </View>

      {/* MODAL 1: CHỌN ĐIỂM ĐI */}
      <Modal visible={activeModal === 'from'} animationType="slide">
        <SafeAreaView style={[tw`flex-1`, { backgroundColor: colors.background }]}>
          <View style={[tw`flex-row items-center justify-between p-4.5 border-b`, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[tw`text-[16px] font-black`, { color: colors.text }]}>{t('search.selectFromPlaceholder')}</Text>
            <TouchableOpacity onPress={() => setActiveModal(null)} style={tw`p-1.5`}>
              <X color={colors.text} size={24} />
            </TouchableOpacity>
          </View>
          <View style={[tw`p-4.5 border-b`, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <TextInput
              style={[tw`h-13 rounded-2xl px-5 text-[15.5px] font-bold border`, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
              placeholder={t('search.searchQueryFromPlaceholder')}
              placeholderTextColor={colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
            />
          </View>
          <ScrollView style={tw`flex-1`} contentContainerStyle={tw`p-5`}>
            {filteredLocations.map((loc) => (
              <TouchableOpacity
                key={loc}
                style={[tw`flex-row items-center py-4 border-b`, { borderColor: colors.border }]}
                onPress={() => {
                  booking.setSearchParams({ from: loc });
                  setActiveModal('to');
                }}
              >
                <MapPin color={colors.primary} size={18} style={tw`mr-3.5`} />
                <Text style={[tw`text-[15.5px] font-black`, { color: colors.text }]}>{loc}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* MODAL 2: CHỌN ĐIỂM ĐẾN */}
      <Modal visible={activeModal === 'to'} animationType="slide">
        <SafeAreaView style={[tw`flex-1`, { backgroundColor: colors.background }]}>
          <View style={[tw`flex-row items-center justify-between p-4.5 border-b`, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[tw`text-[16px] font-black`, { color: colors.text }]}>{t('search.selectToPlaceholder')}</Text>
            <TouchableOpacity onPress={() => setActiveModal(null)} style={tw`p-1.5`}>
              <X color={colors.text} size={24} />
            </TouchableOpacity>
          </View>
          <View style={[tw`p-4.5 border-b`, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <TextInput
              style={[tw`h-13 rounded-2xl px-5 text-[15.5px] font-bold border`, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
              placeholder={t('search.searchQueryToPlaceholder')}
              placeholderTextColor={colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
            />
          </View>
          <ScrollView style={tw`flex-1`} contentContainerStyle={tw`p-5`}>
            {filteredLocations.map((loc) => (
              <TouchableOpacity
                key={loc}
                style={[tw`flex-row items-center py-4 border-b`, { borderColor: colors.border }]}
                onPress={() => {
                  booking.setSearchParams({ to: loc });
                  setActiveModal(null);
                }}
              >
                <MapPin color="#eab308" size={18} style={tw`mr-3.5`} />
                <Text style={[tw`text-[15.5px] font-black`, { color: colors.text }]}>{loc}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* MODAL 3: CHỌN NGÀY */}
      <Modal visible={activeModal === 'departDate' || activeModal === 'returnDate'} transparent animationType="fade">
        <View style={tw`flex-1 bg-black/60 justify-end`}>
          <View style={[tw`rounded-t-[32px] p-6 pb-8 border-t`, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={tw`flex-row justify-between items-center mb-5`}>
              <Text style={[tw`text-[16px] font-black`, { color: colors.text }]}>
                {activeModal === 'departDate' ? t('search.selectDepartDate') : t('search.selectReturnDateTitle')}
              </Text>
              <TouchableOpacity onPress={() => setActiveModal(null)} style={tw`p-1`}>
                <X color={colors.text} size={22} />
              </TouchableOpacity>
            </View>
            {activeModal === 'departDate' ? (
              renderCalendar((date) => {
                booking.setSearchParams({ departDate: date });
                if (booking.returnDate && date > booking.returnDate) {
                  booking.setSearchParams({ returnDate: '' });
                }
              })
            ) : (
              renderCalendar(
                (date) => {
                  booking.setSearchParams({ returnDate: date });
                },
                booking.departDate
              )
            )}
          </View>
        </View>
      </Modal>

      {/* MODAL 4: CHỌN SỐ VÉ */}
      <Modal visible={activeModal === 'tickets'} transparent animationType="fade">
        <View style={tw`flex-1 bg-black/60 justify-end`}>
          <View style={[tw`rounded-t-[32px] p-6 pb-8 border-t`, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={tw`flex-row justify-between items-center mb-5`}>
              <Text style={[tw`text-[16px] font-black`, { color: colors.text }]}>{t('search.selectSeatsTitle')}</Text>
              <TouchableOpacity onPress={() => setActiveModal(null)} style={tw`p-1`}>
                <X color={colors.text} size={22} />
              </TouchableOpacity>
            </View>
            <View style={tw`flex-row justify-between items-center my-8`}>
              <Text style={[tw`text-[14px] font-bold`, { color: colors.text }]}>{t('search.selectSeatsDesc')}</Text>
              <View style={[tw`flex-row items-center rounded-2xl p-1.5 border`, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <TouchableOpacity
                  onPress={() => booking.setSearchParams({ tickets: Math.max(1, booking.tickets - 1) })}
                  style={[tw`w-11 h-11 rounded-xl justify-center items-center`, { backgroundColor: colors.card }]}
                >
                  <Text style={[tw`text-lg font-black`, { color: colors.text }]}>-</Text>
                </TouchableOpacity>
                <Text style={[tw`text-[17px] font-black mx-5`, { color: colors.text }]}>{booking.tickets}</Text>
                <TouchableOpacity
                  onPress={() => booking.setSearchParams({ tickets: Math.min(6, booking.tickets + 1) })}
                  style={[tw`w-11 h-11 rounded-xl justify-center items-center`, { backgroundColor: colors.card }]}
                >
                  <Text style={[tw`text-lg font-black`, { color: colors.text }]}>+</Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              onPress={() => setActiveModal(null)}
              activeOpacity={0.85}
              style={[
                tw`flex-row items-center justify-center py-4 rounded-2xl w-full`,
                { backgroundColor: colors.primary }
              ]}
            >
              <Text style={tw`text-white text-[15px] font-black uppercase tracking-wider`}>{t('search.confirmSeats')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL 5: CHỌN LOẠI VÉ */}
      <Modal visible={activeModal === 'tripType'} transparent animationType="fade">
        <View style={tw`flex-1 bg-black/60 justify-end`}>
          <View style={[tw`rounded-t-[32px] p-6 pb-8 border-t`, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={tw`flex-row justify-between items-center mb-5`}>
              <Text style={[tw`text-[16px] font-black`, { color: colors.text }]}>{t('search.selectRouteType')}</Text>
              <TouchableOpacity onPress={() => setActiveModal(null)} style={tw`p-1`}>
                <X color={colors.text} size={22} />
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity
              onPress={() => {
                booking.setSearchParams({ tripType: 'oneway', returnDate: '' });
                setActiveModal(null);
              }}
              style={[tw`py-4.5 border-b flex-row justify-between items-center`, { borderColor: colors.border }]}
              activeOpacity={0.7}
            >
              <Text style={[tw`text-[15px] font-black`, booking.tripType === 'oneway' ? { color: colors.primary } : { color: colors.text }]}>{t('search.oneWay')}</Text>
              {booking.tripType === 'oneway' && <Check size={18} color={colors.primary} />}
            </TouchableOpacity>
 
            <TouchableOpacity
              onPress={() => {
                booking.setSearchParams({ tripType: 'round' });
                setActiveModal(null);
              }}
              style={tw`py-4.5 flex-row justify-between items-center`}
              activeOpacity={0.7}
            >
              <Text style={[tw`text-[15px] font-black`, booking.tripType === 'round' ? { color: colors.primary } : { color: colors.text }]}>{t('search.roundTripWithReturn')}</Text>
              {booking.tripType === 'round' && <Check size={18} color={colors.primary} />}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
