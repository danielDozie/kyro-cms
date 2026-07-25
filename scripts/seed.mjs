/**
 * Kyro CMS Admin Dashboard — Full E-commerce Seed Script
 * Populates ALL e-commerce collections:
 *   product_categories, brands, products, customers,
 *   orders, reviews, coupons, carts
 *
 * Usage: node scripts/seed.mjs
 */

import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.resolve(__dirname, '../data/kyro.db');
const db = new DatabaseSync(dbPath);

console.log(`\n🌱  Seeding: ${dbPath}\n`);

// ─── Helpers ──────────────────────────────────────────────────────────────────

const uuid = () => randomUUID();
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const ago = (days) => { const d = new Date(); d.setDate(d.getDate() - days); return d.toISOString(); };
const future = (days) => { const d = new Date(); d.setDate(d.getDate() + days); return d.toISOString(); };

// ─── Clear ────────────────────────────────────────────────────────────────────

console.log('🗑   Clearing old data...');
['reviews','orders','coupons','products','customers','brands','product_categories'].forEach(t => {
  try { db.prepare(`DELETE FROM ${t}`).run(); } catch {}
});
console.log('    ✓ Cleared.\n');

// ─── 1. Product Categories ────────────────────────────────────────────────────

const CATEGORIES = [
  { name: 'Electronics',   description: 'Gadgets, devices and accessories' },
  { name: 'Furniture',     description: 'Home and office furniture' },
  { name: 'Office',        description: 'Office supplies and productivity tools' },
  { name: 'Stationery',    description: 'Notebooks, pens and desk essentials' },
  { name: 'Accessories',   description: 'Personal tech accessories' },
];

console.log(`📁  Inserting ${CATEGORIES.length} product categories...`);
const insertCategory = db.prepare(`
  INSERT INTO product_categories (id, slug, name, description, createdAt, updatedAt, status)
  VALUES (?, ?, ?, ?, ?, ?, 'published')
`);
const categoryIds = CATEGORIES.map(c => {
  const id = uuid();
  const slug = c.name.toLowerCase().replace(/\s+/g, '-');
  const created = ago(rand(60, 200));
  insertCategory.run(id, slug, c.name, c.description, created, created);
  return { id, ...c };
});
console.log(`    ✓ ${CATEGORIES.length} categories.\n`);

// ─── 2. Brands ────────────────────────────────────────────────────────────────

const BRANDS = [
  { name: 'TechNova',    description: 'Next-gen consumer electronics' },
  { name: 'ErgoPlus',   description: 'Ergonomic furniture for modern workspaces' },
  { name: 'DeskCraft',  description: 'Premium desk accessories' },
  { name: 'PixelGear',  description: 'Pro-grade peripherals for creatives' },
  { name: 'FlowWork',   description: 'Productivity-first office solutions' },
];

console.log(`🏷   Inserting ${BRANDS.length} brands...`);
const insertBrand = db.prepare(`
  INSERT INTO brands (id, slug, name, description, createdAt, updatedAt, status)
  VALUES (?, ?, ?, ?, ?, ?, 'published')
`);
const brandIds = BRANDS.map(b => {
  const id = uuid();
  const slug = b.name.toLowerCase().replace(/\s+/g, '-');
  const created = ago(rand(60, 200));
  insertBrand.run(id, slug, b.name, b.description, created, created);
  return { id, ...b };
});
console.log(`    ✓ ${BRANDS.length} brands.\n`);

// ─── 3. Products ──────────────────────────────────────────────────────────────

