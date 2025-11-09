import { db } from './index';
import {
    user,
    userRoleEnum,
    customers,
    clothingModels,
    inventoryItems,
    itemStatusEnum
} from './schema';

async function seed() {
    console.log('🌱 Starting database seeding...');

    try {
        // Create sample users
        const [managerUser] = await db.insert(user).values([
            {
                id: 'manager-001',
                name: 'Store Manager',
                email: 'manager@rentalstore.com',
                role: userRoleEnum.enumValues[1], // manager
                employeeId: 'MGR001',
                phoneNumber: '+1234567890',
                isActive: true,
            },
        ]).returning();

        const [cashierUser] = await db.insert(user).values([
            {
                id: 'cashier-001',
                name: 'John Cashier',
                email: 'john@rentalstore.com',
                role: userRoleEnum.enumValues[0], // cashier
                employeeId: 'CSH001',
                phoneNumber: '+1234567891',
                isActive: true,
            },
        ]).returning();

        console.log('✅ Users created:', { manager: managerUser.name, cashier: cashierUser.name });

        // Create sample customers
        const [customer1] = await db.insert(customers).values([
            {
                name: 'Alice Johnson',
                email: 'alice@email.com',
                phoneNumber: '+1555123456',
                address: '123 Main St, City, State 12345',
                idNumber: 'ID123456789',
            },
        ]).returning();

        const [customer2] = await db.insert(customers).values([
            {
                name: 'Bob Smith',
                email: 'bob@email.com',
                phoneNumber: '+1555987654',
                address: '456 Oak Ave, City, State 67890',
                idNumber: 'ID987654321',
            },
        ]).returning();

        console.log('✅ Customers created:', { customer1: customer1.name, customer2: customer2.name });

        // Create sample clothing models
        const [model1] = await db.insert(clothingModels).values([
            {
                name: 'Classic Business Suit',
                description: 'Professional two-piece business suit suitable for formal occasions',
                category: 'Suits',
                brand: 'Professional Wear Co.',
                dailyRate: '25.00',
                lateFeeRate: '10.00',
                imageUrl: '/images/suit-classic.jpg',
            },
        ]).returning();

        const [model2] = await db.insert(clothingModels).values([
            {
                name: 'Elegant Evening Gown',
                description: 'Beautiful evening gown perfect for formal events and galas',
                category: 'Dresses',
                brand: 'Elegance Fashion',
                dailyRate: '45.00',
                lateFeeRate: '15.00',
                imageUrl: '/images/gown-elegant.jpg',
            },
        ]).returning();

        console.log('✅ Clothing models created:', { model1: model1.name, model2: model2.name });

        // Create sample inventory items
        await db.insert(inventoryItems).values([
            // Business suits - multiple sizes and colors
            {
                modelId: model1.id,
                sku: 'SUIT-CLASSIC-BLK-38',
                size: '38',
                color: 'Black',
                status: itemStatusEnum.enumValues[0], // available
                condition: 'Excellent',
            },
            {
                modelId: model1.id,
                sku: 'SUIT-CLASSIC-BLK-40',
                size: '40',
                color: 'Black',
                status: itemStatusEnum.enumValues[0], // available
                condition: 'Excellent',
            },
            {
                modelId: model1.id,
                sku: 'SUIT-CLASSIC-NAVY-42',
                size: '42',
                color: 'Navy',
                status: itemStatusEnum.enumValues[0], // available
                condition: 'Good',
            },
            {
                modelId: model1.id,
                sku: 'SUIT-CLASSIC-GRAY-40',
                size: '40',
                color: 'Gray',
                status: itemStatusEnum.enumValues[0], // available
                condition: 'Good',
            },
            // Evening gowns - multiple sizes and colors
            {
                modelId: model2.id,
                sku: 'GOWN-ELEGANT-RED-6',
                size: '6',
                color: 'Red',
                status: itemStatusEnum.enumValues[0], // available
                condition: 'Excellent',
            },
            {
                modelId: model2.id,
                sku: 'GOWN-ELEGANT-RED-8',
                size: '8',
                color: 'Red',
                status: itemStatusEnum.enumValues[0], // available
                condition: 'Excellent',
            },
            {
                modelId: model2.id,
                sku: 'GOWN-ELEGANT-BLUE-10',
                size: '10',
                color: 'Blue',
                status: itemStatusEnum.enumValues[0], // available
                condition: 'Good',
            },
            {
                modelId: model2.id,
                sku: 'GOWN-ELEGANT-BLACK-8',
                size: '8',
                color: 'Black',
                status: itemStatusEnum.enumValues[4], // damaged (for testing)
                condition: 'Minor damage - need repair',
                notes: 'Small tear on the side seam',
            },
        ]);

        console.log('✅ Inventory items created (8 items total)');

        console.log('🎉 Database seeding completed successfully!');

    } catch (error) {
        console.error('❌ Error seeding database:', error);
        throw error;
    }
}

// Run seed if this file is executed directly
if (require.main === module) {
    seed()
        .then(() => {
            console.log('✅ Seeding completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Seeding failed:', error);
            process.exit(1);
        });
}

export { seed };