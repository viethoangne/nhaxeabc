import React, { useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  Modal,
  Linking,
  TextInput,
  Image,
  ActivityIndicator,
  Animated,
  Alert,
} from 'react-native';
import * as Location from 'expo-location';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Ticket,
  Search as SearchIcon,
  Calendar,
  Phone,
  Newspaper,
  X,
  Bell,
  MapPin,
  Bus,
  Compass,
  Clock,
  ChevronRight,
  ChevronLeft,
  Award,
  Sparkles,
} from 'lucide-react-native';
import { useBookingStore } from '@/hooks/useBookingStore';
import { useAuthStore } from '@/hooks/useAuthStore';
import { useTheme } from '@/hooks/use-theme';
import { useThemeStore } from '@/hooks/useThemeStore';
import { apiClient } from '@/constants/api';
import ChatAI from '@/components/ChatAI';
import BrandTrustBadges from '@/components/home/BrandTrustBadges';
import PopularRoutes from '@/components/home/PopularRoutes';
import { LinearGradient } from 'expo-linear-gradient';
import BouncyPressable from '@/components/ui/BouncyPressable';
import { useChatStore } from '@/hooks/useChatStore';
import tw from 'twrnc';
import TopMenu from '@/components/layout/TopMenu';
import { useTranslation } from '@/hooks/useTranslation';

const FadeInView = (props: any) => {
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(15)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 350,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  return (
    <Animated.View
      style={{
        ...props.style,
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }],
      }}
    >
      {props.children}
    </Animated.View>
  );
};

const SlideUpModal = ({ visible, onClose, children }: { visible: boolean; onClose: () => void; children: React.ReactNode }) => {
  const slideAnim = React.useRef(new Animated.Value(400)).current;
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 350,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 400,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <View style={tw`flex-1 bg-black/40 justify-end`}>
        <TouchableOpacity style={tw`absolute inset-0`} activeOpacity={1} onPress={onClose} />
        <Animated.View style={{ transform: [{ translateY: slideAnim }], opacity: fadeAnim }}>
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
};

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

const CITIES_COORDS = [
  { name: 'TP. Hồ Chí Minh', lat: 10.762622, lon: 106.660172 },
  { name: 'Hà Nội', lat: 21.028511, lon: 105.804817 },
  { name: 'Đà Lạt', lat: 11.940419, lon: 108.438018 },
  { name: 'Nha Trang', lat: 12.238791, lon: 109.196749 },
  { name: 'Cần Thơ', lat: 10.045162, lon: 105.746857 },
  { name: 'Đà Nẵng', lat: 16.054407, lon: 108.202167 },
  { name: 'Vũng Tàu', lat: 10.34599, lon: 107.08426 },
  { name: 'Phan Thiết', lat: 10.933333, lon: 108.1 },
];

function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function findClosestCity(lat: number, lon: number) {
  let closestCity = CITIES_COORDS[0];
  let minDistance = getDistance(lat, lon, closestCity.lat, closestCity.lon);
  
  for (let i = 1; i < CITIES_COORDS.length; i++) {
    const d = getDistance(lat, lon, CITIES_COORDS[i].lat, CITIES_COORDS[i].lon);
    if (d < minDistance) {
      minDistance = d;
      closestCity = CITIES_COORDS[i];
    }
  }
  return closestCity.name;
}

const getLocalizedLocationName = (name: string, locale: string) => {
  if (locale === 'vi') return name;
  const mapping: Record<string, string> = {
    'TP. Hồ Chí Minh': 'Ho Chi Minh City',
    'Hà Nội': 'Hanoi',
    'Đà Lạt': 'Da Lat',
    'Nha Trang': 'Nha Trang',
    'Cần Thơ': 'Can Tho',
    'Đà Nẵng': 'Da Nang',
    'Vũng Tàu': 'Vung Tau',
    'Phan Thiết': 'Phan Thiet',
  };
  return mapping[name] || name;
};

