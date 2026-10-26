import { MongoClient } from "mongodb";

const mongoUri = "mongodb://localhost:27017/sse_biomedical";

async function run() {
  const client = new MongoClient(mongoUri);
  await client.connect();
  const db = client.db();

  console.log("================ DATABASE AUDIT & CLASSIFICATION REPORT ================");

  // 1. Products
  const products = await db.collection("products").find({}).toArray();
  console.log(`\n1. PRODUCTS: ${products.length} records`);
  const abnormalStock = products.filter(p => p.reservedQuantity > 0 || (p.productCode === "MON-01" && p.stockQuantity !== 3));
  console.log(`- Products with non-zero reserved or abnormal stock: ${abnormalStock.length}`);
  for (const p of abnormalStock) {
    console.log(`  -> ${p.productCode} (${p.name}): stock=${p.stockQuantity}, reserved=${p.reservedQuantity}, available=${p.availableQuantity}, status=${p.stockStatus}`);
  }

  // 2. Categories
  const categories = await db.collection("categories").find({}).toArray();
  console.log(`\n2. CATEGORIES: ${categories.length} records`);
  console.log(`- All categories: ${categories.map(c => c.name).join(", ")}`);

  // 3. Company Settings
  const settings = await db.collection("company_settings").find({}).toArray();
  console.log(`\n3. COMPANY SETTINGS: ${settings.length} records`);
  for (const s of settings) {
    console.log(`  -> ID: ${s._id}, Name: ${s.companyName}, Contact: ${s.contactPerson}`);
  }

  // 4. Quotation Requests
  const quotes = await db.collection("quotation_requests").find({}).toArray();
  console.log(`\n4. QUOTATION REQUESTS: ${quotes.length} records`);
  for (const q of quotes) {
    console.log(`  -> [${q.requestId}] ${q.customerName} (${q.customerEmail}) - Status: ${q.status} - Created: ${q.createdAt?.toISOString()}`);
  }

  // 5. Service Tickets
  const tickets = await db.collection("service_tickets").find({}).toArray();
  console.log(`\n5. SERVICE TICKETS: ${tickets.length} records`);
  for (const t of tickets) {
    console.log(`  -> [${t.ticketId}] ${t.customerName} - SN: ${t.serialNumber} - Prod: ${t.productCode} - Tech: ${t.assignedTechnicianName} - Status: ${t.status}`);
  }

  // 6. Technicians
  const techs = await db.collection("technicians").find({}).toArray();
  console.log(`\n6. TECHNICIANS: ${techs.length} records`);
  for (const tc of techs) {
    console.log(`  -> [${tc.technicianId}] ${tc.name} (${tc.email}) - Spec: ${tc.specialization}`);
  }

  // 7. Suppliers
  const sups = await db.collection("suppliers").find({}).toArray();
  console.log(`\n7. SUPPLIERS: ${sups.length} records`);
  for (const s of sups) {
    console.log(`  -> [${s.supplierCode}] ${s.companyName} (${s.email})`);
  }

  // 8. Supplier Products
  const supProds = await db.collection("supplier_products").find({}).toArray();
  console.log(`\n8. SUPPLIER PRODUCTS: ${supProds.length} records`);
  for (const sp of supProds) {
    console.log(`  -> [${sp._id}] Sup: ${sp.supplierCode} (${sp.supplierName}) -> Prod: ${sp.productCode} (${sp.supplierProductCode})`);
  }

  // 9. Contact Messages
  const msgs = await db.collection("contact_messages").find({}).toArray();
  console.log(`\n9. CONTACT MESSAGES: ${msgs.length} records`);
  for (const m of msgs) {
    console.log(`  -> [${m._id}] ${m.name} (${m.email}) - Subject: ${m.subject}`);
  }

  // 10. Inventory Transactions
  const txs = await db.collection("inventory_transactions").find({}).toArray();
  console.log(`\n10. INVENTORY TRANSACTIONS: ${txs.length} records`);
  const initialTxs = txs.filter(t => t.reason === "Initial warehouse inventory intake & physical verification");
  const testTxs = txs.filter(t => t.reason !== "Initial warehouse inventory intake & physical verification");
  console.log(`- Genuine Initial Transactions: ${initialTxs.length}`);
  console.log(`- Non-Initial / Test Transactions: ${testTxs.length}`);
  for (const t of testTxs) {
    console.log(`  -> [${t.transactionId}] Type: ${t.type}, Prod: ${t.productCode}, Qty: ${t.quantity}, Reason: "${t.reason}"`);
  }

  // 11. Counters
  const counters = await db.collection("counters").find({}).toArray();
  console.log(`\n11. COUNTERS: ${counters.length} records`);
  for (const c of counters) {
    console.log(`  -> ${c._id}: seq = ${c.seq}`);
  }

  await client.close();
}

run().catch(console.error);
