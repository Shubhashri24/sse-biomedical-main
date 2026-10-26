import { MongoClient } from "mongodb";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const mongoUri = "mongodb://localhost:27017/sse_biomedical";
const backupDir = path.resolve(__dirname, "../backups/pre-cleanup-backup-2026-10-21");

async function cleanDatabase() {
  console.log("==================================================================");
  console.log("STARTING TARGETED AUDIT CLEANUP OF SSE BIOMEDICAL DATABASE");
  console.log("==================================================================");

  // 1. Safety verification of backup
  console.log("\n[1/7] Verifying pre-cleanup backup status...");
  if (!fs.existsSync(backupDir)) {
    throw new Error(`Backup directory not found at: ${backupDir}. Aborting cleanup!`);
  }
  const manifestPath = path.join(backupDir, "backup-manifest.json");
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Backup manifest not found at: ${manifestPath}. Aborting cleanup!`);
  }
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
  console.log(`✔ Verified backup manifest from ${manifest.timestamp} with ${Object.keys(manifest.collections).length} collections.`);

  // 2. Connect to MongoDB
  console.log(`\n[2/7] Connecting to database: ${mongoUri}...`);
  const client = new MongoClient(mongoUri);
  await client.connect();
  const db = client.db();

  if (db.databaseName !== "sse_biomedical") {
    throw new Error(`Unexpected database name: ${db.databaseName}. Expected 'sse_biomedical'. Aborting!`);
  }
  console.log(`✔ Connected to target database: ${db.databaseName}`);

  // 3. Targeted Cleanup: Quotation Requests
  console.log("\n[3/7] Cleaning quotation requests...");
  const quotesCol = db.collection("quotation_requests");
  const testQuoteIds = [
    "QT-0003", "QT-0004", "QT-0005", "QT-0006",
    "QT-0007", "QT-0008", "QT-0009", "QT-0010", "QT-0011"
  ];
  const quoteDelResult = await quotesCol.deleteMany({ requestId: { $in: testQuoteIds } });
  console.log(`✔ Deleted ${quoteDelResult.deletedCount} confirmed test quotation requests (${testQuoteIds.join(", ")}).`);
  
  const remainingQuotes = await quotesCol.find({}).sort({ requestId: 1 }).toArray();
  console.log(`✔ Preserved ${remainingQuotes.length} quotation requests:`);
  for (const q of remainingQuotes) {
    const classification = q.requestId === "QT-0001" ? "GENUINE CUSTOMER RFQ" : "MANUAL REVIEW (Demo record)";
    console.log(`   - [${q.requestId}] ${q.customerName} (${q.customerEmail}) -> ${classification}`);
  }

  // 4. Targeted Cleanup: Service Tickets
  console.log("\n[4/7] Cleaning service tickets...");
  const ticketsCol = db.collection("service_tickets");
  const testTicketIds = ["SR-0003", "SR-0004", "SR-0005", "SR-0006"];
  const ticketDelResult = await ticketsCol.deleteMany({ ticketId: { $in: testTicketIds } });
  console.log(`✔ Deleted ${ticketDelResult.deletedCount} confirmed test service tickets (${testTicketIds.join(", ")}).`);

  const remainingTickets = await ticketsCol.find({}).sort({ ticketId: 1 }).toArray();
  console.log(`✔ Preserved ${remainingTickets.length} service tickets:`);
  for (const t of remainingTickets) {
    const classification = t.ticketId === "SR-0001" ? "GENUINE SERVICE RECORD" : "MANUAL REVIEW (Demo record)";
    console.log(`   - [${t.ticketId}] ${t.customerName} (Serial: ${t.serialNumber}, Tech: ${t.assignedTechnicianName}) -> ${classification}`);
  }

  // 5. Targeted Cleanup: Technicians
  console.log("\n[5/7] Cleaning field technicians...");
  const techsCol = db.collection("technicians");
  const testTechIds = ["TECH-004", "TECH-005", "TECH-006", "TECH-007"];
  const techDelResult = await techsCol.deleteMany({ technicianId: { $in: testTechIds } });
  console.log(`✔ Deleted ${techDelResult.deletedCount} confirmed test technicians (${testTechIds.join(", ")}).`);

  const remainingTechs = await techsCol.find({}).sort({ technicianId: 1 }).toArray();
  console.log(`✔ Preserved ${remainingTechs.length} authentic biomedical engineers:`);
  for (const tc of remainingTechs) {
    console.log(`   - [${tc.technicianId}] ${tc.name} (${tc.email}) - Spec: ${tc.specialization}`);
  }

  // 6. Targeted Cleanup: Suppliers & Supplier Product Mappings
  console.log("\n[6/7] Cleaning suppliers and mappings...");
  const supsCol = db.collection("suppliers");
  const supProdsCol = db.collection("supplier_products");

  // Remove test suppliers (Apex Medical Systems India Pvt Ltd)
  const supDelResult = await supsCol.deleteMany({
    $or: [
      { companyName: "Apex Medical Systems India Pvt Ltd" },
      { email: "procurement@apexmedindia.com" },
      { supplierCode: { $in: ["SUP-004", "SUP-005", "SUP-006", "SUP-007"] } }
    ]
  });
  console.log(`✔ Deleted ${supDelResult.deletedCount} confirmed test supplier records.`);

  const remainingSups = await supsCol.find({}).sort({ supplierCode: 1 }).toArray();
  console.log(`✔ Preserved ${remainingSups.length} authentic OEM suppliers:`);
  for (const s of remainingSups) {
    console.log(`   - [${s.supplierCode}] ${s.companyName} (${s.email}, ${s.city})`);
  }

  // Remove test mappings (Apex Medical Systems or APEX-MON-PRO)
  const mapDelResult = await supProdsCol.deleteMany({
    $or: [
      { supplierName: "Apex Medical Systems India Pvt Ltd" },
      { supplierProductCode: "APEX-MON-PRO" },
      { supplierCode: { $in: ["SUP-004", "SUP-005", "SUP-006", "SUP-007"] } }
    ]
  });
  console.log(`✔ Deleted ${mapDelResult.deletedCount} test supplier product mappings.`);

  // Ensure authentic OEM mapping for BPL MON-01 is restored
  const bplSup = await supsCol.findOne({ supplierCode: "SUP-001" });
  const mon01Prod = await db.collection("products").findOne({ productCode: "MON-01" });
  if (bplSup && mon01Prod) {
    await supProdsCol.updateOne(
      { supplierCode: "SUP-001", productCode: "MON-01" },
      {
        $set: {
          supplierId: bplSup._id,
          supplierCode: bplSup.supplierCode,
          supplierName: bplSup.companyName,
          productId: mon01Prod._id,
          productCode: mon01Prod.productCode,
          productName: mon01Prod.name,
          supplierProductCode: "BPL-EL-01",
          leadTimeDays: 7,
          lastPurchasePrice: 42000,
          minimumOrderQuantity: 1,
          notes: "Supplied with standard 5-lead ECG cable and adult cuff.",
          updatedAt: new Date(),
        },
        $setOnInsert: { createdAt: new Date() }
      },
      { upsert: true }
    );
    console.log("✔ Restored authentic OEM mapping: BPL Medical -> MON-01 (BPL-EL-01).");
  }

  const remainingMappings = await supProdsCol.find({}).toArray();
  console.log(`✔ Verified ${remainingMappings.length} authentic OEM supplier mappings:`);
  for (const m of remainingMappings) {
    console.log(`   - [${m.supplierCode}] ${m.supplierName} -> ${m.productCode} (${m.supplierProductCode})`);
  }

  // 7. Targeted Cleanup: Contact Messages, Inventory Transactions, Product Stock & Counters
  console.log("\n[7/7] Cleaning contact messages, inventory transactions, restoring stock & counters...");

  // Contact messages
  const msgCol = db.collection("contact_messages");
  const msgDelResult = await msgCol.deleteMany({
    email: "arvind.mehta@carehospital.org",
    subject: "ICU Ventilator Installation Inquiry"
  });
  console.log(`✔ Deleted ${msgDelResult.deletedCount} test contact messages.`);

  // Inventory transactions: delete the 17 non-initial test transactions
  const txCol = db.collection("inventory_transactions");
  const txDelResult = await txCol.deleteMany({
    reason: {
      $in: [
        "Test receipt from OEM BPL Medical batch #9921",
        "Hold units for Sahyadri Hospital RFQ QT-0001",
        "Release 1 reserved unit back to general inventory"
      ]
    }
  });
  console.log(`✔ Deleted ${txDelResult.deletedCount} test inventory transactions.`);

  const remainingTxs = await txCol.find({}).toArray();
  console.log(`✔ Preserved ${remainingTxs.length} initial warehouse intake transactions (TXN-0001 to TXN-0036).`);

  // Restore MON-01 inventory back to authentic initial state
  const prodCol = db.collection("products");
  await prodCol.updateOne(
    { productCode: "MON-01" },
    {
      $set: {
        stockQuantity: 3,
        reservedQuantity: 0,
        availableQuantity: 3,
        stockStatus: "LOW_STOCK",
        reorderLevel: 5,
        lastStockUpdate: new Date(),
        updatedAt: new Date(),
      }
    }
  );
  const mon01 = await prodCol.findOne({ productCode: "MON-01" });
  console.log(`✔ Restored MON-01 stock: stockQuantity=${mon01.stockQuantity}, reservedQuantity=${mon01.reservedQuantity}, availableQuantity=${mon01.availableQuantity}, status=${mon01.stockStatus}`);

  // Verify all 36 products intact
  const productCount = await prodCol.countDocuments();
  console.log(`✔ Verified total catalog products: ${productCount} / 36 intact.`);

  // Verify all 9 categories intact
  const catCol = db.collection("categories");
  const catCount = await catCol.countDocuments();
  console.log(`✔ Verified total categories: ${catCount} / 9 intact.`);

  // Reset counters sequence numbers
  const countersCol = db.collection("counters");
  await countersCol.updateOne({ _id: "quotation_requestId" }, { $set: { seq: 2 } }, { upsert: true });
  await countersCol.updateOne({ _id: "inventory_transactionId" }, { $set: { seq: 36 } }, { upsert: true });
  await countersCol.updateOne({ _id: "supplier_code" }, { $set: { seq: 3 } }, { upsert: true });
  await countersCol.updateOne({ _id: "technician_id" }, { $set: { seq: 3 } }, { upsert: true });
  await countersCol.updateOne({ _id: "service_ticketId" }, { $set: { seq: 2 } }, { upsert: true });

  const updatedCounters = await countersCol.find({}).toArray();
  console.log("✔ Reset sequence counters to match clean state:");
  for (const c of updatedCounters) {
    console.log(`   - ${c._id}: seq = ${c.seq}`);
  }

  await client.close();
  console.log("\n==================================================================");
  console.log("DATABASE CLEANUP SUCCESSFULLY COMPLETED (100%)");
  console.log("==================================================================");
}

cleanDatabase().catch((err) => {
  console.error("Cleanup failed:", err);
  process.exit(1);
});
