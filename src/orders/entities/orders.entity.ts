import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import {OrderItem} from './orderitem.entity';

@Entity()
export class CustomerOrders {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ nullable: true })
    firebaseUid: string;

    @Column('json')
    orderInfo: Record<string, any>;

    @OneToMany(() => OrderItem, (item:OrderItem) => item.order, { cascade: true })
    items: OrderItem[];

    @Column('decimal', { precision: 10, scale: 2 })
    totalAmount: number;

    @Column({ nullable: true })
    razorpayOrderId: string | null;

    @Column({ nullable: true })
    razorpayPaymentId: string | null;

    @Column({ nullable: true })
    razorpaySignature: string | null;

    @Column({ nullable: true })
    shipmentId: string | null;

    @Column({ nullable: true })
    awbCode: string | null;

    @Column({default:"awaiting", nullable:true})
    paymentStatus:string;

    @Column({default:"placed", nullable:true})
    orderStatus:string;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    orderDate: Date;
}
