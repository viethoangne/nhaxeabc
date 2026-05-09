import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BookingStatus, PaymentStatus } from '@prisma/client';

@Injectable()
export class ChuyenXeService {
  constructor(private prisma: PrismaService) {}

  async searchTrips(from: string, to: string, date?: string) {
    let dateFilter = {};

    if (date) {
      // Cách an toàn hơn: Tạo date object từ UTC và điều chỉnh offset theo VN
      // Giả sử 'date' có dạng 'YYYY-MM-DD' (VD: '2026-04-16')
      
      const startDate = new Date(`${date}T00:00:00.000Z`);
      // Lùi 7 tiếng để tương đương với 00:00 Việt Nam
      startDate.setUTCHours(startDate.getUTCHours() - 7); 

      const endDate = new Date(`${date}T23:59:59.999Z`);
      // Lùi 7 tiếng để tương đương với 23:59 Việt Nam
      endDate.setUTCHours(endDate.getUTCHours() - 7);

      dateFilter = {
        departDate: {
          gte: startDate,
          lte: endDate,
        },
      };
    }

    const trips = await this.prisma.trip.findMany({
      where: {
        from,
        to,
        ...dateFilter,
      },
      orderBy: {
        departDate: 'asc',
      },
    });

    if (trips.length === 0) {
      return {
        message: 'Không tìm thấy chuyến đi phù hợp',
        trips: [],
      };
    }

    const tripIds = trips.map((trip) => trip.id);

    const bookedSeatRows = await this.prisma.orderSeat.findMany({
      where: {
        tripId: {
          in: tripIds,
        },
        order: {
          paymentStatus: {
            in: [PaymentStatus.PAID, PaymentStatus.PENDING],
          },
          bookingStatus: {
            not: BookingStatus.CANCELLED,
          },
        },
      },
      select: {
        tripId: true,
      },
    });

    const bookedSeatMap = new Map<number, number>();

    for (const row of bookedSeatRows) {
      if (!row.tripId) continue;
      bookedSeatMap.set(row.tripId, (bookedSeatMap.get(row.tripId) || 0) + 1);
    }

    const TOTAL_SEATS = 22;

    const result = trips.map((trip) => {
      const departureDateObj = new Date(trip.departDate);
      const computedArrival = new Date(
        departureDateObj.getTime() + (trip.durationMinutes ?? 0) * 60000,
      );
      const arrivalDateObj = trip.arrivalDate ?? computedArrival;

      const bookedSeats = bookedSeatMap.get(trip.id) || 0;
      const availableSeats = Math.max(TOTAL_SEATS - bookedSeats, 0);

      return {
        ...trip,
        departDate: departureDateObj.toISOString(),
        arrivalDate: arrivalDateObj.toISOString(),
        arrivalTime: arrivalDateObj.toISOString(),
        pickupPoint: trip.pickupPoint || `Bến xe ${trip.from}`,
        dropoffPoint: trip.dropoffPoint || `Bến xe ${trip.to}`,
        totalSeats: TOTAL_SEATS,
        bookedSeats,
        availableSeats,
      };
    });

    return { trips: result };
  }
}