import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import { ProductSize } from './product-size.entity'; // Import the ProductSize entity
import { Transform } from 'class-transformer';
import { Review } from './product-review.entity';

@Entity()
export class Product {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ default: 'all' })
  category: string;

  @Column({ default: 'base-000' })
  sku: string;

  @Column({ length: 1000 })
  description: string;

  @Column({ default: 'origin', length: 1200 })
  origin: string;

  @Column({ default: 'benefit', length: 1200 })
  benefits: string;

  @Column({ default: 'benefit', length: 1200 })
  uses: string;

  @Column({ default: 'ingredients', length: 1200 })
  ingredients: string;

  @Column({ default: 'safetyInformation', length: 1200 })
  safetyInformation: string;

  @Column({ default: 'www.google.com' })
  video1: string;

  @Column({ default: 'www.google.com' })
  video2: string;

  @Column()
  bannerUrl: string;

  @OneToMany(() => ProductSize, (productSize) => productSize.product, { cascade: true })
  sizes: ProductSize[];

  @OneToMany(() => Review, (review) => review.product, { cascade: true })
  reviews: Review[];

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  @Transform(({ value }) => value.toISOString())
  createdAt: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  @Transform(({ value }) => value.toISOString())
  updatedAt: Date;
}
