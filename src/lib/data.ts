export type Item = {
  code: string;
  name: string;
  function: string;
  options: string;
  application: string;
  note: string;
};

export type Category = {
  slug: string;
  code: string;
  number: string;
  name: string;
  tagline: string;
  totalCount: number;
  accent: string; // tailwind-safe hex used inline
  accentSoft: string;
  items: Item[];
};

export const categories: Category[] = [
  {
    slug: "patient-monitoring",
    code: "MON",
    number: "01",
    name: "Patient Monitoring",
    tagline: "ICU, wards, emergency, OT, recovery, diagnostics and transport.",
    totalCount: 4,
    accent: "#35E7C6",
    accentSoft: "#0F2E2A",
    items: [
      {
        code: "MON-01",
        name: "Multiparameter Patient Monitor",
        function:
          "Continuously displays ECG, SpO2, NIBP, respiration and temperature at the bedside.",
        options:
          "5 or 7 parameter, modular ICU, optional IBP and EtCO2, central-network ready.",
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
    totalCount: 4,
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
        code: "ICU-13",
        name: "ICU Bed",
        function: "Supports powered patient positioning, safe transfers and critical-care procedures.",
        options: "Electric functions, side rails, scale, CPR release, central brake and mattress platform.",
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
    tagline: "Operating theatres, procedure rooms and surgical departments.",
    totalCount: 4,
    accent: "#B98BFF",
    accentSoft: "#211630",
    items: [
      {
        code: "OT-01",
        name: "Operation Table",
        function: "Provides stable, adjustable patient positioning for surgical procedures.",
        options: "Hydraulic or electric, C-arm compatible, radiolucent top and orthopaedic attachments.",
        application: "Operating theatres, procedure rooms and surgical departments.",
        note: "Confirm procedure type, mounting, compatibility, cleaning and power.",
      },
      {
        code: "OT-02",
        name: "Operation Theatre Light",
        function: "Provides shadow-controlled LED illumination over the surgical field.",
        options: "Ceiling or mobile, single or double dome, camera option and examination-light variant.",
        application: "Operating theatres, procedure rooms and surgical departments.",
        note: "Confirm procedure type, mounting, compatibility, cleaning and power.",
      },
      {
        code: "OT-06",
        name: "Electrosurgical Unit",
        function: "Provides high-frequency cutting and coagulation for compatible surgical accessories.",
        options: "Monopolar, bipolar or vessel sealing; power range, modes and foot control.",
        application: "Operating theatres, procedure rooms and surgical departments.",
        note: "Confirm procedure type, mounting, compatibility, cleaning and power.",
      },
      {
        code: "OT-09",
        name: "Laparoscopy System",
        function: "Provides minimally invasive abdominal visualisation through a complete video tower.",
        options: "Camera, light source, insufflator, monitor, trolley, telescope and instruments.",
        application: "Operating theatres, procedure rooms and surgical departments.",
        note: "Confirm procedure type, mounting, compatibility, cleaning and power.",
      },
    ],
  },
  {
    slug: "diagnostic-equipment",
    code: "DIA",
    number: "04",
    name: "Diagnostic Equipment",
    tagline: "Clinics, diagnostic centres, wards and specialist departments.",
    totalCount: 4,
    accent: "#3FD0FF",
    accentSoft: "#0E2530",
    items: [
      {
        code: "DIA-01",
        name: "Digital Blood Pressure Monitor",
        function: "Measures systolic, diastolic and pulse values automatically using an inflatable cuff.",
        options: "Upper-arm or tabletop, adult or paediatric cuff, memory and power options.",
        application: "Clinics, diagnostic centres, wards and specialist departments.",
        note: "Confirm clinical application, channels, software, reports and accessories.",
      },
      {
        code: "DIA-05",
        name: "EEG Machine",
        function: "Records electrical brain activity through multiple scalp-electrode channels.",
        options: "Channel count, amplifier, electrode system, video, software and review workstation.",
        application: "Clinics, diagnostic centres, wards and specialist departments.",
        note: "Confirm clinical application, channels, software, reports and accessories.",
      },
      {
        code: "DIA-07",
        name: "TMT / Stress-Test System",
        function: "Combines ECG acquisition and controlled treadmill exercise for supervised cardiac testing.",
        options: "Treadmill grade, ECG channels, BP integration, protocols and analysis software.",
        application: "Clinics, diagnostic centres, wards and specialist departments.",
        note: "Confirm clinical application, channels, software, reports and accessories.",
      },
      {
        code: "DIA-17",
        name: "Glucometer",
        function: "Measures capillary blood-glucose concentration using compatible test strips.",
        options: "Memory, coding method, sample volume, connectivity and strip availability.",
        application: "Clinics, diagnostic centres, wards and specialist departments.",
        note: "Confirm clinical application, channels, software, reports and accessories.",
      },
    ],
  },
  {
    slug: "imaging-radiology",
    code: "IMG",
    number: "05",
    name: "Imaging & Radiology",
    tagline: "Radiology departments, mobile imaging and procedure support.",
    totalCount: 4,
    accent: "#FFB648",
    accentSoft: "#302410",
    items: [
      {
        code: "IMG-01",
        name: "Fixed X-ray System",
        function: "Produces projection radiographs from a fixed room-based generator and tube stand.",
        options: "Generator power, table, bucky, ceiling or floor stand and detector configuration.",
        application: "Radiology departments, mobile imaging and procedure support.",
        note: "Confirm site planning, power, shielding, detector, software and service needs.",
      },
      {
        code: "IMG-06",
        name: "Ultrasound / Colour Doppler",
        function: "Creates real-time ultrasound images and blood-flow information without ionising radiation.",
        options: "Portable or cart based; convex, linear, cardiac and specialty probes.",
        application: "Radiology departments, mobile imaging and procedure support.",
        note: "Confirm site planning, power, shielding, detector, software and service needs.",
      },
      {
        code: "IMG-08",
        name: "CT Scanner",
        function: "Creates cross-sectional images using rotating X-ray acquisition and reconstruction.",
        options: "Slice class, bore, tube capacity, applications, workstation and injector integration.",
        application: "Radiology departments, mobile imaging and procedure support.",
        note: "Confirm site planning, power, shielding, detector, software and service needs.",
      },
      {
        code: "IMG-09",
        name: "MRI Scanner",
        function: "Creates detailed images using magnetic fields and radiofrequency signals.",
        options: "Field strength, bore, coils, applications, workstation and site infrastructure.",
        application: "Radiology departments, mobile imaging and procedure support.",
        note: "Confirm site planning, power, shielding, detector, software and service needs.",
      },
    ],
  },
  {
    slug: "laboratory-equipment",
    code: "LAB",
    number: "06",
    name: "Laboratory Equipment",
    tagline: "Clinical laboratories, pathology, blood banks and research workflows.",
    totalCount: 4,
    accent: "#7C6FFF",
    accentSoft: "#1A1730",
    items: [
      {
        code: "LAB-01",
        name: "3-Part Haematology Analyser",
        function: "Automates complete blood-count testing with three-part white-cell differentiation.",
        options: "Throughput, parameters, sample mode, reagents, printer and LIS connectivity.",
        application: "Clinical laboratories, pathology, blood banks and research workflows.",
        note: "Match test menu, throughput, sample volume, reagents, QC and infrastructure.",
      },
      {
        code: "LAB-04",
        name: "Fully Automatic Biochemistry Analyser",
        function: "Automates sample, reagent, reaction and result handling for chemistry testing.",
        options: "Throughput, reagent positions, ISE module, sample loader and LIS.",
        application: "Clinical laboratories, pathology, blood banks and research workflows.",
        note: "Match test menu, throughput, sample volume, reagents, QC and infrastructure.",
      },
      {
        code: "LAB-21",
        name: "Laminar Airflow Cabinet",
        function: "Provides HEPA-filtered unidirectional clean air over a protected work surface.",
        options: "Horizontal or vertical flow, width, UV lamp, stand and monitoring.",
        application: "Clinical laboratories, pathology, blood banks and research workflows.",
        note: "Match test menu, throughput, sample volume, reagents, QC and infrastructure.",
      },
      {
        code: "LAB-31",
        name: "Spectrophotometer",
        function: "Measures optical absorbance or transmission across selected wavelengths.",
        options: "Visible or UV-visible, bandwidth, wavelength range, cuvette holder and software.",
        application: "Clinical laboratories, pathology, blood banks and research workflows.",
        note: "Match test menu, throughput, sample volume, reagents, QC and infrastructure.",
      },
    ],
  },
  {
    slug: "hospital-furniture",
    code: "FUR",
    number: "07",
    name: "Hospital Furniture",
    tagline: "Hospitals, nursing homes, clinics and patient-care areas.",
    totalCount: 4,
    accent: "#4ADE80",
    accentSoft: "#122b1c",
    items: [
      {
        code: "FUR-01",
        name: "Hospital Bed",
        function: "Supports patient positioning, nursing care and safe movement within healthcare facilities.",
        options: "Manual, semi-electric, fully electric, ICU, Fowler and paediatric variants.",
        application: "Hospitals, nursing homes, clinics and patient-care areas.",
        note: "Confirm dimensions, load capacity, functions, finish, cleaning and mobility.",
      },
      {
        code: "FUR-04",
        name: "Labour Delivery Table",
        function: "Supports adjustable positioning through labour and delivery workflows.",
        options: "Manual or electric, segmented top, leg supports, basin and accessories.",
        application: "Hospitals, nursing homes, clinics and patient-care areas.",
        note: "Confirm dimensions, load capacity, functions, finish, cleaning and mobility.",
      },
      {
        code: "FUR-11",
        name: "Wheelchair",
        function: "Supports seated mobility for patients with varying transfer and posture needs.",
        options: "Standard, commode or reclining; leg rests, armrests, brakes and load capacity.",
        application: "Hospitals, nursing homes, clinics and patient-care areas.",
        note: "Confirm dimensions, load capacity, functions, finish, cleaning and mobility.",
      },
      {
        code: "FUR-17",
        name: "Emergency / Crash Cart",
        function: "Keeps resuscitation equipment and emergency supplies organised for rapid use.",
        options: "Drawer layout, seal lock, CPR board, oxygen holder and accessory rail.",
        application: "Hospitals, nursing homes, clinics and patient-care areas.",
        note: "Confirm dimensions, load capacity, functions, finish, cleaning and mobility.",
      },
    ],
  },
  {
    slug: "oxygen-respiratory",
    code: "OXY",
    number: "08",
    name: "Oxygen & Respiratory",
    tagline: "Hospitals, ICUs, wards, clinics and central gas installations.",
    totalCount: 4,
    accent: "#FFD23F",
    accentSoft: "#332c0d",
    items: [
      {
        code: "OXY-01",
        name: "Oxygen Concentrator",
        function: "Concentrates oxygen from ambient air for continuous medical oxygen delivery.",
        options: "5 litre, 10 litre or dual flow; purity display, alarms and nebulizer outlet.",
        application: "Hospitals, ICUs, wards, clinics and central gas installations.",
        note: "Confirm flow, pressure, purity, capacity, gas standard and pipeline compatibility.",
      },
      {
        code: "OXY-04",
        name: "PSA Oxygen-Generation Plant",
        function: "Generates oxygen on site using pressure-swing adsorption technology.",
        options: "Capacity, purity, compressor, dryer, storage, redundancy and monitoring.",
        application: "Hospitals, ICUs, wards, clinics and central gas installations.",
        note: "Confirm flow, pressure, purity, capacity, gas standard and pipeline compatibility.",
      },
      {
        code: "OXY-06",
        name: "Central Vacuum Pump System",
        function: "Generates medical vacuum for pipeline suction outlets.",
        options: "Pump technology, capacity, receiver, bacterial filters, redundancy and controls.",
        application: "Hospitals, ICUs, wards, clinics and central gas installations.",
        note: "Confirm flow, pressure, purity, capacity, gas standard and pipeline compatibility.",
      },
      {
        code: "OXY-11",
        name: "CPAP & BiPAP Systems",
        function: "Provide non-invasive positive-pressure respiratory support through a fitted mask.",
        options: "CPAP or bilevel, humidifier, data, backup rate and mask configuration.",
        application: "Hospitals, ICUs, wards, clinics and central gas installations.",
        note: "Confirm flow, pressure, purity, capacity, gas standard and pipeline compatibility.",
      },
    ],
  },
  {
    slug: "accessories-spare-parts",
    code: "ACC",
    number: "09",
    name: "Accessories & Spare Parts",
    tagline: "Replacement, expansion and preventive maintenance of compatible equipment.",
    totalCount: 4,
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

export const company = {
  name: "Shree Shyam Electronics",
  division: "Biomedical Systems",
  contactPerson: "Amol Agrawal",
  phone: "+91 82752 90643",
  phoneHref: "+918275290643",
  email: process.env.NEXT_PUBLIC_COMPANY_EMAIL || "",
};

export function getCategory(slug: string) {
  return categories.find((c) => c.slug === slug);
}

export type CatalogItemWithCategory = Item & {
  categoryName: string;
  categorySlug: string;
  categoryCode: string;
  categoryAccent: string;
};

export function getAllItems(): CatalogItemWithCategory[] {
  return categories.flatMap((cat) =>
    cat.items.map((item) => ({
      ...item,
      categoryName: cat.name,
      categorySlug: cat.slug,
      categoryCode: cat.code,
      categoryAccent: cat.accent,
    }))
  );
}