const PRODUCTS = [
  { title: 'Wireless Noise-Cancelling Headphones', price: 299.99, sku: 'SKU-WNC-001', inventory: 120, cat: 'Electronics', brand: 'TechNova' },
  { title: 'Ergonomic Office Chair',               price: 449.00, sku: 'SKU-EOC-002', inventory: 45,  cat: 'Furniture',   brand: 'ErgoPlus'  },
  { title: 'Standing Desk Pro',                    price: 899.00, sku: 'SKU-SDP-003', inventory: 28,  cat: 'Furniture',   brand: 'ErgoPlus'  },
  { title: 'Mechanical Keyboard TKL',              price: 149.95, sku: 'SKU-MKT-004', inventory: 200, cat: 'Electronics', brand: 'PixelGear' },
  { title: '4K Webcam Ultra',                      price: 199.00, sku: 'SKU-4KW-005', inventory: 85,  cat: 'Electronics', brand: 'TechNova'  },
  { title: 'USB-C Hub 10-in-1',                    price: 79.99,  sku: 'SKU-UCH-006', inventory: 300, cat: 'Electronics', brand: 'FlowWork'  },
  { title: 'Bamboo Desk Organiser',                price: 39.99,  sku: 'SKU-BDO-007', inventory: 150, cat: 'Office',      brand: 'DeskCraft' },
  { title: 'LED Monitor 27" 4K',                   price: 649.00, sku: 'SKU-LM4-008', inventory: 60,  cat: 'Electronics', brand: 'PixelGear' },
  { title: 'Laptop Stand Aluminium',               price: 59.99,  sku: 'SKU-LSA-009', inventory: 180, cat: 'Accessories', brand: 'DeskCraft' },
  { title: 'Wireless Charging Pad',                price: 34.99,  sku: 'SKU-WCP-010', inventory: 250, cat: 'Electronics', brand: 'TechNova'  },
  { title: 'Premium Notebook A5',                  price: 14.99,  sku: 'SKU-PNA-011', inventory: 500, cat: 'Stationery',  brand: 'FlowWork'  },
  { title: 'Blue-Light Blocking Glasses',          price: 49.99,  sku: 'SKU-BLG-012', inventory: 90,  cat: 'Accessories', brand: 'TechNova'  },
  { title: 'Cable Management Kit',                 price: 24.99,  sku: 'SKU-CMK-013', inventory: 220, cat: 'Office',      brand: 'DeskCraft' },
  { title: 'Adjustable Monitor Arm',               price: 119.00, sku: 'SKU-AMA-014', inventory: 75,  cat: 'Office',      brand: 'ErgoPlus'  },
  { title: 'Portable SSD 1TB',                     price: 139.99, sku: 'SKU-SSD-015', inventory: 130, cat: 'Electronics', brand: 'TechNova'  },
];

console.log(`📦  Inserting ${PRODUCTS.length} products...`);
const insertProduct = db.prepare(`
  INSERT INTO products (id, title, slug, price, sku, inventory, category, brand, status, createdAt, updatedAt)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'published', ?, ?)
`);
const productIds = PRODUCTS.map(p => {
  const id = uuid();
  const slug = p.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const catObj = categoryIds.find(c => c.name === p.cat);
  const brandObj = brandIds.find(b => b.name === p.brand);
  const created = ago(rand(30, 180));
  insertProduct.run(id, p.title, slug, p.price, p.sku, p.inventory,
    catObj?.id ?? null, brandObj?.id ?? null, created, created);
  return { id, ...p };
});
console.log(`    ✓ ${PRODUCTS.length} products.\n`);

// ─── 4. Customers ─────────────────────────────────────────────────────────────

const FIRST_NAMES = ['James','Sarah','Michael','Emma','David','Olivia','Daniel','Sophia',
  'Matthew','Chloe','Chris','Amelia','Andrew','Ava','Joshua','Isabella',
  'Ryan','Mia','Ethan','Charlotte','Liam','Grace','Noah','Lily'];
const LAST_NAMES  = ['Smith','Johnson','Williams','Brown','Jones','Garcia','Miller','Davis',
  'Wilson','Taylor','Anderson','Thomas','Jackson','White','Harris','Martin',
  'Thompson','Lewis','Lee','Walker','Hall','Allen','Young','King'];
const DOMAINS = ['gmail.com','yahoo.com','outlook.com','icloud.com','hotmail.com'];

