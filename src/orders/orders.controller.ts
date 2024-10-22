import { Body, Controller, Get, Post } from '@nestjs/common';
import { OrderDto } from './dtos/CreateOrder.dto';
import { OrdersService } from './orders.service';


@Controller('orders')
export class OrdersController {
    constructor(private readonly OrderRepository: OrdersService){}

    
    @Post('createorder')
    async createOrder(@Body() order: OrderDto){
        return await this.OrderRepository.createOrder(order.firebaseUid, order.items, order.OrderInfo);
        
    }

    @Post('confirmPayment')
    async confirmPayment(@Body() paymentDetails: any) {
        return await this.OrderRepository.confirmPayment(paymentDetails);
    }

    @Get('/check')
    checkkeys(){
        console.log({
        key_id: process.env.RAZORPAY_API_KEY_ID,
        key_secret: process.env.RAZORPAY_API_KEY_SECRET})
    }

    @Post('fetchorders')
    async fetchorders(@Body() body:any){
        return await this.OrderRepository.fetchOrders(body);
    }

    @Post('emailservice')
    async sendConfirmEmail(@Body() body:any){
        return await this.OrderRepository.emailService(body);
    }

}
