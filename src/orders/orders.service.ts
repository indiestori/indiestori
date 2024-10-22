require('dotenv').config();
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {OrderItem} from './entities/orderitem.entity';
import { CustomerOrders } from './entities/orders.entity';
import { User } from 'src/user/user.entity';
import { Product } from 'src/shop/entities/product.entity';
import { ProductSize } from 'src/shop/entities/product-size.entity';
import * as sgMail from '@sendgrid/mail';

const Razorpay = require('razorpay');
@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);
  private razorpay: any;
  constructor(
    @InjectRepository(CustomerOrders)
    private readonly orderRepository: Repository<CustomerOrders>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(ProductSize)
    private readonly productSizeRepository: Repository<ProductSize>,
  ) {
    this.razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_API_KEY_ID,
      key_secret: process.env.RAZORPAY_API_KEY_SECRET,
    });
  }

  async createOrder(firebaseUid: string | null, items: any[], OrderInfo: any) {
    // Construct the order object with the billing details
    const orderObject = {
      Name: `${OrderInfo.firstName} ${OrderInfo.lastName}`,
      CompanyName: OrderInfo.companyName || null,
      Country: OrderInfo.country,
      StreetAddress: `${OrderInfo.streetAddress}, ${OrderInfo.apartment || ''}`,
      City: OrderInfo.city,
      State: OrderInfo.state,
      Pincode: OrderInfo.pinCode,
      PaymentMethod: OrderInfo.paymentMethod,
      Phone: OrderInfo.phone,
      Email: OrderInfo.email,
      OrderNotes: OrderInfo.orderNotes || null,
    };
  
    this.logger.log(orderObject);
  
    const allProducts = await Promise.all(
      items.map(async (item: any) => {
        this.logger.log(item);
        
        // Find the product by productId
        const product = await this.productRepository.findOne({
          where: { id: item.productId },
          relations: ['sizes'], // Include the sizes relation
        });
  
        if (!product) {
          throw new Error(`Product not found for ID ${item.productId}`);
        }
  
        // Find the size object within the sizes array that matches the item.size
        const productSizeInfo = product.sizes.find(
          (size) => size.size === item.size
        );
  
        if (!productSizeInfo) {
          throw new Error(
            `Product size not found for product ID ${item.productId} and size ${item.size}`
          );
        }
  
        this.logger.log("product", productSizeInfo.product);
  
        const orderItem = this.orderItemRepository.create({
          productId: product.id,
          name: product.name,
          size: productSizeInfo.size,
          price: productSizeInfo.discountPrice,
          quantity: item.quantity,
          totalPrice: item.quantity * productSizeInfo.discountPrice,
          imageUrl: product.imageUrl[0], // Assuming imageUrl is a string array in Product
        });
  
        return orderItem;
      }),
    );

    //Adds 25 rupees if order is cash on delivery

    let finalAmount =0;

    if(orderObject.PaymentMethod == "cashOnDelivery"){
     finalAmount = allProducts.reduce(
        (acc, product) => acc + product.totalPrice + 25 ,
        0,
      );
    }else{
      finalAmount = allProducts.reduce(
        (acc, product) => acc + product.totalPrice,
        0,
      );
    }
    const taxPercentage = process.env.TAX_PERCENTAGE
    const shipmentCharges = process.env.SHIPMENT_CHARGES
    const noOfproducts = process.env.NO_OF_PRODUCTS
    const totalAmountBeforeShipping: number = parseInt(
      (finalAmount + finalAmount * parseFloat(taxPercentage)).toFixed(0),
    );
    const totalAmountAfterShipping = items.length <= parseInt(noOfproducts) ? totalAmountBeforeShipping + parseFloat(shipmentCharges) : totalAmountBeforeShipping

    
    // Create the order entity
    let razorpayOrderId: string | null = null;
    const cashOnDeliveryCharges = process.env.CASH_ON_DELIVERY_CHARGES
      const razorpayOrder = await this.razorpay.orders.create({
        amount: OrderInfo.paymentMethod === 'cashOnDelivery' ? parseFloat(cashOnDeliveryCharges) * 100 : totalAmountAfterShipping * 100, // Amount in the smallest currency unit (e.g., paise for INR)
        currency: 'INR',
        receipt: `order_${Date.now()}`,
      });
      console.log(razorpayOrder)
      razorpayOrderId = razorpayOrder.id;
    

    const order = this.orderRepository.create({
      firebaseUid,
      orderInfo: orderObject,
      items: allProducts,
      totalAmount:totalAmountAfterShipping,
      razorpayOrderId, // Store the Razorpay order ID or null
    });

    const result = await this.orderRepository.save(order);

    console.log(result);
    return { result, razorpayOrderId };
  }

  async confirmPayment(paymentDetails: any) {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } =
      paymentDetails;

  
    const order = await this.orderRepository.findOneBy({ razorpayOrderId });

    if (!order) {
      throw new Error('Order not found');
    }

    order.paymentStatus = 'confirmed';
    await this.orderRepository.save(order);

    return { success: true };
  }


  async fetchOrders(objectinput: any) {
    // firebaseUid1.toString().trim();
    const orders = await this.orderRepository.find({
      where: { firebaseUid: objectinput.firebaseUid, paymentStatus: "confirmed" },
      relations: ['items'],
    });
    return orders;
  }

  async emailService(body: any) {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);

    console.log('emailservice called');
   // const currentDate = new Date().toLocaleString();
    const currentDate = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

    const ComfirmOrder_msg = {
      to: `${body.recipient}`, // Change to your recipient
      from: 'orders@indiestori.com', // Change to your verified sender
      subject: 'Your order is confirmed',
      text: 'and easy to do anywhere, even with Node.js',
      html: `<div style="font-family: inherit; text-align: inherit">Dear ${body.recipientName},<br>
        <br>
        Thank you for shopping with us!<br>
        <br>
        We are thrilled to confirm that your ${body.OrderId} has been successfully placed. Below are the details of your order:<br>
        <br>
        Order Summary:<br>
        <br>
        - Order Date: ${currentDate}<br>
        - Order Number: ${body.OrderId}<br>
        - Total Amount: Rs. ${body.OrderAmount}<br>
        - Payment Method: ${body.PaymentMethod}<br>
        Order Items:<br>
        <ul>
        ${body.OrderItems.map(
          (item) => `
          <li>
            Product Name: ${item.name}<br>
            Quantity: ${item.quantity}<br>
            Price: ${item.discountprice}<br>
          </li>
        `,
        ).join('')}
        </ul>
        Shipping Address: ${body.OrderAddress}<br>
        <br>
        Thank you for choosing us! Our team will process your order promptly.<br>
        <br>
        Best regards,</div>
        <div style="font-family: inherit; text-align: inherit">Indie Stori</div>`,
    };

    console.log(ComfirmOrder_msg);
    try {
      await sgMail.send(ComfirmOrder_msg);
      console.log('Email sent');
      return { success: true, message: 'Email sent successfully' };
    } catch (error) {
      console.error(error);
      return { success: false, message: 'Failed to send email', error };
    }
  }
}
