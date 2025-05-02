import { MigrationInterface, QueryRunner } from "typeorm"

export class AddRazorpayAndShipmentFields1711471800000 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE customer_orders 
            ADD COLUMN razorpay_payment_id VARCHAR(255),
            ADD COLUMN razorpay_signature VARCHAR(255),
            ADD COLUMN shipment_id VARCHAR(255),
            ADD COLUMN awb_code VARCHAR(255)
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE customer_orders 
            DROP COLUMN razorpay_payment_id,
            DROP COLUMN razorpay_signature,
            DROP COLUMN shipment_id,
            DROP COLUMN awb_code
        `);
    }

} 