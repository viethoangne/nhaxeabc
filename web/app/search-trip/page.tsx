"use client"

import { useState, useMemo } from 'react';
import { useSession } from 'next-auth/react'; // <--- THÊM DÒNG NÀY
import { useRouter, useSearchParams } from 'next/navigation';
import { Trip, TripType } from '@/types';
import PageContainer from '@/components/layout/PageContainer';
import SearchTripSection from '@/components/home/SearchTripSection';
import SearchTripFilter from '@/components/home/SearchTripFilter';
import { LoadingCard } from '@/components/ui/LoadingCard';
import EmptyState from '@/components/ui/EmptyState';
import { Breadcrumb } from '@/components/ui/Breadcrumb'; 
import { useTripSearch } from '@/hooks/useTripSearch';
import toast from 'react-hot-toast';
import { useTranslations, useLocale } from 'next-intl';
import { Sparkles, ArrowRight, Calendar, Ticket, ArrowLeftRight, CheckCircle2 } from 'lucide-react';

interface FilterState {
  times: string[];
  busTypes: string[];
}

export default function SearchTripPage() {
  const router = useRouter();
  const { data: session } = useSession(); // <--- THÊM DÒNG NÀY
  const searchParams = useSearchParams();
  const t = useTranslations('SearchTrip');
  const locale = useLocale();

  const from = searchParams.get('from') || '';
  const to = searchParams.get('to') || '';
  const date = searchParams.get('date') || '';
  const tickets = searchParams.get('tickets') || '1';
  const tripType = (searchParams.get('tripType') as TripType) || 'oneway';
  const returnDate = searchParams.get('returnDate') || '';

  const [selectedOutboundTrip, setSelectedOutboundTrip] = useState<Trip | null>(null);
  const [activeFilters, setActiveFilters] = useState<FilterState | null>(null);
  
  // Thêm state quản lý Tab
  const [activeTab, setActiveTab] = useState<'outbound' | 'return'>('outbound');

  const displayTripType = tripType === 'round' ? t('roundTrip') : t('oneWay');
  const displayTickets = `${tickets} ${t('ticketCount')}`;
  const labelResults = t('searchResultTitle') || 'Kết quả tìm chuyến';

  const sectionLabels = {
    selectSeat: t('selectSeat'),
    schedule: t('schedule'),
    transfer: t('transfer'),
    policy: t('policy'),
    soldOut: t('soldOut'),
    stopBooking: t('stopBooking'),
    availableSeats: t('availableSeats'),
    contact: t('contact'),
    hour: t('hour'),
    minute: t('minute'),
    selected: t('selectedStatus'),
    totalFare: t('totalFare'),
    selectedOutboundLabel: t('selectedOutbound')
  };

  const { outboundTrips, returnTrips, loading, returnLoading, error } =
    useTripSearch({
      from,
      to,
      departDate: date,
      returnDate,
      tripType,
      selectedOutboundTrip,
    });

  const formatTripDate = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString(locale === 'vi' ? 'vi-VN' : 'en-US', {
      weekday: 'long',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatDisplayDate = (d: string) => {
    if (!d) return '';
    const parts = d.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return d;
  };

  // Hàm chuyển đổi ngày sang format Tab "Thứ 2, 06/04"
  const formatTabDate = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const days = ['Chủ Nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
    const dayName = days[d.getDay()];
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `${dayName}, ${dd}/${mm}`;
  };

  const applyFilters = (trips: Trip[], filters: FilterState | null) => {
    const currentTime = new Date(); // Lấy thời gian thực tế (bao gồm giờ, phút, giây)
    
    return trips.filter((trip) => {
      const tripDate = new Date(trip.departDate);
      
      // LOGIC SỬA LỖI: So sánh chính xác thời gian khởi hành với thời gian hiện tại
      // Nếu thời gian khởi hành nhỏ hơn hoặc bằng thời gian hiện tại thì loại bỏ
      if (tripDate.getTime() <= currentTime.getTime()) {
        return false;
      }
      
      if (!filters) return true;

      // Lọc theo khung giờ (Nếu có chọn filter)
      if (filters.times.length > 0) {
        const hour = tripDate.getHours();
        const isMatchTime = filters.times.some((range) => {
          if (range === '00-06') return hour >= 0 && hour < 6;
          if (range === '06-12') return hour >= 6 && hour < 12;
          if (range === '12-18') return hour >= 12 && hour < 18;
          if (range === '18-24') return hour >= 18 && hour < 24;
          return false;
        });
        if (!isMatchTime) return false;
      }

      // Lọc theo loại xe
      if (filters.busTypes.length > 0) {
        if (!filters.busTypes.includes(trip.busType)) return false;
      }
      return true;
    });
  };
// ==============================================================
  // --- AI V6.1: TỐI ƯU GIAO THÔNG & KHỚP 100% TUYẾN ĐƯỜNG CỦA BẠN (CHUYẾN ĐI) ---
  // ==============================================================
  const filteredOutboundTrips = useMemo(() => {
    const filtered = applyFilters(outboundTrips, activeFilters);
    const isGuest = !session?.user;

    const userPreferences = {
      preferredTime: '12-18',
      preferredVehicle: 'Limousine'
    };

    const scoredTrips = filtered.map(trip => {
      let score = 0;
      let isRecommended = false;
      let recommendTag = '';

      const departDateObj = new Date(trip.departDate);
      const tripHour = departDateObj.getHours();
      const durationHours = (trip.durationMinutes || 0) / 60;
      
      let arrivalHour;
      if (trip.arrivalDate || (trip as any)?.arrivalTime) {
        arrivalHour = new Date(trip.arrivalDate || (trip as any)?.arrivalTime).getHours();
      } else {
        const arrivalMs = departDateObj.getTime() + (trip.durationMinutes || 0) * 60000;
        arrivalHour = new Date(arrivalMs).getHours();
      }

      const destination = (trip.to || to).toLowerCase();
      
      const isRushHourDepart = (tripHour >= 7 && tripHour <= 9) || (tripHour >= 16 && tripHour <= 19);
      const isClearTraffic = (tripHour >= 21 || tripHour <= 5) || (tripHour >= 10 && tripHour <= 14);
      const isUnsafeArrival = (arrivalHour >= 1 && arrivalHour <= 4);

      const isLongHaul = durationHours > 14; 
      const touristDests = ['đà lạt', 'nha trang', 'vũng tàu', 'phan thiết', 'đà nẵng'];
      const isTouristDest = touristDests.some(d => destination.includes(d));

      if (!isGuest) {
        if (userPreferences.preferredTime === '00-06' && tripHour >= 0 && tripHour < 6) score += 2;
        if (userPreferences.preferredTime === '06-12' && tripHour >= 6 && tripHour < 12) score += 2;
        if (userPreferences.preferredTime === '12-18' && tripHour >= 12 && tripHour < 18) score += 2;
        if (userPreferences.preferredTime === '18-24' && tripHour >= 18 && tripHour < 24) score += 2;
        if (trip.busType === userPreferences.preferredVehicle) score += 1;
        if (score >= 2) { isRecommended = true; recommendTag = '✨ AI ĐỀ XUẤT THEO SỞ THÍCH'; }
      } else {
        if (isLongHaul) {
          if (isClearTraffic) { score += 5; recommendTag = '🍃 ĐƯỜNG THOÁNG - CHẠY NHANH ĐỠ MỆT'; } 
          else if (arrivalHour >= 6 && arrivalHour <= 18) { score += 3; recommendTag = '🛡️ TỚI NƠI BAN NGÀY AN TOÀN'; } 
          else if (tripHour >= 18 && tripHour <= 22) { score += 2; recommendTag = '🌙 NGỦ ĐÊM TRÊN XE TIẾT KIỆM THỜI GIAN'; }
        } 
        else if (isTouristDest) {
          if (isClearTraffic && arrivalHour >= 13 && arrivalHour <= 15) { score += 6; recommendTag = '🌟 ĐƯỜNG THOÁNG + ĐÚNG GIỜ NHẬN PHÒNG'; } 
          else if (arrivalHour >= 13 && arrivalHour <= 15) { score += 4; recommendTag = '🏨 TỚI NƠI ĐÚNG GIỜ NHẬN PHÒNG'; } 
          else if (durationHours >= 5 && arrivalHour >= 4 && arrivalHour <= 7) { score += 5; recommendTag = '⛅ NGỦ MỘT GIẤC - TỈNH DẬY ĐÓN BÌNH MINH'; } 
          else if (isClearTraffic) { score += 3; recommendTag = '🍃 KHỞI HÀNH ĐƯỜNG THOÁNG - ĐỠ SAY XE'; }
          else if (arrivalHour > 7 && arrivalHour <= 10) { score += 2; recommendTag = '☕ TỚI NƠI THONG THẢ ĂN SÁNG CAFE'; }
        } 
        else {
          if (isClearTraffic) { score += 5; recommendTag = '🍃 XUẤT BẾN ĐƯỜNG THOÁNG - ĐI NHANH NHẤT'; } 
          else if (arrivalHour >= 7 && arrivalHour <= 9) { score += 3; recommendTag = '💼 KỊP GIỜ HÀNH CHÍNH / LÀM VIỆC'; } 
          else if (tripHour >= 19 || tripHour <= 0) { score += 2; recommendTag = '🌙 CHUYẾN ĐÊM DỄ NGỦ'; }
        }

        if (isRushHourDepart) { score -= 4; }
        if (isUnsafeArrival && !(isTouristDest && arrivalHour >= 4)) { score -= 10; recommendTag = ''; }
        if (score >= 3 && recommendTag) isRecommended = true;
      }

      if (trip.availableSeats === 0 || trip.canBook === false) {
        isRecommended = false; 
        score = -100;
      }

      return { ...trip, score, isRecommended, recommendTag };
    });

    return scoredTrips.sort((a, b) => (b.score || 0) - (a.score || 0));

  }, [outboundTrips, activeFilters, session, to, from]);

  // ==============================================================
  // --- AI V6.1: ÁP DỤNG CHO CẢ LƯỢT VỀ (RETURN TRIPS) ---
  // ==============================================================
  const filteredReturnTrips = useMemo(() => {
    let validTrips = applyFilters(returnTrips, activeFilters);

    if (selectedOutboundTrip) {
      const outboundDepartTime = new Date(selectedOutboundTrip.departDate).getTime();
      const outboundDurationMs = (selectedOutboundTrip.durationMinutes || 0) * 60 * 1000;
      const outboundArrivalTime = outboundDepartTime + outboundDurationMs;
      const bufferTimeMs = 60 * 60 * 1000; 

      validTrips = validTrips.filter((trip) => {
        const returnDepartTime = new Date(trip.departDate).getTime();
        return returnDepartTime >= (outboundArrivalTime + bufferTimeMs);
      });
    }

    const isGuest = !session?.user;
    const userPreferences = {
      preferredTime: '12-18',
      preferredVehicle: 'Limousine'
    };

    const scoredTrips = validTrips.map(trip => {
      let score = 0;
      let isRecommended = false;
      let recommendTag = '';

      const departDateObj = new Date(trip.departDate);
      const tripHour = departDateObj.getHours();
      const durationHours = (trip.durationMinutes || 0) / 60;
      
      let arrivalHour;
      if (trip.arrivalDate || (trip as any)?.arrivalTime) {
        arrivalHour = new Date(trip.arrivalDate || (trip as any)?.arrivalTime).getHours();
      } else {
        const arrivalMs = departDateObj.getTime() + (trip.durationMinutes || 0) * 60000;
        arrivalHour = new Date(arrivalMs).getHours();
      }

      const destination = (trip.to || from).toLowerCase();
      
      const isRushHourDepart = (tripHour >= 7 && tripHour <= 9) || (tripHour >= 16 && tripHour <= 19);
      const isClearTraffic = (tripHour >= 21 || tripHour <= 5) || (tripHour >= 10 && tripHour <= 14);
      const isUnsafeArrival = (arrivalHour >= 1 && arrivalHour <= 4);

      const isLongHaul = durationHours > 14; 
      const touristDests = ['đà lạt', 'nha trang', 'vũng tàu', 'phan thiết', 'đà nẵng'];
      const isTouristDest = touristDests.some(d => destination.includes(d));

      if (!isGuest) {
        if (userPreferences.preferredTime === '00-06' && tripHour >= 0 && tripHour < 6) score += 2;
        if (userPreferences.preferredTime === '06-12' && tripHour >= 6 && tripHour < 12) score += 2;
        if (userPreferences.preferredTime === '12-18' && tripHour >= 12 && tripHour < 18) score += 2;
        if (userPreferences.preferredTime === '18-24' && tripHour >= 18 && tripHour < 24) score += 2;
        if (trip.busType === userPreferences.preferredVehicle) score += 1;
        if (score >= 2) { isRecommended = true; recommendTag = '✨ AI ĐỀ XUẤT THEO SỞ THÍCH'; }
      } else {
        if (isLongHaul) {
          if (isClearTraffic) { score += 5; recommendTag = '🍃 ĐƯỜNG THOÁNG - CHẠY NHANH ĐỠ MỆT'; } 
          else if (arrivalHour >= 6 && arrivalHour <= 18) { score += 3; recommendTag = '🛡️ TỚI NƠI BAN NGÀY AN TOÀN'; } 
          else if (tripHour >= 18 && tripHour <= 22) { score += 2; recommendTag = '🌙 NGỦ ĐÊM TRÊN XE TIẾT KIỆM THỜI GIAN'; }
        } 
        else if (isTouristDest) {
          if (isClearTraffic && arrivalHour >= 13 && arrivalHour <= 15) { score += 6; recommendTag = '🌟 ĐƯỜNG THOÁNG + ĐÚNG GIỜ NHẬN PHÒNG'; } 
          else if (arrivalHour >= 13 && arrivalHour <= 15) { score += 4; recommendTag = '🏨 TỚI NƠI ĐÚNG GIỜ NHẬN PHÒNG'; } 
          else if (durationHours >= 5 && arrivalHour >= 4 && arrivalHour <= 7) { score += 5; recommendTag = '⛅ NGỦ MỘT GIẤC - TỈNH DẬY ĐÓN BÌNH MINH'; } 
          else if (isClearTraffic) { score += 3; recommendTag = '🍃 KHỞI HÀNH ĐƯỜNG THOÁNG - ĐỠ SAY XE'; }
          else if (arrivalHour > 7 && arrivalHour <= 10) { score += 2; recommendTag = '☕ TỚI NƠI THONG THẢ ĂN SÁNG CAFE'; }
        } 
        else {
          if (isClearTraffic) { score += 5; recommendTag = '🍃 XUẤT BẾN ĐƯỜNG THOÁNG - VỀ NHÀ NHANH NHẤT'; } 
          else if (arrivalHour >= 7 && arrivalHour <= 9) { score += 3; recommendTag = '💼 KỊP GIỜ LÀM VIỆC SÁNG HÔM SAU'; } 
          else if (tripHour >= 19 || tripHour <= 0) { score += 2; recommendTag = '🌙 CHUYẾN ĐÊM DỄ NGỦ'; }
        }

        if (isRushHourDepart) { score -= 4; }
        if (isUnsafeArrival && !(isTouristDest && arrivalHour >= 4)) { score -= 10; recommendTag = ''; }
        if (score >= 3 && recommendTag) isRecommended = true;
      }

      if (trip.availableSeats === 0 || trip.canBook === false) {
        isRecommended = false; 
        score = -100;
      }

      return { ...trip, score, isRecommended, recommendTag };
    });

    return scoredTrips.sort((a, b) => (b.score || 0) - (a.score || 0));

  }, [returnTrips, activeFilters, selectedOutboundTrip, session, from]);

  const handleSelectAndNavigate = (trip: Trip, isReturn = false) => {
    if (trip.canBook === false) {
      toast.error(trip.bookingBlockedReason || t('bookingBlockedDefault'));
      return;
    }

    if (tripType === 'oneway' || isReturn) {
      const outboundTrip = isReturn ? selectedOutboundTrip : trip;
      const params = new URLSearchParams({
        tripType,
        tickets,
        from,
        to,
        date,
        outboundTripId: String(outboundTrip?.id || 0),
        price: String(outboundTrip?.price || 0),
        departDateTime: outboundTrip?.departDate || '',
        arrivalDateTime: (outboundTrip as any)?.arrivalDate || (outboundTrip as any)?.arrivalTime || '',
        duration: String(outboundTrip?.durationMinutes || 0),
      });

      if (isReturn) {
        params.set('returnTripId', String(trip.id));
        params.set('returnPrice', String(trip.price || 0));
        params.set('returnDepartDateTime', trip.departDate || '');
        params.set('returnArrivalDateTime', (trip as any).arrivalDate || (trip as any).arrivalTime || '');
        params.set('returnDuration', String(trip.durationMinutes || 0));
      }

      if (returnDate) params.set('returnDate', returnDate);
      router.push(`/chair?${params.toString()}`);
    } else {
      setSelectedOutboundTrip(trip);
      setActiveTab('return'); // Tự động nhảy sang tab khứ hồi
      window.scrollTo({ top: 350, behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F5F7] font-sans antialiased text-[#333333]">
      <PageContainer>
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 space-y-5">
          
          <Breadcrumb items={[{ label: labelResults }]} />
          
          <button
            onClick={() => router.back()}
            className="group flex items-center gap-2 text-[#ea580c] transition-all duration-300 w-fit"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-full border border-[#ea580c] bg-transparent group-hover:bg-[#ea580c] group-hover:text-white transition-all duration-300">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="group-hover:-translate-x-0.5 transition-transform duration-300">
                <path d="m15 18-6-6 6-6" />
              </svg>
            </div>
            <span className="text-[14px] font-semibold uppercase tracking-wider">{t('goBack') || 'Trở về'}</span>
          </button>

          {/* HEADER "KẾT QUẢ TÌM CHUYẾN" */}
          <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-[0_2px_10px_rgb(0,0,0,0.04)] border border-gray-100 transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)]">
            <h1 className="text-sm font-bold tracking-widest text-gray-400 uppercase mb-3">
              {labelResults}
            </h1>
            
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="flex items-center flex-wrap gap-4 text-2xl sm:text-3xl font-extrabold text-gray-900">
                <span className="text-gray-900">{from}</span>
                <ArrowRight className="w-6 h-6 sm:w-8 sm:h-8 text-[#ea580c]" strokeWidth={2.5} />
                <span className="text-gray-900">{to}</span>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-sm font-medium">
                <div className="flex items-center gap-1.5 bg-gray-50 text-gray-700 px-4 py-2 rounded-full border border-gray-200">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  {formatDisplayDate(date)} {returnDate && ` - ${formatDisplayDate(returnDate)}`}
                </div>
                <div className="flex items-center gap-1.5 bg-gray-50 text-gray-700 px-4 py-2 rounded-full border border-gray-200">
                  <Ticket className="w-4 h-4 text-gray-500" />
                  {displayTickets}
                </div>
                <div className="flex items-center gap-1.5 bg-[#fff7ed] text-[#ea580c] px-4 py-2 rounded-full border border-[#ffedd5]">
                  <ArrowLeftRight className="w-4 h-4" />
                  {displayTripType}
                </div>
              </div>
            </div>
          </div>

          {/* MAIN LAYOUT */}
          <div className="grid grid-cols-1 gap-8 xl:grid-cols-[280px_1fr] items-start pt-2"> 
            
            <aside className="hidden xl:block sticky top-24 z-10">
              <SearchTripFilter onFilterChange={(f) => setActiveFilters(f as FilterState)} />
            </aside>

            <main className="space-y-6">
              {/* TABS CHUYẾN ĐI / CHUYẾN VỀ */}
              {tripType === 'round' && (
                <div className="flex border-b-2 border-gray-200">
                  <button
                    onClick={() => setActiveTab('outbound')}
                    className={`flex-1 py-4 text-center font-bold text-sm sm:text-base uppercase transition-all duration-300 relative ${
                      activeTab === 'outbound'
                        ? 'text-[#ea580c]'
                        : 'text-gray-500 hover:text-[#ea580c]'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      CHUYẾN ĐI - {formatTabDate(date)}
                      {selectedOutboundTrip && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                    </div>
                    {/* Đường gạch chân tab active */}
                    <div className={`absolute bottom-[-2px] left-0 w-full h-[3px] bg-[#ea580c] transition-all duration-300 ${activeTab === 'outbound' ? 'opacity-100' : 'opacity-0'}`} />
                  </button>
                  
                  <button
                    onClick={() => {
                      if (!selectedOutboundTrip) {
                        toast.error(t('pleaseSelectOutbound') || 'Vui lòng chọn chuyến đi trước');
                        return;
                      }
                      setActiveTab('return');
                    }}
                    className={`flex-1 py-4 text-center font-bold text-sm sm:text-base uppercase transition-all duration-300 relative ${
                      activeTab === 'return'
                        ? 'text-[#ea580c]'
                        : 'text-gray-500 hover:text-[#ea580c]'
                    }`}
                  >
                    CHUYẾN VỀ - {formatTabDate(returnDate)}
                    <div className={`absolute bottom-[-2px] left-0 w-full h-[3px] bg-[#ea580c] transition-all duration-300 ${activeTab === 'return' ? 'opacity-100' : 'opacity-0'}`} />
                  </button>
                </div>
              )}

              {/* NỘI DUNG LIST VÉ BÊN DƯỚI */}
              {activeTab === 'outbound' && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                  {loading ? (
                    <LoadingCard text={t('searchingOutbound')} />
                  ) : error ? (
                    <EmptyState text={t('noOutboundTrips')} />
                  ) : (
                    <SearchTripSection
                      title={t('outboundTripTitle', { from, to })}
                      trips={filteredOutboundTrips}
                      selectedTrip={selectedOutboundTrip} 
                      onSelectTrip={(trip) => handleSelectAndNavigate(trip, false)}
                      buttonText={selectedOutboundTrip ? t('reselect') : t('selectTrip')}
                      emptyText={t('noOutboundTrips')}
                      labels={sectionLabels}
                    />
                  )}
                </div>
              )}

              {activeTab === 'return' && tripType === 'round' && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                  {!selectedOutboundTrip ? (
                    <EmptyState text={t('pleaseSelectOutbound') || 'Vui lòng chọn chuyến đi trước để hiển thị danh sách chuyến về hợp lệ'} />
                  ) : returnLoading ? (
                    <LoadingCard text={t('searchingReturn')} />
                  ) : (
                    <SearchTripSection
                      title={t('returnTripTitle', { from: to, to: from })}
                      trips={filteredReturnTrips}
                      selectedTrip={null} 
                      onSelectTrip={(trip) => handleSelectAndNavigate(trip, true)}
                      buttonText={t('selectReturnTrip')}
                      emptyText={t('noReturnTrips')}
                      labels={sectionLabels}
                    />
                  )}
                </div>
              )}
            </main>
          </div>
        </div>
      </PageContainer>
    </div>
  );
}