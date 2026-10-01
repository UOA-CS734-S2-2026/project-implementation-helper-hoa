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

    console.log('\n🚀 Success! Database connection verified and initial test data seeded successfully.');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Seeding failed! Check your service-account.json and .env file:', error);
    process.exit(1);
  }
}

seed();