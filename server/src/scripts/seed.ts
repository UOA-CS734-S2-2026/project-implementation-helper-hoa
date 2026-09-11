import 'dotenv/config';
import { Timestamp } from 'firebase-admin/firestore';
import { db } from '../config/firebase';

async function seed() {
  console.log('🌱 Starting Firebase Firestore seed...\n');

  try {
    // 1. Seed Users (Required for testing RBAC middleware)
    console.log('📦 Seeding users...');
    const users = [
      {
        uid: 'test_admin_uid',
        email: 'admin@example.com',
        name: 'Alice Admin',
        role: 'admin',
      },
      {
        uid: 'test_manager_uid',
        email: 'manager@example.com',
        name: 'Bob Manager',
        role: 'manager',
      },
      {
        uid: 'test_cashier_uid',
        email: 'cashier@example.com',
        name: 'Charlie Cashier',
        role: 'cashier',
      },
    ];

    for (const user of users) {
      await db.collection('users').doc(user.uid).set({
        email: user.email,
        name: user.name,
        role: user.role,
        createdAt: Timestamp.now(),
      });
      console.log(`   └─ User created: ${user.name} [Role: ${user.role}] (ID: ${user.uid})`);
    }

    // 2. Seed Vendor
    console.log('\n📦 Seeding vendors...');
    const vendorId = 'vendor_jbhifi';
    await db.collection('vendors').doc(vendorId).set({
      name: 'JB Hi-Fi Group (NZ) Limited',
      email: 'orders@jbhifi.co.nz',
      phone: '+64 9 123 4567',
      address: 'Level 1, 7 Link Drive, Auckland, NZ',
      createdAt: Timestamp.now(),
    });
    console.log(`   └─ Vendor created: JB Hi-Fi Group (ID: ${vendorId})`);

    // 3. Seed Products with FIFO Batches
    console.log('\n📦 Seeding products & initial stock batches...');

    const products = [
      {
        id: 'prod_mx_master',
        name: 'Logitech MX Master 3S',
        sku: 'LOGI-MX3S-BLK',
        description: 'Wireless Ergonomic Performance Mouse',
        sellingPrice: 149.99,
        costPrice: 95.00,
        taxRate: 15.0,
        status: 'active',
        totalStock: 10,
        totalSold: 0,
        batches: [
          {
            batchNumber: 'BATCH-2026-001',
            quantity: 10,
            costPrice: 95.00,
            receivedDate: Timestamp.now(),
            vendorId: vendorId,
            invoiceNumber: 'INV-500754',
          },
        ],
      },
      {
        id: 'prod_dell_monitor',
        name: 'Dell UltraSharp 27" 4K Monitor',
        sku: 'DELL-U2723QE',
        description: 'USB-C Hub IPS Display',
        sellingPrice: 799.00,
        costPrice: 550.00,
        taxRate: 15.0,
        status: 'active',
        totalStock: 5,
        totalSold: 0,
        batches: [
          {
            batchNumber: 'BATCH-2026-002',
            quantity: 5,
            costPrice: 550.00,
            receivedDate: Timestamp.now(),
            vendorId: vendorId,
            invoiceNumber: 'INV-500755',
          },
        ],
      },
    ];

    for (const prod of products) {
      const { id, ...data } = prod;
      await db.collection('products').doc(id).set({
        ...data,
        createdAt: Timestamp.now(),
      });
      console.log(`   └─ Product created: ${prod.name} (Stock: ${prod.totalStock}, ID: ${id})`);
    }

    console.log('\n🚀 Success! Database connection verified and initial test data seeded successfully.');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Seeding failed! Check your service-account.json and .env file:', error);
    process.exit(1);
  }
}

seed();