const NUM_CUSTOMERS = 50;
console.log(`👤  Inserting ${NUM_CUSTOMERS} customers...`);
const insertCustomer = db.prepare(`
  INSERT INTO customers (id, email, fullName, firstName, lastName, phone, slug, status, createdAt, updatedAt)
  VALUES (?, ?, ?, ?, ?, ?, ?, 'published', ?, ?)
`);
const customerIds = [];
for (let i = 0; i < NUM_CUSTOMERS; i++) {
  const id = uuid();
  const fn = pick(FIRST_NAMES), ln = pick(LAST_NAMES);
  const fullName = `${fn} ${ln}`;
  const email = `${fn.toLowerCase()}.${ln.toLowerCase()}${rand(1,99)}@${pick(DOMAINS)}`;
  const phone = `+1${rand(200,999)}${rand(1000000,9999999)}`;
  const slug = email.replace(/[@.]/g, '-');
  const created = ago(rand(1, 365));
  customerIds.push(id);
  insertCustomer.run(id, email, fullName, fn, ln, phone, slug, created, created);
}
console.log(`    ✓ ${NUM_CUSTOMERS} customers.\n`);

// ─── 5. Orders ────────────────────────────────────────────────────────────────

const ORDER_STATUSES  = ['pending','processing','shipped','delivered','completed','cancelled'];
const PAYMENT_STATUSES = ['paid','paid','paid','paid','pending','failed','refunded'];

const NUM_ORDERS = 150;
console.log(`🛒  Inserting ${NUM_ORDERS} orders...`);
const insertOrder = db.prepare(`
  INSERT INTO orders (id, orderNumber, customer, orderStatus, paymentStatus, items, subtotal, tax, shipping, discount, total, slug, status, createdAt, updatedAt)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published', ?, ?)
`);
const orderIds = [];
for (let i = 0; i < NUM_ORDERS; i++) {
  const id = uuid();
  const orderNumber = `ORD-${200000 + i}`;
  const customerId = pick(customerIds);
  const status = pick(ORDER_STATUSES);
  const payStatus = pick(PAYMENT_STATUSES);
  const numItems = rand(1, 4);
  const items = [];
  let subtotal = 0;
  for (let j = 0; j < numItems; j++) {
    const prod = pick(productIds);
    const qty = rand(1, 3);
    const lineTotal = parseFloat((prod.price * qty).toFixed(2));
    subtotal += lineTotal;
    items.push({ product: prod.id, title: prod.title, quantity: qty, unitPrice: prod.price, total: lineTotal });
  }
  subtotal = parseFloat(subtotal.toFixed(2));
  const tax      = parseFloat((subtotal * 0.08).toFixed(2));
  const shipping = subtotal > 100 ? 0 : 9.99;
  const discount = rand(0, 3) === 0 ? parseFloat((subtotal * 0.1).toFixed(2)) : 0;
  const total    = parseFloat((subtotal + tax + shipping - discount).toFixed(2));
  const created  = ago(rand(0, 365));
  const slug     = orderNumber.toLowerCase();
  orderIds.push({ id, customerId, total: payStatus === 'paid' ? total : 0 });
  insertOrder.run(id, orderNumber, customerId, status, payStatus,
    JSON.stringify(items), subtotal, tax, shipping, discount, total, slug, created, created);
}
console.log(`    ✓ ${NUM_ORDERS} orders.\n`);

// ─── 6. Reviews ───────────────────────────────────────────────────────────────

const COMMENTS = [
  'Absolutely love this product — exceeded my expectations!',
  'Great quality for the price. Would definitely buy again.',
  'Solid build, fast delivery. Very happy.',
  'Good product but packaging could be better.',
  'Five stars — this changed how I work from home.',
  'Decent product, does what it says on the tin.',
  'Amazing quality! Highly recommend to anyone.',
  'Not bad but took a while to arrive.',
  'Perfect for my home office setup.',
  'Exactly as described. Very satisfied.',
  'Premium feel, worth every penny.',
  'Could be improved but overall a good buy.',
];
const REVIEW_STATUSES = ['published','published','published','pending'];

