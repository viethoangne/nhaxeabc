'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { TripType, TripSearchParams, Trip } from '@/types';
import {
  filterSuggestions,
  POPULAR_FROM,
  POPULAR_TO,
  mergeAndDeduplicate,
} from '@/utils/search';
import { todayISO } from '@/utils/date';
import debounce from 'lodash/debounce';

export function useTripSearch(initialParams?: Partial<TripSearchParams>) {
  const router = useRouter();

  // -------------------------
  // Form state
  // -------------------------
  const [tripType, setTripType] = useState<TripType>(initialParams?.tripType || 'oneway');
  const [from, setFrom] = useState(initialParams?.from || '');
  const [to, setTo] = useState(initialParams?.to || '');
  const [departDate, setDepartDate] = useState(initialParams?.departDate || todayISO());
  const [returnDate, setReturnDate] = useState(initialParams?.returnDate || '');
  const [tickets, setTickets] = useState(initialParams?.tickets || 1);

  // Suggestions
  const fromSuggestions = useMemo(() => {
    const all = mergeAndDeduplicate([POPULAR_FROM, POPULAR_TO]);
    return filterSuggestions(from, all);
  }, [from]);

  const toSuggestions = useMemo(() => {
    const all = mergeAndDeduplicate([POPULAR_TO, POPULAR_FROM]);
    return filterSuggestions(to, all);
  }, [to]);

  const swap = useCallback(() => {
    setFrom(to);
    setTo(from);
  }, [from, to]);

  const onSearch = useCallback(async () => {
    if (!from.trim() || !to.trim() || !departDate) {
      alert('Vui lòng nhập điểm đi, điểm đến và ngày đi');
      return { success: false };
    }

    if (from.trim().toLowerCase() === to.trim().toLowerCase()) {
      alert('Điểm đi và điểm đến không được giống nhau');
      return { success: false };
    }

    if (tripType === 'round' && !returnDate) {
      alert('Vui lòng chọn ngày về');
      return { success: false };
    }

    const params = new URLSearchParams({
      from: from.trim(),
      to: to.trim(),
      date: departDate,
      tickets: String(tickets),
      tripType,
    });

    if (tripType === 'round' && returnDate) {
      params.set('returnDate', returnDate);
    }

    router.push(`/search-trip?${params.toString()}`);
      return { success: true };
  }, [tripType, from, to, departDate, returnDate, tickets, router]);

  // -------------------------
  // API fetch state
  // -------------------------
  const [outboundTrips, setOutboundTrips] = useState<Trip[]>([]);
  const [returnTrips, setReturnTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(false);
  const [returnLoading, setReturnLoading] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const selectedOutboundTrip = initialParams?.selectedOutboundTrip || null;

  // -------------------------
  // Debounced API Logic
  // -------------------------

  // Hàm fetch chuyến đi (outbound) với debounce 500ms
  const debouncedFetchOutbound = useMemo(
    () =>
      debounce(async (f: string, t: string, d: string) => {
        if (!f || !t || !d) return;

        setLoading(true);
        setError('');
        try {
          // Dùng đường dẫn tương đối (relative path) để tận dụng Next.js rewrites
          // Sử dụng encodeURIComponent để tránh lỗi font tiếng Việt
          const url = `/api/chuyenXe?action=searchTrips&from=${encodeURIComponent(f)}&to=${encodeURIComponent(t)}&date=${d}`;
          const res = await fetch(url, { cache: 'no-store' });
          
          if (!res.ok) throw new Error('Không thể tải dữ liệu chuyến đi');
          
          const data = await res.json();
          setOutboundTrips(Array.isArray(data.trips) ? data.trips : []);
        } catch (err: any) {
          console.error("Lỗi Outbound:", err);
          setError(err.message || 'Lỗi khi tải chuyến đi');
        } finally {
          setLoading(false);
        }
      }, 500),
    []
  );

  // Hàm fetch chuyến về (return) với debounce 500ms
  const debouncedFetchReturn = useMemo(
    () =>
      debounce(async (f: string, t: string, rd: string) => {
        if (!f || !t || !rd) return;

        setReturnLoading(true);
        setError('');
        try {
          // Chuyến về: đảo ngược to (t) và from (f)
          const url = `/api/chuyenXe?action=searchTrips&from=${encodeURIComponent(t)}&to=${encodeURIComponent(f)}&date=${rd}`;
          const res = await fetch(url, { cache: 'no-store' });
          
          if (!res.ok) throw new Error('Không thể tải dữ liệu chuyến về');
          
          const dataReturn = await res.json();
          setReturnTrips(Array.isArray(dataReturn.trips) ? dataReturn.trips : []);
        } catch (err: any) {
          console.error("Lỗi Return:", err);
          setError(err.message || 'Lỗi khi tải chuyến về');
        } finally {
          setReturnLoading(false);
        }
      }, 500),
    []
  );

  // -------------------------
  // Effects
  // -------------------------

  // Effect cho outbound
  useEffect(() => {
    debouncedFetchOutbound(from, to, departDate);
    // Cleanup để tránh memory leak và các request thừa
    return () => debouncedFetchOutbound.cancel();
  }, [from, to, departDate, debouncedFetchOutbound]);

  // Effect cho return
  useEffect(() => {
    if (tripType === 'round' && returnDate && selectedOutboundTrip) {
      debouncedFetchReturn(from, to, returnDate);
    }
    return () => debouncedFetchReturn.cancel();
  }, [tripType, returnDate, from, to, selectedOutboundTrip, debouncedFetchReturn]);

  const searchParams: TripSearchParams = { tripType, from, to, departDate, returnDate, tickets };

  return {
    // Form
    tripType,
    setTripType,
    from,
    setFrom,
    to,
    setTo,
    departDate,
    setDepartDate,
    returnDate,
    setReturnDate,
    tickets,
    setTickets,
    fromSuggestions,
    toSuggestions,
    swap,
    onSearch,
    searchParams,
    isLoading,
    setIsLoading,
    

    // API
    outboundTrips,
    returnTrips,
    loading,
    returnLoading,
    error,
  };
}