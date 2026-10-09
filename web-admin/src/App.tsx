import { lazy, Suspense, useEffect, useState, type FormEvent, type ReactNode } from 'react';
import {
  AlertTriangle, ArrowDownRight, ArrowUpRight, Barcode, Boxes, Building2,
  Camera, Check, ChevronDown, CircleDollarSign, ClipboardList, LayoutDashboard,
  LoaderCircle, LogOut, PackagePlus, Pencil, Plus, RefreshCw, Search, ShieldCheck,
  Trash2, Users, X,
} from 'lucide-react';
import { api, setUnauthorizedHandler } from './api';
import type { AdminData, Product, Sale, StaffUser, Vendor } from './types';
import './admin.css';
import logoUrl from '../../assets/team-image.jpg';

const ScannerDialog = lazy(() => import('./ScannerDialog'));

type Page = 'overview' | 'products' | 'users' | 'vendors' | 'sell' | 'sales';
type Entity = 'product' | 'user' | 'vendor';
type DialogState = { entity: Entity; item?: Product | StaffUser | Vendor } | null;

const emptyData: AdminData = {
  summary: { productCount: 0, userCount: 0, vendorCount: 0, salesCount: 0, revenue: 0, lowStockCount: 0 },
  products: [], users: [], vendors: [], sales: [],
};

const navigation = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'products', label: 'Products', icon: Boxes },
  { id: 'users', label: 'Staff users', icon: Users },
  { id: 'vendors', label: 'Vendors', icon: Building2 },
  { id: 'sell', label: 'New sale', icon: CircleDollarSign },
  { id: 'sales', label: 'Sales history', icon: ClipboardList },
] as const;

function money(value: number) {
  return new Intl.NumberFormat('en-NZ', { style: 'currency', currency: 'NZD' }).format(value || 0);
}

