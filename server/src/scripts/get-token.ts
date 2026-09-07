import 'dotenv/config';
import { auth } from '../config/firebase';

async function generateTestToken(uid: string) {
  // 1. Create a custom token using Admin SDK
  const customToken = await auth.createCustomToken(uid);
  
  // 2. Exchange the custom token for a Firebase ID Token via Google Identity Toolkit
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || process.env.FIREBASE_WEB_API_KEY;
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