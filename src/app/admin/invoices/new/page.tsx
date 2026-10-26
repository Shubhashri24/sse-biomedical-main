"use client";

import React from "react";
import AdminShell from "@/components/admin/AdminShell";
import InvoiceForm from "@/components/admin/InvoiceForm";

export default function CreateInvoicePage() {
  return (
    <AdminShell
      title="Create New Invoice"
      subtitle="Prepare and issue customer invoices for hospital biomedical equipment orders."
      breadcrumbs={[
        { label: "Invoices", href: "/admin/invoices" },
        { label: "Create Invoice" },
      ]}
    >
      <InvoiceForm isEdit={false} />
    </AdminShell>
  );
}
