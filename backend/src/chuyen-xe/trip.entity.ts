import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn } from 'typeorm';
import { Ticket } from './ticket.entity';

@Entity()
export class Trip {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  from: string;

  @Column()
  to: string;

  @Column({ default: 300 })
  distanceKm: number;

  @Column()
  durationMinutes: number;

  @Column()
  price: number;

  @Column()
  busType: string;

  @Column()
  pickupPoint: string;

  @Column()
  dropoffPoint: string;

  @Column({ type: 'timestamp' }) // Lưu ngày và giờ đi
  departDate: Date;

  @Column({ type: 'timestamp' }) // Lưu ngày và giờ đến
  arrivalTime: Date;

  @OneToMany(() => Ticket, (ticket) => ticket.trip)
  tickets: Ticket[];

  @CreateDateColumn()
  createdAt: Date;
}