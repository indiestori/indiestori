import { Module } from '@nestjs/common';
import { ShopService } from './services/shop.service';
import { ShopController } from './shop.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from './entities/product.entity';
import { ProductSize } from './entities/product-size.entity';
import { Review } from './entities/product-review.entity';

@Module({
  imports:[TypeOrmModule.forFeature([Product,ProductSize,Review])],
  providers: [ShopService],
  controllers: [ShopController],
})
export class ShopModule {}
