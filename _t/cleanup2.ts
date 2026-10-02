import { db } from '../src/config/firebase';
async function main() {
  const snap = await db.collection('products').get();
  const junk = ['Fix Check Widget', 'Second Check Widget', 'RBAC Widget'];
  for (const d of snap.docs) {
    if (junk.includes(d.data().name)) {
      await d.ref.delete();
      console.log('del prod', d.id);
    }
  }
  const inv = await db.collection('invoices').get();
  for (const d of inv.docs) {
    if (d.data().invoiceNumber === 'INV-FIX-100') {
      await d.ref.delete();
      console.log('del inv', d.id);
    }
  }
}
main();
