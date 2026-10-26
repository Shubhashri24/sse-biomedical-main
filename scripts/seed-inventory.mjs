import { MongoClient } from "mongodb";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read .env.local for MONGODB_URI
const envLocalPath = path.resolve(__dirname, "../.env.local");
let mongoUri = process.env.MONGODB_URI;

if (!mongoUri && fs.existsSync(envLocalPath)) {
  const content = fs.readFileSync(envLocalPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.startsWith("MONGODB_URI=")) {
      mongoUri = trimmed.substring("MONGODB_URI=".length).trim();
      break;
    }
  }
}

if (!mongoUri) {
  mongoUri = "mongodb://localhost:27017/sse_biomedical";
}

async function seedInventoryAndModules() {
  console.log("Connecting to MongoDB:", mongoUri);
  const client = new MongoClient(mongoUri);
  await client.connect();
  const db = client.db();

  const productsCol = db.collection("products");
  const txCol = db.collection("inventory_transactions");
  const suppliersCol = db.collection("suppliers");
  const supplierProductsCol = db.collection("supplier_products");
  const techniciansCol = db.collection("technicians");
  const serviceTicketsCol = db.collection("service_tickets");

  const now = new Date();

  // 1. Initialize Stock on existing 36 products
  const products = await productsCol.find({}).toArray();
  console.log(`Found ${products.length} products to check inventory initialization...`);

  let initializedStockCount = 0;
  for (let idx = 0; idx < products.length; idx++) {
    const p = products[idx];
    if (typeof p.stockQuantity !== "number") {
      let initialStock = 12; // default healthy stock
      let reorderLevel = 5;

      // Realistic stock spread:
      if (idx === 0) initialStock = 3; // MON-01 Low stock
      else if (idx === 4) initialStock = 0; // ICU-01 Out of stock
      else if (idx === 8) initialStock = 4; // OT-01 Low stock
      else if (idx % 3 === 0) initialStock = 8;
      else if (idx % 2 === 0) initialStock = 15;
      else initialStock = 20;

      const reserved = 0;
      const available = Math.max(0, initialStock - reserved);
      const stockStatus =
        available === 0 ? "OUT_OF_STOCK" : available <= reorderLevel ? "LOW_STOCK" : "IN_STOCK";

      await productsCol.updateOne(
        { _id: p._id },
        {
          $set: {
            stockQuantity: initialStock,
            reservedQuantity: reserved,
            availableQuantity: available,
            reorderLevel: reorderLevel,
            stockStatus: stockStatus,
            lastStockUpdate: now,
            updatedAt: now,
          },
        }
      );

      // Record initial STOCK_IN transaction
      const txId = `TXN-${String(idx + 1).padStart(4, "0")}`;
      await txCol.updateOne(
        { transactionId: txId },
        {
          $set: {
            transactionId: txId,
            productId: p._id,
            productCode: p.productCode,
            equipmentName: p.name,
            type: "STOCK_IN",
            quantity: initialStock,
            previousStock: 0,
            newStock: initialStock,
            previousReserved: 0,
            newReserved: 0,
            reason: "Initial warehouse inventory intake & physical verification",
            createdBy: "admin",
            createdAt: now,
          },
        },
        { upsert: true }
      );

      initializedStockCount++;
    }
  }
  console.log(`Initialized inventory for ${initializedStockCount} products.`);

  // 2. Initialize Authentic Indian Biomedical Suppliers
  const existingSuppliersCount = await suppliersCol.countDocuments();
  if (existingSuppliersCount === 0) {
    const suppliersData = [
      {
        supplierCode: "SUP-001",
        companyName: "BPL Medical Technologies Pvt Ltd",
        contactPerson: "Rajiv Nambiar (Regional Sales)",
        email: "sales.west@bplmedical.com",
        phone: "+91 80 2839 5963",
        address: "11-D, Bommasandra Industrial Area",
        city: "Bengaluru",
        state: "Karnataka",
        country: "India",
        gstNumber: "29AABCB1234F1Z8",
        website: "https://bplmedicaltechnologies.com",
        notes: "Authorized OEM distributor for ECG, patient monitoring systems and syringe infusion pumps.",
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        supplierCode: "SUP-002",
        companyName: "Schiller Healthcare India Pvt Ltd",
        contactPerson: "Dinesh Kulkarni (Institutional Accounts)",
        email: "dinesh.kulkarni@schillerindia.com",
        phone: "+91 22 6152 3333",
        address: "Advance House, Makwana Road, Marol, Andheri East",
        city: "Mumbai",
        state: "Maharashtra",
        country: "India",
        gstNumber: "27AAACS4567G1Z2",
        website: "https://schillerindia.com",
        notes: "Manufacturer & provider for emergency defibrillators, stress test systems, and spirometry units.",
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        supplierCode: "SUP-003",
        companyName: "Skanray Technologies Ltd",
        contactPerson: "Maheshwar Rao (Hospital Projects)",
        email: "healthcare.contracts@skanray.com",
        phone: "+91 821 240 7000",
        address: "Plot #15-17, Hebbal Industrial Area",
        city: "Mysuru",
        state: "Karnataka",
        country: "India",
        gstNumber: "29AALCS7890H1Z5",
        website: "https://skanray.com",
        notes: "OEM partner for critical care ventilators, surgical C-Arms, and high-frequency dental/mobile X-ray.",
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
    ];

    const insertedSuppliers = await suppliersCol.insertMany(suppliersData);
    console.log(`Created ${Object.keys(insertedSuppliers.insertedIds).length} authentic suppliers.`);

    // Map suppliers to products
    const bpl = await suppliersCol.findOne({ supplierCode: "SUP-001" });
    const schiller = await suppliersCol.findOne({ supplierCode: "SUP-002" });
    const skanray = await suppliersCol.findOne({ supplierCode: "SUP-003" });

    const mon01 = await productsCol.findOne({ productCode: "MON-01" });
    const mon04 = await productsCol.findOne({ productCode: "MON-04" });
    const icu01 = await productsCol.findOne({ productCode: "ICU-01" });
    const card01 = await productsCol.findOne({ productCode: "CARD-01" });

    const mappings = [];
    if (bpl && mon01) {
      mappings.push({
        supplierId: bpl._id,
        supplierCode: bpl.supplierCode,
        supplierName: bpl.companyName,
        productId: mon01._id,
        productCode: mon01.productCode,
        productName: mon01.name,
        supplierProductCode: "BPL-EL-01",
        leadTimeDays: 7,
        lastPurchasePrice: 42000,
        minimumOrderQuantity: 1,
        notes: "Supplied with standard 5-lead ECG cable and adult cuff.",
        createdAt: now,
        updatedAt: now,
      });
    }
    if (bpl && mon04) {
      mappings.push({
        supplierId: bpl._id,
        supplierCode: bpl.supplierCode,
        supplierName: bpl.companyName,
        productId: mon04._id,
        productCode: mon04.productCode,
        productName: mon04.name,
        supplierProductCode: "BPL-CARDIART-6208",
        leadTimeDays: 5,
        lastPurchasePrice: 38000,
        minimumOrderQuantity: 1,
        notes: "12-lead portable ECG machine.",
        createdAt: now,
        updatedAt: now,
      });
    }
    if (schiller && card01) {
      mappings.push({
        supplierId: schiller._id,
        supplierCode: schiller.supplierCode,
        supplierName: schiller.companyName,
        productId: card01._id,
        productCode: card01.productCode,
        productName: card01.name,
        supplierProductCode: "SCH-CARDIOVIT-CS200",
        leadTimeDays: 14,
        lastPurchasePrice: 185000,
        minimumOrderQuantity: 1,
        notes: "Includes medical treadmill and telemetry module.",
        createdAt: now,
        updatedAt: now,
      });
    }
    if (skanray && icu01) {
      mappings.push({
        supplierId: skanray._id,
        supplierCode: skanray.supplierCode,
        supplierName: skanray.companyName,
        productId: icu01._id,
        productCode: icu01.productCode,
        productName: icu01.name,
        supplierProductCode: "SKAN-RESPO-V",
        leadTimeDays: 10,
        lastPurchasePrice: 240000,
        minimumOrderQuantity: 1,
        notes: "Adult and pediatric invasive ventilator with turbine drive.",
        createdAt: now,
        updatedAt: now,
      });
    }

    if (mappings.length > 0) {
      await supplierProductsCol.insertMany(mappings);
      console.log(`Created ${mappings.length} supplier ↔ product mappings.`);
    }
  }

  // 3. Initialize Field Technicians
  const existingTechsCount = await techniciansCol.countDocuments();
  if (existingTechsCount === 0) {
    const techData = [
      {
        technicianId: "TECH-001",
        name: "Rameshwar Kulkarni",
        email: "rameshwar.biomed@shreeshyamelectronics.com",
        phone: "+91 98224 55102",
        specialization: "ICU Ventilators & Patient Monitoring",
        availability: "AVAILABLE",
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        technicianId: "TECH-002",
        name: "Prashant Deshmukh",
        email: "prashant.service@shreeshyamelectronics.com",
        phone: "+91 98901 23419",
        specialization: "OT Tables, Surgical Lights & Electrosurgery",
        availability: "ON_CALL",
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        technicianId: "TECH-003",
        name: "Siddharth Joshi",
        email: "siddharth.imaging@shreeshyamelectronics.com",
        phone: "+91 94230 67891",
        specialization: "Medical Imaging (X-Ray, C-Arm & Ultrasound)",
        availability: "AVAILABLE",
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
    ];
    await techniciansCol.insertMany(techData);
    console.log(`Created ${techData.length} biomedical service technicians.`);
  }

  // 4. Initialize Realistic Biomedical Service Tickets
  const existingTicketsCount = await serviceTicketsCol.countDocuments();
  if (existingTicketsCount === 0) {
    const ticketsData = [
      {
        ticketId: "SR-0001",
        customerId: "shubhashrikgadewar123@gmail.com",
        customerName: "Shubhashri Gadewar",
        customerEmail: "shubhashrikgadewar123@gmail.com",
        customerPhone: "8080068399",
        facility: "Gadewar Clinical Care",
        productCode: "MON-01",
        equipmentName: "Multiparameter Patient Monitor",
        serialNumber: "SSE-MON-2026-0042",
        issueTitle: "NIBP pump calibration drift & intermittent cuff leak",
        issueDescription:
          "Bedside monitor displays blood pressure error 0x04 during inflation. Clinical staff noticed slow cuff pressurization during ward rounds.",
        priority: "HIGH",
        status: "IN_PROGRESS",
        assignedTechnicianId: "TECH-001",
        assignedTechnicianName: "Rameshwar Kulkarni",
        scheduledDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
        completedDate: null,
        diagnosis: "Checked pneumatic block. Internal solenoid valve micro-leak detected under 180 mmHg pressure test.",
        resolution: "Replaced air manifold valve gasket and recalibrated NIBP transducer against digital manometer.",
        partsUsed: "NIBP pneumatic manifold gasket (SKU: GASK-NIBP-01)",
        installationRequired: false,
        installationStatus: "COMPLETED",
        createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000),
        updatedAt: now,
      },
      {
        ticketId: "SR-0002",
        customerId: "spatil@sahyadrihospital.com",
        customerName: "Suresh Patil",
        customerEmail: "spatil@sahyadrihospital.com",
        customerPhone: "+91 94220 88990",
        facility: "Sahyadri Specialty Hospital",
        productCode: "ICU-01",
        equipmentName: "ICU Ventilator",
        serialNumber: "SSE-ICU-2026-0108",
        issueTitle: "O2 cell calibration expiry warning & scheduled installation",
        issueDescription:
          "New ICU ventilator delivered to 4-bed HDU unit. Requires complete pre-commissioning calibration, O2 cell replacement check, and staff operational demonstration.",
        priority: "CRITICAL",
        status: "SCHEDULED",
        assignedTechnicianId: "TECH-001",
        assignedTechnicianName: "Rameshwar Kulkarni",
        scheduledDate: new Date(Date.now() + 12 * 60 * 60 * 1000),
        completedDate: null,
        diagnosis: "Pre-installation electrical safety test (EST) and gas pipeline pressure validation pending.",
        resolution: "",
        partsUsed: "",
        installationRequired: true,
        installationDate: new Date(Date.now() + 12 * 60 * 60 * 1000),
        installationTechnician: "Rameshwar Kulkarni",
        installationNotes: "Coordinate with HDU in-charge sister and biomedical department head.",
        installationStatus: "SCHEDULED",
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
        updatedAt: now,
      },
    ];
    await serviceTicketsCol.insertMany(ticketsData);
    console.log(`Created ${ticketsData.length} service & maintenance tickets.`);
  }

  console.log("Database successfully seeded with inventory, suppliers, technicians, and service records!");
  await client.close();
}

seedInventoryAndModules().catch((err) => {
  console.error("Failed to seed inventory modules:", err);
  process.exit(1);
});
