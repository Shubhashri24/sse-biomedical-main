"use client";

import React, { useState, useEffect } from "react";
import type {
  SupplierDoc,
  SupplierType,
  BusinessRegistrationType,
  GstRegistrationStatus,
  SupplierPaymentTerms,
  SupplierStatus,
  SupplierAddressInfo,
  SupplierDocumentReference,
} from "@/lib/mongodb";

interface SupplierRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplier: SupplierDoc | null;
  onSaved: (saved: SupplierDoc) => void;
}

const SUPPLIER_TYPES: SupplierType[] = [
  "Manufacturer",
  "Authorized Distributor",
  "Dealer",
  "Importer",
  "Service Provider",
  "Other",
];

const BUSINESS_REG_TYPES: BusinessRegistrationType[] = [
  "Private Limited",
  "Proprietorship",
  "Partnership",
  "LLP",
  "Public Limited",
  "Other",
];

const GST_STATUSES: GstRegistrationStatus[] = [
  "Registered",
  "Unregistered",
  "Composition Scheme",
  "Not Applicable",
];

const PAYMENT_TERMS_OPTIONS: SupplierPaymentTerms[] = [
  "Advance",
  "Immediate",
  "Net 15",
  "Net 30",
  "Net 45",
  "Net 60",
  "Custom",
];

const SUPPLIER_STATUS_OPTIONS: SupplierStatus[] = [
  "Active",
  "Inactive",
  "Suspended",
  "Pending Approval",
];

const PRODUCT_CATEGORIES = [
  "Diagnostic Equipment",
  "Imaging Equipment",
  "Patient Monitoring",
  "ICU / Critical Care Equipment",
  "Laboratory Equipment",
  "Surgical Equipment",
  "Hospital Furniture",
  "Medical Consumables",
  "Biomedical Spare Parts",
  "Installation & Commissioning",
  "Repair & Maintenance",
  "Calibration Services",
  "Other",
];

const DOCUMENT_TYPES = [
  "GST Certificate",
  "PAN Document",
  "Company Registration Certificate",
  "MSME / Udyam Certificate",
  "OEM Authorization Letter",
  "ISO Certificate",
  "Medical Device / Regulatory Certificate",
  "Cancelled Cheque or Bank Proof",
  "Other Document",
];

const INDIAN_STATES = [
  "Andhra Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Delhi NCR",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Tamil Nadu",
  "Telangana",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
];