function App() {
  const [identity, setIdentity] = useState<string | null>(null);
  const [page, setPage] = useState<Page>('overview');
  const [data, setData] = useState<AdminData>(emptyData);
  const [dataLoading, setDataLoading] = useState(false);
  const [dialog, setDialog] = useState<DialogState>(null);
  const [notice, setNotice] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setIdentity(null);
      setData(emptyData);
      setNotice({ kind: 'error', text: 'Your session has expired. Please sign in again.' });
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  async function refreshData() {
    setDataLoading(true);
    try {
      setData(await api.loadAdminData());
      setNotice(null);
    } catch (error) {
      setNotice({ kind: 'error', text: error instanceof Error ? error.message : 'Could not load admin data.' });
    } finally {
      setDataLoading(false);
    }
  }

  async function handleLogin() {
    try {
      setNotice(null);
      await api.login();
      setIdentity('Token-authenticated admin');
      await refreshData();
    } catch (error) {
      setNotice({ kind: 'error', text: error instanceof Error ? error.message : 'Sign-in failed.' });
    }
  }

  async function handleSignOut() {
    await api.logout();
    setIdentity(null);
    setData(emptyData);
  }

  async function saveEntity(entity: Entity, item: Product | StaffUser | Vendor | undefined, values: Record<string, unknown>) {
    try {
      if (entity === 'product') {
        if (item) await api.updateProduct(item.id, values);
        else await api.createProduct(values);
      } else if (entity === 'user') {
        if (item) await api.updateUser(item.id, values);
        else await api.createUser(values);
      } else if (entity === 'vendor') {
        if (item) await api.updateVendor(item.id, values);
        else await api.createVendor(values);
      }
      setDialog(null);
      setNotice({ kind: 'success', text: `${entity === 'user' ? 'Staff user' : entity[0].toUpperCase() + entity.slice(1)} ${item ? 'updated' : 'added'}.` });
      await refreshData();
    } catch (error) {
      setNotice({ kind: 'error', text: error instanceof Error ? error.message : 'Could not save changes.' });
    }
  }

  async function deleteEntity(entity: Entity, id: string) {
    if (!window.confirm(`Delete this ${entity}? This action cannot be undone.`)) return;
    try {
      if (entity === 'product') await api.deleteProduct(id);
      if (entity === 'user') await api.deleteUser(id);
      if (entity === 'vendor') await api.deleteVendor(id);
      setNotice({ kind: 'success', text: `${entity[0].toUpperCase() + entity.slice(1)} deleted.` });
      await refreshData();
    } catch (error) {
      setNotice({ kind: 'error', text: error instanceof Error ? error.message : 'Could not delete record.' });
    }
  }

  async function completeSale(values: Record<string, unknown>) {
    try {
      const sale = await api.createSale(values);
      setNotice({ kind: 'success', text: `Sale recorded: ${sale.quantity} x ${sale.productName} for ${money(sale.totalPrice)}.` });
      await refreshData();
      return true;
    } catch (error) {
      setNotice({ kind: 'error', text: error instanceof Error ? error.message : 'Sale could not be recorded.' });
      return false;
    }
  }

  if (!identity) return <LoginPage onSubmit={handleLogin} notice={notice} />;

  const titles: Record<Page, string> = {
    overview: 'Overview', products: 'Products', users: 'Staff users', vendors: 'Vendors', sell: 'New sale', sales: 'Sales history',
  };
  const filteredProducts = data.products.filter((product) => `${product.name} ${product.sku} ${product.category}`.toLowerCase().includes(search.toLowerCase()));
  const filteredUsers = data.users.filter((user) => `${user.name} ${user.lastName} ${user.email} ${user.role}`.toLowerCase().includes(search.toLowerCase()));
  const filteredVendors = data.vendors.filter((vendor) => `${vendor.name} ${vendor.email ?? ''} ${vendor.phone ?? ''}`.toLowerCase().includes(search.toLowerCase()));
  const filteredSales = data.sales.filter((sale) => `${sale.sku} ${sale.productName}`.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#overview" onClick={() => setPage('overview')}>
          <img className="brand-logo" src={logoUrl} alt="Helper Hoa logo" />
          <span><strong>Helper Hoa</strong><small>ADMIN CONSOLE</small></span>
        </a>
        <div className="side-label">Workspace</div>
        <nav className="side-nav" aria-label="Admin sections">
          {navigation.map(({ id, label, icon: Icon }) => (
            <button key={id} className={`nav-item ${page === id ? 'active' : ''}`} onClick={() => { setPage(id); setSearch(''); }}>
              <Icon size={18} strokeWidth={1.8} /><span>{label}</span>
              {id === 'products' && data.summary.lowStockCount > 0 && <b className="nav-count">{data.summary.lowStockCount}</b>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="secure-note"><ShieldCheck size={17} /><span>Signed in securely<br /><small>Admin access</small></span></div>
          <button className="nav-item signout" onClick={() => void handleSignOut()}><LogOut size={18} /><span>Sign out</span></button>
        </div>
      </aside>

      <main className="main-panel">
        <header className="topbar">
          <div className="breadcrumbs">Helper Hoa <span>/</span> <strong>{titles[page]}</strong></div>
          <div className="top-actions">
            <button className="icon-button" title="Refresh data" aria-label="Refresh data" onClick={() => void refreshData()} disabled={dataLoading}><RefreshCw size={17} className={dataLoading ? 'spin' : ''} /></button>
            <span className="avatar">A</span>
            <span className="user-email">{identity}</span>
            <ChevronDown size={15} className="muted-icon" />
          </div>
        </header>

        <div className="page-wrap">
          <div className="page-heading">
            <div><p className="eyebrow">STORE OPERATIONS</p><h1>{titles[page]}</h1></div>
            {['products', 'users', 'vendors'].includes(page) && (
              <button className="primary-button" onClick={() => setDialog({ entity: page === 'products' ? 'product' : page === 'users' ? 'user' : 'vendor' })}><Plus size={17} /> Add {page === 'users' ? 'user' : page.slice(0, -1)}</button>
            )}
            {page === 'sell' && <div className="session-chip"><span className="live-dot" />Register open</div>}
          </div>

          {notice && <div className={`notice ${notice.kind}`} role="status"><span>{notice.text}</span><button className="notice-close" aria-label="Dismiss message" onClick={() => setNotice(null)}><X size={16} /></button></div>}

          {page === 'overview' && <Overview data={data} loading={dataLoading} onNavigate={setPage} />}
          {page === 'products' && <ProductsPage products={filteredProducts} search={search} setSearch={setSearch} onEdit={(item) => setDialog({ entity: 'product', item })} onDelete={(id) => void deleteEntity('product', id)} />}
          {page === 'users' && <UsersPage users={filteredUsers} search={search} setSearch={setSearch} onEdit={(item) => setDialog({ entity: 'user', item })} onDelete={(id) => void deleteEntity('user', id)} />}
          {page === 'vendors' && <VendorsPage vendors={filteredVendors} search={search} setSearch={setSearch} onEdit={(item) => setDialog({ entity: 'vendor', item })} onDelete={(id) => void deleteEntity('vendor', id)} />}
          {page === 'sell' && <SellPage products={data.products} onComplete={completeSale} />}
          {page === 'sales' && <SalesPage sales={filteredSales} search={search} setSearch={setSearch} />}
        </div>
      </main>

      {dialog && <EntityDialog key={`${dialog.entity}-${dialog.item?.id ?? 'new'}`} entity={dialog.entity} item={dialog.item} vendors={data.vendors} onClose={() => setDialog(null)} onSave={(values) => void saveEntity(dialog.entity, dialog.item, values)} />}
    </div>
  );
}

function LoginPage({ onSubmit, notice }: { onSubmit: () => Promise<void>; notice: { kind: 'success' | 'error'; text: string } | null }) {
  return (
    <main className="login-page">
      <div className="login-art"><div className="login-art-top"><img className="brand-logo" src={logoUrl} alt="Helper Hoa logo" /><span>HELPER HOA</span></div><div className="login-art-copy"><p>STORE OPERATIONS</p><h1>Good stock.<br />Clear decisions.</h1><span>One workspace for products, people, suppliers and sales.</span></div><div className="login-art-foot">INVENTORY MANAGEMENT <i /> ADMINISTRATION</div></div>
      <section className="login-side">
        <form className="login-form" onSubmit={(event) => { event.preventDefault(); void onSubmit(); }}>
          <div className="login-mobile-brand"><img className="brand-logo" src={logoUrl} alt="Helper Hoa logo" /> Helper Hoa</div>
          <p className="eyebrow">ADMINISTRATOR ACCESS</p><h2>Welcome back</h2><p className="login-sub">Sign in with the configured static admin token.</p>
          {notice && <div className="notice error">{notice.text}</div>}
          <div className="token-login-note"><ShieldCheck size={18} /><span>The browser never receives the token. The local Vite server reads it from <code>root/.env</code> and validates admin access with the API.</span></div>
          <button className="primary-button login-submit" type="submit">Sign in with admin token <ArrowUpRight size={17} /></button>
          <p className="login-security"><ShieldCheck size={15} /> Token verified by Firebase Admin</p>
        </form>
      </section>
    </main>
  );
}

function Overview({ data, loading, onNavigate }: { data: AdminData; loading: boolean; onNavigate: (page: Page) => void }) {
  const stats = [
    { label: 'Products', value: data.summary.productCount, icon: Boxes, tone: 'green', link: 'products' as Page },
    { label: 'Low stock', value: data.summary.lowStockCount, icon: AlertTriangle, tone: 'amber', link: 'products' as Page },
    { label: 'Sales recorded', value: data.summary.salesCount, icon: ClipboardList, tone: 'blue', link: 'sales' as Page },
    { label: 'Recorded revenue', value: money(data.summary.revenue), icon: CircleDollarSign, tone: 'coral', link: 'sales' as Page },
  ];
  return <>
    <section className="welcome-band"><div><p>STORE SNAPSHOT</p><h2>Good work starts with a clear picture.</h2><span>Current inventory and recent register activity.</span></div><button className="band-action" onClick={() => onNavigate('sell')}><CircleDollarSign size={17} /> Start a sale</button></section>
    <section className="stat-grid" aria-label="Store summary">
      {stats.map(({ label, value, icon: Icon, tone, link }) => <button key={label} className="stat-card" onClick={() => onNavigate(link)}><span className={`stat-icon ${tone}`}><Icon size={19} /></span><span className="stat-label">{label}</span><strong>{loading ? '—' : value}</strong><span className="stat-foot">Open details <ArrowUpRight size={13} /></span></button>)}
    </section>
    <div className="overview-grid">
      <section className="panel"><div className="panel-head"><div><p className="eyebrow">ATTENTION NEEDED</p><h2>Low stock</h2></div><button className="text-button" onClick={() => onNavigate('products')}>All products <ArrowUpRight size={14} /></button></div>
        {data.products.filter((product) => product.totalStock <= product.reorderPoint).slice(0, 5).length === 0 ? <EmptyState icon={Check} title="Stock levels look good" body="Products below their reorder point will show up here." /> : <div className="compact-list">{data.products.filter((product) => product.totalStock <= product.reorderPoint).slice(0, 5).map((product) => <div className="compact-row" key={product.id}><span className="product-glyph"><Boxes size={17} /></span><span className="compact-main"><strong>{product.name}</strong><small>{product.sku}</small></span><span className="stock-pill">{product.totalStock} {product.unitOfMeasure} left</span></div>)}</div>}
      </section>
      <section className="panel"><div className="panel-head"><div><p className="eyebrow">LATEST REGISTER ACTIVITY</p><h2>Recent sales</h2></div><button className="text-button" onClick={() => onNavigate('sales')}>View history <ArrowUpRight size={14} /></button></div>
        {data.sales.length === 0 ? <EmptyState icon={CircleDollarSign} title="No sales yet" body="Completed sales will appear in this register feed." action={<button className="text-button" onClick={() => onNavigate('sell')}>Record first sale <ArrowUpRight size={14} /></button>} /> : <div className="compact-list">{data.sales.slice(0, 5).map((sale) => <div className="compact-row" key={sale.id}><span className="sale-glyph"><ArrowDownRight size={17} /></span><span className="compact-main"><strong>{sale.productName}</strong><small>{sale.quantity} × {money(sale.unitPrice)} · {new Date(sale.soldAt).toLocaleString()}</small></span><strong className="sale-value">{money(sale.totalPrice)}</strong></div>)}</div>}
      </section>
    </div>
    <div className="quick-links"><span>Quick actions</span><button onClick={() => onNavigate('products')}><Plus size={16} /> Add product</button><button onClick={() => onNavigate('users')}><Users size={16} /> Manage staff</button><button onClick={() => onNavigate('vendors')}><Building2 size={16} /> Add vendor</button></div>
  </>;
}

function ProductsPage({ products, search, setSearch, onEdit, onDelete }: { products: Product[]; search: string; setSearch: (value: string) => void; onEdit: (item: Product) => void; onDelete: (id: string) => void }) {
  return <section className="panel table-panel"><TableToolbar search={search} setSearch={setSearch} placeholder="Search name, SKU or category" count={products.length} countLabel="products" />
    {products.length === 0 ? <EmptyState icon={Boxes} title="No matching products" body="Try a different search or add a product to the catalog." /> : <div className="table-scroll"><table><thead><tr><th>Product</th><th>SKU</th><th>Category</th><th>Unit price</th><th>In stock</th><th>Status</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{products.map((product) => <tr key={product.id}><td><span className="table-primary">{product.name}</span><small className="table-secondary">{product.description}</small></td><td><code>{product.sku}</code></td><td>{product.category || '—'}</td><td>{money(product.sellingPrice)}</td><td><span className={product.totalStock <= product.reorderPoint ? 'stock-low' : ''}>{product.totalStock} {product.unitOfMeasure}</span></td><td><StatusPill value={product.status} /></td><td><RowActions onEdit={() => onEdit(product)} onDelete={() => onDelete(product.id)} /></td></tr>)}</tbody></table></div>}
  </section>;
}

function UsersPage({ users, search, setSearch, onEdit, onDelete }: { users: StaffUser[]; search: string; setSearch: (value: string) => void; onEdit: (item: StaffUser) => void; onDelete: (id: string) => void }) {
  return <section className="panel table-panel"><TableToolbar search={search} setSearch={setSearch} placeholder="Search staff name, email or role" count={users.length} countLabel="users" />
    {users.length === 0 ? <EmptyState icon={Users} title="No matching users" body="Add staff accounts and assign the role they need." /> : <div className="table-scroll"><table><thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Role</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{users.map((user) => <tr key={user.id}><td><span className="table-primary">{user.name} {user.lastName}</span></td><td>{user.email}</td><td>{user.phone || '—'}</td><td><StatusPill value={user.role} /></td><td><RowActions onEdit={() => onEdit(user)} onDelete={() => onDelete(user.id)} /></td></tr>)}</tbody></table></div>}
  </section>;
}

function VendorsPage({ vendors, search, setSearch, onEdit, onDelete }: { vendors: Vendor[]; search: string; setSearch: (value: string) => void; onEdit: (item: Vendor) => void; onDelete: (id: string) => void }) {
  return <section className="panel table-panel"><TableToolbar search={search} setSearch={setSearch} placeholder="Search vendors" count={vendors.length} countLabel="vendors" />
    {vendors.length === 0 ? <EmptyState icon={Building2} title="No matching vendors" body="Keep supplier contacts here for inventory and purchasing." /> : <div className="table-scroll"><table><thead><tr><th>Vendor</th><th>Email</th><th>Phone</th><th>Address</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{vendors.map((vendor) => <tr key={vendor.id}><td><span className="table-primary">{vendor.name}</span></td><td>{vendor.email || '—'}</td><td>{vendor.phone || '—'}</td><td className="address-cell">{vendor.address || '—'}</td><td><RowActions onEdit={() => onEdit(vendor)} onDelete={() => onDelete(vendor.id)} /></td></tr>)}</tbody></table></div>}
  </section>;
}

function SalesPage({ sales, search, setSearch }: { sales: Sale[]; search: string; setSearch: (value: string) => void }) {
  return <section className="panel table-panel"><TableToolbar search={search} setSearch={setSearch} placeholder="Search SKU or product" count={sales.length} countLabel="transactions" />
    {sales.length === 0 ? <EmptyState icon={ClipboardList} title="No matching transactions" body="Recorded sales are listed here with their SKU, amount and time." /> : <div className="table-scroll"><table><thead><tr><th>Transaction</th><th>Product / SKU</th><th>Qty</th><th>Unit price</th><th>Total</th><th>Payment</th><th>Date</th></tr></thead><tbody>{sales.map((sale) => <tr key={sale.id}><td><code>{sale.id.slice(0, 8).toUpperCase()}</code></td><td><span className="table-primary">{sale.productName}</span><small className="table-secondary">{sale.sku}</small></td><td>{sale.quantity}</td><td>{money(sale.unitPrice)}</td><td><strong>{money(sale.totalPrice)}</strong></td><td><StatusPill value={sale.paymentMethod} /></td><td>{new Date(sale.soldAt).toLocaleString()}</td></tr>)}</tbody></table></div>}
  </section>;
}

function SellPage({ products, onComplete }: { products: Product[]; onComplete: (values: Record<string, unknown>) => Promise<boolean> }) {
  const [sku, setSku] = useState('');
  const [product, setProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState('1');
  const [price, setPrice] = useState('');
  const [payment, setPayment] = useState('cash');
  const [searching, setSearching] = useState(false);
  const [scan, setScan] = useState(false);
  const [lookupError, setLookupError] = useState('');
  const total = (Number(quantity) || 0) * (Number(price) || 0);

  async function findProduct(value = sku) {
    if (!value.trim()) return;
    setSearching(true);
    setLookupError('');
    try {
      const found = await api.productBySku(value.trim());
      setProduct(found);
      setSku(found.sku);
      setPrice(String(found.sellingPrice));
    } catch (error) {
      setProduct(null);
      setLookupError(error instanceof Error ? error.message : 'Product not found.');
    } finally { setSearching(false); }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!product) return;
    const success = await onComplete({ sku: product.sku, quantity: Number(quantity), unitPrice: Number(price), paymentMethod: payment });
    if (success) {
      setSku(''); setProduct(null); setQuantity('1'); setPrice('');
    }
  }

  return <div className="sell-layout">
    <form className="panel sell-panel" onSubmit={submit}>
      <div className="panel-head"><div><p className="eyebrow">REGISTER</p><h2>Scan or find a product</h2></div><span className="register-badge">SALE</span></div>
      <div className="sku-row"><label className="form-label grow">SKU or barcode<input value={sku} onChange={(event) => setSku(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); void findProduct(); } }} placeholder="Scan or type a SKU" autoFocus /></label><button className="secondary-button find-button" type="button" onClick={() => void findProduct()} disabled={searching}>{searching ? <LoaderCircle size={17} className="spin" /> : <Search size={17} />} Find</button><button className="scan-button" type="button" title="Scan barcode with camera" aria-label="Scan barcode with camera" onClick={() => setScan(true)}><Camera size={19} /></button></div>
      {lookupError && <div className="inline-error"><AlertTriangle size={16} />{lookupError}</div>}
      {product ? <>
        <div className="sale-product"><span className="product-glyph large"><Boxes size={21} /></span><div className="sale-product-name"><strong>{product.name}</strong><span>{product.sku} <i /> {product.totalStock} {product.unitOfMeasure} available</span></div><strong>{money(product.sellingPrice)}</strong></div>
        <div className="sale-fields"><label className="form-label">Quantity<input type="number" min="1" step="1" max={product.totalStock} value={quantity} onChange={(event) => setQuantity(event.target.value)} required /></label><label className="form-label">Unit price<input type="number" min="0" step="0.01" value={price} onChange={(event) => setPrice(event.target.value)} required /></label><label className="form-label">Payment<select value={payment} onChange={(event) => setPayment(event.target.value)}><option value="cash">Cash</option><option value="card">Card</option><option value="other">Other</option></select></label></div>
        <div className="sale-total"><span>Total due</span><strong>{money(total)}</strong></div>
        <button className="primary-button complete-sale" type="submit" disabled={Number(quantity) < 1 || Number(quantity) > product.totalStock}><Check size={17} /> Complete sale</button>
      </> : <div className="sell-empty"><Barcode size={30} /><strong>Product details appear here</strong><span>Enter a SKU or use the camera scanner to look up a product.</span></div>}
    </form>
    <aside className="sell-aside"><div className="sell-aside-icon"><PackagePlus size={22} /></div><p className="eyebrow">INVENTORY SYNC</p><h3>Stock stays in step.</h3><p>Completing a sale records the transaction and updates the product quantity in the same Firestore transaction.</p><div className="mini-rule" /><span><strong>{products.length}</strong> products in catalog</span><span><strong>{products.reduce((sum, item) => sum + item.totalStock, 0)}</strong> units currently tracked</span></aside>
    {scan && <Suspense fallback={<div className="modal-backdrop"><div className="dialog">Loading camera scanner…</div></div>}><ScannerDialog onClose={() => setScan(false)} onDetected={(code) => { setScan(false); setSku(code); void findProduct(code); }} /></Suspense>}
  </div>;
}

function EntityDialog({ entity, item, vendors, onClose, onSave }: { entity: Entity; item?: Product | StaffUser | Vendor; vendors: Vendor[]; onClose: () => void; onSave: (values: Record<string, unknown>) => void }) {
  const isEdit = Boolean(item);
  const title = `${isEdit ? 'Edit' : 'Add'} ${entity === 'user' ? 'staff user' : entity}`;
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const values = Object.fromEntries(form.entries()) as Record<string, unknown>;
    if (entity === 'product') {
      for (const key of ['sellingPrice', 'costPrice', 'taxRate', 'reorderPoint', 'totalStock', 'totalSold']) values[key] = Number(values[key] ?? 0);
      values.batches = [{
        batchNumber: String(values.batchNumber ?? '').trim(),
        quantity: Number(values.totalStock ?? 0),
        vendorId: String(values.vendorId ?? '').trim(),
        invoiceNumber: String(values.invoiceNumber ?? '').trim(),
        expirationDate: String(values.expirationDate ?? '').trim() || null,
        receivedDate: String(values.receivedDate ?? '').trim() || null,
      }];
      delete values.vendorId;
      delete values.batchNumber;
      delete values.invoiceNumber;
      delete values.expirationDate;
      delete values.receivedDate;
      values.images = [];
      values.tags = [];
    }
    onSave(values);
  }
  const product = item as Product | undefined;
  const user = item as StaffUser | undefined;
  const vendor = item as Vendor | undefined;
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="dialog" role="dialog" aria-modal="true" aria-labelledby="entity-dialog-title"><div className="dialog-head"><div><p className="eyebrow">CATALOG MANAGEMENT</p><h2 id="entity-dialog-title">{title}</h2></div><button className="icon-button" onClick={onClose} aria-label="Close dialog"><X size={19} /></button></div>
    <form className="entity-form" onSubmit={handleSubmit}>
      {entity === 'product' && <>
        <div className="form-grid"><Field name="name" label="Product name" defaultValue={product?.name} required /><Field name="sku" label="SKU" defaultValue={product?.sku} required /><Field name="barcode" label="Barcode (optional)" defaultValue={product?.barcode ?? ''} /><Field name="category" label="Category" defaultValue={product?.category} /><Field name="unitOfMeasure" label="Unit" defaultValue={product?.unitOfMeasure || 'unit'} required /><Field name="sellingPrice" label="Selling price (NZD)" type="number" defaultValue={product?.sellingPrice ?? 0} min="0" step="0.01" required /><Field name="costPrice" label="Cost price (NZD)" type="number" defaultValue={product?.costPrice ?? 0} min="0" step="0.01" required /><Field name="taxRate" label="Tax rate (%)" type="number" defaultValue={product?.taxRate ?? 0} min="0" step="0.01" /><Field name="reorderPoint" label="Reorder point" type="number" defaultValue={product?.reorderPoint ?? 0} min="0" step="1" /><Field name="totalStock" label="Total stock" type="number" defaultValue={product?.totalStock ?? 0} min="0" step="1" /><Field name="totalSold" label="Total sold" type="number" defaultValue={product?.totalSold ?? 0} min="0" step="1" />
          <label className="form-label">Vendor<select name="vendorId" defaultValue={product?.batches[0]?.vendorId ?? ''}><option value="">Select vendor</option>{vendors.map((vendor) => <option key={vendor.id} value={vendor.id}>{vendor.name}</option>)}</select></label>
          <Field name="batchNumber" label="Batch number" defaultValue={product?.batches[0]?.batchNumber ?? ''} /><Field name="invoiceNumber" label="Invoice number" defaultValue={product?.batches[0]?.invoiceNumber ?? ''} /><Field name="expirationDate" label="Expiration date" type="date" defaultValue={product?.batches[0]?.expirationDate?.slice(0, 10) ?? ''} /><Field name="receivedDate" label="Received date" type="date" defaultValue={product?.batches[0]?.receivedDate?.slice(0, 10) ?? ''} /></div>
        <label className="form-label">Description<textarea name="description" defaultValue={product?.description} rows={3} /></label>
        <label className="form-label">Status<select name="status" defaultValue={product?.status ?? 'active'}><option value="active">Active</option><option value="out_of_stock">Out of stock</option><option value="discontinued">Discontinued</option></select></label>
        {isEdit && <div className="form-hint"><AlertTriangle size={15} /> Stock quantity is changed by receiving inventory or recording a sale.</div>}
      </>}
      {entity === 'user' && <>
        <div className="form-grid"><Field name="name" label="First name" defaultValue={user?.name} required /><Field name="lastName" label="Last name" defaultValue={user?.lastName} required /><Field name="email" label="Email address" type="email" defaultValue={user?.email} required /><Field name="phone" label="Phone" defaultValue={user?.phone} /></div>
        <label className="form-label">Role<select name="role" defaultValue={user?.role ?? 'cashier'}><option value="admin">Admin</option><option value="manager">Manager</option><option value="cashier">Cashier</option></select></label>
        {!isEdit && <Field name="password" label="Temporary password (8+ characters)" type="password" minLength={8} autoComplete="new-password" required />}
        <div className="form-hint"><ShieldCheck size={15} /> New users receive a Firebase Authentication account and a matching Firestore role profile.</div>
      </>}
      {entity === 'vendor' && <div className="form-grid"><Field name="name" label="Vendor name" defaultValue={vendor?.name} required /><Field name="email" label="Email" type="email" defaultValue={vendor?.email ?? ''} /><Field name="phone" label="Phone" defaultValue={vendor?.phone ?? ''} /><Field name="address" label="Address" defaultValue={vendor?.address ?? ''} /></div>}
      <div className="dialog-actions"><button type="button" className="secondary-button" onClick={onClose}>Cancel</button><button type="submit" className="primary-button"><Check size={16} /> {isEdit ? 'Save changes' : `Add ${entity === 'user' ? 'user' : entity}`}</button></div>
    </form>
  </section></div>;
}

function Field({ name, label, type = 'text', defaultValue, required, min, minLength, step, autoComplete }: { name: string; label: string; type?: string; defaultValue?: string | number; required?: boolean; min?: string; minLength?: number; step?: string; autoComplete?: string }) {
  return <label className="form-label">{label}<input name={name} type={type} defaultValue={defaultValue} required={required} min={min} minLength={minLength} step={step} autoComplete={autoComplete} /></label>;
}

function TableToolbar({ search, setSearch, placeholder, count, countLabel }: { search: string; setSearch: (value: string) => void; placeholder: string; count: number; countLabel: string }) {
  return <div className="table-toolbar"><label className="search-box"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={placeholder} /></label><span className="record-count">{count} {countLabel}</span></div>;
}

function RowActions({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return <div className="row-actions"><button className="icon-button" title="Edit" aria-label="Edit record" onClick={onEdit}><Pencil size={16} /></button><button className="icon-button danger-action" title="Delete" aria-label="Delete record" onClick={onDelete}><Trash2 size={16} /></button></div>;
}

function StatusPill({ value }: { value: string }) {
  return <span className={`status-pill ${value.replaceAll('_', '-')}`}>{value.replaceAll('_', ' ')}</span>;
}

function EmptyState({ icon: Icon, title, body, action }: { icon: typeof Boxes; title: string; body: string; action?: ReactNode }) {
  return <div className="empty-state"><span><Icon size={23} /></span><strong>{title}</strong><p>{body}</p>{action}</div>;
}

export default App;