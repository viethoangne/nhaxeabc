import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Trip } from './trip.entity';  // Đảm bảo rằng đường dẫn này đúng

@Entity()
export class Ticket {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Trip, (trip) => trip.tickets)  // Liên kết với Trip
  trip: Trip;

  @Column()
  numTickets: number;

  @Column()
  createdAt: Date;
}