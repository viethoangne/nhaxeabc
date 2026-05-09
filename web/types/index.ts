// Common TypeScript types for the application
export type TripType = 'oneway' | 'round';

export interface TripSearchParams {
  tripType: TripType;
  from: string;
  to: string;
  departDate: string;
  returnDate: string;
  tickets: number;
  selectedOutboundTrip?: Trip | null;
}

export interface Suggestion {
  id: string;
  name: string;
  type: 'city' | 'station' | 'terminal';
}

export interface Theme {
  mode: 'light' | 'dark';
  primaryColor: string;
}

export interface NavigationItem {
  label: string;
  href: string;
  icon?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

export interface Trip {
  id: number;
  from: string;
  to: string;
  departDate: string;
  arrivalDate?: string | null;
  arrivalTime?: string | null;
  returnDate?: string | null;

  tickets?: { id: number }[];

  price?: number | null;
  distanceKm?: number | null;
  durationMinutes?: number | null;
  busType?: string | null;
  pickupPoint?: string | null;
  dropoffPoint?: string | null;

  totalSeats?: number;
  bookedSeats?: number;
  availableSeats?: number;

  canBook?: boolean;
  bookingBlockedReason?: string | null;
}