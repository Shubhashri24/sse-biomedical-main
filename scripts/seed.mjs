import { MongoClient } from "mongodb";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read .env.local for MONGODB_URI if not in process.env
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

function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// 9 Real Categories with exactly their 36 Real Equipment Items from data.ts
const categoriesData = [
  {
    slug: "patient-monitoring",
    code: "MON",
    number: "01",
    name: "Patient Monitoring",
    tagline: "ICU, wards, emergency, OT, recovery, diagnostics and transport.",
    accent: "#35E7C6",
    accentSoft: "#0F2E2A",
    items: [
      {
        code: "MON-01",
        name: "Multiparameter Patient Monitor",
        function: "Continuously displays ECG, SpO2, NIBP, respiration and temperature at the bedside.",
        options: "5 or 7 parameter, modular ICU, optional IBP and EtCO2, central-network ready.",
        application: "ICU, wards, emergency, OT, recovery, diagnostics and transport.",
        note: "Match patient group, parameters, connectivity and sensor compatibility.",
      },
      {
        code: "MON-02",
        name: "Central Monitoring System",
        function: "Consolidates compatible bedside-monitor data for a single clinical overview.",
        options: "Single or multi-station layouts, wall displays, alarm review and scalable networking.",
        application: "ICU, wards, emergency, OT, recovery, diagnostics and transport.",
        note: "Match patient group, parameters, connectivity and sensor compatibility.",
      },
      {
        code: "MON-04",
        name: "ECG Machine",
        function: "Captures, displays and prints cardiac electrical activity for clinical interpretation.",
        options: "1, 3, 6 or 12 channel; interpretation software, battery and connectivity options.",
        application: "ICU, wards, emergency, OT, recovery, diagnostics and transport.",
        note: "Match patient group, parameters, connectivity and sensor compatibility.",
      },
      {
        code: "MON-08",
        name: "Fetal Monitor / CTG",
        function: "Tracks fetal heart rate and uterine activity for obstetric assessment and labour monitoring.",
        options: "Single or twin fetus, printer, central connectivity and compatible transducers.",
        application: "ICU, wards, emergency, OT, recovery, diagnostics and transport.",
        note: "Match patient group, parameters, connectivity and sensor compatibility.",
      },
    ],
  },
  {
    slug: "icu-critical-care",
    code: "ICU",
    number: "02",
    name: "ICU & Critical Care",
    tagline: "ICU, HDU, emergency, recovery, transport and respiratory care.",
    accent: "#FF6B6B",
    accentSoft: "#301418",
    items: [
      {
        code: "ICU-01",
        name: "ICU Ventilator",
        function: "Provides controlled invasive respiratory support with monitored ventilation parameters.",
        options: "Adult, paediatric or neonatal; ventilation modes, graphics, humidification and gas modules.",
        application: "ICU, HDU, emergency, recovery, transport and respiratory care.",
        note: "Confirm patient group, modes, alarms, battery, interfaces and consumables.",
      },
      {
        code: "ICU-06",
        name: "Syringe Pump",
        function: "Controls delivery of small medication volumes with programmable rate and alarms.",
        options: "Single or dual channel, syringe sizes, drug library, docking and battery options.",
        application: "ICU, HDU, emergency, recovery, transport and respiratory care.",
        note: "Confirm patient group, modes, alarms, battery, interfaces and consumables.",
      },
      {
        code: "ICU-09",
        name: "Manual Defibrillator",
        function: "Delivers controlled defibrillation and monitoring for advanced emergency response.",
        options: "Paddles or pads, ECG, pacing, SpO2, printer and battery configuration.",
        application: "ICU, HDU, emergency, recovery, transport and respiratory care.",
        note: "Confirm patient group, modes, alarms, battery, interfaces and consumables.",
      },
      {
        code: "ICU-11",
        name: "Infusion Pump",
        function: "Delivers programmed intravenous fluids, electrolytes and infusions continuously.",
        options: "Drop or volumetric sensor, standard or dedicated IV sets, rate range and alarms.",
        application: "ICU, HDU, emergency, recovery, transport and respiratory care.",
        note: "Confirm patient group, modes, alarms, battery, interfaces and consumables.",
      },
    ],
  },
  {
    slug: "operation-theatre",
    code: "OT",
    number: "03",
    name: "Operation Theatre",
    tagline: "Main OT, day-surgery theatres, minor procedure rooms and emergency suites.",
    accent: "#FFD166",
    accentSoft: "#302610",
    items: [
      {
        code: "OT-01",
        name: "Anaesthesia Workstation",
        function: "Delivers controlled inhalation anaesthesia, monitored ventilation and breathing gas mixture.",
        options: "Vaporiser positions, ventilation modes, integrated gas analysis and suction module.",
        application: "Main OT, day-surgery theatres, minor procedure rooms and emergency suites.",
        note: "Review gas pipeline compatibility, scavenging, monitors and backup cylinders.",
      },
      {
        code: "OT-03",
        name: "Electrosurgical Unit (ESU)",
        function: "Generates high-frequency current for cutting and coagulating biological tissue.",
        options: "Monopolar/bipolar outputs, power levels, vessel sealing and patient-plate monitoring.",
        application: "Main OT, day-surgery theatres, minor procedure rooms and emergency suites.",
        note: "Review gas pipeline compatibility, scavenging, monitors and backup cylinders.",
      },
      {
        code: "OT-05",
        name: "Surgical OT Light",
        function: "Provides high-intensity shadowless illumination over the surgical field.",
        options: "Single or dual dome, ceiling/mobile mount, colour temperature, lux output and camera.",
        application: "Main OT, day-surgery theatres, minor procedure rooms and emergency suites.",
        note: "Review gas pipeline compatibility, scavenging, monitors and backup cylinders.",
      },
      {
        code: "OT-08",
        name: "Hydraulic / Electric OT Table",
        function: "Positions patient securely during surgical procedures with adjustable segments.",
        options: "Electric or electro-hydraulic, radiolucent top, load capacity and specialty attachments.",
        application: "Main OT, day-surgery theatres, minor procedure rooms and emergency suites.",
        note: "Review gas pipeline compatibility, scavenging, monitors and backup cylinders.",
      },
    ],
  },
  {
    slug: "cardiology-diagnostics",
    code: "CARD",
    number: "04",
    name: "Cardiology & Diagnostics",
    tagline: "Cardiology OPD, non-invasive cardiac labs, stress labs and executive health checkup.",
    accent: "#6C5CE7",
    accentSoft: "#15122B",
    items: [
      {
        code: "CARD-01",
        name: "TMT / Stress Test System",
        function: "Records and evaluates 12-lead ECG under controlled exercise workload.",
        options: "Medical treadmill, wireless or wired acquisition, report software and emergency stop.",
        application: "Cardiology OPD, non-invasive cardiac labs, stress labs and executive health checkup.",
        note: "Confirm treadmill duty rating, room dimensions, PC configuration and resuscitation backup.",
      },
      {
        code: "CARD-02",
        name: "Holter Monitoring System",
        function: "Records continuous ECG over 24, 48 hours or longer for ambulatory cardiac analysis.",
        options: "3 or 12 channel recorders, software licences, rapid analysis and event recording.",
        application: "Cardiology OPD, non-invasive cardiac labs, stress labs and executive health checkup.",
        note: "Confirm treadmill duty rating, room dimensions, PC configuration and resuscitation backup.",
      },
      {
        code: "CARD-03",
        name: "Ambulatory Blood Pressure Monitor (ABPM)",
        function: "Measures blood pressure automatically at programmed intervals throughout 24 hours.",
        options: "Multiple cuff sizes, silent pump, software protocols and clinical validation.",
        application: "Cardiology OPD, non-invasive cardiac labs, stress labs and executive health checkup.",
        note: "Confirm treadmill duty rating, room dimensions, PC configuration and resuscitation backup.",
      },
      {
        code: "CARD-06",
        name: "Spirometer",
        function: "Measures pulmonary volumes and flow rates to assess ventilatory lung function.",
        options: "Handheld or PC-based, turbine or pneumotach sensor, disposable mouthpieces and software.",
        application: "Cardiology OPD, non-invasive cardiac labs, stress labs and executive health checkup.",
        note: "Confirm treadmill duty rating, room dimensions, PC configuration and resuscitation backup.",
      },
    ],
  },
  {
    slug: "medical-imaging",
    code: "IMG",
    number: "05",
    name: "Medical Imaging",
    tagline: "Radiology, emergency, orthopaedics, bedside imaging and diagnostic centres.",
    accent: "#00CEC9",
    accentSoft: "#072928",
    items: [
      {
        code: "IMG-01",
        name: "Mobile X-Ray Machine",
        function: "Generates diagnostic radiographic exposures at the bedside or in OT.",
        options: "Line-powered or battery-operated, HF generator kW rating, collimator and tube arm reach.",
        application: "Radiology, emergency, orthopaedics, bedside imaging and diagnostic centres.",
        note: "Confirm generator rating, detector compatibility, radiation safety and room layout.",
      },
      {
        code: "IMG-03",
        name: "C-Arm Image Intensifier",
        function: "Provides real-time fluoroscopic imaging for surgical and interventional procedures.",
        options: "Image intensifier or flat-panel detector, generator power, memory/roadmapping and monitors.",
        application: "Radiology, emergency, orthopaedics, bedside imaging and diagnostic centres.",
        note: "Confirm generator rating, detector compatibility, radiation safety and room layout.",
      },
      {
        code: "IMG-06",
        name: "Diagnostic Ultrasound Machine",
        function: "Produces diagnostic real-time acoustic imaging across multiple clinical specialties.",
        options: "Convex, linear, phased-array or endocavitary probes; Doppler modes and reporting packages.",
        application: "Radiology, emergency, orthopaedics, bedside imaging and diagnostic centres.",
        note: "Confirm generator rating, detector compatibility, radiation safety and room layout.",
      },
      {
        code: "IMG-07",
        name: "Computed Radiography (CR) / DR System",
        function: "Digitises radiographic exposures for viewing, reporting, archiving and PACS transfer.",
        options: "Retrofit DR flat panel, CR reader with imaging plates, acquisition workstation and DICOM.",
        application: "Radiology, emergency, orthopaedics, bedside imaging and diagnostic centres.",
        note: "Confirm generator rating, detector compatibility, radiation safety and room layout.",
      },
    ],
  },
  {
    slug: "laboratory-diagnostics",
    code: "LAB",
    number: "06",
    name: "Laboratory & Diagnostics",
    tagline: "Clinical pathology, biochemistry, emergency labs and diagnostic centres.",
    accent: "#A29BFE",
    accentSoft: "#1B1933",
    items: [
      {
        code: "LAB-01",
        name: "Automated Biochemistry Analyser",
        function: "Measures metabolites, enzymes, electrolytes and substrates in clinical samples.",
        options: "Semi-automated or fully automated, throughput (tests/hour), open or closed reagent system.",
        application: "Clinical pathology, biochemistry, emergency labs and diagnostic centres.",
        note: "Confirm workload throughput, sample volume, reagent availability, controls and calibrators.",
      },
      {
        code: "LAB-02",
        name: "Hematology Analyser",
        function: "Performs complete blood counts (CBC) and leukocyte differential analysis automatically.",
        options: "3-part or 5-part differential, throughput, sample volume requirement and touch display.",
        application: "Clinical pathology, biochemistry, emergency labs and diagnostic centres.",
        note: "Confirm workload throughput, sample volume, reagent availability, controls and calibrators.",
      },
      {
        code: "LAB-04",
        name: "Electrolyte Analyser",
        function: "Quantifies clinical electrolytes (Na+, K+, Cl-, Ca++, Li+) using ion-selective electrodes.",
        options: "Reagent pack vs individual reagents, sample types, throughput and maintenance schedule.",
        application: "Clinical pathology, biochemistry, emergency labs and diagnostic centres.",
        note: "Confirm workload throughput, sample volume, reagent availability, controls and calibrators.",
      },
      {
        code: "LAB-07",
        name: "Laboratory Centrifuge",
        function: "Separates fluid samples of varying density by controlled centrifugal acceleration.",
        options: "Fixed-angle or swing-out rotor, RPM/RCF, tube capacities, timer and safety lid interlock.",
        application: "Clinical pathology, biochemistry, emergency labs and diagnostic centres.",
        note: "Confirm workload throughput, sample volume, reagent availability, controls and calibrators.",
      },
    ],
  },
  {
    slug: "hospital-furniture",
    code: "FURN",
    number: "07",
    name: "Hospital Furniture & Infrastructure",
    tagline: "ICU, general wards, recovery, emergency and patient transfer.",
    accent: "#55EFC4",
    accentSoft: "#0F2E26",
    items: [
      {
        code: "FURN-01",
        name: "Motorised ICU Bed",
        function: "Provides multi-position electrical patient positioning with nurse controls and CPR release.",
        options: "3 or 5 function, central-locking castors, X-ray translucent backrest and battery backup.",
        application: "ICU, general wards, recovery, emergency and patient transfer.",
        note: "Confirm load capacity, castor size, rail safety standards, mattress type and cleaning compatibility.",
      },
      {
        code: "FURN-04",
        name: "Semi-Fowler / Fowler Bed",
        function: "Supports ergonomic patient elevation for general wards and recovery care.",
        options: "Mechanical crank or electrical, side rails, IV pole provisions and castor options.",
        application: "ICU, general wards, recovery, emergency and patient transfer.",
        note: "Confirm load capacity, castor size, rail safety standards, mattress type and cleaning compatibility.",
      },
      {
        code: "FURN-07",
        name: "Emergency Patient Transfer Trolley",
        function: "Facilitates safe, stable inter-department patient transfer with elevation controls.",
        options: "Hydraulic height adjustment, Trendelenburg positions, oxygen cylinder holder and collapsible rails.",
        application: "ICU, general wards, recovery, emergency and patient transfer.",
        note: "Confirm load capacity, castor size, rail safety standards, mattress type and cleaning compatibility.",
      },
      {
        code: "FURN-12",
        name: "Bedside Locker & Overbed Table",
        function: "Provides convenient bedside personal storage and adjustable surface for patient care.",
        options: "Gas-spring or mechanical height, drawer configuration, towel rails and lockable casters.",
        application: "ICU, general wards, recovery, emergency and patient transfer.",
        note: "Confirm load capacity, castor size, rail safety standards, mattress type and cleaning compatibility.",
      },
    ],
  },
  {
    slug: "oxygen-respiratory",
    code: "RESP",
    number: "08",
    name: "Oxygen & Respiratory Care",
    tagline: "Wards, step-down units, home healthcare, emergency and post-operative care.",
    accent: "#74B9FF",
    accentSoft: "#132333",
    items: [
      {
        code: "RESP-01",
        name: "Medical Oxygen Concentrator",
        function: "Separates atmospheric nitrogen to deliver continuous medical-grade concentrated oxygen.",
        options: "5 LPM or 10 LPM, single/dual flow, purity sensor, nebuliser port and hour meter.",
        application: "Wards, step-down units, home healthcare, emergency and post-operative care.",
        note: "Confirm oxygen output LPM, purity alarm, continuous run rating, filter maintenance and consumables.",
      },
      {
        code: "RESP-03",
        name: "BiPAP / CPAP Machine",
        function: "Delivers non-invasive positive airway pressure for obstructive sleep apnea and respiratory failure.",
        options: "Auto-titrating CPAP, BiPAP S/T, integrated heated humidifier, ramp time and data compliance.",
        application: "Wards, step-down units, home healthcare, emergency and post-operative care.",
        note: "Confirm oxygen output LPM, purity alarm, continuous run rating, filter maintenance and consumables.",
      },
      {
        code: "RESP-05",
        name: "Medical Suction Unit",
        function: "Generates controlled vacuum to evacuate secretions, fluids and debris from airway.",
        options: "Electric AC, AC/DC portable, single or double jar (2L/3L), overflow safety and oil-less pump.",
        application: "Wards, step-down units, home healthcare, emergency and post-operative care.",
        note: "Confirm oxygen output LPM, purity alarm, continuous run rating, filter maintenance and consumables.",
      },
      {
        code: "RESP-08",
        name: "Heavy-Duty Medical Compressor Nebuliser",
        function: "Converts liquid respiratory medication into aerosol mist for direct pulmonary inhalation.",
        options: "Continuous hospital rating, particle size (MMAD < 5μm), flow rate and mask kits.",
        application: "Wards, step-down units, home healthcare, emergency and post-operative care.",
        note: "Confirm oxygen output LPM, purity alarm, continuous run rating, filter maintenance and consumables.",
      },
    ],
  },
  {
    slug: "accessories-spare-parts",
    code: "ACC",
    number: "09",
    name: "Accessories & Spare Parts",
    tagline: "Replacement, expansion and preventive maintenance of compatible equipment.",
    accent: "#FF6FB5",
    accentSoft: "#301523",
    items: [
      {
        code: "ACC-01",
        name: "ECG Cables & Lead Wires",
        function: "Connect ECG electrodes to a compatible monitor or ECG machine.",
        options: "3, 5 or 10 lead; snap or clip ends, trunk cable and connector family.",
        application: "Replacement, expansion and preventive maintenance of compatible equipment.",
        note: "Confirm equipment make, model, connector, patient group and reusable or disposable.",
      },
      {
        code: "ACC-02",
        name: "SpO2 Sensors",
        function: "Connect a compatible optical sensor for oxygen-saturation measurement.",
        options: "Adult, paediatric or neonatal; finger clip, soft tip, wrap and extension cable.",
        application: "Replacement, expansion and preventive maintenance of compatible equipment.",
        note: "Confirm equipment make, model, connector, patient group and reusable or disposable.",
      },
      {
        code: "ACC-17",
        name: "Defibrillator Pads",
        function: "Provide adhesive patient contact for compatible defibrillation and pacing.",
        options: "Adult or paediatric, pre-connected or standard connector and shelf life.",
        application: "Replacement, expansion and preventive maintenance of compatible equipment.",
        note: "Confirm equipment make, model, connector, patient group and reusable or disposable.",
      },
      {
        code: "ACC-22",
        name: "Medical Cables, Connectors & Adapters",
        function: "Provide compatible signal, power or mechanical connection between devices and accessories.",
        options: "Connector family, pinout, cable length, shielding and application.",
        application: "Replacement, expansion and preventive maintenance of compatible equipment.",
        note: "Confirm equipment make, model, connector, patient group and reusable or disposable.",
      },
    ],
  },
];

