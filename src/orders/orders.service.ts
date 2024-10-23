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
  private shiprocketToken: string | null = null;
  private tokenExpiry: number | null = null;

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
  

  // Method to authenticate with Shiprocket and get a new token
  async getShiprocketToken() {
    const currentTime = Math.floor(Date.now() / 1000);
    if (
      !this.shiprocketToken ||
      (this.tokenExpiry && currentTime >= this.tokenExpiry)
    ) {
      const baseUrl = 'https://apiv2.shiprocket.in/v1/external/auth/login';

      const response = await fetch(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: process.env.SHIPROCKET_EMAIL,
          password: process.env.SHIPROCKET_PASSWORD,
        }),
      });

      const data = await response.json();
      this.shiprocketToken = data.token;

      const tokenPayload = JSON.parse(
        Buffer.from(data.token.split('.')[1], 'base64').toString(),
      );
      this.tokenExpiry = tokenPayload.exp;
    }

    return this.shiprocketToken;
  }

  async createOrder(firebaseUid: string | null, items: any[], OrderInfo: any) {
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

      const product = await this.productRepository.findOne({
        where: { id: item.productId },
        relations: ['sizes'],
      });

      if (!product) {
        throw new Error(`Product not found for ID ${item.productId}`);
      }

      const productSizeInfo = product.sizes.find(
        (size) => size.size === item.size,
      );

      if (!productSizeInfo) {
        throw new Error(
          `Product size not found for product ID ${item.productId} and size ${item.size}`,
        );
      }

      const orderItem = this.orderItemRepository.create({
        productId: product.id,
        name: product.name,
        size: productSizeInfo.size,
        price: productSizeInfo.discountPrice,
        quantity: item.quantity,
        totalPrice: item.quantity * productSizeInfo.discountPrice,
        imageUrl: product.imageUrl[0],
      });

      return orderItem;
    }),
  );

  // Handle final amount and additional charges
  let finalAmount = 0;
  if (orderObject.PaymentMethod == 'cashOnDelivery') {
    finalAmount = allProducts.reduce(
      (acc, product) => acc + product.totalPrice + 25,
      0,
    );
  } else {
    finalAmount = allProducts.reduce(
      (acc, product) => acc + product.totalPrice,
      0,
    );
  }

  const taxPercentage = process.env.TAX_PERCENTAGE;
  const shipmentCharges = process.env.SHIPMENT_CHARGES;
  const noOfProducts = process.env.NO_OF_PRODUCTS;

  const totalAmountBeforeShipping = parseInt(
    (finalAmount + finalAmount * parseFloat(taxPercentage)).toFixed(0),
  );

  const totalAmountAfterShipping =
    items.length <= parseInt(noOfProducts)
      ? totalAmountBeforeShipping + parseFloat(shipmentCharges)
      : totalAmountBeforeShipping;

  let razorpayOrderId: string | null = null;
  const cashOnDeliveryCharges = process.env.CASH_ON_DELIVERY_CHARGES;

  // Create the order in Razorpay
  const razorpayOrder = await this.razorpay.orders.create({
    amount:
      OrderInfo.paymentMethod === 'cashOnDelivery'
        ? parseFloat(cashOnDeliveryCharges) * 100
        : totalAmountAfterShipping * 100, // Amount in the smallest currency unit (paise for INR)
    currency: 'INR',
    receipt: `order_${Date.now()}`,
  });

  razorpayOrderId = razorpayOrder.id;

  const order = this.orderRepository.create({
    firebaseUid,
    orderInfo: orderObject,
    items: allProducts,
    totalAmount: totalAmountAfterShipping,
    razorpayOrderId,
  });

  const result = await this.orderRepository.save(order);

  // Check if payment method is COD and create shipment
  if (OrderInfo.paymentMethod === 'cashOnDelivery') {
    const shiprocketShipment = await this.createShiprocketShipment(order, allProducts);
    // order.shipmentTrackingId = shiprocketShipment.tracking_id; // Adjust based on Shiprocket response
    // await this.orderRepository.save(order);
  }

  return { result, razorpayOrderId };
}


  // Method to confirm payment and trigger shipment creation via Shiprocket
  async confirmPayment(paymentDetails: any) {
    const { razorpayOrderId,items } = paymentDetails;
    const order = await this.orderRepository.findOneBy({ razorpayOrderId });

    if (!order) {
      throw new Error('Order not found');
    }

        // Confirm payment
        order.paymentStatus = 'confirmed';
    await this.orderRepository.save(order);
    console.log("items",order)
    // Create a shipment via Shiprocket API
    const shiprocketShipment = await this.createShiprocketShipment(order,items);

    return { success: true };
  }

  // Method to call Shiprocket's API and create a shipment
