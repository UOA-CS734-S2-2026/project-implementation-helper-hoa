import { initializeApp, getApps, getApp, cert, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// The service account is the server tier's own credential. It can be provided in
// three ways (in order of preference):
// 1. GOOGLE_APPLICATION_CREDENTIALS env var pointing to a JSON key file
// 2. Application Default Credentials (Cloud Run, GCP metadata service)
// 3. Local file at server/service-account.json (for local development)
//
// Resolved relative to this module rather than process.cwd(): every npm script
// runs from server/, but `npx tsx server/src/scripts/seed.ts` from the project
// root does not, and a cwd-relative path silently fails in that case.
const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const serviceAccountPath = path.resolve(moduleDir, '..', '..', 'service-account.json');

let credential;
if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  credential = cert(process.env.GOOGLE_APPLICATION_CREDENTIALS);
} else if (fs.existsSync(serviceAccountPath)) {
  credential = cert(serviceAccountPath);
} else {
  credential = applicationDefault();
}

const app = !getApps().length
  ? initializeApp({
      credential,
    })
  : getApp();

export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