const getLocalizedAddress = (address: string, locale: string) => {
  if (!address) return '';
  
  let localized = address;
  if (locale === 'en') {
    const mapping: Record<string, string> = {
      'TP. Hồ Chí Minh': 'Ho Chi Minh City',
      'Thành phố Hồ Chí Minh': 'Ho Chi Minh City',
      'Hà Nội': 'Hanoi',
      'Thành phố Hà Nội': 'Hanoi',
      'Đà Lạt': 'Da Lat',
      'Nha Trang': 'Nha Trang',
      'Cần Thơ': 'Can Tho',
      'Thành phố Cần Thơ': 'Can Tho',
      'Đà Nẵng': 'Da Nang',
      'Thành phố Đà Nẵng': 'Da Nang',
      'Vũng Tàu': 'Vung Tau',
      'Thành phố Vũng Tàu': 'Vung Tau',
      'Phan Thiết': 'Phan Thiet',
      'Bình Thuận': 'Binh Thuan',
      'Khánh Hòa': 'Khanh Hoa',
      'Lâm Đồng': 'Lam Dong',
      'Việt Nam': 'Vietnam',
      'Quận': 'District',
      'Phường': 'Ward',
    };
    
    for (const [vi, en] of Object.entries(mapping)) {
      localized = localized.replace(new RegExp(vi, 'g'), en);
    }
  } else {
    const mapping: Record<string, string> = {
      'Ho Chi Minh City': 'TP. Hồ Chí Minh',
      'Hanoi': 'Hà Nội',
      'Ha Noi': 'Hà Nội',
      'Da Lat': 'Đà Lạt',
      'Nha Trang': 'Nha Trang',
      'Can Tho': 'Cần Thơ',
      'Da Nang': 'Đà Nẵng',
      'Vung Tau': 'Vũng Tàu',
      'Phan Thiet': 'Phan Thiết',
      'Binh Thuan': 'Bình Thuận',
      'Khanh Hoa': 'Khánh Hòa',
      'Lam Dong': 'Lâm Đồng',
      'Vietnam': 'Việt Nam',
      'Viet Nam': 'Việt Nam',
      'District (\\d+)': 'Quận $1',
      'District': 'Quận',
      'Ward': 'Phường',
      'Town': 'Thị trấn',
      'Province': 'Tỉnh',
    };
    
    for (const [en, vi] of Object.entries(mapping)) {
      localized = localized.replace(new RegExp(en, 'g'), vi);
    }
  }
  return localized;
};

