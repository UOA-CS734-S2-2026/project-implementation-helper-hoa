import '../src/config/env';
import { auth } from '../src/config/firebase';

async function main() {
  for (const email of ['admin@example.com', 'manager@example.com', 'cashier@example.com']) {
    try {
      const u = await auth.getUserByEmail(email);
      console.log(`EXISTS ${email} uid=${u.uid}`);
    } catch (e) {
      console.log(`MISSING ${email}`);
    }
  }
}
main();
