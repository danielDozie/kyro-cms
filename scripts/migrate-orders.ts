import { createRequire } from "module";
const _require = createRequire(import.meta.url);
const modPath = "node:" + "sqlite";
const { DatabaseSync } = _require(modPath) as typeof import("node:sqlite");
import path from "path";

async function run() {
  const dbPath = path.resolve(process.cwd(), "data", "kyro.db");
  console.log("Connecting to SQLite at:", dbPath);
  
  const db = new DatabaseSync(dbPath);
  
  // Load products to create lookup
  const productsRows = db.prepare("SELECT id, title FROM products").all() as any[];
  const titleToId = new Map<string, string>();
  const productIds = new Set<string>();

  for (const row of productsRows) {
    if (row.title && row.id) {
      titleToId.set(String(row.title).toLowerCase().trim(), row.id);
    }
    if (row.id) {
      productIds.add(row.id);
    }
  }

  console.log(`Loaded ${productIds.size} products from SQLite.`);
  
  // Load orders
  const ordersRows = db.prepare("SELECT id, orderNumber, status, orderStatus, items FROM orders").all() as any[];
  console.log(`Found ${ordersRows.length} orders.`);
  
  let updatedCount = 0;
  
  const updateStmt = db.prepare("UPDATE orders SET items = ?, status = ?, orderStatus = ? WHERE id = ?");

  for (const row of ordersRows) {
    try {
      let changed = false;
      
      let status = row.status;
      let orderStatus = row.orderStatus;
      let items = row.items ? JSON.parse(row.items) : [];

      // 1. Rename status -> orderStatus if present
      if (status && !orderStatus) {
        const validStatuses = ['pending', 'processing', 'shipped', 'in_transit', 'delivered', 'completed', 'cancelled'];
        if (validStatuses.includes(status)) {
          orderStatus = status;
          status = "published";
          changed = true;
          console.log(`  Order ${row.orderNumber}: migrated status -> orderStatus`);
        }
      }

      // 2. Migrate items.product text to relationship
      if (Array.isArray(items)) {
        items = items.map((item: any) => {
          const raw = item.product;
          
          if (typeof raw === "string" && productIds.has(raw)) return item;
          if (typeof raw === "object" && raw !== null && productIds.has(raw.value)) return item;
          
          if (typeof raw === "string") {
            const resolvedId = titleToId.get(raw.toLowerCase().trim());
            if (resolvedId) {
              changed = true;
              console.log(`  Order ${row.orderNumber}: "${raw}" → ${resolvedId}`);
              return { ...item, product: resolvedId };
            }
          }
          return item;
        });
      }

      if (changed) {
        updateStmt.run(JSON.stringify(items), status, orderStatus, row.id);
        updatedCount++;
      }
      
    } catch (e) {
      console.warn("Failed to process order:", row.id, e);
    }
  }

  console.log(`\nUpdated ${updatedCount} orders successfully.`);
  db.close();
}

run().catch(console.error);
