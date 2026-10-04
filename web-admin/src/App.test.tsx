import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AdminData } from './types';

const mocks = vi.hoisted(() => ({
  login: vi.fn(),
  logout: vi.fn(),
  loadAdminData: vi.fn(),
  productBySku: vi.fn(),
  createProduct: vi.fn(),
  updateProduct: vi.fn(),
  deleteProduct: vi.fn(),
  createUser: vi.fn(),
  updateUser: vi.fn(),
  deleteUser: vi.fn(),
  createVendor: vi.fn(),
  updateVendor: vi.fn(),
  deleteVendor: vi.fn(),
  createSale: vi.fn(),
}));

vi.mock('./api', () => ({ api: mocks }));

import App from './App';

const data: AdminData = {
  summary: {
    productCount: 1,
    userCount: 1,
    vendorCount: 1,
    salesCount: 1,
    revenue: 24,
    lowStockCount: 0,
  },
  products: [{
    id: 'product-1',
    sku: 'COFFEE',
    barcode: null,
    name: 'Coffee beans',
    category: 'Food',
    description: '',
    images: [],
    costPrice: 5,
    sellingPrice: 8,
    taxRate: 15,
    totalStock: 2,
    reorderPoint: 4,
    unitOfMeasure: 'bags',
    totalSold: 3,
    salesVelocity: 0,
    tags: [],
    status: 'active',
    batches: [],
  }],
  users: [],
  vendors: [],
  sales: [],
};

describe('admin console', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.login.mockResolvedValue(undefined);
    mocks.logout.mockResolvedValue(undefined);
    mocks.loadAdminData.mockResolvedValue(data);
  });

  it('signs in and displays dashboard data', async () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Sign in with admin token' }));

    expect(await screen.findByRole('heading', { name: 'Overview' })).toBeInTheDocument();
    expect(screen.getByText('Coffee beans')).toBeInTheDocument();
    expect(mocks.login).toHaveBeenCalledOnce();
    expect(mocks.loadAdminData).toHaveBeenCalledOnce();
  });

  it('surfaces login failures without entering the console', async () => {
    mocks.login.mockRejectedValueOnce(new Error('Admin token was rejected'));
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Sign in with admin token' }));

    expect(await screen.findByText('Admin token was rejected')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Overview' })).not.toBeInTheDocument();
  });

  it('filters products and signs out', async () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Sign in with admin token' }));
    await screen.findByRole('heading', { name: 'Overview' });

    fireEvent.click(screen.getByRole('button', { name: 'Products' }));
    expect(await screen.findByRole('heading', { name: 'Products' })).toBeInTheDocument();
    expect(screen.getByText('Coffee beans')).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText('Search name, SKU or category'), {
      target: { value: 'missing' },
    });
    expect(screen.queryByText('Coffee beans')).not.toBeInTheDocument();
    expect(screen.getByText('No matching products')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
    });
    expect(mocks.logout).toHaveBeenCalledOnce();
  });
});
