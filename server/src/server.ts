import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createProductRoutes } from './routes/products.routes';
import { FirebaseHoaStore } from './store/store-firestore';
import { globalErrorHandler } from './middlewares/errorHandler';
import { InventoryService } from './services/inventory.service';
import { createInvoiceRoutes } from './routes/invoices.routes';
import { InvoiceService } from './services/invoice.service';  
import { UserService } from './services/user.service';
import { createUserRoutes } from './routes/user.routes';
const app = express();
const port = process.env.PORT || 3000;

const store = new FirebaseHoaStore();
const inventoryService = new InventoryService(store);
const invoiceService = new InvoiceService(store);
const userService = new UserService(store);
app.use(cors());
app.use(express.json());

// This maps all routes in createProductRoutes to start with /products
app.use('/products', createProductRoutes(inventoryService, store));
app.use('/invoices', createInvoiceRoutes(invoiceService, store));
app.use('/users', createUserRoutes(userService, store));

app.use(globalErrorHandler);


app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});