export default function SupplierRegistrationModal({
  isOpen,
  onClose,
  supplier,
  onSaved,
}: SupplierRegistrationModalProps) {
  const isEditing = !!supplier;

  // Active section tab for accordion / jump
  const [activeSection, setActiveSection] = useState<string>("all");

  // Form State
  // Section A: Company & Business
  const [companyName, setCompanyName] = useState("");
  const [supplierType, setSupplierType] = useState<SupplierType>("Authorized Distributor");
  const [businessRegistrationType, setBusinessRegistrationType] = useState<BusinessRegistrationType>("Private Limited");
  const [yearEstablished, setYearEstablished] = useState("");
  const [website, setWebsite] = useState("");
  const [companyDescription, setCompanyDescription] = useState("");
  const [employeeCount, setEmployeeCount] = useState("");
  const [panNumber, setPanNumber] = useState("");
  const [gstRegistrationStatus, setGstRegistrationStatus] = useState<GstRegistrationStatus>("Registered");
  const [gstNumber, setGstNumber] = useState("");
  const [cinNumber, setCinNumber] = useState("");
  const [msmeNumber, setMsmeNumber] = useState("");
  const [iecCode, setIecCode] = useState("");

  // Section B: Contact Information
  const [contactPerson, setContactPerson] = useState("");
  const [designation, setDesignation] = useState("");
  const [email, setEmail] = useState("");
  const [alternateEmail, setAlternateEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [alternatePhone, setAlternatePhone] = useState("");
  const [accountsBillingEmail, setAccountsBillingEmail] = useState("");

  // Section C: Registered Address
  const [streetAddress, setStreetAddress] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [pinCode, setPinCode] = useState("");
  const [country, setCountry] = useState("India");

  // Billing & Shipping checkboxes
  const [billingSameAsRegistered, setBillingSameAsRegistered] = useState(true);
  const [billingAddress, setBillingAddress] = useState<SupplierAddressInfo>({
    streetAddress: "",
    addressLine2: "",
    city: "",
    state: "",
    pinCode: "",
    country: "India",
  });

  const [shippingSameAsRegistered, setShippingSameAsRegistered] = useState(true);
  const [shippingAddress, setShippingAddress] = useState<SupplierAddressInfo>({
    streetAddress: "",
    addressLine2: "",
    city: "",
    state: "",
    pinCode: "",
    country: "India",
  });

  // Section D: Banking & Payment
  const [bankName, setBankName] = useState("");
  const [accountHolderName, setAccountHolderName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [confirmAccountNumber, setConfirmAccountNumber] = useState("");
  const [ifscCode, setIfscCode] = useState("");
  const [branchName, setBranchName] = useState("");
  const [accountType, setAccountType] = useState<"Current" | "Savings" | "Other">("Current");
  const [paymentTerms, setPaymentTerms] = useState<SupplierPaymentTerms>("Net 30");
  const [customPaymentTerms, setCustomPaymentTerms] = useState("");
  const [creditLimit, setCreditLimit] = useState("");
  const [currency, setCurrency] = useState("INR");
  const [upiId, setUpiId] = useState("");
  const [bankVerificationStatus, setBankVerificationStatus] = useState<"Pending Verification" | "Verified" | "Rejected" | "Unverified">("Pending Verification");
  const [showAccountDigits, setShowAccountDigits] = useState(false);

  // Section E: Biomedical Capabilities
  const [productCategories, setProductCategories] = useState<string[]>([]);
  const [brandsInput, setBrandsInput] = useState("");
  const [equipmentModels, setEquipmentModels] = useState("");
  const [isAuthorizedDistributor, setIsAuthorizedDistributor] = useState(true);
  const [manufacturerAuthorizationDetails, setManufacturerAuthorizationDetails] = useState("");
  const [geographicServiceCoverage, setGeographicServiceCoverage] = useState("Pan-India");
  const [statesServed, setStatesServed] = useState<string[]>([]);
  const [hasInstallationSupport, setHasInstallationSupport] = useState(true);
  const [hasWarrantySupport, setHasWarrantySupport] = useState(true);
  const [hasAfterSalesService, setHasAfterSalesService] = useState(true);
  const [typicalLeadTimeDays, setTypicalLeadTimeDays] = useState("7-14 Days");
  const [minimumOrderValue, setMinimumOrderValue] = useState("");

  // Section F: Compliance Documents
  const [documents, setDocuments] = useState<SupplierDocumentReference[]>([]);

  // Section G: Procurement & Review
  const [notes, setNotes] = useState("");
  const [agreedCommercialTerms, setAgreedCommercialTerms] = useState("");
  const [warrantyReturnPolicy, setWarrantyReturnPolicy] = useState("");
  const [deliveryInstallationTerms, setDeliveryInstallationTerms] = useState("");
  const [isPreferredSupplier, setIsPreferredSupplier] = useState(false);
  const [supplierRating, setSupplierRating] = useState<number>(4);
  const [internalRiskReviewNotes, setInternalRiskReviewNotes] = useState("");
  const [supplierStatus, setSupplierStatus] = useState<SupplierStatus>("Active");
  const [isActive, setIsActive] = useState(true);

  // UI status
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Reset or Populate form
  useEffect(() => {
    if (supplier) {
      setCompanyName(supplier.companyName || "");
      setSupplierType((supplier.supplierType as SupplierType) || "Authorized Distributor");
      setBusinessRegistrationType((supplier.businessRegistrationType as BusinessRegistrationType) || "Private Limited");
      setYearEstablished(supplier.yearEstablished ? String(supplier.yearEstablished) : "");
      setWebsite(supplier.website || "");
      setCompanyDescription(supplier.companyDescription || "");
      setEmployeeCount(supplier.employeeCount || "");
      setPanNumber(supplier.panNumber || "");
      setGstRegistrationStatus((supplier.gstRegistrationStatus as GstRegistrationStatus) || (supplier.gstNumber ? "Registered" : "Unregistered"));
      setGstNumber(supplier.gstNumber || "");
      setCinNumber(supplier.cinNumber || "");
      setMsmeNumber(supplier.msmeNumber || "");
      setIecCode(supplier.iecCode || "");

      setContactPerson(supplier.contactPerson || "");
      setDesignation(supplier.designation || "");
      setEmail(supplier.email || "");
      setAlternateEmail(supplier.alternateEmail || "");
      setPhone(supplier.phone || "");
      setAlternatePhone(supplier.alternatePhone || "");
      setAccountsBillingEmail(supplier.accountsBillingEmail || "");

      const reg = supplier.registeredOfficeAddress || {};
      setStreetAddress(supplier.streetAddress || reg.streetAddress || supplier.address || "");
      setAddressLine2(supplier.addressLine2 || reg.addressLine2 || "");
      setCity(supplier.city || reg.city || "");
      setState(supplier.state || reg.state || "");
      setPinCode(supplier.pinCode || reg.pinCode || "");
      setCountry(supplier.country || reg.country || "India");

      setBillingSameAsRegistered(supplier.billingSameAsRegistered !== false);
      setBillingAddress(supplier.billingAddress || {
        streetAddress: "",
        addressLine2: "",
        city: "",
        state: "",
        pinCode: "",
        country: "India",
      });

      setShippingSameAsRegistered(supplier.shippingSameAsRegistered !== false);
      setShippingAddress(supplier.shippingAddress || {
        streetAddress: "",
        addressLine2: "",
        city: "",
        state: "",
        pinCode: "",
        country: "India",
      });

      const b = supplier.bankingDetails || {};
      setBankName(b.bankName || "");
      setAccountHolderName(b.accountHolderName || "");
      setAccountNumber(b.accountNumber || "");
      setConfirmAccountNumber(b.accountNumber || "");
      setIfscCode(b.ifscCode || "");
      setBranchName(b.branchName || "");
      setAccountType((b.accountType as "Current" | "Savings" | "Other") || "Current");
      setPaymentTerms((b.paymentTerms as SupplierPaymentTerms) || "Net 30");
      setCustomPaymentTerms(b.customPaymentTerms || "");
      setCreditLimit(b.creditLimit !== undefined ? String(b.creditLimit) : "");
      setCurrency(b.currency || "INR");
      setUpiId(b.upiId || "");
      setBankVerificationStatus(
        (b.verificationStatus as "Pending Verification" | "Verified" | "Rejected" | "Unverified") || "Pending Verification"
      );

      setProductCategories(supplier.productCategories || []);
      setBrandsInput(supplier.brandsRepresented ? supplier.brandsRepresented.join(", ") : "");
      setEquipmentModels(supplier.equipmentModels || "");
      setIsAuthorizedDistributor(supplier.isAuthorizedDistributor ?? true);
      setManufacturerAuthorizationDetails(supplier.manufacturerAuthorizationDetails || "");
      setGeographicServiceCoverage(supplier.geographicServiceCoverage || "Pan-India");
      setStatesServed(supplier.statesServed || []);
      setHasInstallationSupport(supplier.hasInstallationSupport ?? true);
      setHasWarrantySupport(supplier.hasWarrantySupport ?? true);
      setHasAfterSalesService(supplier.hasAfterSalesService ?? true);
      setTypicalLeadTimeDays(supplier.typicalLeadTimeDays ? String(supplier.typicalLeadTimeDays) : "7-14 Days");
      setMinimumOrderValue(supplier.minimumOrderValue !== undefined ? String(supplier.minimumOrderValue) : "");

      setDocuments(supplier.documents || []);

      setNotes(supplier.notes || "");
      setAgreedCommercialTerms(supplier.agreedCommercialTerms || "");
      setWarrantyReturnPolicy(supplier.warrantyReturnPolicy || "");
      setDeliveryInstallationTerms(supplier.deliveryInstallationTerms || "");
      setIsPreferredSupplier(supplier.isPreferredSupplier ?? false);
      setSupplierRating(supplier.supplierRating || 4);
      setInternalRiskReviewNotes(supplier.internalRiskReviewNotes || "");
      setSupplierStatus((supplier.supplierStatus as SupplierStatus) || (supplier.isActive ? "Active" : "Inactive"));
      setIsActive(supplier.isActive ?? true);
    } else {
      // Default clean values for new supplier
      setCompanyName("");
      setSupplierType("Authorized Distributor");
      setBusinessRegistrationType("Private Limited");
      setYearEstablished("");
      setWebsite("");
      setCompanyDescription("");
      setEmployeeCount("11-50");
      setPanNumber("");
      setGstRegistrationStatus("Registered");
      setGstNumber("");
      setCinNumber("");
      setMsmeNumber("");
      setIecCode("");

      setContactPerson("");
      setDesignation("Sales / Biomedical Procurement Lead");
      setEmail("");
      setAlternateEmail("");
      setPhone("");
      setAlternatePhone("");
      setAccountsBillingEmail("");

      setStreetAddress("");
      setAddressLine2("");
      setCity("");
      setState("Maharashtra");
      setPinCode("");
      setCountry("India");

      setBillingSameAsRegistered(true);
      setBillingAddress({
        streetAddress: "",
        addressLine2: "",
        city: "",
        state: "",
        pinCode: "",
        country: "India",
      });

      setShippingSameAsRegistered(true);
      setShippingAddress({
        streetAddress: "",
        addressLine2: "",
        city: "",
        state: "",
        pinCode: "",
        country: "India",
      });

      setBankName("");
      setAccountHolderName("");
      setAccountNumber("");
      setConfirmAccountNumber("");
      setIfscCode("");
      setBranchName("");
      setAccountType("Current");
      setPaymentTerms("Net 30");
      setCustomPaymentTerms("");
      setCreditLimit("");
      setCurrency("INR");
      setUpiId("");
      setBankVerificationStatus("Pending Verification");

      setProductCategories(["Diagnostic Equipment", "Patient Monitoring"]);
      setBrandsInput("");
      setEquipmentModels("");
      setIsAuthorizedDistributor(true);
      setManufacturerAuthorizationDetails("");
      setGeographicServiceCoverage("Pan-India");
      setStatesServed(["Maharashtra", "Gujarat", "Delhi NCR"]);
      setHasInstallationSupport(true);
      setHasWarrantySupport(true);
      setHasAfterSalesService(true);
      setTypicalLeadTimeDays("7-14 Days");
      setMinimumOrderValue("");

      setDocuments([]);

      setNotes("");
      setAgreedCommercialTerms("");
      setWarrantyReturnPolicy("");
      setDeliveryInstallationTerms("");
      setIsPreferredSupplier(false);
      setSupplierRating(4);
      setInternalRiskReviewNotes("");
      setSupplierStatus("Active");
      setIsActive(true);
    }
    setErrorMessage("");
    setFieldErrors({});
    setShowAccountDigits(false);
  }, [supplier, isOpen]);

  if (!isOpen) return null;

  // Category toggle helper
  const toggleCategory = (cat: string) => {
    setProductCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  // State served toggle helper
  const toggleStateServed = (st: string) => {
    setStatesServed((prev) =>
      prev.includes(st) ? prev.filter((s) => s !== st) : [...prev, st]
    );
  };

  // Document management helpers
  const handleAddDocument = () => {
    const newDoc: SupplierDocumentReference = {
      id: `DOC-${Date.now()}`,
      documentType: "OEM Authorization Letter",
      documentReferenceNumber: "",
      issueDate: null,
      expiryDate: null,
      verificationStatus: "Pending",
      reviewNotes: "",
      submittedAt: new Date(),
    };
    setDocuments([...documents, newDoc]);
  };

  const handleUpdateDocument = (index: number, updates: Partial<SupplierDocumentReference>) => {
    setDocuments((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], ...updates };
      return copy;
    });
  };

  const handleRemoveDocument = (index: number) => {
    setDocuments((prev) => prev.filter((_, i) => i !== index));
  };

  // Validation
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!companyName.trim()) {
      errors.companyName = "Company / OEM name is required.";
    }

    if (!contactPerson.trim()) {
      errors.contactPerson = "Primary contact person is required.";
    }

    if (!email.trim()) {
      errors.email = "Business email is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = "Invalid business email address format.";
    }

    if (alternateEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(alternateEmail.trim())) {
      errors.alternateEmail = "Invalid alternate email address format.";
    }

    if (accountsBillingEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(accountsBillingEmail.trim())) {
      errors.accountsBillingEmail = "Invalid accounts email format.";
    }

    if (!phone.trim()) {
      errors.phone = "Primary phone number is required.";
    } else if (!/^[+0-9\s\-()]{7,20}$/.test(phone.trim())) {
      errors.phone = "Phone number must contain 7-20 digits.";
    }

    if (panNumber.trim() && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(panNumber.trim().toUpperCase())) {
      errors.panNumber = "PAN format must be 5 letters, 4 digits, 1 letter (e.g. ABCDE1234F).";
    }

    if (gstRegistrationStatus === "Registered" && gstNumber.trim()) {
      if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(gstNumber.trim().toUpperCase())) {
        errors.gstNumber = "Invalid GSTIN format (15 characters, e.g. 27ABCDE1234F1Z5).";
      }
    }

    if (accountNumber.trim()) {
      const cleanAcc = accountNumber.trim().replace(/\s+/g, "");
      if (!/^\d{6,24}$/.test(cleanAcc)) {
        errors.accountNumber = "Bank account number must be 6 to 24 numeric digits.";
      }
      if (confirmAccountNumber && confirmAccountNumber.trim().replace(/\s+/g, "") !== cleanAcc) {
        errors.confirmAccountNumber = "Account numbers do not match.";
      }
    }

    if (ifscCode.trim() && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifscCode.trim().toUpperCase())) {
      errors.ifscCode = "Invalid IFSC format (e.g. CBIN0280710: 4 letters, 0, 6 alphanumeric).";
    }

    if (paymentTerms === "Custom" && !customPaymentTerms.trim()) {
      errors.customPaymentTerms = "Please specify custom payment terms.";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (!validateForm()) {
      setErrorMessage("Please review the highlighted validation errors before saving.");
      return;
    }

    setSubmitting(true);

    try {
      // Clean brands
      const brandsRepresented = brandsInput
        .split(/[,;\n]+/)
        .map((b) => b.trim())
        .filter(Boolean);

      // Clean banking details
      const cleanAcc = accountNumber.trim().replace(/\s+/g, "");
      let bankingDetailsPayload = undefined;
      if (bankName.trim() || accountHolderName.trim() || cleanAcc || ifscCode.trim()) {
        bankingDetailsPayload = {
          bankName: bankName.trim(),
          accountHolderName: accountHolderName.trim(),
          accountNumber: cleanAcc,
          ifscCode: ifscCode.trim().toUpperCase(),
          branchName: branchName.trim(),
          accountType,
          paymentTerms,
          customPaymentTerms: paymentTerms === "Custom" ? customPaymentTerms.trim() : undefined,
          creditLimit: creditLimit.trim() ? parseFloat(creditLimit) : undefined,
          currency: currency.trim() || "INR",
          upiId: upiId.trim(),
          verificationStatus: bankVerificationStatus,
        };
      }

      // Address blocks
      const registeredOfficeAddress: SupplierAddressInfo = {
        streetAddress: streetAddress.trim(),
        addressLine2: addressLine2.trim(),
        city: city.trim(),
        state: state.trim(),
        pinCode: pinCode.trim(),
        country: country.trim() || "India",
      };

      const payload = {
        // Section A
        companyName: companyName.trim(),
        supplierType,
        businessRegistrationType,
        yearEstablished: yearEstablished.trim() || undefined,
        website: website.trim(),
        companyDescription: companyDescription.trim(),
        employeeCount: employeeCount.trim(),
        panNumber: panNumber.trim().toUpperCase(),
        gstRegistrationStatus,
        gstNumber: gstRegistrationStatus === "Registered" ? gstNumber.trim().toUpperCase() : "",
        cinNumber: cinNumber.trim().toUpperCase(),
        msmeNumber: msmeNumber.trim(),
        iecCode: iecCode.trim(),

        // Section B
        contactPerson: contactPerson.trim(),
        designation: designation.trim(),
        email: email.trim().toLowerCase(),
        alternateEmail: alternateEmail.trim().toLowerCase(),
        phone: phone.trim(),
        alternatePhone: alternatePhone.trim(),
        accountsBillingEmail: accountsBillingEmail.trim().toLowerCase(),

        // Section C
        streetAddress: streetAddress.trim(),
        addressLine2: addressLine2.trim(),
        city: city.trim(),
        state: state.trim(),
        pinCode: pinCode.trim(),
        country: country.trim() || "India",
        registeredOfficeAddress,
        billingSameAsRegistered,
        billingAddress: billingSameAsRegistered ? registeredOfficeAddress : billingAddress,
        shippingSameAsRegistered,
        shippingAddress: shippingSameAsRegistered ? registeredOfficeAddress : shippingAddress,

        // Section D
        bankingDetails: bankingDetailsPayload,

        // Section E
        productCategories,
        brandsRepresented,
        equipmentModels: equipmentModels.trim(),
        isAuthorizedDistributor,
        manufacturerAuthorizationDetails: isAuthorizedDistributor ? manufacturerAuthorizationDetails.trim() : "",
        geographicServiceCoverage,
        statesServed,
        hasInstallationSupport,
        hasWarrantySupport,
        hasAfterSalesService,
        typicalLeadTimeDays: typicalLeadTimeDays.trim(),
        minimumOrderValue: minimumOrderValue.trim() ? parseFloat(minimumOrderValue) : undefined,

        // Section F
        documents,

        // Section G
        notes: notes.trim(),
        agreedCommercialTerms: agreedCommercialTerms.trim(),
        warrantyReturnPolicy: warrantyReturnPolicy.trim(),
        deliveryInstallationTerms: deliveryInstallationTerms.trim(),
        isPreferredSupplier,
        supplierRating,
        internalRiskReviewNotes: internalRiskReviewNotes.trim(),
        supplierStatus,
        isActive,
      };

      const url = isEditing
        ? `/api/admin/suppliers/${supplier.supplierCode || supplier._id}`
        : "/api/admin/suppliers";
      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMessage(data.message || "Failed to save supplier partner record.");
        setSubmitting(false);
        return;
      }

      onSaved(data.supplier);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(`Network error saving supplier: ${msg}`);
    } finally {
      setSubmitting(false);
    }
  };

  const sectionsNav = [
    { id: "all", label: "Full Form" },
    { id: "section-a", label: "A. Company Profile" },
    { id: "section-b", label: "B. Contact Details" },
    { id: "section-c", label: "C. Addresses" },
    { id: "section-d", label: "D. Banking & Terms" },
    { id: "section-e", label: "E. Biomedical Specialization" },
    { id: "section-f", label: "F. Compliance Docs" },
    { id: "section-g", label: "G. Procurement Dossier" },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 sm:p-4 backdrop-blur-xs overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="supplier-modal-title"
    >
      <div className="relative flex flex-col w-full max-w-5xl max-h-[92vh] rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in fade-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/80 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-[#0F9F95] border border-teal-200 shadow-2xs font-bold text-lg">
              🏥
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="supplier-modal-title" className="text-lg font-bold text-slate-900">
                  {isEditing
                    ? `Edit Biomedical Partner: ${supplier.supplierCode}`
                    : "Register Biomedical Supply Partner"}
                </h2>
                {isEditing && (
                  <span className="rounded-full bg-teal-100 px-2.5 py-0.5 text-[11px] font-semibold text-teal-800">
                    {supplier.companyName}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Comprehensive OEM, distributor, banking, and regulatory compliance dossier for hospital procurement.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {/* Section Quick Jump Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto border-b border-slate-100 bg-white px-6 py-2.5 scrollbar-thin">
          {sectionsNav.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setActiveSection(s.id)}
              className={`rounded-lg px-3 py-1 text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                activeSection === s.id
                  ? "bg-[#0F9F95] text-white shadow-2xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Error Banner */}
        {errorMessage && (
          <div className="mx-6 mt-4 rounded-xl bg-red-50 p-3.5 text-xs font-medium text-red-700 border border-red-200 flex items-start gap-2 shadow-2xs">
            <span className="text-base leading-none">⚠️</span>
            <div className="flex-1">{errorMessage}</div>
          </div>
        )}

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* SECTION A: Company & Business Information */}
          {(activeSection === "all" || activeSection === "section-a") && (
            <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-teal-100 text-[#0F9F95] text-xs font-bold">
                    A
                  </span>
                  <h3 className="text-sm font-bold text-slate-800">
                    Company & OEM Business Information
                  </h3>
                </div>
                <span className="text-[11px] text-slate-400 font-medium">Core Credentials</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                {/* Company Name */}
                <div className="md:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">
                    Company / OEM Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="e.g. Siemens Healthcare Private Limited"
                    className={`w-full rounded-lg border px-3 py-2 text-slate-900 focus:outline-none ${
                      fieldErrors.companyName
                        ? "border-red-400 bg-red-50/50"
                        : "border-slate-300 focus:border-teal-600"
                    }`}
                    required
                  />
                  {fieldErrors.companyName && (
                    <p className="text-[11px] text-red-600 mt-1">{fieldErrors.companyName}</p>
                  )}
                </div>

                {/* Supplier Type */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Supplier Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={supplierType}
                    onChange={(e) => setSupplierType(e.target.value as SupplierType)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-teal-600 focus:outline-none bg-white"
                  >
                    {SUPPLIER_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Business Registration Type */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Business Registration Type
                  </label>
                  <select
                    value={businessRegistrationType}
                    onChange={(e) =>
                      setBusinessRegistrationType(e.target.value as BusinessRegistrationType)
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-teal-600 focus:outline-none bg-white"
                  >
                    {BUSINESS_REG_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Year Established */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Year Established</label>
                  <input
                    type="number"
                    min="1900"
                    max="2099"
                    value={yearEstablished}
                    onChange={(e) => setYearEstablished(e.target.value)}
                    placeholder="e.g. 2008"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-teal-600 focus:outline-none"
                  />
                </div>

                {/* Number of Employees */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Number of Employees</label>
                  <select
                    value={employeeCount}
                    onChange={(e) => setEmployeeCount(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-teal-600 focus:outline-none bg-white"
                  >
                    <option value="">Select range...</option>
                    <option value="1-10">1 - 10 employees</option>
                    <option value="11-50">11 - 50 employees</option>
                    <option value="51-200">51 - 200 employees</option>
                    <option value="201-500">201 - 500 employees</option>
                    <option value="500+">500+ Enterprise</option>
                  </select>
                </div>

                {/* Website URL */}
                <div className="md:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">Official Website URL</label>
                  <input
                    type="text"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="https://www.biomedicalpartner.com"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-teal-600 focus:outline-none"
                  />
                </div>

                {/* Company PAN */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Company PAN Number
                  </label>
                  <input
                    type="text"
                    value={panNumber}
                    maxLength={10}
                    onChange={(e) => setPanNumber(e.target.value.toUpperCase())}
                    placeholder="ABCDE1234F"
                    className={`w-full rounded-lg border px-3 py-2 text-slate-900 font-mono focus:outline-none uppercase ${
                      fieldErrors.panNumber
                        ? "border-red-400 bg-red-50/50"
                        : "border-slate-300 focus:border-teal-600"
                    }`}
                  />
                  {fieldErrors.panNumber && (
                    <p className="text-[11px] text-red-600 mt-1">{fieldErrors.panNumber}</p>
                  )}
                </div>

                {/* GST Registration Status */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    GST Registration Status
                  </label>
                  <select
                    value={gstRegistrationStatus}
                    onChange={(e) =>
                      setGstRegistrationStatus(e.target.value as GstRegistrationStatus)
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-teal-600 focus:outline-none bg-white"
                  >
                    {GST_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                {/* GSTIN (Conditional) */}
                {gstRegistrationStatus === "Registered" ? (
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      GSTIN <span className="text-teal-600 font-normal">(15 digits)</span>
                    </label>
                    <input
                      type="text"
                      maxLength={15}
                      value={gstNumber}
                      onChange={(e) => setGstNumber(e.target.value.toUpperCase())}
                      placeholder="27AABCS1429B1Z8"
                      className={`w-full rounded-lg border px-3 py-2 text-slate-900 font-mono focus:outline-none uppercase ${
                        fieldErrors.gstNumber
                          ? "border-red-400 bg-red-50/50"
                          : "border-slate-300 focus:border-teal-600"
                      }`}
                    />
                    {fieldErrors.gstNumber && (
                      <p className="text-[11px] text-red-600 mt-1">{fieldErrors.gstNumber}</p>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center text-slate-400 italic text-[11px] pt-6">
                    GSTIN not required for {gstRegistrationStatus}.
                  </div>
                )}

                {/* CIN Number */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    CIN / Reg Number <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={cinNumber}
                    onChange={(e) => setCinNumber(e.target.value.toUpperCase())}
                    placeholder="U33110MH2012PTC234567"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 font-mono uppercase focus:border-teal-600 focus:outline-none"
                  />
                </div>

                {/* MSME / Udyam */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    MSME / Udyam Reg. <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={msmeNumber}
                    onChange={(e) => setMsmeNumber(e.target.value)}
                    placeholder="UDYAM-MH-01-0012345"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-teal-600 focus:outline-none"
                  />
                </div>

                {/* IEC Code */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    IEC Code <span className="text-slate-400 font-normal">(For Importers)</span>
                  </label>
                  <input
                    type="text"
                    value={iecCode}
                    onChange={(e) => setIecCode(e.target.value.toUpperCase())}
                    placeholder="e.g. 0512345678"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 font-mono uppercase focus:border-teal-600 focus:outline-none"
                  />
                </div>

                {/* Company Description */}
                <div className="md:col-span-3">
                  <label className="block font-semibold text-slate-700 mb-1">
                    Company Overview & Biomedical Scope
                  </label>
                  <textarea
                    rows={2}
                    value={companyDescription}
                    onChange={(e) => setCompanyDescription(e.target.value)}
                    placeholder="Brief background on OEM certifications, manufacturing facilities, or exclusive distribution rights..."
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-teal-600 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* SECTION B: Contact Information */}
          {(activeSection === "all" || activeSection === "section-b") && (
            <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-teal-100 text-[#0F9F95] text-xs font-bold">
                    B
                  </span>
                  <h3 className="text-sm font-bold text-slate-800">
                    Contact Roster & Key Liaisons
                  </h3>
                </div>
                <span className="text-[11px] text-slate-400 font-medium">Communication Channels</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                {/* Primary Contact Person */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Primary Contact Person <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    placeholder="e.g. Rajesh Sharma"
                    className={`w-full rounded-lg border px-3 py-2 text-slate-900 focus:outline-none ${
                      fieldErrors.contactPerson
                        ? "border-red-400 bg-red-50/50"
                        : "border-slate-300 focus:border-teal-600"
                    }`}
                    required
                  />
                  {fieldErrors.contactPerson && (
                    <p className="text-[11px] text-red-600 mt-1">{fieldErrors.contactPerson}</p>
                  )}
                </div>

                {/* Designation */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Designation / Role
                  </label>
                  <input
                    type="text"
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    placeholder="e.g. Regional Institutional Sales Head"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-teal-600 focus:outline-none"
                  />
                </div>

                {/* Primary Phone */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Primary Phone Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98200 12345"
                    className={`w-full rounded-lg border px-3 py-2 text-slate-900 focus:outline-none ${
                      fieldErrors.phone
                        ? "border-red-400 bg-red-50/50"
                        : "border-slate-300 focus:border-teal-600"
                    }`}
                    required
                  />
                  {fieldErrors.phone && (
                    <p className="text-[11px] text-red-600 mt-1">{fieldErrors.phone}</p>
                  )}
                </div>

                {/* Business Email */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Business Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="procurement@siemens-partner.com"
                    className={`w-full rounded-lg border px-3 py-2 text-slate-900 focus:outline-none ${
                      fieldErrors.email
                        ? "border-red-400 bg-red-50/50"
                        : "border-slate-300 focus:border-teal-600"
                    }`}
                    required
                  />
                  {fieldErrors.email && (
                    <p className="text-[11px] text-red-600 mt-1">{fieldErrors.email}</p>
                  )}
                </div>

                {/* Alternate Email */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Alternate / Support Email
                  </label>
                  <input
                    type="email"
                    value={alternateEmail}
                    onChange={(e) => setAlternateEmail(e.target.value)}
                    placeholder="support@siemens-partner.com"
                    className={`w-full rounded-lg border px-3 py-2 text-slate-900 focus:outline-none ${
                      fieldErrors.alternateEmail
                        ? "border-red-400 bg-red-50/50"
                        : "border-slate-300 focus:border-teal-600"
                    }`}
                  />
                  {fieldErrors.alternateEmail && (
                    <p className="text-[11px] text-red-600 mt-1">{fieldErrors.alternateEmail}</p>
                  )}
                </div>

                {/* Alternate Phone */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Alternate / Desk Phone
                  </label>
                  <input
                    type="tel"
                    value={alternatePhone}
                    onChange={(e) => setAlternatePhone(e.target.value)}
                    placeholder="022-28495000"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-teal-600 focus:outline-none"
                  />
                </div>

                {/* Official Accounts / Billing Email */}
                <div className="md:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">
                    Accounts / Invoicing Email <span className="text-slate-400 font-normal">(For payment notices)</span>
                  </label>
                  <input
                    type="email"
                    value={accountsBillingEmail}
                    onChange={(e) => setAccountsBillingEmail(e.target.value)}
                    placeholder="accounts.invoicing@partner.com"
                    className={`w-full rounded-lg border px-3 py-2 text-slate-900 focus:outline-none ${
                      fieldErrors.accountsBillingEmail
                        ? "border-red-400 bg-red-50/50"
                        : "border-slate-300 focus:border-teal-600"
                    }`}
                  />
                  {fieldErrors.accountsBillingEmail && (
                    <p className="text-[11px] text-red-600 mt-1">{fieldErrors.accountsBillingEmail}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* SECTION C: Registered Address & Location */}
          {(activeSection === "all" || activeSection === "section-c") && (
            <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-2xs space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-teal-100 text-[#0F9F95] text-xs font-bold">
                    C
                  </span>
                  <h3 className="text-sm font-bold text-slate-800">
                    Registered Office, Billing & Shipping Locations
                  </h3>
                </div>
                <span className="text-[11px] text-slate-400 font-medium">Logistics & Tax Jurisdiction</span>
              </div>

              {/* Registered Office Address */}
              <div>
                <h4 className="text-xs font-bold text-slate-900 mb-2 flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#0F9F95]"></span>
                  Registered Office Address
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div className="md:col-span-2">
                    <label className="block font-semibold text-slate-700 mb-1">Street Address</label>
                    <input
                      type="text"
                      value={streetAddress}
                      onChange={(e) => setStreetAddress(e.target.value)}
                      placeholder="e.g. Unit 402, Trade Avenue, Technopark"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-teal-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Address Line 2</label>
                    <input
                      type="text"
                      value={addressLine2}
                      onChange={(e) => setAddressLine2(e.target.value)}
                      placeholder="Near MIDC Police Station"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-teal-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">City</label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="e.g. Mumbai / Pune"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-teal-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">State</label>
                    <input
                      type="text"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      placeholder="e.g. Maharashtra"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-teal-600 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">PIN Code</label>
                      <input
                        type="text"
                        value={pinCode}
                        onChange={(e) => setPinCode(e.target.value)}
                        placeholder="400093"
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-teal-600 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Country</label>
                      <input
                        type="text"
                        value={country}
                        onChange={(e) => setCountry(e.target.value)}
                        placeholder="India"
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-teal-600 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Billing Address */}
              <div className="pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-teal-600"></span>
                    Billing Address
                  </h4>
                  <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={billingSameAsRegistered}
                      onChange={(e) => setBillingSameAsRegistered(e.target.checked)}
                      className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 h-3.5 w-3.5"
                    />
                    Billing address same as registered address
                  </label>
                </div>

                {!billingSameAsRegistered ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs bg-slate-50/70 p-3.5 rounded-xl border border-slate-200">
                    <div className="md:col-span-2">
                      <label className="block font-semibold text-slate-700 mb-1">Billing Street Address</label>
                      <input
                        type="text"
                        value={billingAddress.streetAddress || ""}
                        onChange={(e) =>
                          setBillingAddress({ ...billingAddress, streetAddress: e.target.value })
                        }
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-teal-600 focus:outline-none bg-white"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Billing City</label>
                      <input
                        type="text"
                        value={billingAddress.city || ""}
                        onChange={(e) =>
                          setBillingAddress({ ...billingAddress, city: e.target.value })
                        }
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-teal-600 focus:outline-none bg-white"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Billing State</label>
                      <input
                        type="text"
                        value={billingAddress.state || ""}
                        onChange={(e) =>
                          setBillingAddress({ ...billingAddress, state: e.target.value })
                        }
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-teal-600 focus:outline-none bg-white"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Billing PIN Code</label>
                      <input
                        type="text"
                        value={billingAddress.pinCode || ""}
                        onChange={(e) =>
                          setBillingAddress({ ...billingAddress, pinCode: e.target.value })
                        }
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-teal-600 focus:outline-none bg-white"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Billing Country</label>
                      <input
                        type="text"
                        value={billingAddress.country || "India"}
                        onChange={(e) =>
                          setBillingAddress({ ...billingAddress, country: e.target.value })
                        }
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-teal-600 focus:outline-none bg-white"
                      />
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-500 italic pl-3">
                    ✓ Billing address will automatically mirror the registered office address.
                  </p>
                )}
              </div>

              {/* Shipping / Warehouse Address */}
              <div className="pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-teal-600"></span>
                    Shipping / Warehouse Dispatch Address
                  </h4>
                  <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={shippingSameAsRegistered}
                      onChange={(e) => setShippingSameAsRegistered(e.target.checked)}
                      className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 h-3.5 w-3.5"
                    />
                    Shipping address same as registered address
                  </label>
                </div>

                {!shippingSameAsRegistered ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs bg-slate-50/70 p-3.5 rounded-xl border border-slate-200">
                    <div className="md:col-span-2">
                      <label className="block font-semibold text-slate-700 mb-1">Warehouse / Depot Street Address</label>
                      <input
                        type="text"
                        value={shippingAddress.streetAddress || ""}
                        onChange={(e) =>
                          setShippingAddress({ ...shippingAddress, streetAddress: e.target.value })
                        }
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-teal-600 focus:outline-none bg-white"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Depot City</label>
                      <input
                        type="text"
                        value={shippingAddress.city || ""}
                        onChange={(e) =>
                          setShippingAddress({ ...shippingAddress, city: e.target.value })
                        }
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-teal-600 focus:outline-none bg-white"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Depot State</label>
                      <input
                        type="text"
                        value={shippingAddress.state || ""}
                        onChange={(e) =>
                          setShippingAddress({ ...shippingAddress, state: e.target.value })
                        }
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-teal-600 focus:outline-none bg-white"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Depot PIN Code</label>
                      <input
                        type="text"
                        value={shippingAddress.pinCode || ""}
                        onChange={(e) =>
                          setShippingAddress({ ...shippingAddress, pinCode: e.target.value })
                        }
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-teal-600 focus:outline-none bg-white"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Depot Country</label>
                      <input
                        type="text"
                        value={shippingAddress.country || "India"}
                        onChange={(e) =>
                          setShippingAddress({ ...shippingAddress, country: e.target.value })
                        }
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-teal-600 focus:outline-none bg-white"
                      />
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-500 italic pl-3">
                    ✓ Shipping warehouse address will automatically mirror the registered office address.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* SECTION D: Banking & Payment Details */}
          {(activeSection === "all" || activeSection === "section-d") && (
            <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-teal-100 text-[#0F9F95] text-xs font-bold">
                    D
                  </span>
                  <h3 className="text-sm font-bold text-slate-800">
                    Banking & Payment Settlement Details
                  </h3>
                </div>
                <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                  Accounts Payable Disbursement Only
                </span>
              </div>

              {/* Segregation Warning Callout */}
              <div className="rounded-lg bg-teal-50/60 p-3 text-xs text-teal-900 border border-teal-200/80 flex items-start gap-2">
                <span className="text-sm">🔒</span>
                <p className="leading-relaxed">
                  <strong>Notice:</strong> Supplier banking records are stored exclusively for procurement purchase order remittances and vendor settlements. They are kept completely separate from Shree Shyam Electronics’ customer invoice banking details.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                {/* Bank Name */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Bank Name</label>
                  <input
                    type="text"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="e.g. HDFC Bank Ltd."
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-teal-600 focus:outline-none"
                  />
                </div>

                {/* Account Holder Name */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Account Beneficiary Name
                  </label>
                  <input
                    type="text"
                    value={accountHolderName}
                    onChange={(e) => setAccountHolderName(e.target.value)}
                    placeholder="Exact legal name on bank record"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-teal-600 focus:outline-none"
                  />
                </div>

                {/* Account Type */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Account Type</label>
                  <select
                    value={accountType}
                    onChange={(e) => setAccountType(e.target.value as "Current" | "Savings" | "Other")}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-teal-600 focus:outline-none bg-white"
                  >
                    <option value="Current">Current Account</option>
                    <option value="Savings">Savings Account</option>
                    <option value="Other">Other / Escrow</option>
                  </select>
                </div>

                {/* Bank Account Number */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-semibold text-slate-700">
                      Bank Account Number
                    </label>
                    {accountNumber && (
                      <button
                        type="button"
                        onClick={() => setShowAccountDigits(!showAccountDigits)}
                        className="text-[10px] text-teal-700 hover:underline cursor-pointer"
                      >
                        {showAccountDigits ? "Hide Digits" : "Show Digits"}
                      </button>
                    )}
                  </div>
                  <input
                    type={showAccountDigits ? "text" : "password"}
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    placeholder="e.g. 50200012345678"
                    className={`w-full rounded-lg border px-3 py-2 font-mono text-slate-900 focus:outline-none ${
                      fieldErrors.accountNumber
                        ? "border-red-400 bg-red-50/50"
                        : "border-slate-300 focus:border-teal-600"
                    }`}
                  />
                  {fieldErrors.accountNumber && (
                    <p className="text-[11px] text-red-600 mt-1">{fieldErrors.accountNumber}</p>
                  )}
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Leading zeros are strictly preserved.
                  </span>
                </div>

                {/* Confirm Account Number */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Confirm Account Number
                  </label>
                  <input
                    type="password"
                    value={confirmAccountNumber}
                    onChange={(e) => setConfirmAccountNumber(e.target.value)}
                    placeholder="Re-enter account number"
                    className={`w-full rounded-lg border px-3 py-2 font-mono text-slate-900 focus:outline-none ${
                      fieldErrors.confirmAccountNumber
                        ? "border-red-400 bg-red-50/50"
                        : "border-slate-300 focus:border-teal-600"
                    }`}
                  />
                  {fieldErrors.confirmAccountNumber && (
                    <p className="text-[11px] text-red-600 mt-1">{fieldErrors.confirmAccountNumber}</p>
                  )}
                </div>

                {/* IFSC Code */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    IFSC Code <span className="text-teal-600 font-normal">(11 chars)</span>
                  </label>
                  <input
                    type="text"
                    maxLength={11}
                    value={ifscCode}
                    onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                    placeholder="HDFC0000128"
                    className={`w-full rounded-lg border px-3 py-2 font-mono uppercase text-slate-900 focus:outline-none ${
                      fieldErrors.ifscCode
                        ? "border-red-400 bg-red-50/50"
                        : "border-slate-300 focus:border-teal-600"
                    }`}
                  />
                  {fieldErrors.ifscCode && (
                    <p className="text-[11px] text-red-600 mt-1">{fieldErrors.ifscCode}</p>
                  )}
                </div>

                {/* Branch Name */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Branch Name</label>
                  <input
                    type="text"
                    value={branchName}
                    onChange={(e) => setBranchName(e.target.value)}
                    placeholder="e.g. Andheri East Commercial Branch"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-teal-600 focus:outline-none"
                  />
                </div>

                {/* Payment Terms */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Payment Terms</label>
                  <select
                    value={paymentTerms}
                    onChange={(e) => setPaymentTerms(e.target.value as SupplierPaymentTerms)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-teal-600 focus:outline-none bg-white"
                  >
                    {PAYMENT_TERMS_OPTIONS.map((term) => (
                      <option key={term} value={term}>
                        {term}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Custom Payment Terms (Conditional) */}
                {paymentTerms === "Custom" ? (
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Custom Terms Specification <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={customPaymentTerms}
                      onChange={(e) => setCustomPaymentTerms(e.target.value)}
                      placeholder="e.g. 50% Advance, 50% Post-Installation"
                      className={`w-full rounded-lg border px-3 py-2 text-slate-900 focus:outline-none ${
                        fieldErrors.customPaymentTerms
                          ? "border-red-400 bg-red-50/50"
                          : "border-slate-300 focus:border-teal-600"
                      }`}
                    />
                    {fieldErrors.customPaymentTerms && (
                      <p className="text-[11px] text-red-600 mt-1">{fieldErrors.customPaymentTerms}</p>
                    )}
                  </div>
                ) : (
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Credit Limit (INR) <span className="text-slate-400 font-normal">(Optional)</span>
                    </label>
                    <input
                      type="number"
                      value={creditLimit}
                      onChange={(e) => setCreditLimit(e.target.value)}
                      placeholder="e.g. 2500000"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-teal-600 focus:outline-none"
                    />
                  </div>
                )}

                {/* Currency */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Currency</label>
                  <input
                    type="text"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                    placeholder="INR"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono uppercase text-slate-900 focus:border-teal-600 focus:outline-none"
                  />
                </div>

                {/* UPI ID */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    UPI ID <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    placeholder="partner@okhdfcbank"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-teal-600 focus:outline-none"
                  />
                </div>

                {/* Verification Status */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Banking Verification Status
                  </label>
                  <select
                    value={bankVerificationStatus}
                    onChange={(e) =>
                      setBankVerificationStatus(
                        e.target.value as "Pending Verification" | "Verified" | "Rejected" | "Unverified"
                      )
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-teal-600 focus:outline-none bg-white font-medium"
                  >
                    <option value="Pending Verification">⏳ Pending Verification</option>
                    <option value="Verified">✅ Verified by Finance</option>
                    <option value="Rejected">❌ Rejected / Invalid</option>
                    <option value="Unverified">⚪ Unverified</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* SECTION E: Biomedical Product & Service Specialization */}
          {(activeSection === "all" || activeSection === "section-e") && (
            <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-2xs space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-teal-100 text-[#0F9F95] text-xs font-bold">
                    E
                  </span>
                  <h3 className="text-sm font-bold text-slate-800">
                    Biomedical Product & Service Specialization
                  </h3>
                </div>
                <span className="text-[11px] text-slate-400 font-medium">Equipment & Capabilities</span>
              </div>

              {/* Product Categories Multi-Select Chips */}
              <div>
                <label className="block font-semibold text-slate-700 text-xs mb-2">
                  Product Categories & Clinical Modalities <span className="text-teal-600 font-normal">({productCategories.length} selected)</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 text-xs">
                  {PRODUCT_CATEGORIES.map((cat) => {
                    const selected = productCategories.includes(cat);
                    return (
                      <button
                        type="button"
                        key={cat}
                        onClick={() => toggleCategory(cat)}
                        className={`flex items-center justify-between rounded-lg border px-3 py-2 text-left transition-all cursor-pointer ${
                          selected
                            ? "border-[#0F9F95] bg-teal-50/70 text-teal-900 font-semibold shadow-2xs"
                            : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        <span className="truncate pr-1">{cat}</span>
                        <span className="text-xs font-bold">
                          {selected ? "✓" : "+"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                {/* Brands Represented */}
                <div className="md:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">
                    Brands Represented / OEM Franchises <span className="text-slate-400 font-normal">(Comma-separated)</span>
                  </label>
                  <input
                    type="text"
                    value={brandsInput}
                    onChange={(e) => setBrandsInput(e.target.value)}
                    placeholder="e.g. GE HealthCare, Mindray, Philips, Nihon Kohden"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-teal-600 focus:outline-none"
                  />
                </div>

                {/* Typical Lead Time */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Typical Delivery Lead Time
                  </label>
                  <input
                    type="text"
                    value={typicalLeadTimeDays}
                    onChange={(e) => setTypicalLeadTimeDays(e.target.value)}
                    placeholder="e.g. 7-14 Days / Immediate Stock"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-teal-600 focus:outline-none"
                  />
                </div>

                {/* Equipment / Product Models */}
                <div className="md:col-span-3">
                  <label className="block font-semibold text-slate-700 mb-1">
                    Key Equipment Models & Catalog Reference
                  </label>
                  <textarea
                    rows={2}
                    value={equipmentModels}
                    onChange={(e) => setEquipmentModels(e.target.value)}
                    placeholder="e.g. BeneVision N12 Patient Monitor, Logiq e Ultrasound, V680 Critical Care Ventilator"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-teal-600 focus:outline-none"
                  />
                </div>

                {/* Authorized Distributor toggle */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Authorized OEM Distributor?
                  </label>
                  <div className="flex items-center gap-3 mt-1.5">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="authDistributor"
                        checked={isAuthorizedDistributor === true}
                        onChange={() => setIsAuthorizedDistributor(true)}
                        className="text-teal-600 focus:ring-teal-500"
                      />
                      <span className="font-medium text-slate-800">Yes</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="authDistributor"
                        checked={isAuthorizedDistributor === false}
                        onChange={() => setIsAuthorizedDistributor(false)}
                        className="text-teal-600 focus:ring-teal-500"
                      />
                      <span className="font-medium text-slate-800">No</span>
                    </label>
                  </div>
                </div>

                {/* Authorization Details (Conditional) */}
                {isAuthorizedDistributor ? (
                  <div className="md:col-span-2">
                    <label className="block font-semibold text-slate-700 mb-1">
                      Manufacturer Authorization Details
                    </label>
                    <input
                      type="text"
                      value={manufacturerAuthorizationDetails}
                      onChange={(e) => setManufacturerAuthorizationDetails(e.target.value)}
                      placeholder="e.g. Official OEM Tier-1 Partner Letter valid till Dec 2026 for Maharashtra & Goa"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-teal-600 focus:outline-none"
                    />
                  </div>
                ) : (
                  <div className="md:col-span-2 text-[11px] text-slate-400 italic pt-3">
                    Direct or Independent Sourcing Partner.
                  </div>
                )}

                {/* Geographic Service Coverage */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Geographic Service Coverage
                  </label>
                  <select
                    value={geographicServiceCoverage}
                    onChange={(e) => setGeographicServiceCoverage(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-teal-600 focus:outline-none bg-white"
                  >
                    <option value="Pan-India">Pan-India</option>
                    <option value="West India">West India (MH, GJ, GA)</option>
                    <option value="North India">North India (DL, HR, PB, UP)</option>
                    <option value="South India">South India (KA, TN, KL, TS, AP)</option>
                    <option value="East & North-East">East & North-East</option>
                    <option value="State Specific">State Specific</option>
                    <option value="International">International</option>
                  </select>
                </div>

                {/* Minimum Order Value */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Minimum Order Value (INR)
                  </label>
                  <input
                    type="number"
                    value={minimumOrderValue}
                    onChange={(e) => setMinimumOrderValue(e.target.value)}
                    placeholder="e.g. 50000"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-teal-600 focus:outline-none"
                  />
                </div>
              </div>

              {/* Service Support Capabilities Toggles */}
              <div className="rounded-xl bg-slate-50 p-4 border border-slate-200">
                <span className="block font-bold text-slate-800 text-xs mb-2">
                  Technical Support & Engineering Deliverables
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <label className="flex items-center gap-2 p-2.5 rounded-lg bg-white border border-slate-200 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={hasInstallationSupport}
                      onChange={(e) => setHasInstallationSupport(e.target.checked)}
                      className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 h-4 w-4"
                    />
                    <div>
                      <span className="font-semibold text-slate-800 block">Installation Support</span>
                      <span className="text-[10px] text-slate-500">Commissioning engineers on-site</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2 p-2.5 rounded-lg bg-white border border-slate-200 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={hasWarrantySupport}
                      onChange={(e) => setHasWarrantySupport(e.target.checked)}
                      className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 h-4 w-4"
                    />
                    <div>
                      <span className="font-semibold text-slate-800 block">Warranty Support</span>
                      <span className="text-[10px] text-slate-500">OEM standard guarantee backing</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2 p-2.5 rounded-lg bg-white border border-slate-200 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={hasAfterSalesService}
                      onChange={(e) => setHasAfterSalesService(e.target.checked)}
                      className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 h-4 w-4"
                    />
                    <div>
                      <span className="font-semibold text-slate-800 block">After-Sales AMC / CMC</span>
                      <span className="text-[10px] text-slate-500">Preventative maintenance coverage</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* States / Regions Served Multi-Select */}
              <div>
                <label className="block font-semibold text-slate-700 text-xs mb-1.5">
                  States / Regions Served <span className="text-teal-600 font-normal">({statesServed.length} selected)</span>
                </label>
                <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-2 rounded-lg border border-slate-200 bg-slate-50">
                  {INDIAN_STATES.map((st) => {
                    const active = statesServed.includes(st);
                    return (
                      <button
                        type="button"
                        key={st}
                        onClick={() => toggleStateServed(st)}
                        className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-all cursor-pointer ${
                          active
                            ? "bg-[#0F9F95] text-white shadow-2xs font-semibold"
                            : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {st} {active ? "✓" : "+"}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* SECTION F: Compliance & Documents */}
          {(activeSection === "all" || activeSection === "section-f") && (
            <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-teal-100 text-[#0F9F95] text-xs font-bold">
                    F
                  </span>
                  <h3 className="text-sm font-bold text-slate-800">
                    Compliance Dossier & Statutory Certificates
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={handleAddDocument}
                  className="rounded-lg bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-800 border border-teal-200 hover:bg-teal-100 transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
                >
                  <span>+</span> Add Document Entry
                </button>
              </div>

              {/* Secure Document Storage Architecture Callout */}
              <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600 border border-slate-200 flex items-start gap-2">
                <span className="text-sm">📋</span>
                <div className="leading-relaxed">
                  <strong>Structured Document Governance:</strong> This registry securely maintains certificate identification numbers, regulatory validity dates, and verification lifecycle states without exposing insecure binary uploads. Expiry alerts trigger automatically.
                </div>
              </div>

              {documents.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-400">
                  No documents cataloged yet. Click <strong>“+ Add Document Entry”</strong> to register GST certificates, OEM authorization letters, ISO certifications, or cancelled cheque references.
                </div>
              ) : (
                <div className="space-y-3">
                  {documents.map((doc, idx) => {
                    const isExpired = doc.expiryDate && new Date(doc.expiryDate) < new Date();
                    const isExpiringSoon =
                      doc.expiryDate &&
                      !isExpired &&
                      new Date(doc.expiryDate).getTime() - new Date().getTime() < 30 * 24 * 60 * 60 * 1000;

                    return (
                      <div
                        key={doc.id || idx}
                        className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-3 transition-all hover:border-slate-300"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-700">
                              Doc #{idx + 1}
                            </span>
                            {isExpired && (
                              <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">
                                EXPIRED
                              </span>
                            )}
                            {isExpiringSoon && (
                              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                                EXPIRING SOON
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveDocument(idx)}
                            className="text-xs text-red-600 hover:text-red-800 hover:underline cursor-pointer"
                          >
                            Remove
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                          {/* Document Type */}
                          <div>
                            <label className="block font-semibold text-slate-700 mb-1">
                              Document Type
                            </label>
                            <select
                              value={doc.documentType}
                              onChange={(e) =>
                                handleUpdateDocument(idx, { documentType: e.target.value })
                              }
                              className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-slate-900 focus:border-teal-600 focus:outline-none bg-white text-xs"
                            >
                              {DOCUMENT_TYPES.map((dt) => (
                                <option key={dt} value={dt}>
                                  {dt}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Reference / Cert Number */}
                          <div>
                            <label className="block font-semibold text-slate-700 mb-1">
                              Reference / Cert Number
                            </label>
                            <input
                              type="text"
                              value={doc.documentReferenceNumber}
                              onChange={(e) =>
                                handleUpdateDocument(idx, {
                                  documentReferenceNumber: e.target.value,
                                })
                              }
                              placeholder="e.g. OEM-AUTH-2025-081"
                              className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-slate-900 focus:border-teal-600 focus:outline-none bg-white text-xs"
                            />
                          </div>

                          {/* Expiry Date */}
                          <div>
                            <label className="block font-semibold text-slate-700 mb-1">
                              Expiry Date
                            </label>
                            <input
                              type="date"
                              value={
                                doc.expiryDate
                                  ? new Date(doc.expiryDate).toISOString().split("T")[0]
                                  : ""
                              }
                              onChange={(e) =>
                                handleUpdateDocument(idx, {
                                  expiryDate: e.target.value ? new Date(e.target.value) : null,
                                })
                              }
                              className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-slate-900 focus:border-teal-600 focus:outline-none bg-white text-xs"
                            />
                          </div>

                          {/* Verification Status */}
                          <div>
                            <label className="block font-semibold text-slate-700 mb-1">
                              Status
                            </label>
                            <select
                              value={doc.verificationStatus}
                              onChange={(e) =>
                                handleUpdateDocument(idx, {
                                  verificationStatus: e.target
                                    .value as SupplierDocumentReference["verificationStatus"],
                                })
                              }
                              className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-slate-900 focus:border-teal-600 focus:outline-none bg-white text-xs font-medium"
                            >
                              <option value="Pending">Pending Review</option>
                              <option value="Verified">Verified</option>
                              <option value="Expired">Expired</option>
                              <option value="Rejected">Rejected</option>
                            </select>
                          </div>

                          {/* Internal Review Notes */}
                          <div className="sm:col-span-2 md:col-span-4">
                            <label className="block font-semibold text-slate-700 mb-1">
                              Internal Review Notes
                            </label>
                            <input
                              type="text"
                              value={doc.reviewNotes || ""}
                              onChange={(e) =>
                                handleUpdateDocument(idx, { reviewNotes: e.target.value })
                              }
                              placeholder="e.g. Scanned physical copy verified against OEM registry by Biomedical Lead"
                              className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-slate-900 focus:border-teal-600 focus:outline-none bg-white text-xs"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* SECTION G: Procurement & Internal Notes */}
          {(activeSection === "all" || activeSection === "section-g") && (
            <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-teal-100 text-[#0F9F95] text-xs font-bold">
                    G
                  </span>
                  <h3 className="text-sm font-bold text-slate-800">
                    Procurement Dossier, Commercial Terms & Internal Governance
                  </h3>
                </div>
                <span className="text-[11px] text-slate-400 font-medium">Internal Sourcing Record</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {/* Agreed Commercial Terms */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Agreed Commercial Terms & Discount Structure
                  </label>
                  <textarea
                    rows={2}
                    value={agreedCommercialTerms}
                    onChange={(e) => setAgreedCommercialTerms(e.target.value)}
                    placeholder="e.g. 5% bulk discount for orders > 5 units; freight included F.O.R. destination"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-teal-600 focus:outline-none"
                  />
                </div>

                {/* Warranty / Return Policy */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Warranty & Return Policy
                  </label>
                  <textarea
                    rows={2}
                    value={warrantyReturnPolicy}
                    onChange={(e) => setWarrantyReturnPolicy(e.target.value)}
                    placeholder="e.g. 1-year comprehensive OEM warranty; immediate replacement for DOA within 15 days"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-teal-600 focus:outline-none"
                  />
                </div>

                {/* Delivery and Installation Terms */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Delivery & Commissioning Terms
                  </label>
                  <textarea
                    rows={2}
                    value={deliveryInstallationTerms}
                    onChange={(e) => setDeliveryInstallationTerms(e.target.value)}
                    placeholder="e.g. Delivery within 10 days of PO; biomedical engineer arrives within 48h of hospital delivery"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-teal-600 focus:outline-none"
                  />
                </div>

                {/* Internal Procurement Notes */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Internal Procurement Notes & History
                  </label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="General supplier history, performance notes, executive contacts..."
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-teal-600 focus:outline-none"
                  />
                </div>

                {/* Supplier Status */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Supplier Operational Status
                  </label>
                  <select
                    value={supplierStatus}
                    onChange={(e) => {
                      const newStatus = e.target.value as SupplierStatus;
                      setSupplierStatus(newStatus);
                      if (newStatus === "Active") setIsActive(true);
                      else if (newStatus === "Inactive") setIsActive(false);
                    }}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-teal-600 focus:outline-none bg-white font-medium"
                  >
                    {SUPPLIER_STATUS_OPTIONS.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Supplier Rating */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Supplier Performance Rating (1 - 5 Stars)
                  </label>
                  <div className="flex items-center gap-2 mt-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        type="button"
                        key={star}
                        onClick={() => setSupplierRating(star)}
                        className={`text-xl transition-transform hover:scale-110 cursor-pointer ${
                          star <= supplierRating ? "text-amber-400" : "text-slate-300"
                        }`}
                      >
                        ★
                      </button>
                    ))}
                    <span className="text-xs font-semibold text-slate-600 ml-2">
                      {supplierRating} / 5 Stars
                    </span>
                  </div>
                </div>

                {/* Preferred Supplier Toggle */}
                <div className="md:col-span-2 pt-2">
                  <label className="flex items-center gap-3 p-3 rounded-xl bg-amber-50/60 border border-amber-200 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isPreferredSupplier}
                      onChange={(e) => setIsPreferredSupplier(e.target.checked)}
                      className="rounded border-amber-300 text-amber-600 focus:ring-amber-500 h-4 w-4"
                    />
                    <div>
                      <span className="font-bold text-amber-900 text-xs block">
                        ⭐ Mark as Preferred Biomedical Partner
                      </span>
                      <span className="text-[11px] text-amber-700">
                        Highlights this supplier as the primary vendor for quote comparison and emergency procurement.
                      </span>
                    </div>
                  </label>
                </div>

                {/* Internal Risk / Review Notes */}
                <div className="md:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">
                    Internal Risk & Compliance Review Notes
                  </label>
                  <textarea
                    rows={2}
                    value={internalRiskReviewNotes}
                    onChange={(e) => setInternalRiskReviewNotes(e.target.value)}
                    placeholder="Audit findings, quality control observations, SLA compliance history..."
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-teal-600 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Sticky Bottom Actions */}
          <div className="sticky bottom-0 z-10 -mx-6 -mb-5 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-200 bg-white/95 px-6 py-4 backdrop-blur-md shadow-lg">
            <label className="flex items-center gap-2.5 text-xs font-semibold text-slate-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => {
                  setIsActive(e.target.checked);
                  if (!e.target.checked && supplierStatus === "Active") {
                    setSupplierStatus("Inactive");
                  } else if (e.target.checked && supplierStatus === "Inactive") {
                    setSupplierStatus("Active");
                  }
                }}
                className="rounded border-slate-300 text-[#0F9F95] focus:ring-teal-500 h-4 w-4"
              />
              Active supplier in procurement roster
            </label>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg bg-[#0F9F95] px-5 py-2 text-xs font-semibold text-white hover:bg-[#0B827B] transition-colors disabled:opacity-50 cursor-pointer shadow-2xs flex items-center gap-2"
              >
                {submitting ? (
                  <>
                    <span className="animate-spin text-xs">⏳</span>
                    <span>Saving Partner Record...</span>
                  </>
                ) : isEditing ? (
                  "Update Supplier Partner"
                ) : (
                  "Register Biomedical Partner"
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
