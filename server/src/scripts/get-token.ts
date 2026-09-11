import 'dotenv/config';
import { auth } from '../config/firebase';

const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || process.env.FIREBASE_WEB_API_KEY;

if (!apiKey) {
  console.error('❌ ERROR: API Key is undefined. dotenv is not loading the key from .env');
  process.exit(1);
}

console.log(`✅ Loaded API Key starting with: ${apiKey.substring(0, 8)}...`);

async function generateTestToken(uid: string) {
  const customToken = await auth.createCustomToken(uid);
  // Note: Using FIREBASE_API_KEY which should be in .env
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: customToken, returnSecureToken: true }),
    }
  );

  const data = await res.json();
  if (data.idToken) {
    console.log(`\n🔑 ID Token for user [${uid}]:\n\n${data.idToken}\n`);
  } else {
    console.error('Failed to generate token:', data);
  }
}

// Generate token for seeded admin user
generateTestToken('test_admin_uid');