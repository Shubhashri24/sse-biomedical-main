import { MongoClient } from "mongodb";

const mongoUri = "mongodb://localhost:27017/sse_biomedical";

async function main() {
  const client = new MongoClient(mongoUri);
  await client.connect();
  const db = client.db();

  console.log("=== 1. QUOTATION_REQUESTS ===");
  const quotes = await db.collection("quotation_requests").find({}).sort({ createdAt: 1 }).toArray();
  for (const q of quotes) {
    console.log(`[${q.requestId}] Name: ${q.customerName} | Email: ${q.customerEmail} | Facility: ${q.facility} | Items: ${q.items?.length || 1} | Status: ${q.status} | Created: ${q.createdAt?.toISOString()}`);
  }

  console.log("\n=== 2. SERVICE_TICKETS ===");
  const tickets = await db.collection("service_tickets").find({}).sort({ createdAt: 1 }).toArray();
  for (const t of tickets) {
    console.log(`[${t.ticketId}] Customer: ${t.customerName} | Product: ${t.productCode} (${t.equipmentName}) | Status: ${t.status} | Tech: ${t.assignedTechnicianName} | Created: ${t.createdAt?.toISOString()}`);
  }

  console.log("\n=== 3. TECHNICIANS ===");
  const techs = await db.collection("technicians").find({}).sort({ createdAt: 1 }).toArray();
  for (const tc of techs) {
    console.log(`[${tc.technicianId}] Name: ${tc.name} | Email: ${tc.email} | Spec: ${tc.specialization} | Avail: ${tc.availability}`);
  }

  console.log("\n=== 4. CONTACT_MESSAGES ===");
  const msgs = await db.collection("contact_messages").find({}).sort({ createdAt: 1 }).toArray();
  for (const m of msgs) {
    console.log(`[${m._id}] Name: ${m.name} | Email: ${m.email} | Subject: ${m.subject} | Status: ${m.status} | Msg: ${m.message?.substring(0, 50)}...`);
  }

  console.log("\n=== 5. SUPPLIERS ===");
  const sups = await db.collection("suppliers").find({}).sort({ createdAt: 1 }).toArray();
  for (const s of sups) {
    console.log(`[${s.supplierCode}] Company: ${s.companyName} | Person: ${s.contactPerson} | Email: ${s.email} | City: ${s.city}`);
  }

  console.log("\n=== 6. SUPPLIER_PRODUCTS ===");
  const supProds = await db.collection("supplier_products").find({}).toArray();
  for (const sp of supProds) {
    console.log(`Supplier: ${sp.supplierCode} (${sp.supplierName}) -> Product: ${sp.productCode} (${sp.productName}) | Code: ${sp.supplierProductCode}`);
  }

  console.log("\n=== 7. COUNTERS ===");
  const counters = await db.collection("counters").find({}).toArray();
  for (const c of counters) {
    console.log(`Counter: ${c._id} => seq: ${c.seq}`);
  }

  console.log("\n=== 8. INVENTORY TRANSACTIONS (Recent / Non-initial) ===");
  const txs = await db.collection("inventory_transactions").find({}).sort({ createdAt: 1 }).toArray();
  console.log(`Total transactions: ${txs.length}`);
  for (const tx of txs) {
    if (tx.reason !== "Initial warehouse inventory intake & physical verification") {
      console.log(`[${tx.transactionId}] Type: ${tx.type} | Code: ${tx.productCode} | Qty: ${tx.quantity} (${tx.previousStock}->${tx.newStock}, res: ${tx.previousReserved}->${tx.newReserved}) | Reason: ${tx.reason} | Created: ${tx.createdAt?.toISOString()}`);
    }
  }

  console.log("\n=== 9. PRODUCT STOCK CHANGES (Products with modified stock/reserved) ===");
  const prods = await db.collection("products").find({
    $or: [{ reservedQuantity: { $gt: 0 } }, { productCode: "MON-01" }]
  }).toArray();
  for (const p of prods) {
    console.log(`[${p.productCode}] ${p.name}: stock=${p.stockQuantity}, reserved=${p.reservedQuantity}, available=${p.availableQuantity}`);
  }

  await client.close();
}

main().catch(console.error);
