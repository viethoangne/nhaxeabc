import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { ArrowRight, Calendar, Ticket, ArrowLeftRight, SlidersHorizontal, Sparkles, X, ChevronRight, ChevronLeft, Check, Clock } from 'lucide-react-native';
import { apiClient } from '@/constants/api';
import { useAuthStore } from '@/hooks/useAuthStore';
import { useBookingStore } from '@/hooks/useBookingStore';
import { LinearGradient } from 'expo-linear-gradient';
import tw from 'twrnc';
import { useTranslation } from '@/hooks/useTranslation';

interface Trip {
  id: number;
  from: string;
  to: string;
  departDate: string;
  arrivalDate?: string;
  arrivalTime?: string;
  durationMinutes: number;
  busType: string;
  price: number;
  availableSeats: number;
  canBook?: boolean;
  bookingBlockedReason?: string;
  score?: number;
  isRecommended?: boolean;
  recommendTag?: string;
}

interface FilterState {
  times: string[];
  busTypes: string[];
}

// AI tag labels come from translations.ts via t('SearchTrip.aiTags.*')

import { useThemeStore } from '@/hooks/useThemeStore';
import { useTheme } from '@/hooks/use-theme';

export default function SearchTripScreen() {
  const router = useRouter();
  const colors = useTheme();
  const { theme } = useThemeStore();
  const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const params = useLocalSearchParams();
  const bookingStore = useBookingStore();

  const from = (params.from as string) || bookingStore.from;
  const to = (params.to as string) || bookingStore.to;
  const date = (params.date as string) || bookingStore.departDate;
  const tickets = Number(params.tickets || bookingStore.tickets.toString() || '1');
  const tripType = (params.tripType as 'oneway' | 'round') || bookingStore.tripType;
  const returnDate = (params.returnDate as string) || bookingStore.returnDate;

  const [outboundTrips, setOutboundTrips] = useState<Trip[]>([]);
  const [returnTrips, setReturnTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(false);
  const [returnLoading, setReturnLoading] = useState(false);

  const [selectedOutboundTrip, setSelectedOutboundTrip] = useState<Trip | null>(null);
  const [activeTab, setActiveTab] = useState<'outbound' | 'return'>('outbound');
  const [isFilterVisible, setIsFilterVisible] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    times: [],
    busTypes: [],
  });

  // Fetch Outbound trips
  const fetchOutboundTrips = async () => {
    if (!from || !to || !date) return;
    setLoading(true);
    try {
      const res = await apiClient.get('/chuyenXe', {
        params: {
          action: 'searchTrips',
          from,
          to,
          date,
        },
      });
      setOutboundTrips(Array.isArray(res.data.trips) ? res.data.trips : []);
    } catch (error) {
      console.error('Lỗi tải chuyến đi:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Return trips
  const fetchReturnTrips = async () => {
    if (!from || !to || !returnDate) return;
    setReturnLoading(true);
    try {
      // Đảo ngược điểm đi và điểm đến cho lượt về
      const res = await apiClient.get('/chuyenXe', {
        params: {
          action: 'searchTrips',
          from: to,
          to: from,
          date: returnDate,
        },
      });
      setReturnTrips(Array.isArray(res.data.trips) ? res.data.trips : []);
    } catch (error) {
      console.error('Lỗi tải chuyến về:', error);
    } finally {
      setReturnLoading(false);
    }
  };

  useEffect(() => {
    fetchOutboundTrips();
  }, [from, to, date]);

  useEffect(() => {
    if (tripType === 'round' && returnDate) {
      fetchReturnTrips();
    }
  }, [tripType, returnDate, from, to]);

  const applyFilters = (tripsList: Trip[], activeFilters: FilterState) => {
    const now = new Date();
    return tripsList.filter((trip) => {
      const tripDate = new Date(trip.departDate);
      if (tripDate.getTime() <= now.getTime()) {
        return false;
      }

      if (activeFilters.times.length > 0) {
        const hour = tripDate.getHours();
        const isMatchTime = activeFilters.times.some((range) => {
          if (range === '00-06') return hour >= 0 && hour < 6;
          if (range === '06-12') return hour >= 6 && hour < 12;
          if (range === '12-18') return hour >= 12 && hour < 18;
          if (range === '18-24') return hour >= 18 && hour < 24;
          return false;
        });
        if (!isMatchTime) return false;
      }

      if (activeFilters.busTypes.length > 0) {
        if (!activeFilters.busTypes.includes(trip.busType)) return false;
      }

      return true;
    });
  };

  const getScoredTrips = (tripsList: Trip[], targetTo: string) => {
    const filtered = applyFilters(tripsList, filters);
    const isGuest = !user;
    const userPreferences = {
      preferredTime: '12-18',
      preferredVehicle: 'Limousine',
    };

    const isReturn = targetTo.toLowerCase() === from.toLowerCase();

    const scored = filtered.map((trip) => {
      let score = 0;
      let isRecommended = false;
      let recommendTag = '';

      const departDateObj = new Date(trip.departDate);
      const tripHour = departDateObj.getHours();
      const durationHours = (trip.durationMinutes || 0) / 60;

      let arrivalHour;
      if (trip.arrivalDate || trip.arrivalTime) {
        arrivalHour = new Date(trip.arrivalDate || trip.arrivalTime!).getHours();
      } else {
        arrivalHour = new Date(departDateObj.getTime() + trip.durationMinutes * 60000).getHours();
      }

      const destination = (trip.to || targetTo).toLowerCase();
      const isRushHourDepart = (tripHour >= 7 && tripHour <= 9) || (tripHour >= 16 && tripHour <= 19);
      const isClearTraffic = (tripHour >= 21 || tripHour <= 5) || (tripHour >= 10 && tripHour <= 14);
      const isUnsafeArrival = arrivalHour >= 1 && arrivalHour <= 4;
      const isLongHaul = durationHours > 14;
      const touristDests = ['đà lạt', 'nha trang', 'vũng tàu', 'phan thiết', 'đà nẵng'];
      const isTouristDest = touristDests.some((d) => destination.includes(d));

      if (!isGuest) {
        if (userPreferences.preferredTime === '00-06' && tripHour >= 0 && tripHour < 6) score += 2;
        if (userPreferences.preferredTime === '06-12' && tripHour >= 6 && tripHour < 12) score += 2;
        if (userPreferences.preferredTime === '12-18' && tripHour >= 12 && tripHour < 18) score += 2;
        if (userPreferences.preferredTime === '18-24' && tripHour >= 18 && tripHour < 24) score += 2;
        if (trip.busType === userPreferences.preferredVehicle) score += 1;
        if (score >= 2) {
          isRecommended = true;
          recommendTag = 'pref';
        }
      } else {
        if (isLongHaul) {
          if (isClearTraffic) {
            score += 5;
            recommendTag = 'clearFast';
          } else if (arrivalHour >= 6 && arrivalHour <= 18) {
            score += 3;
            recommendTag = 'safeDay';
          } else if (tripHour >= 18 && tripHour <= 22) {
            score += 2;
            recommendTag = 'overnightSave';
          }
        } else if (isTouristDest) {
          if (isClearTraffic && arrivalHour >= 13 && arrivalHour <= 15) {
            score += 6;
            recommendTag = 'clearCheckin';
          } else if (arrivalHour >= 13 && arrivalHour <= 15) {
            score += 4;
            recommendTag = 'hotelCheckin';
          } else if (durationHours >= 5 && arrivalHour >= 4 && arrivalHour <= 7) {
            score += 5;
            recommendTag = 'sunrise';
          } else if (isClearTraffic) {
            score += 3;
            recommendTag = 'lessSick';
          } else if (arrivalHour > 7 && arrivalHour <= 10) {
            score += 2;
            recommendTag = 'leisureCafe';
          }
        } else {
          if (isClearTraffic) {
            score += 5;
            recommendTag = isReturn ? 'clearFastestReturn' : 'clearFastest';
          } else if (arrivalHour >= 7 && arrivalHour <= 9) {
            score += 3;
            recommendTag = isReturn ? 'workTimeNext' : 'workTime';
          } else if (tripHour >= 19 || tripHour <= 0) {
            score += 2;
            recommendTag = 'easySleep';
          }
        }

        if (isRushHourDepart) score -= 4;
        if (isUnsafeArrival && !(isTouristDest && arrivalHour >= 4)) {
          score -= 10;
          recommendTag = '';
        }
        if (score >= 3 && recommendTag) isRecommended = true;
      }

      if (trip.availableSeats === 0 || trip.canBook === false) {
        isRecommended = false;
        score = -100;
      }

      return { ...trip, score, isRecommended, recommendTag };
    });

    return scored.sort((a, b) => (b.score || 0) - (a.score || 0));
  };

  const filteredOutboundTrips = useMemo(() => getScoredTrips(outboundTrips, to), [outboundTrips, filters, user]);

  const filteredReturnTrips = useMemo(() => {
    let list = returnTrips;
    if (selectedOutboundTrip) {
      const outboundDepartTime = new Date(selectedOutboundTrip.departDate).getTime();
      const outboundDurationMs = (selectedOutboundTrip.durationMinutes || 0) * 60 * 1000;
      const outboundArrivalTime = outboundDepartTime + outboundDurationMs;
      const bufferTimeMs = 60 * 60 * 1000;

      list = list.filter((trip) => {
        const returnDepartTime = new Date(trip.departDate).getTime();
        return returnDepartTime >= outboundArrivalTime + bufferTimeMs;
      });
    }
    return getScoredTrips(list, from);
  }, [returnTrips, selectedOutboundTrip, filters, user]);

  const handleSelectTrip = (trip: Trip) => {
    if (trip.canBook === false) {
      alert(trip.bookingBlockedReason || t('SearchTrip.cannotBookAlert'));
      return;
    }

    if (tripType === 'oneway') {
      router.push({
        pathname: '/booking/select-seats',
        params: {
          tripType,
          tickets: tickets.toString(),
          from,
          to,
          date,
          outboundTripId: trip.id.toString(),
          price: trip.price.toString(),
          departDateTime: trip.departDate,
          arrivalDateTime: trip.arrivalDate || trip.arrivalTime || '',
          duration: trip.durationMinutes.toString(),
          busType: trip.busType || '',
        },
      });
    } else {
      if (activeTab === 'outbound') {
        setSelectedOutboundTrip(trip);
        setActiveTab('return');
      } else {
        // Đã chọn xong cả 2 chiều
        router.push({
          pathname: '/booking/select-seats',
          params: {
            tripType,
            tickets: tickets.toString(),
            from,
            to,
            date,
            returnDate,
            outboundTripId: selectedOutboundTrip!.id.toString(),
            price: selectedOutboundTrip!.price.toString(),
            departDateTime: selectedOutboundTrip!.departDate,
            arrivalDateTime: selectedOutboundTrip!.arrivalDate || selectedOutboundTrip!.arrivalTime || '',
            duration: selectedOutboundTrip!.durationMinutes.toString(),
            busType: selectedOutboundTrip!.busType || '',
            returnTripId: trip.id.toString(),
            returnPrice: trip.price.toString(),
            returnDepartDateTime: trip.departDate,
            returnArrivalDateTime: trip.arrivalDate || trip.arrivalTime || '',
            returnDuration: trip.durationMinutes.toString(),
            returnBusType: trip.busType || '',
          },
        });
      }
    }
  };

  const formatDisplayDate = (d: string) => {
    if (!d) return '';
    const parts = d.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return d;
  };

  const toggleTimeFilter = (timeRange: string) => {
    setFilters((prev) => {
      const times = prev.times.includes(timeRange)
        ? prev.times.filter((t) => t !== timeRange)
        : [...prev.times, timeRange];
      return { ...prev, times };
    });
  };

  const toggleBusTypeFilter = (type: string) => {
    setFilters((prev) => {
      const busTypes = prev.busTypes.includes(type)
        ? prev.busTypes.filter((b) => b !== type)
        : [...prev.busTypes, type];
      return { ...prev, busTypes };
    });
  };

  const currentTrips = activeTab === 'outbound' ? filteredOutboundTrips : filteredReturnTrips;
  const currentLoading = activeTab === 'outbound' ? loading : returnLoading;

  return (
    <SafeAreaView style={[tw`flex-1`, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
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
        {/* Row 1: Back + Route title */}
        <View style={tw`flex-row items-center gap-3.5 mb-4`}>
          <TouchableOpacity 
            onPress={() => router.back()}
            style={[tw`w-10 h-10 rounded-full justify-center items-center`, { backgroundColor: 'rgba(255,255,255,0.18)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.3)' }]}
            activeOpacity={0.7}
          >
            <ChevronLeft color="#ffffff" size={22} strokeWidth={3} />
          </TouchableOpacity>
          <View style={tw`flex-1`}>
            <Text style={tw`text-white/70 text-[10px] font-black uppercase tracking-widest mb-0.5`}>
              {tripType === 'round' ? t('SearchTrip.roundTripBadge') : t('SearchTrip.oneWayBadge')}
            </Text>
            <View style={tw`flex-row items-center gap-2.5`}>
              <Text style={tw`text-white text-[19px] font-black tracking-wide`} numberOfLines={1}>
                {activeTab === 'outbound' ? from : to}
              </Text>
              <ArrowRight color="rgba(255,255,255,0.8)" size={16} strokeWidth={3} />
              <Text style={tw`text-white text-[19px] font-black tracking-wide`} numberOfLines={1}>
                {activeTab === 'outbound' ? to : from}
              </Text>
            </View>
          </View>
        </View>

        {/* Row 2: Info chips + Filter */}
        <View style={tw`flex-row items-center justify-between mb-4`}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={tw`flex-1 mr-3`}
            contentContainerStyle={tw`flex-row gap-2`}
          >
            {/* Date chip */}
            <View style={[tw`flex-row items-center gap-1.5 px-3 py-1.5 rounded-full`, { backgroundColor: 'rgba(0,0,0,0.2)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' }]}>
              <Calendar color="rgba(255,255,255,0.9)" size={12} />
              <Text style={tw`text-white text-[11px] font-black`}>
                {formatDisplayDate(activeTab === 'outbound' ? date : returnDate)}
              </Text>
            </View>
            {/* Ticket count chip */}
            <View style={[tw`flex-row items-center gap-1.5 px-3 py-1.5 rounded-full`, { backgroundColor: 'rgba(0,0,0,0.2)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' }]}>
              <Ticket color="rgba(255,255,255,0.9)" size={12} />
              <Text style={tw`text-white text-[11px] font-black`}>{tickets} {t('SearchTrip.ticketUnit').replace('{n}', tickets.toString())}</Text>
            </View>
            {/* Result count chip */}
            <View style={[tw`flex-row items-center gap-1.5 px-3 py-1.5 rounded-full`, { backgroundColor: 'rgba(255,255,255,0.15)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' }]}>
              <Text style={tw`text-white text-[11px] font-black`}>{t('SearchTrip.tripUnit').replace('{n}', currentTrips.length.toString())}</Text>
            </View>
          </ScrollView>

          {/* Filter button */}
          <TouchableOpacity
            onPress={() => setIsFilterVisible(true)}
            style={[tw`flex-row items-center gap-1.5 px-4 py-2 rounded-full`, { backgroundColor: 'rgba(255,255,255,0.22)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.3)' }]}
            activeOpacity={0.8}
          >
            <SlidersHorizontal color="#ffffff" size={13} strokeWidth={2.5} />
            <Text style={tw`text-white text-[11px] font-black uppercase tracking-wider`}>{t('SearchTrip.filterBtn')}</Text>
            {(filters.times.length > 0 || filters.busTypes.length > 0) && (
              <View style={tw`bg-white rounded-full w-4.5 h-4.5 items-center justify-center`}>
                <Text style={tw`text-[#EF5222] text-[9px] font-black`}>
                  {filters.times.length + filters.busTypes.length}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Row 3: Round-trip tab pill selector (inside gradient) */}
        {tripType === 'round' && (
          <View style={[tw`flex-row rounded-2xl p-1`, { backgroundColor: 'rgba(0,0,0,0.22)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' }]}>
            <TouchableOpacity
              onPress={() => setActiveTab('outbound')}
              style={[
                tw`flex-1 py-2.5 items-center justify-center rounded-xl`,
                activeTab === 'outbound' && { backgroundColor: theme === 'dark' ? colors.primaryLight : '#ffffff' }
              ]}
            >
              <View style={tw`flex-row items-center gap-1.5`}>
                <Text style={[tw`text-[12px] font-black tracking-wider`, { color: activeTab === 'outbound' ? colors.primary : 'rgba(255,255,255,0.65)' }]}>
                  {t('SearchTrip.outboundTab')}
                </Text>
                {selectedOutboundTrip && (
                  <View style={[tw`rounded-full p-0.5`, { backgroundColor: activeTab === 'outbound' ? '#dcfce7' : 'rgba(255,255,255,0.2)' }]}>
                    <Check color={activeTab === 'outbound' ? '#16a34a' : '#ffffff'} size={10} strokeWidth={3} />
                  </View>
                )}
              </View>
              {selectedOutboundTrip && activeTab === 'outbound' && (
                <Text style={[tw`text-[9px] font-black mt-0.5`, { color: colors.textSecondary }]}>
                  {new Date(selectedOutboundTrip.departDate).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false })}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                if (!selectedOutboundTrip) {
                  alert(t('SearchTrip.selectOutboundFirst'));
                  return;
                }
                setActiveTab('return');
              }}
              style={[
                tw`flex-1 py-2.5 items-center justify-center rounded-xl`,
                activeTab === 'return' && { backgroundColor: theme === 'dark' ? colors.primaryLight : '#ffffff' },
                !selectedOutboundTrip && tw`opacity-45`
              ]}
            >
              <Text style={[tw`text-[12px] font-black tracking-wider`, { color: activeTab === 'return' ? colors.primary : 'rgba(255,255,255,0.65)' }]}>
                {t('SearchTrip.returnTab')}
              </Text>
              {!selectedOutboundTrip && (
                <Text style={tw`text-white/50 text-[9px] font-black mt-0.5`}>{t('SearchTrip.selectOutboundHint')}</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </LinearGradient>

      {/* Trip List */}
      {currentLoading ? (
        <View style={[tw`flex-1 justify-center items-center`, { backgroundColor: colors.background }]}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[tw`text-sm mt-4 font-black tracking-wide`, { color: colors.textSecondary }]}>{t('SearchTrip.searching')}</Text>
        </View>
      ) : currentTrips.length === 0 ? (
        <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={tw`flex-1 justify-center items-center p-8`}>
          <View style={[tw`p-6 rounded-full mb-5`, { backgroundColor: colors.backgroundElement }]}>
            <Ticket size={48} color={colors.textSecondary} />
          </View>
          <Text style={[tw`text-base font-black tracking-wide`, { color: colors.text }]}>{t('SearchTrip.noTripsTitle')}</Text>
          <Text style={[tw`text-sm text-center mt-2 max-w-72 font-medium leading-5`, { color: colors.textSecondary }]}>
            {t('SearchTrip.noTripsHint')}
          </Text>
        </ScrollView>
      ) : (
        <FlatList
          data={currentTrips}
          keyExtractor={(item) => item.id.toString()}
          style={{ backgroundColor: colors.background }}
          contentContainerStyle={tw`px-4 pt-4 pb-20`}
          renderItem={({ item }) => {
            const departTime = new Date(item.departDate);
            const arrivalTime = item.arrivalDate || item.arrivalTime
              ? new Date(item.arrivalDate || item.arrivalTime!)
              : new Date(departTime.getTime() + item.durationMinutes * 60000);
            
            const isLowSeats = item.availableSeats > 0 && item.availableSeats <= 5;
            const isSoldOut = item.availableSeats === 0 || item.canBook === false;
            
            const busTypeColor = (() => {
              const bt = (item.busType || '').toLowerCase();
              if (bt.includes('limousine')) return { bg: theme === 'dark' ? '#3B291A' : '#fef3c7', text: theme === 'dark' ? '#FBBF24' : '#b45309', border: theme === 'dark' ? '#FBBF24' : '#fde68a' };
              if (bt.includes('giường')) return { bg: theme === 'dark' ? '#211C3A' : '#ede9fe', text: theme === 'dark' ? '#A78BFA' : '#7c3aed', border: theme === 'dark' ? '#7C3AED' : '#ddd6fe' };
              if (bt.includes('vip')) return { bg: theme === 'dark' ? '#3C1B31' : '#fce7f3', text: theme === 'dark' ? '#F472B6' : '#be185d', border: theme === 'dark' ? '#BE185D' : '#fbcfe8' };
              return { bg: colors.backgroundElement, text: colors.textSecondary, border: colors.border };
            })();

            return (
              <TouchableOpacity
                onPress={() => handleSelectTrip(item)}
                activeOpacity={0.88}
                disabled={isSoldOut}
                style={[
                  tw`rounded-3xl mb-4 overflow-hidden`,
                  { 
                    borderWidth: 1.5,
                    backgroundColor: colors.card,
                    borderColor: item.isRecommended ? colors.primary : colors.border,
                    shadowColor: item.isRecommended ? colors.primary : colors.text,
                    shadowOffset: { width: 0, height: 6 },
                    shadowOpacity: item.isRecommended ? 0.15 : 0.05,
                    shadowRadius: 16,
                    elevation: item.isRecommended ? 6 : 3,
                    opacity: isSoldOut ? 0.55 : 1
                  }
                ]}
              >
                {/* AI Recommendation Banner */}
                {item.isRecommended && (
                  <LinearGradient
                    colors={theme === 'dark' ? ['#2A1A14', '#211512'] : ['#fff7ed', '#ffedd5']}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    style={[tw`px-4.5 py-2.5 flex-row items-center gap-2 border-b`, { borderColor: colors.primary + '22' }]}
                  >
                    <Sparkles color={colors.primary} size={13} strokeWidth={2.5} />
                    <Text style={[tw`text-[11px] font-black tracking-wider flex-1`, { color: colors.primary }]}>
                      {t(`SearchTrip.aiTags.${item.recommendTag}`) || item.recommendTag}
                    </Text>
                    <View style={[tw`rounded-full px-2.5 py-0.5`, { backgroundColor: colors.primary }]}>
                      <Text style={tw`text-[9px] font-black text-white uppercase tracking-wider`}>{t('SearchTrip.aiSuggestion')}</Text>
                    </View>
                  </LinearGradient>
                )}

                <View style={tw`px-5 pt-5 pb-4`}>
                  {/* Timeline Row */}
                  <View style={tw`flex-row items-center justify-between mb-4`}>
                    {/* Departure */}
                    <View style={tw`items-center`}>
                      <Text style={[tw`text-[24px] font-black tracking-tight leading-none`, { color: colors.text }]}>
                        {departTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false })}
                      </Text>
                      <Text style={[tw`text-[11.5px] font-black mt-1.5`, { color: colors.textSecondary }]} numberOfLines={1}>
                        {activeTab === 'outbound' ? from : to}
                      </Text>
                    </View>

                    {/* Duration connector */}
                    <View style={tw`flex-1 mx-4 items-center`}>
                      <Text style={[tw`text-[10.5px] font-black mb-2`, { color: colors.textSecondary }]}>
                        {Math.floor(item.durationMinutes / 60)}h{item.durationMinutes % 60 > 0 ? `${item.durationMinutes % 60}m` : ''}
                      </Text>
                      <View style={tw`w-full flex-row items-center`}>
                        <View style={[tw`w-2 h-2 rounded-full`, { backgroundColor: colors.primary }]} />
                        <View style={[tw`flex-1 h-[2px]`, { backgroundColor: colors.border }]} />
                        <View style={[tw`w-1 h-1 rounded-full mx-1`, { backgroundColor: colors.border }]} />
                        <View style={[tw`w-1 h-1 rounded-full mx-1`, { backgroundColor: colors.border }]} />
                        <View style={[tw`w-1 h-1 rounded-full mx-1`, { backgroundColor: colors.border }]} />
                        <View style={[tw`flex-1 h-[2px]`, { backgroundColor: colors.border }]} />
                        <View style={[tw`w-2 h-2 rounded-full`, { backgroundColor: colors.textSecondary }]} />
                      </View>
                    </View>

                    {/* Arrival */}
                    <View style={tw`items-center`}>
                      <Text style={[tw`text-[24px] font-black tracking-tight leading-none`, { color: colors.text }]}>
                        {arrivalTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false })}
                      </Text>
                      <Text style={[tw`text-[11.5px] font-black mt-1.5`, { color: colors.textSecondary }]} numberOfLines={1}>
                        {activeTab === 'outbound' ? to : from}
                      </Text>
                    </View>
                  </View>

                  {/* Bottom row: bus info + price + button */}
                  <View style={[tw`flex-row items-center justify-between pt-3.5 border-t`, { borderColor: colors.border }]}>
                    {/* Left: badges */}
                    <View style={tw`flex-col gap-1.5`}>
                      <View style={tw`flex-row items-center gap-2`}>
                        <View style={[tw`px-2.5 py-1 rounded-full border`, { backgroundColor: busTypeColor.bg, borderColor: busTypeColor.border }]}>
                          <Text style={[tw`text-[10px] font-black uppercase tracking-wider`, { color: busTypeColor.text }]}>
                            {item.busType}
                          </Text>
                        </View>
                        {isSoldOut ? (
                          <View style={[tw`px-2.5 py-1 rounded-full border`, { backgroundColor: theme === 'dark' ? '#3D1B1B' : '#fee2e2', borderColor: theme === 'dark' ? '#EF4444' : '#fca5a5' }]}>
                            <Text style={[tw`text-[10px] font-black`, { color: theme === 'dark' ? '#FCA5A5' : '#dc2626' }]}>{t('SearchTrip.soldOut')}</Text>
                          </View>
                        ) : isLowSeats ? (
                          <View style={[tw`px-2.5 py-1 rounded-full border`, { backgroundColor: theme === 'dark' ? '#3B291A' : '#fef3c7', borderColor: theme === 'dark' ? '#FBBF24' : '#fde68a' }]}>
                            <Text style={[tw`text-[10px] font-black`, { color: theme === 'dark' ? '#FBBF24' : '#b45309' }]}>{t('SearchTrip.lowSeats').replace('{n}', item.availableSeats.toString())}</Text>
                          </View>
                        ) : (
                          <View style={[tw`px-2.5 py-1 rounded-full border`, { backgroundColor: theme === 'dark' ? '#1B3D2A' : '#dcfce7', borderColor: theme === 'dark' ? '#10B981' : '#bbf7d0' }]}>
                            <Text style={[tw`text-[10px] font-black`, { color: theme === 'dark' ? '#A7F3D0' : '#15803d' }]}>{t('SearchTrip.goodSeats').replace('{n}', item.availableSeats.toString())}</Text>
                          </View>
                        )}
                      </View>
                    </View>

                    {/* Right: price + button */}
                    <View style={tw`items-end gap-1.5`}>
                      <Text style={[tw`text-[18px] font-black tracking-tight`, { color: colors.primary }]}>
                        {Number(item.price).toLocaleString('vi-VN')}đ
                      </Text>
                      {!isSoldOut && (
                        <LinearGradient
                          colors={[colors.primary, colors.primary + 'e0']}
                          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                          style={tw`flex-row items-center px-4 py-2 rounded-full gap-1`}
                        >
                          <Text style={tw`text-[11px] font-black text-white uppercase tracking-wider`}>{t('SearchTrip.bookBtn')}</Text>
                          <ChevronRight color="#ffffff" size={13} strokeWidth={3} />
                        </LinearGradient>
                      )}
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* Filter Modal Sheet */}
      <Modal
        visible={isFilterVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsFilterVisible(false)}
      >
        <View style={tw`flex-1 bg-black/60 justify-end`}>
          <View style={[tw`p-6 pb-10`, { backgroundColor: colors.card, borderTopLeftRadius: 32, borderTopRightRadius: 32, maxHeight: '85%' }]}>
            {/* Modal Header */}
            <View style={[tw`flex-row justify-between items-center pb-4.5 mb-6 border-b`, { borderColor: colors.border }]}>
              <Text style={[tw`text-base font-black uppercase tracking-wider`, { color: colors.text }]}>{t('SearchTrip.filterTitle')}</Text>
              <TouchableOpacity 
                onPress={() => setIsFilterVisible(false)}
                style={[tw`w-8 h-8 rounded-full justify-center items-center`, { backgroundColor: colors.backgroundElement }]}
              >
                <X color={colors.textSecondary} size={18} strokeWidth={2.5} />
              </TouchableOpacity>
            </View>

            {/* Time Filter Option */}
            <View style={tw`mb-6`}>
              <Text style={[tw`text-xs font-black uppercase tracking-widest mb-3.5`, { color: colors.textSecondary }]}>{t('SearchTrip.timeFilterTitle')}</Text>
              <View style={tw`flex-row flex-wrap gap-2.5`}>
                {[
                  { label: t('SearchTrip.filterEarlyMorning'), val: '00-06' },
                  { label: t('SearchTrip.filterMorning'), val: '06-12' },
                  { label: t('SearchTrip.filterAfternoon'), val: '12-18' },
                  { label: t('SearchTrip.filterEvening'), val: '18-24' },
                ].map((item) => {
                  const isAct = filters.times.includes(item.val);
                  return (
                    <TouchableOpacity
                      key={item.val}
                      onPress={() => toggleTimeFilter(item.val)}
                      style={[
                        tw`flex-row items-center px-4.5 py-3 rounded-2xl border`, 
                        isAct 
                          ? { borderColor: colors.primary, backgroundColor: colors.primaryLight } 
                          : { borderColor: colors.border, backgroundColor: colors.background }
                      ]}
                      activeOpacity={0.8}
                    >
                      {isAct && <Check color={colors.primary} size={14} strokeWidth={3} style={tw`mr-1.5`} />}
                      <Text style={[tw`text-[13px] font-extrabold`, { color: isAct ? colors.primary : colors.text }]}>
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Bus Type Filter Option */}
            <View style={tw`mb-8`}>
              <Text style={[tw`text-xs font-black uppercase tracking-widest mb-3.5`, { color: colors.textSecondary }]}>{t('SearchTrip.busTypeFilterTitle')}</Text>
              <View style={tw`flex-row flex-wrap gap-2.5`}>
                {['Limousine', 'Giường nằm 40 chỗ', 'Ghế ngồi'].map((type) => {
                  const isAct = filters.busTypes.includes(type);
                  return (
                    <TouchableOpacity
                      key={type}
                      onPress={() => toggleBusTypeFilter(type)}
                      style={[
                        tw`flex-row items-center px-4.5 py-3 rounded-2xl border`, 
                        isAct 
                          ? { borderColor: colors.primary, backgroundColor: colors.primaryLight } 
                          : { borderColor: colors.border, backgroundColor: colors.background }
                      ]}
                      activeOpacity={0.8}
                    >
                      {isAct && <Check color={colors.primary} size={14} strokeWidth={3} style={tw`mr-1.5`} />}
                      <Text style={[tw`text-[13px] font-extrabold`, { color: isAct ? colors.primary : colors.text }]}>
                        {type}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Buttons */}
            <View style={[tw`flex-row gap-3 pt-5 border-t`, { borderColor: colors.border }]}>
              <TouchableOpacity
                onPress={() => setFilters({ times: [], busTypes: [] })}
                style={[tw`flex-1 py-4 border rounded-2xl items-center justify-center`, { borderColor: colors.border }]}
                activeOpacity={0.7}
              >
                <Text style={[tw`text-[13.5px] font-black uppercase tracking-wider`, { color: colors.textSecondary }]}>{t('SearchTrip.clearFilter')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setIsFilterVisible(false)}
                style={[tw`flex-1 py-4 rounded-2xl items-center justify-center`, { backgroundColor: colors.primary }]}
                activeOpacity={0.8}
              >
                <Text style={tw`text-white text-[13.5px] font-black uppercase tracking-wider`}>{t('SearchTrip.apply')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