export default function HomeScreen() {
  const colors = useTheme();
  const { theme } = useThemeStore();
  const router = useRouter();
  const booking = useBookingStore();
  const auth = useAuthStore();
  const { setIsOpen: setChatOpen, setInitialQuery } = useChatStore();
  const { t, locale } = useTranslation();

  const [activeModal, setActiveModal] = useState<'schedule' | 'contact' | 'about' | 'location_info' | null>(null);
  const [latestBooking, setLatestBooking] = useState<any>(null);
  const [isLocating, setIsLocating] = useState(false);

  // Lịch trình
  const [allRoutes, setAllRoutes] = useState<any[]>([]);
  const [searchFrom, setSearchFrom] = useState('');
  const [searchTo, setSearchTo] = useState('');
  const [routesLoading, setRoutesLoading] = useState(false);

  const handleAutoDetectLocation = async (showFeedback = false) => {
    setIsLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        if (showFeedback) {
          Alert.alert(
            t('location_permission_denied') || 'Quyền truy cập vị trí bị từ chối',
            t('location_permission_desc') || 'Vui lòng cho phép quyền truy cập vị trí trong cài đặt thiết bị để sử dụng tính năng này.'
          );
        }
        setIsLocating(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const closestCityName = findClosestCity(
        location.coords.latitude,
        location.coords.longitude
      );

      let detailedAddr = '';
      const reverseGeocode = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      if (reverseGeocode && reverseGeocode.length > 0) {
        const address = reverseGeocode[0];
        const parts: string[] = [];
        if (address.district) {
          parts.push(address.district);
        }
        if (address.subregion) {
          parts.push(address.subregion);
        }
        if (address.city || address.region) {
          const city = address.city || address.region;
          let shortCity = city || '';
          if (shortCity.includes('Hồ Chí Minh')) {
            shortCity = 'TP. HCM';
          }
          parts.push(shortCity);
        }
        detailedAddr = parts.join(', ');
      }

      const finalDetailed = detailedAddr || getLocalizedLocationName(closestCityName, locale);
      await booking.setUserLocation(closestCityName, finalDetailed);
      
      if (showFeedback) {
        Alert.alert(
          t('location_detected_title') || 'Định vị thành công',
          `${t('location_detected') || 'Đã xác định vị trí của bạn là:'} ${finalDetailed}`
        );
      }
    } catch (error) {
      console.error('Error getting location:', error);
      if (showFeedback) {
        Alert.alert(
          t('gps_error') || 'Lỗi GPS',
          t('gps_error_desc') || 'Không thể xác định vị trí GPS của bạn.'
        );
      }
    } finally {
      setIsLocating(false);
    }
  };

  React.useEffect(() => {
    booking.initLocation().then(() => {
      handleAutoDetectLocation(false);
    });
  }, []);

  React.useEffect(() => {
    if (activeModal === 'schedule' && allRoutes.length === 0) {
      const fetchRoutes = async () => {
        setRoutesLoading(true);
        try {
          const res = await apiClient.get('/schedule/routes');
          setAllRoutes(res.data || []);
        } catch (err) {
          console.error("Lỗi lấy tuyến đường:", err);
        } finally {
          setRoutesLoading(false);
        }
      };
      fetchRoutes();
    }
  }, [activeModal, allRoutes]);

  const normalizeText = (text: string) => {
    if (!text) return "";
    return text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/[^a-z0-9\s]/g, "")
      .trim();
  };

  const filteredRoutes = allRoutes.filter(route => {
    const routeFrom = normalizeText(route.from);
    const routeTo = normalizeText(route.to);
    const termFrom = normalizeText(searchFrom);
    const termTo = normalizeText(searchTo);
    return routeFrom.includes(termFrom) && routeTo.includes(termTo);
  });

  const groupedRoutes = filteredRoutes.reduce((acc: Record<string, any[]>, route) => {
    if (!acc[route.from]) acc[route.from] = [];
    acc[route.from].push(route);
    return acc;
  }, {});

  const handleBookingRedirect = (from: string, to: string) => {
    setActiveModal(null);
    const today = new Date().toISOString().split('T')[0];
    router.push({
      pathname: '/booking/search-trip',
      params: {
        from,
        to,
        date: today,
        tickets: '1',
        tripType: 'oneway',
      }
    });
  };

  React.useEffect(() => {
    const fetchLatestBooking = async () => {
      if (!auth.user?.id) return;
      try {
        const res = await apiClient.get(`/payment/history/${auth.user.id}`);
        const historyData = res.data?.data || res.data || [];
        if (historyData.length > 0) {
          const sorted = [...historyData].sort((a, b) => {
            const dateA = new Date(a.createdAt || 0).getTime();
            const dateB = new Date(b.createdAt || 0).getTime();
            return dateB - dateA;
          });
          setLatestBooking(sorted[0]);
        }
      } catch (error) {
        console.warn('Lỗi lấy vé sắp tới ở Trang chủ:', error);
      }
    };

    if (auth.user?.id) {
      fetchLatestBooking();
    } else {
      setLatestBooking(null);
    }
  }, [auth.user]);

  const handleSelectPopularRoute = (from: string, to: string) => {
    booking.setSearchParams({ from, to });
    router.push('/booking/search-trip');
  };

  const handleGridAction = (action: string) => {
    if (action === 'booking') {
      router.push('/booking/search' as any);
    } else if (action === 'lookup') {
      router.push('/lookup' as any);
    } else if (action === 'schedule') {
      setActiveModal('schedule');
    } else if (action === 'contact') {
      router.push('/contact' as any);
    } else if (action === 'news') {
      router.push('/news' as any);
    } else if (action === 'about') {
      router.push('/about' as any);
    }
  };

  const getTicketStatus = (b: any) => {
    if (!b) return null;
    const currentStatus = b.bookingStatus?.toUpperCase();
    if (currentStatus === 'CANCELLED') return 'cancelled';

    const departAt = b.outboundDepartDateSnapshot || b.date;
    if (!departAt) return 'completed';

    const now = Date.now();
    const departTime = new Date(departAt).getTime();
    
    const durationMin = b.outboundDurationMinutesSnapshot || 240;
    const arrivalTime = departTime + durationMin * 60000;

    if (departTime > now) return 'upcoming';
    if (now >= departTime && now <= arrivalTime) return 'ongoing';
    return 'completed';
  };

  return (
    <SafeAreaView style={[tw`flex-1`, { backgroundColor: colors.background }]}>
      {/* 1. TOP HEADER */}
      <View style={[
        tw`flex-row items-center justify-between px-5 pt-3 pb-3.5 z-40 border-b`,
        { 
          backgroundColor: colors.card, 
          borderColor: colors.border,
        }
      ]}>
        {/* Left: Avatar tài khoản */}
        <BouncyPressable
          onPress={() => router.push('/(tabs)/loyalty' as any)}
          style={[
            tw`w-9 h-9 rounded-full overflow-hidden border-2 items-center justify-center`,
            { 
              borderColor: auth.isAuthenticated ? '#f59e0b' : colors.primary,
              backgroundColor: colors.primaryLight,
            }
          ]}
        >
          {auth.isAuthenticated && auth.user?.picture ? (
            <Image source={{ uri: auth.user.picture }} style={tw`w-full h-full`} resizeMode="cover" />
          ) : auth.isAuthenticated ? (
            <Text style={[tw`text-sm font-black`, { color: colors.primary }]}>
              {auth.user?.name?.charAt(0)?.toUpperCase() || '?'}
            </Text>
          ) : (
            <Text style={[tw`text-[10px] font-black`, { color: colors.primary }]}>ABC</Text>
          )}
        </BouncyPressable>

        {/* Center: Greeting & Location */}
        <View style={tw`items-center`}>
          <Text style={tw`text-[11px] font-bold text-slate-400`}>
            {auth.isAuthenticated ? `${t('hi')}, ${auth.user?.name?.split(' ')[0] || ''}` : t('welcome')}
          </Text>
          <BouncyPressable 
            onPress={() => setActiveModal('location_info')}
            style={tw`flex-row items-center mt-0.5`}
          >
            <MapPin size={13} color={colors.primary} style={tw`mr-1`} />
            <Text 
              numberOfLines={1} 
              ellipsizeMode="tail" 
              style={[tw`text-[13px] font-black max-w-[170px]`, { color: colors.text }]}
            >
              {getLocalizedAddress(booking.detailedAddress || 'Hà Nội', locale)}
            </Text>
            {isLocating ? (
              <ActivityIndicator size="small" color={colors.primary} style={tw`ml-1.5`} />
            ) : (
              <Text style={[tw`text-[9px] font-black ml-1`, { color: colors.textSecondary }]}>↻</Text>
            )}
          </BouncyPressable>
        </View>

        {/* Right: Menu */}
        <TopMenu />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={tw`pb-[110px]`}>

        {/* 3. SERVICES GRID */}
        <View style={tw`px-5 mt-6 gap-3`}>
          {/* Row 1 */}
          <View style={tw`flex-row justify-between gap-3`}>
            {/* Mua vé */}
            <BouncyPressable 
              onPress={() => handleGridAction('booking')}
              style={[tw`items-center flex-1 border rounded-2xl py-3.5 shadow-sm`, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <View style={[tw`w-11 h-11 rounded-full justify-center items-center`, { backgroundColor: colors.primaryLight }]}>
                <Ticket size={20} color={colors.primary} />
              </View>
              <Text style={[tw`text-[11.5px] font-black mt-2`, { color: colors.text }]}>{t('buy_tickets')}</Text>
            </BouncyPressable>

            {/* Tra cứu */}
            <BouncyPressable 
              onPress={() => handleGridAction('lookup')}
              style={[tw`items-center flex-1 border rounded-2xl py-3.5 shadow-sm`, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <View style={[tw`w-11 h-11 rounded-full justify-center items-center`, { backgroundColor: colors.primaryLight }]}>
                <SearchIcon size={20} color={colors.primary} />
              </View>
              <Text style={[tw`text-[11.5px] font-black mt-2`, { color: colors.text }]}>{t('lookup_title')}</Text>
            </BouncyPressable>

            {/* Lịch trình */}
            <BouncyPressable 
              onPress={() => handleGridAction('schedule')}
              style={[tw`items-center flex-1 border rounded-2xl py-3.5 shadow-sm`, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <View style={[tw`w-11 h-11 rounded-full justify-center items-center`, { backgroundColor: colors.primaryLight }]}>
                <Calendar size={20} color={colors.primary} />
              </View>
              <Text style={[tw`text-[11.5px] font-black mt-2`, { color: colors.text }]}>{t('footer.schedule')}</Text>
            </BouncyPressable>
          </View>

          {/* Row 2 */}
          <View style={tw`flex-row justify-between gap-3`}>
            {/* Tin tức */}
            <BouncyPressable 
              onPress={() => handleGridAction('news')}
              style={[tw`items-center flex-1 border rounded-2xl py-3.5 shadow-sm`, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <View style={[tw`w-11 h-11 rounded-full justify-center items-center`, { backgroundColor: colors.primaryLight }]}>
                <Newspaper size={20} color={colors.primary} />
              </View>
              <Text style={[tw`text-[11.5px] font-black mt-2`, { color: colors.text }]}>{t('news_title')}</Text>
            </BouncyPressable>

            {/* Liên hệ */}
            <BouncyPressable 
              onPress={() => handleGridAction('contact')}
              style={[tw`items-center flex-1 border rounded-2xl py-3.5 shadow-sm`, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <View style={[tw`w-11 h-11 rounded-full justify-center items-center`, { backgroundColor: colors.primaryLight }]}>
                <Phone size={20} color={colors.primary} />
              </View>
              <Text style={[tw`text-[11.5px] font-black mt-2`, { color: colors.text }]}>{t('contactPage.breadcrumb')}</Text>
            </BouncyPressable>

            {/* Giới thiệu */}
            <BouncyPressable 
              onPress={() => handleGridAction('about')}
              style={[tw`items-center flex-1 border rounded-2xl py-3.5 shadow-sm`, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <View style={[tw`w-11 h-11 rounded-full justify-center items-center`, { backgroundColor: colors.primaryLight }]}>
                <Award size={20} color={colors.primary} />
              </View>
              <Text style={[tw`text-[11.5px] font-black mt-2`, { color: colors.text }]}>{t('about_title')}</Text>
            </BouncyPressable>
          </View>
        </View>

        {/* Upcoming Trip Section */}
        {latestBooking && (getTicketStatus(latestBooking) === 'upcoming' || getTicketStatus(latestBooking) === 'ongoing') && (
          <FadeInView style={tw`px-5 mt-6`}>
            <View style={[
              tw`rounded-3xl border overflow-hidden p-5`,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                shadowColor: '#EF5222',
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: theme === 'dark' ? 0.2 : 0.08,
                shadowRadius: 16,
                elevation: 3,
              }
            ]}>
              <View style={tw`flex-row justify-between items-center mb-3.5`}>
                <View style={tw`flex-row items-center gap-2`}>
                  <View style={tw`w-2.5 h-2.5 rounded-full bg-emerald-500`} />
                  <Text style={[tw`text-[11px] font-black uppercase tracking-wider`, { color: colors.text }]}>
                    {getTicketStatus(latestBooking) === 'ongoing' ? t('ongoing_trip') || 'Đang di chuyển' : t('upcoming_trip') || 'Chuyến đi sắp tới'}
                  </Text>
                </View>
                <Text style={[tw`text-[11px] font-black`, { color: colors.textSecondary }]}>#{latestBooking.orderCode}</Text>
              </View>

              <View style={tw`flex-row items-center justify-between mt-1`}>
                <View style={tw`flex-1`}>
                  <Text style={[tw`text-[10px] font-bold uppercase tracking-wide`, { color: colors.textSecondary }]}>{t('search.from') || 'Điểm đi'}</Text>
                  <Text style={[tw`text-[16px] font-black mt-0.5`, { color: colors.text }]}>{latestBooking.from}</Text>
                </View>

                <View style={tw`px-4`}>
                  <ChevronRight size={18} color="#EF5222" />
                </View>

                <View style={tw`flex-1 items-end`}>
                  <Text style={[tw`text-[10px] font-bold uppercase tracking-wide`, { color: colors.textSecondary }]}>{t('search.to') || 'Điểm đến'}</Text>
                  <Text style={[tw`text-[16px] font-black mt-0.5`, { color: colors.text }]}>{latestBooking.to}</Text>
                </View>
              </View>

              <View style={[tw`h-px my-4`, { backgroundColor: colors.border }]} />

              <View style={tw`flex-row justify-between items-center`}>
                <View style={tw`flex-row items-center gap-2`}>
                  <Calendar size={14} color={colors.textSecondary} />
                  <Text style={[tw`text-[12px] font-bold`, { color: colors.textSecondary }]}>
                    {new Date(latestBooking.outboundDepartDateSnapshot || latestBooking.date).toLocaleDateString(locale === 'vi' ? 'vi-VN' : 'en-US', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </Text>
                </View>

                <View style={tw`flex-row items-center gap-1.5`}>
                  <Text style={[tw`text-[11px] font-bold`, { color: colors.textSecondary }]}>{t('historyPage.seatsNumber') || 'Số ghế'}:</Text>
                  <Text style={tw`text-[12px] font-black text-[#EF5222]`}>
                    {(latestBooking.seats?.filter((s: any) => s.tripDirection === 'outbound') || latestBooking.seats || [])
                      .map((s: any) => s.seatNumber).join(', ') || '--'}
                  </Text>
                </View>
              </View>

              {/* Action buttons inside card */}
              <View style={[tw`flex-row gap-3.5 mt-4 pt-4 border-t`, { borderColor: colors.border }]}>
                <TouchableOpacity
                  onPress={() => {
                    router.push('/(tabs)/history' as any);
                  }}
                  activeOpacity={0.8}
                  style={[
                    tw`flex-1 py-2.5 border rounded-xl items-center justify-center`,
                    {
                      backgroundColor: theme === 'dark' ? 'rgba(239, 82, 34, 0.1)' : '#fff7ed',
                      borderColor: theme === 'dark' ? 'rgba(239, 82, 34, 0.3)' : '#ffedd5',
                    }
                  ]}
                >
                  <Text style={tw`text-[12px] font-black text-[#EF5222]`}>{t('historyPage.viewTicket') || 'Xem chi tiết'}</Text>
                </TouchableOpacity>

                {getTicketStatus(latestBooking) === 'ongoing' && (
                  <TouchableOpacity
                    onPress={() => {
                      router.push({
                        pathname: '/tracking/[orderId]',
                        params: {
                          orderId: latestBooking.id.toString(),
                          orderCode: latestBooking.orderCode,
                          from: latestBooking.from,
                          to: latestBooking.to,
                          departDate: latestBooking.outboundDepartDateSnapshot || latestBooking.date,
                          durationMinutes: (latestBooking.outboundDurationMinutesSnapshot || 240).toString(),
                          driverName: latestBooking.outboundTrip?.driverName || '',
                          driverPhone: '',
                          busPlate: latestBooking.outboundTrip?.busPlate || '',
                          busType: latestBooking.outboundBusTypeSnapshot || '',
                          pickupPoint: latestBooking.outboundPickupPointSnapshot || '',
                          dropoffPoint: latestBooking.outboundDropoffPointSnapshot || '',
                        },
                      } as any);
                    }}
                    activeOpacity={0.8}
                    style={tw`flex-1 py-2.5 bg-[#EF5222] rounded-xl items-center justify-center`}
                  >
                    <Text style={tw`text-[12px] font-black text-white`}>{t('track_bus') || 'Theo dõi xe'}</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </FadeInView>
        )}

        {/* 5. POPULAR ROUTES */}
        <PopularRoutes onSelectRoute={handleSelectPopularRoute} />

        {/* 6. BRAND TRUST BADGES */}
        <BrandTrustBadges />

        {/* AI Voice & Assistant Feature Showcase Banner */}
        <View style={tw`px-5 mt-4 mb-8`}>
          <BouncyPressable
            onPress={() => setChatOpen(true)}
            scaleTo={0.99}
            style={tw`overflow-hidden rounded-3xl border border-orange-100 shadow-md`}
          >
            <LinearGradient
              colors={['#EF5222', '#F59E0B']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={tw`p-5.5 relative`}
            >
              {/* Floating ambient glow in background */}
              <View style={[tw`absolute -right-10 -bottom-10 w-40 h-40 bg-white/10 rounded-full`]} />

              <View style={tw`flex-row justify-between items-center mb-3.5`}>
                <View style={tw`flex-row items-center gap-2 bg-white/20 border border-white/30 px-3 py-1 rounded-xl`}>
                  <Sparkles size={12} color="#FFFFFF" />
                  <Text style={tw`text-[9px] font-black text-white uppercase tracking-wider`}>
                    {t('home.aiBadge')}
                  </Text>
                </View>
                <View style={tw`flex-row items-center gap-1 bg-white/15 px-2 py-0.8 rounded-lg border border-white/25`}>
                  <View style={tw`w-1.5 h-1.5 rounded-full bg-white`} />
                  <Text style={tw`text-[8px] font-black text-white uppercase tracking-widest`}>AI Assistant</Text>
                </View>
              </View>

              <Text style={tw`text-[17px] font-black text-white`}>
                {t('home.aiTitle')}
              </Text>
              
              <Text style={tw`text-[11.5px] leading-5 text-white/90 font-bold mt-1.5 mb-4`}>
                {t('home.aiDesc')}
              </Text>

              {/* Steps/Features column (themed cards inside orange background) */}
              <View style={tw`gap-3`}>
                {/* Feature 1 */}
                <View style={[tw`flex-row items-start gap-3 rounded-2xl p-3.5 shadow-sm`, { backgroundColor: colors.card }]}>
                  <View style={[tw`w-8 h-8 rounded-xl items-center justify-center mt-0.5`, { backgroundColor: colors.primaryLight }]}>
                    <Sparkles size={15} color={colors.primary} />
                  </View>
                  <View style={tw`flex-1`}>
                    <Text style={[tw`text-[12.5px] font-black`, { color: colors.text }]}>AI Voice Booking ⚡</Text>
                    <Text style={[tw`text-[10.5px] leading-4 font-bold mt-0.5`, { color: colors.textSecondary }]}>
                      {t('home.aiInstruction')}
                    </Text>
                  </View>
                </View>

                {/* Feature 2 */}
                <View style={[tw`flex-row items-start gap-3 rounded-2xl p-3.5 shadow-sm`, { backgroundColor: colors.card }]}>
                  <View style={[tw`w-8 h-8 rounded-xl items-center justify-center mt-0.5`, { backgroundColor: colors.primaryLight }]}>
                    <Award size={15} color={colors.primary} />
                  </View>
                  <View style={tw`flex-1`}>
                    <Text style={[tw`text-[12.5px] font-black`, { color: colors.text }]}>{t('home.aiSuggestTitle')}</Text>
                    <Text style={[tw`text-[10.5px] leading-4 font-bold mt-0.5`, { color: colors.textSecondary }]}>
                      {t('home.aiSuggestDesc')}
                    </Text>
                  </View>
                </View>
              </View>

              <TouchableOpacity
                onPress={() => setChatOpen(true)}
                activeOpacity={0.85}
                style={tw`mt-4 flex-row items-center justify-center bg-slate-900 rounded-2xl py-3.5 shadow-sm`}
              >
                <Text style={tw`text-[12.5px] font-black text-white mr-1.5 uppercase tracking-wider`}>
                  {t('home.aiBtn')}
                </Text>
                <ChevronRight size={14} color="#ffffff" strokeWidth={3} />
              </TouchableOpacity>
            </LinearGradient>
          </BouncyPressable>
        </View>
      </ScrollView>

      {/* Floating Chatbot AI */}
      <ChatAI />

      {/* MODAL: LỊCH TRÌNH */}
      <Modal visible={activeModal === 'schedule'} animationType="slide">
        <SafeAreaView style={[tw`flex-1`, { backgroundColor: colors.background }]}>
          {/* ===== HEADER ===== */}
          <LinearGradient
            colors={['#F97316', '#EF5222', '#C2410C']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
              tw`px-4 pt-5 pb-5`,
              {
                shadowColor: '#C2410C',
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: 0.3,
                shadowRadius: 20,
                elevation: 10,
              }
            ]}
          >
            <View style={tw`flex-row items-center gap-3.5`}>
              <TouchableOpacity
                onPress={() => setActiveModal(null)}
                style={[
                  tw`w-10 h-10 rounded-full justify-center items-center`,
                  {
                    backgroundColor: 'rgba(255,255,255,0.18)',
                    borderWidth: 1.5,
                    borderColor: 'rgba(255,255,255,0.3)',
                  }
                ]}
                activeOpacity={0.7}
              >
                <ChevronLeft color="#ffffff" size={24} strokeWidth={3} />
              </TouchableOpacity>
              <View style={tw`flex-1`}>
                <Text style={tw`text-white/70 text-[10px] font-black uppercase tracking-widest mb-0.5`}>
                  {t('home.scheduleHeader')}
                </Text>
                <Text style={tw`text-white text-[19px] font-black tracking-wide`}>
                  {t('home.scheduleTitle')}
                </Text>
              </View>
            </View>
          </LinearGradient>

          {/* Search and Filters */}
          <View style={tw`p-4 bg-white border-b border-slate-100`}>
            <View style={tw`flex-row gap-3 bg-slate-50 p-2 rounded-2xl border border-slate-100`}>
              <View style={tw`flex-1 flex-row items-center gap-2 px-3 py-2 bg-white rounded-xl border border-slate-100`}>
                <MapPin size={16} color="#64748b" />
                <TextInput
                  value={searchFrom}
                  onChangeText={setSearchFrom}
                  placeholder={t('home.scheduleFrom')}
                  style={tw`flex-1 text-[13px] font-bold text-slate-700 p-0`}
                  placeholderTextColor="#94a3b8"
                />
                {searchFrom !== '' && (
                  <TouchableOpacity onPress={() => setSearchFrom('')} style={tw`p-1`}>
                    <X size={12} color="#94a3b8" />
                  </TouchableOpacity>
                )}
              </View>

              <View style={tw`flex-1 flex-row items-center gap-2 px-3 py-2 bg-white rounded-xl border border-slate-100`}>
                <Compass size={16} color="#64748b" />
                <TextInput
                  value={searchTo}
                  onChangeText={setSearchTo}
                  placeholder={t('home.scheduleTo')}
                  style={tw`flex-1 text-[13px] font-bold text-slate-700 p-0`}
                  placeholderTextColor="#94a3b8"
                />
                {searchTo !== '' && (
                  <TouchableOpacity onPress={() => setSearchTo('')} style={tw`p-1`}>
                    <X size={12} color="#94a3b8" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>

          {routesLoading ? (
            <View style={tw`flex-1 items-center justify-center`}>
              <ActivityIndicator size="large" color="#EF5222" />
              <Text style={tw`text-xs font-black text-slate-400 uppercase tracking-widest mt-4`}>
                {t('home.loading')}
              </Text>
            </View>
          ) : Object.keys(groupedRoutes).length > 0 ? (
            <ScrollView style={tw`flex-1`} contentContainerStyle={tw`p-4 pb-12`}>
              <FadeInView>
                {Object.keys(groupedRoutes).map((fromName, idx) => (
                  <View key={fromName} style={tw`mb-6`}>
                    {/* Group Header */}
                    <View style={tw`flex-row items-center gap-2 mb-3.5`}>
                      <View style={tw`w-2 h-2 rounded-full bg-[#EF5222]`} />
                      <Text style={tw`text-[14px] font-black text-[#EF5222] uppercase tracking-wider`}>
                        {t('home.routeFrom').replace('{fromName}', fromName)}
                      </Text>
                    </View>

                    {/* List of cards in this group */}
                    {groupedRoutes[fromName].map((route: any, rIdx: number) => (
                      <BouncyPressable
                        key={route.id || rIdx}
                        onPress={() => handleBookingRedirect(route.from, route.to)}
                        scaleTo={0.98}
                        style={tw`bg-white border border-slate-100 rounded-3xl p-4 mb-3 shadow-sm flex-row items-center justify-between`}
                      >
                        <View style={tw`flex-1 pr-3`}>
                          <View style={tw`flex-row items-center gap-2.5 mb-2`}>
                            <View style={tw`w-8 h-8 rounded-xl bg-orange-50 items-center justify-center`}>
                              <Bus size={16} color="#EF5222" />
                            </View>
                            <View style={tw`flex-row items-center gap-1.5`}>
                              <Text style={tw`text-[14px] font-black text-slate-800`}>{route.from}</Text>
                              <Text style={tw`text-slate-300 font-light`}>➔</Text>
                              <Text style={tw`text-[14px] font-black text-slate-800`}>{route.to}</Text>
                            </View>
                          </View>

                          <View style={tw`flex-row items-center gap-3.5`}>
                            <View style={tw`bg-orange-50 px-2 py-0.5 rounded-md border border-orange-100`}>
                              <Text style={tw`text-[9px] font-black text-[#EF5222] uppercase tracking-wider`}>
                                {route.busType || 'LIMOUSINE VIP'}
                              </Text>
                            </View>
                            <Text style={tw`text-[11px] font-bold text-slate-500`}>
                              📍 {route.distanceKm} km
                            </Text>
                            <Text style={tw`text-[11px] font-bold text-slate-500`}>
                              ⏱️ {Math.floor(route.durationMinutes / 60)}h{route.durationMinutes % 60}m
                            </Text>
                          </View>
                        </View>

                        <View style={tw`items-end gap-2`}>
                          <View>
                            <Text style={tw`text-[15px] font-black text-[#EF5222]`}>
                              {route.price?.toLocaleString()}đ
                            </Text>
                            <Text style={tw`text-[8.5px] font-bold text-slate-400 uppercase tracking-widest text-right mt-0.5`}>
                              {t('home.basePrice')}
                            </Text>
                          </View>
                          <View style={tw`h-8 w-8 rounded-xl bg-orange-500 items-center justify-center shadow-sm`}>
                            <ChevronRight size={16} color="#ffffff" strokeWidth={3} />
                          </View>
                        </View>
                      </BouncyPressable>
                    ))}
                  </View>
                ))}
              </FadeInView>
            </ScrollView>
          ) : (
            <View style={tw`flex-1 items-center justify-center p-8`}>
              <Compass size={48} color="#94a3b8" style={tw`mb-4`} />
              <Text style={tw`text-slate-500 font-black text-[13.5px] text-center`}>
                {t('home.noRoutes')}
              </Text>
              <Text style={tw`text-xs text-slate-400 mt-1.5 text-center leading-5`}>
                {t('home.noRoutesDesc')}
              </Text>
            </View>
          )}
        </SafeAreaView>
      </Modal>
      <SlideUpModal
        visible={activeModal === 'location_info'}
        onClose={() => setActiveModal(null)}
      >
        <View style={[
          tw`rounded-t-[32px] p-6 pb-10 border-t shadow-2xl`,
          { backgroundColor: colors.card, borderColor: colors.border }
        ]}>
          {/* Top Drag Indicator */}
          <View style={tw`w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full self-center mb-6`} />

          {/* Icon Header */}
          <View style={tw`items-center mb-5`}>
            <LinearGradient
              colors={['#EF5222', '#f97316']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={tw`w-14 h-14 rounded-full justify-center items-center shadow-lg shadow-orange-500/20 mb-3`}
            >
              <MapPin size={26} color="#fff" />
            </LinearGradient>
            <Text style={[tw`text-[18px] font-black`, { color: colors.text }]}>
              {t('current_location') || 'Vị trí hiện tại'}
            </Text>
            <Text style={tw`text-[11px] font-bold text-slate-400 mt-1 text-center`}>
              {t('location_sync_desc') || 'Hệ thống tự động đồng bộ theo tọa độ GPS của bạn'}
            </Text>
          </View>

          {/* Address Box */}
          <View style={[
            tw`p-5 rounded-2xl mb-6 border`,
            { 
              backgroundColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.03)' : '#f8fafc',
              borderColor: colors.border,
            }
          ]}>
            <Text style={[tw`text-[11px] font-black uppercase tracking-wider text-slate-400 mb-2`]}>
              {t('detailed_address_label') || 'Địa chỉ chi tiết:'}
            </Text>
            <Text style={[tw`text-[15.5px] font-black leading-6`, { color: colors.text }]}>
              {getLocalizedAddress(booking.detailedAddress || 'Hà Nội', locale)}
            </Text>

            <View style={tw`h-[1px] bg-slate-100 dark:bg-slate-850 my-3.5`} />

            <View style={tw`flex-row items-center gap-2`}>
              <View style={tw`w-2 h-2 rounded-full bg-emerald-500`} />
              <Text style={[tw`text-[12px] font-bold`, { color: colors.textSecondary }]}>
                {t('matched_departing_from').replace('{location}', getLocalizedLocationName(booking.userLocation, locale)) || `Khớp tuyến đi từ: ${getLocalizedLocationName(booking.userLocation, locale)}`}
              </Text>
            </View>
          </View>

          {/* Buttons */}
          <View style={tw`gap-3`}>
            {/* 1. Định vị lại */}
            <BouncyPressable
              onPress={async () => {
                await handleAutoDetectLocation(true);
              }}
              disabled={isLocating}
              style={[tw`overflow-hidden rounded-2xl`]}
            >
              <LinearGradient
                colors={['#EF5222', '#f97316']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={tw`flex-row items-center justify-center py-4`}
              >
                {isLocating ? (
                  <ActivityIndicator size="small" color="#fff" style={tw`mr-2`} />
                ) : (
                  <Sparkles size={18} color="#fff" style={tw`mr-2`} />
                )}
                <Text style={tw`text-[14px] font-black text-white`}>
                  {isLocating ? t('detecting_location') || 'Đang xác định vị trí...' : t('re_detect_gps') || 'Định vị lại (GPS)'}
                </Text>
              </LinearGradient>
            </BouncyPressable>

            {/* 2. Đặt lại mặc định */}
            <BouncyPressable
              onPress={async () => {
                await booking.setUserLocation('Hà Nội', 'Hà Nội');
                Alert.alert(
                  t('notice') || 'Thông báo',
                  t('reset_success') || 'Đã đặt lại vị trí mặc định thành công.'
                );
                setActiveModal(null);
              }}
              style={[
                tw`flex-row items-center justify-center py-4 rounded-2xl border`,
                {
                  backgroundColor: colors.backgroundElement,
                  borderColor: colors.border,
                }
              ]}
            >
              <Compass size={18} color={colors.textSecondary} style={tw`mr-2`} />
              <Text style={[tw`text-[14px] font-black`, { color: colors.textSecondary }]}>
                {t('reset_to_default') || 'Đặt lại mặc định'}
              </Text>
            </BouncyPressable>

            {/* 3. Đóng */}
            <TouchableOpacity
              onPress={() => setActiveModal(null)}
              style={tw`py-3 items-center`}
            >
              <Text style={[tw`text-[13.5px] font-bold`, { color: colors.primary }]}>
                {t('close') || 'Đóng'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </SlideUpModal>

    </SafeAreaView>
  );
}
