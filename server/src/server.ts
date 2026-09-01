import express from 'express';
import cors from 'cors';
import { initializeApp, credential } from 'firebase-admin/app';
import { createProductRoutes } from './routes/products.routes';
import { FirebaseHoaStore } from './store/store-firestore';
import 'dotenv/config';

initializeApp({
  credential: credential.applicationDefault(), 
});

const app = express();
const port = process.env.PORT || 3000;
const store = new FirebaseHoaStore();

app.use(cors());
app.use(express.json());

// This maps all routes in createProductRoutes to start with /products
app.use('/products', createProductRoutes(store));

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Server Error:', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});