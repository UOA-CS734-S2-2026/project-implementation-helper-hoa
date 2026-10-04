import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from './api';

describe('admin API client', () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('loads the dashboard resources together', async () => {
    fetchMock
      .mockResolvedValueOnce(Response.json({ productCount: 2 }))
      .mockResolvedValueOnce(Response.json([{ id: 'product-1' }]))
      .mockResolvedValueOnce(Response.json([{ id: 'user-1' }]))
      .mockResolvedValueOnce(Response.json([{ id: 'vendor-1' }]))
      .mockResolvedValueOnce(Response.json([{ id: 'sale-1' }]));

    const result = await api.loadAdminData();

    expect(result).toEqual({
      summary: { productCount: 2 },
      products: [{ id: 'product-1' }],
      users: [{ id: 'user-1' }],
      vendors: [{ id: 'vendor-1' }],
      sales: [{ id: 'sale-1' }],
    });
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      '/admin/dashboard',
      '/admin/products',
      '/admin/users',
      '/admin/vendors',
      '/admin/sales',
    ]);
  });

  it('URL-encodes product SKUs', async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ id: 'product-1' }));

    await api.productBySku('coffee beans/250g');

    expect(fetchMock).toHaveBeenCalledWith(
      '/products/sku/coffee%20beans%2F250g',
      expect.objectContaining({
        headers: { 'Content-Type': 'application/json' },
      }),
    );
  });

  it('uses the server message for non-success responses', async () => {
    fetchMock.mockResolvedValueOnce(Response.json(
      { error: 'SKU already exists' },
      { status: 409 },
    ));

    await expect(api.createProduct({ sku: 'COFFEE' }))
      .rejects.toThrow('SKU already exists');
    expect(fetchMock).toHaveBeenCalledWith(
      '/admin/products',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ sku: 'COFFEE' }),
      }),
    );
  });

  it('handles empty success responses and non-JSON failures', async () => {
    fetchMock
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(new Response('Unavailable', { status: 503 }));

    await expect(api.deleteProduct('product-1')).resolves.toBeUndefined();
    await expect(api.productBySku('COFFEE')).rejects.toThrow('Request failed (503)');
  });
});