async function seed() {
  console.log("Connecting to MongoDB:", mongoUri);
  const client = new MongoClient(mongoUri);
  await client.connect();
  const db = client.db();

  const categoriesCol = db.collection("categories");
  const productsCol = db.collection("products");

  const now = new Date();
  let categoriesCount = 0;
  let productsCount = 0;

  for (let i = 0; i < categoriesData.length; i++) {
    const cat = categoriesData[i];
    await categoriesCol.updateOne(
      { slug: cat.slug },
      {
        $set: {
          name: cat.name,
          slug: cat.slug,
          description: cat.tagline,
          code: cat.code,
          number: cat.number,
          accent: cat.accent,
          totalCount: cat.items.length,
          isActive: true,
          displayOrder: i + 1,
          image: `/images/categories/${cat.slug}.svg`,
          updatedAt: now,
        },
        $setOnInsert: { createdAt: now },
      },
      { upsert: true }
    );
    categoriesCount++;

    for (let j = 0; j < cat.items.length; j++) {
      const item = cat.items[j];
      const productSlug = slugify(item.name);

      await productsCol.updateOne(
        { productCode: item.code },
        {
          $set: {
            productCode: item.code,
            name: item.name,
            slug: productSlug,
            categoryId: cat.slug,
            categoryName: cat.name,
            shortDescription: item.function,
            description: `${item.function} Designed for reliable clinical deployment in ${item.application.toLowerCase()}`,
            specifications: item.options,
            manufacturer: "SSE Biomedical",
            model: item.code,
            availability: j === 0 || j === 2 ? "In Stock" : "Available on Order",
            image: `/images/products/${item.code.toLowerCase()}.svg`,
            featured: j === 0,
            isActive: true,
            application: item.application,
            selectionNote: item.note,
            updatedAt: now,
          },
          $setOnInsert: { createdAt: now },
        },
        { upsert: true }
      );
      productsCount++;
    }
  }

  const finalPCount = await productsCol.countDocuments();
  const finalCCount = await categoriesCol.countDocuments();

  console.log(`Successfully migrated:`);
  console.log(`- Categories: ${finalCCount} (Processed: ${categoriesCount})`);
  console.log(`- Products: ${finalPCount} (Processed: ${productsCount})`);

  await client.close();
}

seed().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
