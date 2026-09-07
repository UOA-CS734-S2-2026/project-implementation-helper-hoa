import { initializeApp, getApps, getApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import path from 'path';
import fs from 'fs';

// Resolve absolute path to project root (not src)
const serviceAccountPath = path.resolve(process.cwd(), '..','service-account.json');

if (!fs.existsSync(serviceAccountPath)) {
  throw new Error(`Service account key not found at ${serviceAccountPath}. Ensure service-account.json is in your project root folder.`);
}

const app = !getApps().length
  ? initializeApp({
      credential: cert(serviceAccountPath),
    })
  : getApp();

export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;