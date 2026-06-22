import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const LOCATION_STORAGE_KEY = 'user_location';
const DETAILED_STORAGE_KEY = 'detailed_address';

const locationStorage = {
  async setItem(value: string, detailed: string) {
    if (Platform.OS === 'web') {
      try {
        localStorage.setItem(LOCATION_STORAGE_KEY, value);
        localStorage.setItem(DETAILED_STORAGE_KEY, detailed);
      } catch {}
    } else {
      try {
        await SecureStore.setItemAsync(LOCATION_STORAGE_KEY, value);
        await SecureStore.setItemAsync(DETAILED_STORAGE_KEY, detailed);
      } catch {}
    }
  },
  async getItem(): Promise<{ location: string | null; detailed: string | null }> {
    if (Platform.OS === 'web') {
      try {
        return {
          location: localStorage.getItem(LOCATION_STORAGE_KEY),
          detailed: localStorage.getItem(DETAILED_STORAGE_KEY),
        };
      } catch {
        return { location: null, detailed: null };
      }
    }
    try {
      return {
        location: await SecureStore.getItemAsync(LOCATION_STORAGE_KEY),
        detailed: await SecureStore.getItemAsync(DETAILED_STORAGE_KEY),
      };
    } catch {
      return { location: null, detailed: null };
    }
  }
};

export interface Trip {
  id: string;
  from: string;
  to: string;
  departDate: string;
  departTime: string;
  duration: string;
  price: number;
  coachType: string;
  availableSeats: number;
  totalSeats: number;
  licensePlate?: string;
  driverName?: string;
}

interface BookingState {
  // Form Tìm kiếm
  tripType: 'oneway' | 'round';
  from: string;
  to: string;
  departDate: string;
  returnDate: string;
  tickets: number;

  // Lựa chọn chuyến và ghế
  selectedOutboundTrip: Trip | null;
  selectedReturnTrip: Trip | null;
  selectedOutboundSeats: string[];
  selectedReturnSeats: string[];

  // Thông tin liên hệ
  passengerName: string;
  passengerPhone: string;
  passengerEmail: string;
  passengerNote: string;

  // Actions
  setSearchParams: (params: {
    tripType?: 'oneway' | 'round';
    from?: string;
    to?: string;
    departDate?: string;
    returnDate?: string;
    tickets?: number;
  }) => void;
  selectOutboundTrip: (trip: Trip | null) => void;
  selectReturnTrip: (trip: Trip | null) => void;
  toggleOutboundSeat: (seatCode: string) => void;
  toggleReturnSeat: (seatCode: string) => void;
  clearSelection: () => void;
  setPassengerInfo: (info: {
    name: string;
    phone: string;
    email: string;
    note: string;
  }) => void;
  userLocation: string;
  detailedAddress: string;
  setUserLocation: (location: string, detailed?: string) => Promise<void>;
  initLocation: () => Promise<void>;
}

export const useBookingStore = create<BookingState>((set, get) => ({
  tripType: 'oneway',
  from: '',
  to: '',
  departDate: new Date().toISOString().split('T')[0],
  returnDate: '',
  tickets: 1,

  selectedOutboundTrip: null,
  selectedReturnTrip: null,
  selectedOutboundSeats: [],
  selectedReturnSeats: [],

  passengerName: '',
  passengerPhone: '',
  passengerEmail: '',
  passengerNote: '',

  userLocation: 'Hà Nội',
  detailedAddress: 'Hà Nội',

  setUserLocation: async (location, detailed) => {
    const detailValue = detailed || location;
    set((state) => {
      const newTo = state.to === location ? '' : state.to;
      return { userLocation: location, detailedAddress: detailValue, from: location, to: newTo };
    });
    await locationStorage.setItem(location, detailValue);
  },

  initLocation: async () => {
    const stored = await locationStorage.getItem();
    if (stored.location) {
      set((state) => {
        const newFrom = state.from ? state.from : stored.location!;
        const newTo = state.to === newFrom ? '' : state.to;
        return {
          userLocation: stored.location!,
          detailedAddress: stored.detailed || stored.location!,
          from: newFrom,
          to: newTo
        };
      });
    } else {
      set((state) => {
        const newFrom = state.from ? state.from : 'Hà Nội';
        const newTo = state.to === newFrom ? '' : state.to;
        return {
          userLocation: 'Hà Nội',
          detailedAddress: 'Hà Nội',
          from: newFrom,
          to: newTo
        };
      });
    }
  },

  setSearchParams: (params) => set((state) => ({ ...state, ...params })),
  
  selectOutboundTrip: (trip) => set({ 
    selectedOutboundTrip: trip, 
    selectedOutboundSeats: [] // Reset ghế khi đổi chuyến
  }),

  selectReturnTrip: (trip) => set({ 
    selectedReturnTrip: trip, 
    selectedReturnSeats: [] 
  }),

  toggleOutboundSeat: (seatCode) => set((state) => {
    const isSelected = state.selectedOutboundSeats.includes(seatCode);
    const newSeats = isSelected
      ? state.selectedOutboundSeats.filter(s => s !== seatCode)
      : [...state.selectedOutboundSeats, seatCode].slice(0, state.tickets); // Giới hạn số lượng chọn bằng số vé đăng ký
    return { selectedOutboundSeats: newSeats };
  }),

  toggleReturnSeat: (seatCode) => set((state) => {
    const isSelected = state.selectedReturnSeats.includes(seatCode);
    const newSeats = isSelected
      ? state.selectedReturnSeats.filter(s => s !== seatCode)
      : [...state.selectedReturnSeats, seatCode].slice(0, state.tickets);
    return { selectedReturnSeats: newSeats };
  }),

  setPassengerInfo: (info) => set({
    passengerName: info.name,
    passengerPhone: info.phone,
    passengerEmail: info.email,
    passengerNote: info.note,
  }),

  clearSelection: () => set({
    selectedOutboundTrip: null,
    selectedReturnTrip: null,
    selectedOutboundSeats: [],
    selectedReturnSeats: [],
  }),
}));
