export type Product = {
  id: string;
  sku: string;
  barcode: string | null;
  name: string;
  category: string;
  description: string;
  images: string[] | null;
  costPrice: number;
  sellingPrice: number;
  taxRate: number;
  totalStock: number;
  reorderPoint: number;
  unitOfMeasure: string;
  totalSold: number;
  salesVelocity: number;
  tags: string[];
  status: 'active' | 'discontinued' | 'out_of_stock';
  batches: { batchNumber: string; quantity: number; vendorId: string }[];
};

export type StaffUser = {
  id: string;
  name: string;
  lastName: string;
  role: 'admin' | 'manager' | 'cashier';
  email: string;
  phone: string;
};

export type Vendor = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
};

export type Sale = {
  id: string;
  productId: string;
  sku: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  paymentMethod: string;
  soldBy: string;
  soldAt: string;
};

export type DashboardSummary = {
  productCount: number;
  userCount: number;
  vendorCount: number;
  salesCount: number;
  revenue: number;
  lowStockCount: number;
};

export type AdminData = {
  summary: DashboardSummary;
  products: Product[];
  users: StaffUser[];
  vendors: Vendor[];
  sales: Sale[];
};