"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import AdminShell from "@/components/admin/AdminShell";
import InvoiceForm from "@/components/admin/InvoiceForm";
import type { InvoiceDoc } from "@/lib/mongodb";

export default function EditInvoicePage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [invoice, setInvoice] = useState<InvoiceDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadInvoice() {
      try {
        setLoading(true);
        const res = await fetch(`/api/admin/invoices/${id}`);
        if (!res.ok) {
          setError(`Invoice '${id}' could not be loaded.`);
          return;
        }

        const data = await res.json();
        if (!cancelled && data.success && data.invoice) {
          if (data.invoice.isFinalized) {
            router.push(`/admin/invoices/${id}`);
            return;
          }
          setInvoice(data.invoice);
        }
      } catch (err) {
        console.error("Failed to load invoice:", err);
        setError("Error loading invoice.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    if (id) {
      loadInvoice();
    }

    return () => {
      cancelled = true;
    };
  }, [id, router]);

  if (loading) {
    return (
      <AdminShell
        title="Edit Invoice Draft"
        breadcrumbs={[
          { label: "Invoices", href: "/admin/invoices" },
          { label: "Edit Draft" },
        ]}
      >
        <div className="py-20 text-center text-xs text-slate-500">
          <div className="flex flex-col items-center justify-center gap-2">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />
            <span>Loading invoice draft...</span>
          </div>
        </div>
      </AdminShell>
    );
  }

  if (error || !invoice) {
    return (
      <AdminShell
        title="Edit Invoice Draft"
        breadcrumbs={[
          { label: "Invoices", href: "/admin/invoices" },
          { label: "Edit Draft" },
        ]}
      >
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-xs text-red-800">
          <p>{error || "Invoice not found or cannot be edited."}</p>
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell
      title={`Edit Invoice Draft ${invoice.invoiceNumber || invoice.invoiceId}`}
      subtitle="Modify line items, quantities, rates, customer details, or finalize this draft document."
      breadcrumbs={[
        { label: "Invoices", href: "/admin/invoices" },
        { label: invoice.invoiceNumber || invoice.invoiceId, href: `/admin/invoices/${invoice.invoiceId}` },
        { label: "Edit Draft" },
      ]}
    >
      <InvoiceForm initialInvoice={invoice} isEdit={true} />
    </AdminShell>
  );
}
