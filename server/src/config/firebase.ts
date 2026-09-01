import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';


const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

if (!keyPath) {
  console.error('No GOOGLE_APPLICATION_CREDENTIALS set.');
  console.error('Copy server/.env.example to server/.env and point it at your');
  console.error('service account key. See the README for how to download one.');
  process.exit(1);
}

const app = initializeApp({ credential: applicationDefault() });

export const db = getFirestore(app);
export const messaging = getMessaging(app);
export const projectId: string = JSON.parse(readFileSync(keyPath, 'utf8')).project_id;
