import { Entity, Column, PrimaryGeneratedColumn, ManyToOne } from 'typeorm';
import { Product } from './product.entity'; // Import the Product entity

@Entity()
export class ProductSize {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  size: string;

  @Column('decimal', { precision: 10, scale: 2 })
  price: number;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  discountPrice: number;

  @Column('simple-array', { nullable: true }) // Add imageUrl array here
  imageUrl: string[];

  @ManyToOne(() => Product, (product) => product.sizes, { onDelete: 'CASCADE' })
  product: Product;
}
