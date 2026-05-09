export type Trip = {
  id: number;
  from: string;
  to: string;
  departDate: string;
  returnDate?: string | null;
  tickets?: { id: number }[];

  price?: number | null;
  distanceKm?: number | null;
  durationMinutes?: number | null;
  busType?: string | null;
  pickupPoint?: string | null;
  dropoffPoint?: string | null;
  arrivalTime?: string | null;
  arrivalDate?: string | null;

  totalSeats?: number;
  bookedSeats?: number;
  availableSeats?: number;
  canBook?: number;
  bookingBlockedReason?: number;
};

export function mapTrip(raw: any): Trip {
  return {
    id: raw.id,
    from: raw.from,
    to: raw.to,
    departDate: raw.departDate,
    arrivalDate: raw.arrivalDate ?? null,
    arrivalTime: raw.arrivalTime ?? null,
    returnDate: raw.returnDate ?? null,

    price: raw.price ?? null,
    distanceKm: raw.distanceKm ?? null,
    durationMinutes: raw.durationMinutes ?? null,
    busType: raw.busType ?? '22 Phòng nằm',
    pickupPoint: raw.pickupPoint ?? raw.from,
    dropoffPoint: raw.dropoffPoint ?? raw.to,

    totalSeats: raw.totalSeats ?? 22,
    bookedSeats: raw.bookedSeats ?? 0,
    availableSeats: raw.availableSeats ?? 22,

    canBook: raw.canBook ?? true,
    bookingBlockedReason: raw.bookingBlockedReason ?? null,

    tickets: raw.tickets || [],
  };
}