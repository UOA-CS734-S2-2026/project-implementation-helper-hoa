import { initializeApp, getApps, getApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// The service account is the server tier's own credential. Two sources, in
// order of preference:
//
// 1. GOOGLE_APPLICATION_CREDENTIALS, which Render populates from a Secret File
//    mounted at /etc/secrets/service-account.json.
// 2. server/service-account.json, for local development.
//
// Resolved relative to this module rather than process.cwd(): every npm script
// runs from server/, but `npx tsx server/src/scripts/seed.ts` from the project
// root does not, and a cwd-relative path silently fails in that case.
const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const localServiceAccountPath = path.resolve(moduleDir, '..', '..', 'service-account.json');

// One path, resolved once, so that reading project_id below and initialising
// the app below cannot disagree about which credential file is in use.
const credentialPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || localServiceAccountPath;

if (!fs.existsSync(credentialPath)) {
  throw new Error(
    `Service account key not found at ${credentialPath}. ` +
    'Locally, place service-account.json in the server/ folder (see ' +
    'server/.env.example). On Render, add it as a Secret File named ' +
    'service-account.json, which mounts at /etc/secrets/service-account.json.',
  );
}

// push.routes.ts compares a device's reported projectId against this, to reject
// a phone registered against a different Firebase project.
const serviceAccount: { project_id?: unknown } = JSON.parse(fs.readFileSync(credentialPath, 'utf8'));
if (typeof serviceAccount.project_id !== 'string' || !serviceAccount.project_id) {
  throw new Error('The Firebase service account must contain a project_id.');
}
export const firebaseProjectId = serviceAccount.project_id;

const app = !getApps().length
  ? initializeApp({
      credential: cert(credentialPath),
      projectId: firebaseProjectId,
    })
  : getApp();

export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
