// hooks/useTripResults.ts
'use client';

import { useState, useEffect } from 'react';
import { Trip } from '@/lib/trip-mapper';

type UseTripResultsProps = {
  from: string;
  to: string;
  date: string;
  returnDate?: string;
  tripType: 'oneway' | 'round';
  selectedOutboundTrip?: Trip | null;
};

export function useTripResults({
  from,
  to,
  date,
  returnDate,
  tripType,
  selectedOutboundTrip,
}: UseTripResultsProps) {
  const API_URL = process.env.NEXT_PUBLIC_API_URL;

  const [outboundTrips, setOutboundTrips] = useState<Trip[]>([]);
  const [returnTrips, setReturnTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [returnLoading, setReturnLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchOutbound = async () => {
      try {
        setLoading(true);
        setError('');
        const res = await fetch(`${API_URL}/api/chuyenXe?from=${from}&to=${to}&date=${date}`);
        if (!res.ok) throw new Error('Không thể tải dữ liệu chuyến đi');
        const data = await res.json();
        setOutboundTrips(data.trips || []);
      } catch (err: any) {
        console.error(err);
        setError(err.message || 'Đã có lỗi khi tải chuyến đi');
      } finally {
        setLoading(false);
      }
    };

    if (from && to && date) fetchOutbound();
  }, [from, to, date, API_URL]);

  useEffect(() => {
    const fetchReturn = async () => {
      if (tripType !== 'round' || !returnDate || !selectedOutboundTrip) return;

      try {
        setReturnLoading(true);
        setError('');
        const res = await fetch(
          `${API_URL}/api/chuyenXe?from=${to}&to=${from}&date=${returnDate}`
        );
        if (!res.ok) throw new Error('Không thể tải dữ liệu chuyến về');
        const data = await res.json();
        setReturnTrips(data.trips || []);
      } catch (err: any) {
        console.error(err);
        setError(err.message || 'Đã có lỗi khi tải chuyến về');
      } finally {
        setReturnLoading(false);
      }
    };

    fetchReturn();
  }, [tripType, returnDate, selectedOutboundTrip, from, to, API_URL]);

  return { outboundTrips, returnTrips, loading, returnLoading, error };
}