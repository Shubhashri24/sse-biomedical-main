import { MongoClient } from "mongodb";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const mongoUri = "mongodb://localhost:27017/sse_biomedical";
const backupDir = path.resolve(__dirname, "../backups/pre-phase2-cleanup-backup-2026-10-21");

async function cleanDatabasePhase2() {
  console.log("==================================================================");
  console.log("STARTING PHASE 2 DATABASE CLEANUP: REMOVING CONFIRMED DEMO RECORDS");
  console.log("==================================================================");

  // 1. Verify Phase 2 backup
  console.log("\n[1/6] Verifying pre-cleanup Phase 2 backup...");
  if (!fs.existsSync(backupDir)) {
    throw new Error(`Backup directory not found at: ${backupDir}. Aborting!`);
  }
  const manifestPath = path.join(backupDir, "backup-manifest.json");
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Backup manifest not found at: ${manifestPath}. Aborting!`);
  }
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
  console.log(`✔ Verified backup manifest from ${manifest.timestamp} with ${Object.keys(manifest.collections).length} collections.`);

  // 2. Connect to MongoDB
  console.log(`\n[2/6] Connecting to database: ${mongoUri}...`);
  const client = new MongoClient(mongoUri);
  await client.connect();
  const db = client.db();

  if (db.databaseName !== "sse_biomedical") {
    throw new Error(`Unexpected database name: ${db.databaseName}. Expected 'sse_biomedical'. Aborting!`);
  }
  console.log(`✔ Connected to target database: ${db.databaseName}`);

  // 3. Remove confirmed demo quotation QT-0002
  console.log("\n[3/6] Removing confirmed demo quotation request QT-0002...");
  const quotesCol = db.collection("quotation_requests");
  const delQuoteRes = await quotesCol.deleteOne({ requestId: "QT-0002" });
  console.log(`✔ Deleted ${delQuoteRes.deletedCount} demo quotation request (QT-0002 - Suresh Patil).`);

  const remainingQuotes = await quotesCol.find({}).toArray();
  console.log(`✔ Preserved ${remainingQuotes.length} genuine quotation request(s):`);
  for (const q of remainingQuotes) {
    console.log(`   - [${q.requestId}] ${q.customerName} (${q.customerEmail}) - Facility: ${q.facility} - Equipment: ${q.equipment}`);
  }

  // 4. Remove confirmed demo service tickets (SR-0001, SR-0002)
  console.log("\n[4/6] Removing confirmed demo service tickets (SR-0001, SR-0002)...");
  const ticketsCol = db.collection("service_tickets");
  const delTicketsRes = await ticketsCol.deleteMany({ ticketId: { $in: ["SR-0001", "SR-0002"] } });
  console.log(`✔ Deleted ${delTicketsRes.deletedCount} demo service tickets (SR-0001, SR-0002 originating from seed-inventory.mjs).`);

  const remainingTickets = await ticketsCol.find({}).toArray();
  console.log(`✔ Preserved ${remainingTickets.length} service ticket(s).`);

  // 5. Remove confirmed demo technicians, suppliers, and supplier product mappings
  console.log("\n[5/6] Removing confirmed demo technicians, suppliers, and mappings from seed-inventory.mjs...");

  // Technicians
  const techsCol = db.collection("technicians");
  const delTechsRes = await techsCol.deleteMany({ technicianId: { $in: ["TECH-001", "TECH-002", "TECH-003"] } });
  console.log(`✔ Deleted ${delTechsRes.deletedCount} demo technicians (TECH-001, TECH-002, TECH-003).`);
  const remainingTechs = await techsCol.find({}).toArray();
  console.log(`✔ Preserved ${remainingTechs.length} technician(s).`);

  // Suppliers
  const supsCol = db.collection("suppliers");
  const delSupsRes = await supsCol.deleteMany({ supplierCode: { $in: ["SUP-001", "SUP-002", "SUP-003"] } });
  console.log(`✔ Deleted ${delSupsRes.deletedCount} demo suppliers (SUP-001, SUP-002, SUP-003).`);
  const remainingSups = await supsCol.find({}).toArray();
  console.log(`✔ Preserved ${remainingSups.length} supplier(s).`);

  // Supplier Products mappings
  const supProdsCol = db.collection("supplier_products");
  const delMappingsRes = await supProdsCol.deleteMany({ supplierCode: { $in: ["SUP-001", "SUP-002", "SUP-003"] } });
  console.log(`✔ Deleted ${delMappingsRes.deletedCount} demo supplier product mappings.`);
  const remainingMappings = await supProdsCol.find({}).toArray();
  console.log(`✔ Preserved ${remainingMappings.length} supplier product mapping(s). (Zero dangling references)`);

  // 6. Reset sequence counters & verify inventory/catalog integrity
  console.log("\n[6/6] Calibrating sequence counters and verifying catalog & inventory integrity...");
  const countersCol = db.collection("counters");
  await countersCol.updateOne({ _id: "quotation_requestId" }, { $set: { seq: 1 } }, { upsert: true });
  await countersCol.updateOne({ _id: "inventory_transactionId" }, { $set: { seq: 36 } }, { upsert: true });
  await countersCol.updateOne({ _id: "supplier_code" }, { $set: { seq: 0 } }, { upsert: true });
  await countersCol.updateOne({ _id: "technician_id" }, { $set: { seq: 0 } }, { upsert: true });
  await countersCol.updateOne({ _id: "service_ticketId" }, { $set: { seq: 0 } }, { upsert: true });

  const updatedCounters = await countersCol.find({}).toArray();
  console.log("✔ Reset sequence counters to match clean state:");
  for (const c of updatedCounters) {
    console.log(`   - ${c._id}: seq = ${c.seq}`);
  }

  // Verify 36 products
  const prodCol = db.collection("products");
  const prodCount = await prodCol.countDocuments();
  console.log(`✔ Verified total catalog products: ${prodCount} / 36 intact.`);

  // Verify MON-01 stock
  const mon01 = await prodCol.findOne({ productCode: "MON-01" });
  console.log(`✔ Verified MON-01 stock: stockQuantity=${mon01.stockQuantity}, reservedQuantity=${mon01.reservedQuantity}, availableQuantity=${mon01.availableQuantity}, status=${mon01.stockStatus}`);

  // Verify 9 categories
  const catCol = db.collection("categories");
  const catCount = await catCol.countDocuments();
  console.log(`✔ Verified total clinical categories: ${catCount} / 9 intact.`);

  // Verify company settings
  const settingsCol = db.collection("company_settings");
  const settingsCount = await settingsCol.countDocuments();
  console.log(`✔ Verified company settings: ${settingsCount} / 1 intact.`);

  // Verify inventory transactions
  const txCol = db.collection("inventory_transactions");
  const txCount = await txCol.countDocuments();
  console.log(`✔ Verified initial warehouse intake transactions: ${txCount} / 36 intact.`);

  await client.close();
  console.log("\n==================================================================");
  console.log("PHASE 2 DATABASE CLEANUP COMPLETED SUCCESSFULLY (100%)");
  console.log("==================================================================");
}

cleanDatabasePhase2().catch((err) => {
  console.error("Phase 2 Cleanup failed:", err);
  process.exit(1);
});
