// Trip search management hook
'use client';

import { useState, useMemo, useCallback } from 'react';
import { TripType, TripSearchParams } from '@/types';
import {
  filterSuggestions,
  POPULAR_FROM,
  POPULAR_TO,
  mergeAndDeduplicate,
} from '@utils/search';
import { todayISO } from '@utils/date';

export function useTripSearch(initialParams?: Partial<TripSearchParams>) {
  const [tripType, setTripType] = useState<TripType>(
    initialParams?.tripType || 'oneway'
  );
  const [from, setFrom] = useState(initialParams?.from || '');
  const [to, setTo] = useState(initialParams?.to || '');
  const [departDate, setDepartDate] = useState(
    initialParams?.departDate || todayISO()
  );
  const [returnDate, setReturnDate] = useState(initialParams?.returnDate || '');
  const [tickets, setTickets] = useState(initialParams?.tickets || 1);
  const [isLoading, setIsLoading] = useState(false);

  const fromSuggestions = useMemo(() => {
    const allSuggestions = mergeAndDeduplicate([POPULAR_FROM, POPULAR_TO]);
    return filterSuggestions(from, allSuggestions);
  }, [from]);

  const toSuggestions = useMemo(() => {
    const allSuggestions = mergeAndDeduplicate([POPULAR_TO, POPULAR_FROM]);
    return filterSuggestions(to, allSuggestions);
  }, [to]);

  const swap = useCallback(() => {
    setFrom(to);
    setTo(from);
  }, [from, to]);

  const onSearch = useCallback(async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 900));
      
      // Here you would make actual API call
      console.log('Searching with params:', {
        tripType,
        from,
        to,
        departDate,
        returnDate,
        tickets,
      });
      
      // Return search results
      return { success: true, data: [] };
    } catch (error) {
      console.error('Search failed:', error);
      return { success: false, error };
    } finally {
      setIsLoading(false);
    }
  }, [tripType, from, to, departDate, returnDate, tickets, isLoading]);

  const searchParams: TripSearchParams = {
    tripType,
    from,
    to,
    departDate,
    returnDate,
    tickets,
  };

  return {
    // State
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
    isLoading,
    setIsLoading,
    
    // Derived values
    fromSuggestions,
    toSuggestions,
    searchParams,
    
    // Actions
    swap,
    onSearch,
  };
}