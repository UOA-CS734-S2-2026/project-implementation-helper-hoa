import '../config/env';
import { Timestamp } from 'firebase-admin/firestore';
import { auth, db } from '../config/firebase';

type SeedUser = {
  legacyUid: string;
  email: string;
  name: string;
  role: 'admin' | 'manager' | 'cashier';
};

const SEED_USERS: SeedUser[] = [
  {
    legacyUid: 'test_admin_uid',
    email: 'admin@example.com',
    name: 'Alice Admin',
    role: 'admin',
  },
  {
    legacyUid: 'test_manager_uid',
    email: 'manager@example.com',
    name: 'Bob Manager',
    role: 'manager',
  },
  {
    legacyUid: 'test_cashier_uid',
    email: 'cashier@example.com',
    name: 'Charlie Cashier',
    role: 'cashier',
  },
];

// The password is only ever used for local demo accounts. Override it with
// SEED_USER_PASSWORD if you need something else.
const SEED_PASSWORD = process.env.SEED_USER_PASSWORD || 'password123';

function isNotFound(error: unknown): boolean {
  return (error as { code?: string } | null)?.code === 'auth/user-not-found';
}

/**
 * Creates the Firebase Auth login record for a seeded user and returns the UID
 * Firebase actually assigned. Auth owns the UID, so the Firestore profile has to
 * be written under whatever comes back rather than a hardcoded id.
 */
async function upsertAuthUser(user: SeedUser): Promise<string> {
  try {
    const existing = await auth.getUserByEmail(user.email);
    await auth.updateUser(existing.uid, {
      password: SEED_PASSWORD,
      displayName: user.name,
    });
    console.log(`   └─ Auth user updated: ${user.email} (UID: ${existing.uid})`);

    return existing.uid;
  } catch (error) {
    if (!isNotFound(error)) {
      throw error;
    }
  }

  const created = await auth.createUser({
    email: user.email,
    password: SEED_PASSWORD,
    displayName: user.name,
  });
  console.log(`   └─ Auth user created: ${user.email} (UID: ${created.uid})`);

  return created.uid;
}

