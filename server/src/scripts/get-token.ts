import '../config/env';
import { requireEnv } from '../config/env';
import { auth } from '../config/firebase';

const apiKey = requireEnv('FIREBASE_WEB_API_KEY');
const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@example.com';

console.log(`✅ Loaded API Key starting with: ${apiKey.substring(0, 8)}...`);

/**
 * Firebase Auth owns the uid, and seed.ts creates the login record before the
 * Firestore profile, so the admin's uid is whatever Auth returned. Look it up by
 * email rather than assuming the old hardcoded 'test_admin_uid'.
 */
async function resolveUid(email: string): Promise<string> {
  const user = await auth.getUserByEmail(email);
  return user.uid;
}

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

async function main() {
  const uid = await resolveUid(adminEmail);
  await generateTestToken(uid);
}

main().catch((error) => {
  console.error(
    `Failed to mint a token for ${adminEmail}. Run \`npm run seed\` first so the Auth user exists.`,
    error,
  );
  process.exit(1);
});