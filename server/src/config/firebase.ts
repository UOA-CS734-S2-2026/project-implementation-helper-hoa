import { initializeApp, getApps, getApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// The service account is the server tier's own credential, so it lives inside
// server/ next to the code that uses it (see server/.env.example).
//
// Resolved relative to this module rather than process.cwd(): every npm script
// runs from server/, but `npx tsx server/src/scripts/seed.ts` from the project
// root does not, and a cwd-relative path silently fails in that case.
const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const serviceAccountPath = path.resolve(moduleDir, '..', '..', 'service-account.json');

if (!fs.existsSync(serviceAccountPath)) {
  throw new Error(
    `Service account key not found at ${serviceAccountPath}. ` +
    'Place service-account.json in the server/ folder (see server/.env.example).',
  );
}

const app = !getApps().length
  ? initializeApp({
      credential: cert(serviceAccountPath),
    })
  : getApp();

export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