async function seed() {
  console.log('🌱 Starting Firebase Firestore seed...\n');

  try {
    // 1. Seed Users (Required for testing RBAC middleware and for logging in)
    // Each user needs both a Firebase Auth record, so the app can exchange an
    // email and password for an ID token, and a Firestore profile holding the
    // role that requireRole reads.
    console.log('📦 Seeding users...');

    for (const user of SEED_USERS) {
      const uid = await upsertAuthUser(user);

      // Earlier runs wrote the profile under a hardcoded uid. Carry the role
      // over so re-seeding does not reset anyone to cashier, then drop the
      // stale document.
      const legacy = await db.collection('users').doc(user.legacyUid).get();
      const createdAt = legacy.exists
        ? (legacy.get('createdAt') as Timestamp | undefined) ?? Timestamp.now()
        : Timestamp.now();

      await db.collection('users').doc(uid).set({
        email: user.email,
        name: user.name,
        lastName: '',
        phone: '',
        role: user.role,
        createdAt,
      });

      if (user.legacyUid !== uid) {
        await db.collection('users').doc(user.legacyUid).delete();
        console.log(`   └─ Removed legacy profile: ${user.legacyUid}`);
      }

      console.log(
        `   └─ User profile saved: ${user.name} [Role: ${user.role}] (ID: ${uid})`,
      );
    }

    console.log(
      `\n🔑 Sign in with any of the above emails and the password: ${SEED_PASSWORD}\n`,
    );

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

    // 4. Seed grocery vendors and products that exercise the home page inventory alerts
    console.log('\n📦 Seeding grocery vendors...');
    const groceryVendors = [
      {
        id: 'vendor_fresh_farms',
        name: 'Fresh Farms Wholesale Ltd',
        email: 'orders@freshfarms.co.nz',
        phone: '+64 9 555 0142',
        address: '22 Market Road, Mangere, Auckland, NZ',
      },
      {
        id: 'vendor_dairy_co',
        name: 'Waikato Dairy Co-op',
        email: 'supply@waikatodairy.co.nz',
        phone: '+64 7 555 0199',
        address: '8 Creamery Lane, Hamilton, NZ',
      },
      {
        id: 'vendor_grain_traders',
        name: 'Pacific Grain Traders',
        email: 'sales@pacificgrain.co.nz',
        phone: '+64 9 555 0177',
        address: '120 Wharf Street, Onehunga, Auckland, NZ',
      },
    ];

    for (const vendor of groceryVendors) {
      const { id, ...data } = vendor;
      await db.collection('vendors').doc(id).set({ ...data, createdAt: Timestamp.now() });
      console.log(`   └─ Vendor created: ${vendor.name} (ID: ${id})`);
    }

    const daysFromNow = (days: number) =>
      Timestamp.fromDate(new Date(Date.now() + days * 24 * 60 * 60 * 1000));

    type SeedBatch = {
      batchNumber: string;
      quantity: number;
      costPrice: number;
      expiresInDays: number;
      receivedDaysAgo: number;
      vendorId: string;
      invoiceNumber: string;
    };

    const groceryProducts: Array<{
      id: string;
      name: string;
      sku: string;
      category: string;
      description: string;
      unitOfMeasure: string;
      sellingPrice: number;
      costPrice: number;
      reorderPoint: number;
      batches: SeedBatch[];
    }> = [
      {
        id: 'prod_fresh_milk',
        name: 'Fresh Milk 2L',
        sku: 'DAIRY-MILK-2L',
        category: 'Dairy',
        description: 'Full cream fresh milk, 2 litre carton',
        unitOfMeasure: 'carton',
        sellingPrice: 4.5,
        costPrice: 2.8,
        reorderPoint: 20,
        batches: [
          { batchNumber: 'BATCH-MILK-001', quantity: 6, costPrice: 2.8, expiresInDays: 1, receivedDaysAgo: 6, vendorId: 'vendor_dairy_co', invoiceNumber: 'INV-D-1021' },
        ],
      },
      {
        id: 'prod_yogurt',
        name: 'Greek Yogurt 1kg',
        sku: 'DAIRY-YOG-1KG',
        category: 'Dairy',
        description: 'Plain unsweetened Greek yogurt',
        unitOfMeasure: 'tub',
        sellingPrice: 7.99,
        costPrice: 4.6,
        reorderPoint: 12,
        batches: [
          { batchNumber: 'BATCH-YOG-004', quantity: 4, costPrice: 4.6, expiresInDays: 2, receivedDaysAgo: 10, vendorId: 'vendor_dairy_co', invoiceNumber: 'INV-D-1018' },
        ],
      },
      {
        id: 'prod_bread',
        name: 'Wholemeal Bread',
        sku: 'BAKERY-WHOLEMEAL',
        category: 'Bakery',
        description: 'Sliced wholemeal sandwich loaf',
        unitOfMeasure: 'loaf',
        sellingPrice: 3.5,
        costPrice: 1.9,
        reorderPoint: 15,
        batches: [],
      },
      {
        id: 'prod_organic_rice',
        name: 'Organic Rice 5kg',
        sku: 'GRAIN-RICE-5KG',
        category: 'Pantry',
        description: 'Organic long grain white rice',
        unitOfMeasure: 'bag',
        sellingPrice: 18.99,
        costPrice: 11.5,
        reorderPoint: 30,
        batches: [
          { batchNumber: 'BATCH-RICE-012', quantity: 12, costPrice: 11.5, expiresInDays: 180, receivedDaysAgo: 20, vendorId: 'vendor_grain_traders', invoiceNumber: 'INV-G-0450' },
        ],
      },
      {
        id: 'prod_chicken_feed',
        name: 'Chicken Feed 20kg',
        sku: 'FARM-FEED-20KG',
        category: 'Farm Supplies',
        description: 'Layer pellets for poultry',
        unitOfMeasure: 'sack',
        sellingPrice: 32.0,
        costPrice: 21.0,
        reorderPoint: 40,
        batches: [
          { batchNumber: 'BATCH-FEED-007', quantity: 15, costPrice: 21.0, expiresInDays: 90, receivedDaysAgo: 14, vendorId: 'vendor_grain_traders', invoiceNumber: 'INV-G-0447' },
        ],
      },
      {
        id: 'prod_tomatoes',
        name: 'Tomatoes',
        sku: 'PRODUCE-TOMATO-CRATE',
        category: 'Produce',
        description: 'Vine-ripened tomatoes, 10kg crate',
        unitOfMeasure: 'crate',
        sellingPrice: 45.0,
        costPrice: 28.0,
        reorderPoint: 10,
        batches: [
          { batchNumber: 'BATCH-TOM-031', quantity: 8, costPrice: 28.0, expiresInDays: 12, receivedDaysAgo: 2, vendorId: 'vendor_fresh_farms', invoiceNumber: 'INV-F-2210' },
        ],
      },
      {
        id: 'prod_cabbage',
        name: 'Cabbage',
        sku: 'PRODUCE-CABBAGE',
        category: 'Produce',
        description: 'Green cabbage, whole head',
        unitOfMeasure: 'head',
        sellingPrice: 3.99,
        costPrice: 1.8,
        reorderPoint: 20,
        batches: [
          { batchNumber: 'BATCH-CAB-019', quantity: 18, costPrice: 1.8, expiresInDays: 14, receivedDaysAgo: 3, vendorId: 'vendor_fresh_farms', invoiceNumber: 'INV-F-2211' },
        ],
      },
      {
        id: 'prod_cheddar',
        name: 'Cheddar Cheese 1kg',
        sku: 'DAIRY-CHEDDAR-1KG',
        category: 'Dairy',
        description: 'Mild cheddar block',
        unitOfMeasure: 'block',
        sellingPrice: 14.5,
        costPrice: 9.2,
        reorderPoint: 10,
        batches: [
          { batchNumber: 'BATCH-CHD-003', quantity: 10, costPrice: 9.2, expiresInDays: 5, receivedDaysAgo: 25, vendorId: 'vendor_dairy_co', invoiceNumber: 'INV-D-0990' },
          { batchNumber: 'BATCH-CHD-004', quantity: 15, costPrice: 9.2, expiresInDays: 40, receivedDaysAgo: 4, vendorId: 'vendor_dairy_co', invoiceNumber: 'INV-D-1025' },
        ],
      },
      {
        id: 'prod_spinach',
        name: 'Baby Spinach 500g',
        sku: 'PRODUCE-SPINACH-500G',
        category: 'Produce',
        description: 'Washed baby spinach leaves',
        unitOfMeasure: 'bag',
        sellingPrice: 5.5,
        costPrice: 3.1,
        reorderPoint: 10,
        batches: [
          { batchNumber: 'BATCH-SPN-008', quantity: 24, costPrice: 3.1, expiresInDays: 4, receivedDaysAgo: 2, vendorId: 'vendor_fresh_farms', invoiceNumber: 'INV-F-2214' },
        ],
      },
      {
        id: 'prod_eggs',
        name: 'Free Range Eggs (12)',
        sku: 'DAIRY-EGGS-12',
        category: 'Dairy',
        description: 'Dozen free range eggs',
        unitOfMeasure: 'carton',
        sellingPrice: 9.99,
        costPrice: 6.2,
        reorderPoint: 20,
        batches: [
          { batchNumber: 'BATCH-EGG-021', quantity: 60, costPrice: 6.2, expiresInDays: 25, receivedDaysAgo: 3, vendorId: 'vendor_fresh_farms', invoiceNumber: 'INV-F-2215' },
        ],
      },
    ];

    console.log('\n📦 Seeding grocery products...');
    for (const prod of groceryProducts) {
      const { id, batches, ...data } = prod;
      const totalStock = batches.reduce((sum, batch) => sum + batch.quantity, 0);
      await db.collection('products').doc(id).set({
        ...data,
        taxRate: 15.0,
        totalStock,
        totalSold: 0,
        salesVelocity: 0,
        tags: [],
        images: [],
        status: totalStock > 0 ? 'active' : 'out_of_stock',
        batches: batches.map(({ expiresInDays, receivedDaysAgo, ...batch }) => ({
          ...batch,
          expirationDate: daysFromNow(expiresInDays),
          receivedDate: daysFromNow(-receivedDaysAgo),
        })),
        createdAt: Timestamp.now(),
      });
      console.log(`   └─ Product created: ${prod.name} (Stock: ${totalStock}, ID: ${id})`);
    }

    console.log('\n🚀 Success! Database connection verified and initial test data seeded successfully.');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Seeding failed! Check server/service-account.json and server/.env:', error);
    process.exit(1);
  }
}

seed();