import { Entity, Column, PrimaryGeneratedColumn, ManyToOne } from 'typeorm';
import { Product } from './product.entity'; // Import the Product entity

@Entity()
export class Review {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  title: string;

  @Column({ length: 2000 }) // Adjust length as needed
  description: string;

  @Column({ type: 'float' })
  rating: number;

  @ManyToOne(() => Product, (product) => product.reviews)
  product: Product;
}
