import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ShopModule } from './shop/shop.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from './shop/entities/product.entity';
import { CartModule } from './cart/cart.module';
import { AdminModule } from './admin/admin.module';
import { UserModule } from './user/user.module';
import { User } from './user/user.entity';
import { Cart } from './cart/cart.entity';
import { CartItem } from './cart/cart-Item.entity';
import { OrdersModule } from './orders/orders.module';
import { CustomerOrders } from './orders/entities/orders.entity';
import {OrderItem} from './orders/entities/orderitem.entity';
import { ProductSize } from './shop/entities/product-size.entity';
import { Review } from './shop/entities/product-review.entity';


@Module({
  controllers: [AppController],
  providers: [AppService],
  imports: [ShopModule, TypeOrmModule.forRoot({
    type: 'mysql',
    host: '127.0.0.1',
    port: 3306,
    username: 'root',
    password: 'Leobarca@10',
    database: 'indietesting',
    entities: [Product, User, Cart, CartItem, CustomerOrders, OrderItem,ProductSize,Review],
    synchronize: true,  //only to use in development enviornment NEVER IN production
  }), CartModule, UserModule, AdminModule, OrdersModule],
  exports: [TypeOrmModule],
})
export class AppModule {}