const NUM_REVIEWS = 80;
console.log(`⭐  Inserting ${NUM_REVIEWS} reviews...`);
const insertReview = db.prepare(`
  INSERT INTO reviews (id, product, customer, rating, comment, status, createdAt, updatedAt)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);
for (let i = 0; i < NUM_REVIEWS; i++) {
  const id = uuid();
  const prod = pick(productIds);
  const custId = pick(customerIds);
  const ratingPool = [3, 3, 4, 4, 4, 5, 5, 5, 5, 5];
  const rating = pick(ratingPool);
  const comment = pick(COMMENTS);
  const status = pick(REVIEW_STATUSES);
  const created = ago(rand(1, 300));
  insertReview.run(id, prod.id, custId, rating, comment, status, created, created);
}
console.log(`    ✓ ${NUM_REVIEWS} reviews.\n`);

// ─── 7. Coupons ───────────────────────────────────────────────────────────────

const COUPONS = [
  { code: 'WELCOME10',  type: 'percentage', value: 10, minPurchase: 50,  maxDiscount: 30,  usageLimit: 500 },
  { code: 'SAVE20',     type: 'percentage', value: 20, minPurchase: 100, maxDiscount: 60,  usageLimit: 200 },
  { code: 'FLAT15',     type: 'fixed',      value: 15, minPurchase: 75,  maxDiscount: 15,  usageLimit: 300 },
  { code: 'FLASH50',    type: 'percentage', value: 50, minPurchase: 200, maxDiscount: 100, usageLimit: 50  },
  { code: 'FREESHIP',   type: 'fixed',      value: 10, minPurchase: 40,  maxDiscount: 10,  usageLimit: 1000},
  { code: 'VIP25',      type: 'percentage', value: 25, minPurchase: 150, maxDiscount: 75,  usageLimit: 100 },
  { code: 'SUMMER5',    type: 'fixed',      value: 5,  minPurchase: 30,  maxDiscount: 5,   usageLimit: 999 },
  { code: 'LOYALTY30',  type: 'percentage', value: 30, minPurchase: 250, maxDiscount: 150, usageLimit: 75  },
];

console.log(`🎟   Inserting ${COUPONS.length} coupons...`);
const insertCoupon = db.prepare(`
  INSERT INTO coupons (id, code, type, value, minPurchase, maxDiscount, usageLimit, usedCount, startsAt, expiresAt, active, status, createdAt, updatedAt)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 'published', ?, ?)
`);
for (const c of COUPONS) {
  const id = uuid();
  const usedCount = rand(0, Math.floor(c.usageLimit * 0.6));
  const startsAt = ago(rand(10, 60));
  const expiresAt = future(rand(30, 120));
  const created = ago(rand(10, 60));
  insertCoupon.run(id, c.code, c.type, c.value, c.minPurchase, c.maxDiscount,
    c.usageLimit, usedCount, startsAt, expiresAt, created, created);
}
console.log(`    ✓ ${COUPONS.length} coupons.\n`);

// ─── Summary ──────────────────────────────────────────────────────────────────

const counts = {
  categories: db.prepare('SELECT COUNT(*) as c FROM product_categories').get().c,
  brands:     db.prepare('SELECT COUNT(*) as c FROM brands').get().c,
  products:   db.prepare('SELECT COUNT(*) as c FROM products').get().c,
  customers:  db.prepare('SELECT COUNT(*) as c FROM customers').get().c,
  orders:     db.prepare('SELECT COUNT(*) as c FROM orders').get().c,
  reviews:    db.prepare('SELECT COUNT(*) as c FROM reviews').get().c,
  coupons:    db.prepare('SELECT COUNT(*) as c FROM coupons').get().c,
};
const revenue = db.prepare("SELECT SUM(total) as t FROM orders WHERE paymentStatus='paid'").get().t || 0;

console.log('✅  Seed complete!\n');
console.log('─────────────────────────────────────────');
Object.entries(counts).forEach(([k, v]) =>
  console.log(`  ${k.padEnd(16)}: ${v}`)
);
console.log(`  ${'Revenue'.padEnd(16)}: $${revenue.toFixed(2)}`);
console.log('─────────────────────────────────────────\n');
console.log('🔄  Refresh your admin dashboard to see the data.\n');
