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

const serviceAccount: { project_id?: unknown } = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
if (typeof serviceAccount.project_id !== 'string' || !serviceAccount.project_id) {
  throw new Error('The Firebase service account must contain a project_id.');
}
export const firebaseProjectId = serviceAccount.project_id;

const app = !getApps().length
  ? initializeApp({
      credential: cert(serviceAccountPath),
      projectId: firebaseProjectId,
    })
  : getApp();

export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
