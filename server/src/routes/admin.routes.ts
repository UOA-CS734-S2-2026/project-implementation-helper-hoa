import { NextFunction, Request, Response, Router } from 'express';

import { AuthRequest, requireAuth, requireRole } from '../middlewares/auth';
import { InventoryService } from '../services/inventory.service';
import { HelperHoaStore } from '../store';
import { NewProduct, NewUser, NewVendor, User } from '../types';

const roles = ['admin', 'manager', 'cashier'] as const;

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Request body must be a JSON object');
  }
  return value as Record<string, unknown>;
}

function text(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${field} is required`);
  }
  return value.trim();
}

function validateProduct(value: unknown): NewProduct {
  const body = record(value);
  const status = body.status ?? 'active';
  if (status !== 'active' && status !== 'discontinued' && status !== 'out_of_stock') {
    throw new Error('Product status is invalid');
  }
  const sellingPrice = Number(body.sellingPrice);
  const costPrice = Number(body.costPrice);
  if (!Number.isFinite(sellingPrice) || sellingPrice < 0 || !Number.isFinite(costPrice) || costPrice < 0) {
    throw new Error('Product prices must be non-negative numbers');
  }
  return {
    sku: text(body.sku, 'SKU').toUpperCase(),
    barcode: typeof body.barcode === 'string' ? body.barcode.trim() || null : null,
    name: text(body.name, 'Product name'),
    category: typeof body.category === 'string' ? body.category.trim() : '',
    description: typeof body.description === 'string' ? body.description.trim() : '',
    images: Array.isArray(body.images) ? body.images.filter((image): image is string => typeof image === 'string') : [],
    costPrice,
    sellingPrice,
    taxRate: Number(body.taxRate ?? 0),
    reorderPoint: Number(body.reorderPoint ?? 0),
    unitOfMeasure: typeof body.unitOfMeasure === 'string' ? body.unitOfMeasure.trim() : 'unit',
    tags: Array.isArray(body.tags) ? body.tags.filter((tag): tag is string => typeof tag === 'string') : [],
    status,
  };
}

export function createAdminRoutes(store: HelperHoaStore, inventory: InventoryService): Router {
  const router = Router();
  router.use(requireAuth, requireRole(['admin'], store));

  router.get('/dashboard', async (_request, response, next) => {
    try {
      const [products, users, vendors, sales] = await Promise.all([
        store.products(), store.users(), store.vendors(), store.sales(),
      ]);
      response.json({
        productCount: products.length,
        userCount: users.length,
        vendorCount: vendors.length,
        salesCount: sales.length,
        revenue: Number(sales.reduce((sum, sale) => sum + sale.totalPrice, 0).toFixed(2)),
        lowStockCount: products.filter((product) => product.totalStock <= product.reorderPoint).length,
      });
    } catch (error) { next(error); }
  });

  router.get('/products', async (_request, response, next) => {
    try { response.json(await store.products()); } catch (error) { next(error); }
  });
  router.post('/products', async (request, response, next) => {
    try { response.status(201).json(await inventory.createNewProduct(validateProduct(request.body))); } catch (error) { next(error); }
  });
  router.patch('/products/:id', async (request, response, next) => {
    try {
      const body = record(request.body);
      const changes: Partial<NewProduct> = {};
      const allowed = ['sku', 'barcode', 'name', 'category', 'description', 'images', 'costPrice', 'sellingPrice', 'taxRate', 'reorderPoint', 'unitOfMeasure', 'tags', 'status'] as const;
      for (const key of allowed) if (key in body) (changes as Record<string, unknown>)[key] = body[key];
      response.json(await inventory.updateProduct(request.params.id, changes));
    } catch (error) { next(error); }
  });
  router.delete('/products/:id', async (request, response, next) => {
    try { await inventory.deleteProduct(request.params.id); response.status(204).end(); } catch (error) { next(error); }
  });

  router.get('/users', async (_request, response, next) => {
    try { response.json(await store.users()); } catch (error) { next(error); }
  });
  router.post('/users', async (request, response, next) => {
    try {
      const body = record(request.body);
      const role = body.role;
      if (!roles.includes(role as (typeof roles)[number])) throw new Error('User role is invalid');
      const password = text(body.password, 'Temporary password');
      if (password.length < 8) throw new Error('Temporary password must contain at least 8 characters');
      const user: NewUser = {
        name: text(body.name, 'First name'),
        lastName: text(body.lastName, 'Last name'),
        email: text(body.email, 'Email').toLowerCase(),
        phone: typeof body.phone === 'string' ? body.phone.trim() : '',
        role: role as User['role'],
        password,
      };
      response.status(201).json(await store.createUser(user));
    } catch (error) { next(error); }
  });
  router.patch('/users/:id', async (request, response, next) => {
    try {
      const body = record(request.body);
      const changes: Partial<User> = {};
      if (body.name !== undefined) changes.name = text(body.name, 'First name');
      if (body.lastName !== undefined) changes.lastName = text(body.lastName, 'Last name');
      if (body.email !== undefined) changes.email = text(body.email, 'Email').toLowerCase();
      if (body.phone !== undefined) changes.phone = String(body.phone).trim();
      if (body.role !== undefined) {
        if (!roles.includes(body.role as (typeof roles)[number])) throw new Error('User role is invalid');
        changes.role = body.role as User['role'];
      }
      response.json(await store.updateUser(request.params.id, changes));
    } catch (error) { next(error); }
  });
  router.delete('/users/:id', async (request: AuthRequest, response, next) => {
    try {
      const id = Array.isArray(request.params.id) ? request.params.id[0] : request.params.id;
      if (request.user?.uid === id) throw new Error('You cannot delete your own admin account');
      await store.deleteUser(id);
      response.status(204).end();
    } catch (error) { next(error); }
  });

  router.get('/vendors', async (_request, response, next) => {
    try { response.json(await store.vendors()); } catch (error) { next(error); }
  });
  router.post('/vendors', async (request, response, next) => {
    try {
      const body = record(request.body);
      const vendor: NewVendor = {
        name: text(body.name, 'Vendor name'),
        email: typeof body.email === 'string' ? body.email.trim() || null : null,
        phone: typeof body.phone === 'string' ? body.phone.trim() || null : null,
        address: typeof body.address === 'string' ? body.address.trim() || null : null,
      };
      response.status(201).json(await store.createVendor(vendor));
    } catch (error) { next(error); }
  });
  router.patch('/vendors/:id', async (request, response, next) => {
    try {
      const body = record(request.body);
      const changes: Partial<NewVendor> = {};
      if (body.name !== undefined) changes.name = text(body.name, 'Vendor name');
      if (body.email !== undefined) changes.email = String(body.email).trim() || null;
      if (body.phone !== undefined) changes.phone = String(body.phone).trim() || null;
      if (body.address !== undefined) changes.address = String(body.address).trim() || null;
      response.json(await store.updateVendor(request.params.id, changes));
    } catch (error) { next(error); }
  });
  router.delete('/vendors/:id', async (request, response, next) => {
    try {
      const products = await store.products();
      if (products.some((product) => product.batches.some((batch) => batch.vendorId === request.params.id))) {
        throw new Error('Cannot delete a vendor referenced by product stock batches');
      }
      await store.deleteVendor(request.params.id);
      response.status(204).end();
    } catch (error) { next(error); }
  });

  router.get('/sales', async (_request, response, next) => {
    try { response.json(await store.sales()); } catch (error) { next(error); }
  });
  router.post('/sales', async (request: AuthRequest, response, next) => {
    try {
      const body = record(request.body);
      const sku = text(body.sku, 'SKU');
      const sale = await inventory.createSale({
        sku,
        quantity: Number(body.quantity),
        unitPrice: Number(body.unitPrice),
        paymentMethod: typeof body.paymentMethod === 'string' ? body.paymentMethod : 'cash',
        soldBy: request.user?.uid ?? 'unknown',
      });
      response.status(201).json(sale);
    } catch (error) { next(error); }
  });

  return router;
}