// Method to call Shiprocket's API and create a shipment
// Method to call Shiprocket's API and create a shipment
async createShiprocketShipment(order: any, items: any[]) {
  const baseUrl = 'https://apiv2.shiprocket.in/v1/external/orders/create/adhoc';

  const token = await this.getShiprocketToken();
  this.logger.log("Creating shipment for order:", order);

  // Adjust dimensions and weight based on product name and size
  let totalWeight = 0;
  let length = 10; // Default
  let breadth = 10; // Default
  let height = 10; // Default

  const orderItems = items.map((item) => {
    let packageDimensions = { length: 10, breadth: 10, height: 10, weight: 0.5 }; // Default values

    // Check if the product is honey
    if (item.name.toLowerCase().includes('honey')) {
      if (item.size <= 600) {
        packageDimensions = { length: 20, breadth: 13, height: 11, weight: 0.75 }; // 750 gm
      } else {
        packageDimensions = { length: 26, breadth: 12, height: 11, weight: 1.4 }; // 1400 gm
      }
    }

    // Check if the product is turmeric or salt
    if (item.name.toLowerCase().includes('turmeric') || item.name.toLowerCase().includes('salt')) {
      packageDimensions = { length: 14, breadth: 11, height: 9, weight: 0.4 }; // 400 gm
    }

    // Update total weight for the shipment
    totalWeight += packageDimensions.weight;

    // Use the largest dimension among all items as the overall package dimension
    length = Math.max(length, packageDimensions.length);
    breadth = Math.max(breadth, packageDimensions.breadth);
    height = Math.max(height, packageDimensions.height);

    // Return the order items with updated dimensions
    return {
      name: item.name,
      sku: item.productId,
      units: item.quantity,
      selling_price: item.price > 0 ? item.price : 1, // Ensure selling price is not zero
      discount: 0,
      tax: 0,
    };
  });

  // Determine the shipping charges based on the number of items
  const shippingCharges = items.length > parseFloat(process.env.NO_OF_PRODUCTS) ? 0 : parseFloat(process.env.SHIPMENT_CHARGES);

  this.logger.log("test",{
    order_id: order.razorpayOrderId,
    order_date: new Date().toISOString().split('T')[0],
    pickup_location: "warehouse",
    channel_id: 3815733,
    billing_customer_name: order.orderInfo.Name,
    billing_last_name: '',
    billing_address: order.orderInfo.StreetAddress,
    billing_city: order.orderInfo.City,
    billing_pincode: order.orderInfo.Pincode,
    billing_state: order.orderInfo.State,
    billing_country: order.orderInfo.Country,
    billing_email: order.orderInfo.Email,
    billing_phone: order.orderInfo.Phone,
    shipping_is_billing: true,
    order_items: orderItems,
    payment_method: order.orderInfo.PaymentMethod === 'cashOnDelivery' ? 'COD' : 'Prepaid',
    shipping_charges: shippingCharges,
    giftwrap_charges: 0,
    transaction_charges: 0,
    total_discount: 0,
    sub_total: order.totalAmount - shippingCharges,
    weight: totalWeight, // Total weight of the shipment
    length: length,      // Max length from all items
    breadth: breadth,    // Max breadth from all items
    height: height,      // Max height from all items
  })
  // Make the API request to Shiprocket
  const response = await fetch(baseUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      order_id: order.razorpayOrderId,
      order_date: new Date().toISOString().split('T')[0],
      pickup_location: "warehouse",
      channel_id: 3815733,
      billing_customer_name: order.orderInfo.Name,
      billing_last_name: '',
      billing_address: order.orderInfo.StreetAddress,
      billing_city: order.orderInfo.City,
      billing_pincode: order.orderInfo.Pincode,
      billing_state: order.orderInfo.State,
      billing_country: order.orderInfo.Country,
      billing_email: order.orderInfo.Email,
      billing_phone: order.orderInfo.Phone,
      shipping_is_billing: true,
      order_items: orderItems,
      payment_method: order.orderInfo.PaymentMethod === 'cashOnDelivery' ? 'COD' : 'Prepaid',
      shipping_charges: shippingCharges,
      giftwrap_charges: 0,
      transaction_charges: 0,
      total_discount: 0,
      sub_total: order.totalAmount - shippingCharges,
      weight: totalWeight, // Total weight of the shipment
      length: length,      // Max length from all items
      breadth: breadth,    // Max breadth from all items
      height: height,      // Max height from all items
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    this.logger.error("Shiprocket API Error:", errorData);
    throw new Error(`Failed to create shipment: ${errorData.message}`);
  }

  const shipment = await response.json();
  this.logger.log("Shiprocket Shipment Response:", shipment);

  return {success:true}
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
