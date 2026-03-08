// Common TypeScript types for the application
export type TripType = 'oneway' | 'round';

export interface TripSearchParams {
  tripType: TripType;
  from: string;
  to: string;
  departDate: string;
  returnDate: string;
  tickets: number;
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