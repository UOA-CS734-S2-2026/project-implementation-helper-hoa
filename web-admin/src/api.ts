import type { AdminData, Product, Sale, StaffUser, Vendor } from './types';

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init.headers,
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as { error?: string; message?: string };
    throw new Error(body.error || body.message || `Request failed (${response.status})`);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const api = {
  async logout(): Promise<void> {
    await fetch('/__admin/logout', { method: 'POST' });
  },
  async login(): Promise<void> {
    const response = await fetch('/__admin/login', { method: 'POST' });
    if (!response.ok) {
      const body = await response.json().catch(() => ({})) as { error?: string };
      throw new Error(body.error || `Sign-in failed (${response.status})`);
    }
  },
  async loadAdminData(): Promise<AdminData> {
    const [summary, products, users, vendors, sales] = await Promise.all([
      request<AdminData['summary']>('/admin/dashboard'),
      request<Product[]>('/admin/products'),
      request<StaffUser[]>('/admin/users'),
      request<Vendor[]>('/admin/vendors'),
      request<Sale[]>('/admin/sales'),
    ]);
    return { summary, products, users, vendors, sales };
  },
  productBySku: (sku: string) => request<Product>(`/products/sku/${encodeURIComponent(sku)}`),
  createProduct: (body: Record<string, unknown>) => request<Product>('/admin/products', { method: 'POST', body: JSON.stringify(body) }),
  updateProduct: (id: string, body: Record<string, unknown>) => request<Product>(`/admin/products/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteProduct: (id: string) => request<void>(`/admin/products/${id}`, { method: 'DELETE' }),
  createUser: (body: Record<string, unknown>) => request<StaffUser>('/admin/users', { method: 'POST', body: JSON.stringify(body) }),
  updateUser: (id: string, body: Record<string, unknown>) => request<StaffUser>(`/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteUser: (id: string) => request<void>(`/admin/users/${id}`, { method: 'DELETE' }),
  createVendor: (body: Record<string, unknown>) => request<Vendor>('/admin/vendors', { method: 'POST', body: JSON.stringify(body) }),
  updateVendor: (id: string, body: Record<string, unknown>) => request<Vendor>(`/admin/vendors/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteVendor: (id: string) => request<void>(`/admin/vendors/${id}`, { method: 'DELETE' }),
  createSale: (body: Record<string, unknown>) => request<Sale>('/admin/sales', { method: 'POST', body: JSON.stringify(body) }),
};