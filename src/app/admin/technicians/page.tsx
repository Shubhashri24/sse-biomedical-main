"use client";

import React, { useState, useEffect } from "react";
import AdminShell from "@/components/admin/AdminShell";
import type { TechnicianDoc } from "@/lib/mongodb";

export default function AdminTechniciansPage() {
  const [technicians, setTechnicians] = useState<TechnicianDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState({ total: 0, active: 0, available: 0 });

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [availabilityFilter, setAvailabilityFilter] = useState("ALL");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTech, setEditingTech] = useState<TechnicianDoc | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    specialization: "",
    availability: "AVAILABLE" as TechnicianDoc["availability"],
    isActive: true,
  });
  const [formError, setFormError] = useState("");
  const [savingForm, setSavingForm] = useState(false);

  const [toastMessage, setToastMessage] = useState("");

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 4000);
  };

  const [reloadTrigger, setReloadTrigger] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function fetchTechnicians() {
      try {
        const params = new URLSearchParams();
        if (search.trim()) params.set("search", search.trim());
        if (statusFilter !== "all") params.set("status", statusFilter);
        if (availabilityFilter !== "ALL") params.set("availability", availabilityFilter);

        const res = await fetch(`/api/admin/technicians?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          if (!cancelled && data.success) {
            setTechnicians(data.technicians || []);
            if (data.counts) setCounts(data.counts);
          }
        }
      } catch (err) {
        console.error("Failed to load technicians:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchTechnicians();
    return () => {
      cancelled = true;
    };
  }, [search, statusFilter, availabilityFilter, reloadTrigger]);

  const openAddModal = () => {
    setEditingTech(null);
    setFormData({
      name: "",
      email: "",
      phone: "",
      specialization: "",
      availability: "AVAILABLE",
      isActive: true,
    });
    setFormError("");
    setIsModalOpen(true);
  };

  const openEditModal = (tech: TechnicianDoc) => {
    setEditingTech(tech);
    setFormData({
      name: tech.name,
      email: tech.email,
      phone: tech.phone,
      specialization: tech.specialization,
      availability: tech.availability,
      isActive: tech.isActive !== false,
    });
    setFormError("");
    setIsModalOpen(true);
  };

  const handleSaveTech = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim() || !formData.phone.trim() || !formData.specialization.trim()) {
      setFormError("Name, email, phone, and clinical specialization are mandatory.");
      return;
    }

    setSavingForm(true);
    setFormError("");

    try {
      const url = editingTech
        ? `/api/admin/technicians/${editingTech.technicianId}`
        : "/api/admin/technicians";
      const method = editingTech ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setFormError(data.message || "Failed to save technician profile.");
        setSavingForm(false);
        return;
      }

      showToast(editingTech ? `Technician ${editingTech.name} updated.` : "New field engineer registered.");
      setIsModalOpen(false);
      setReloadTrigger((v) => v + 1);
    } catch {
      setFormError("Network error saving technician.");
    } finally {
      setSavingForm(false);
    }
  };

  const handleQuickAvailabilityChange = async (tech: TechnicianDoc, newAvailability: TechnicianDoc["availability"]) => {
    try {
      const res = await fetch(`/api/admin/technicians/${tech.technicianId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ availability: newAvailability }),
      });
      if (res.ok) {
        showToast(`Technician ${tech.name} status updated to ${newAvailability}.`);
        setTechnicians((prev) =>
          prev.map((t) =>
            t.technicianId === tech.technicianId ? { ...t, availability: newAvailability } : t
          )
        );
      }
    } catch {
      alert("Failed to update technician availability.");
    }
  };

  const handleToggleActive = async (tech: TechnicianDoc) => {
    const newStatus = !tech.isActive;
    const confirmMsg = newStatus
      ? `Re-activate technician ${tech.name}?`
      : `Deactivate technician ${tech.name}? They will be hidden from service assignment rosters.`;

    if (!confirm(confirmMsg)) return;

    try {
      const res = await fetch(`/api/admin/technicians/${tech.technicianId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: newStatus }),
      });
      if (res.ok) {
        showToast(`Technician status updated.`);
        setReloadTrigger((v) => v + 1);
      }
    } catch {
      alert("Network error updating technician status.");
    }
  };

  const getAvailabilityBadge = (avail: TechnicianDoc["availability"]) => {
    switch (avail) {
      case "AVAILABLE":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Available
          </span>
        );
      case "ON_CALL":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-teal-200 bg-teal-50 px-2.5 py-0.5 text-[11px] font-semibold text-teal-700">
            <span className="h-1.5 w-1.5 rounded-full bg-[#0F9F95]" />
            On Call
          </span>
        );
      case "BUSY":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            Busy / On-Site
          </span>
        );
      case "ON_LEAVE":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-600">
            On Leave
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <AdminShell
      title="Biomedical Field Engineering & Technicians"
      subtitle="Certified service engineers, hospital deployment rosters, and skill specialization"
      breadcrumbs={[{ label: "Technicians" }]}
      actions={
        <button
          type="button"
          onClick={openAddModal}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#0F9F95] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#0B827B] transition-colors shadow-xs"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Technician
        </button>
      }
    >
      <div className="space-y-6">
        {toastMessage && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs font-medium text-emerald-800 shadow-xs flex items-center gap-2">
            <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {toastMessage}
          </div>
        )}

        {/* KPI Strip */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
            <div className="text-xs font-medium text-slate-500">
              Total Service Engineers
            </div>
            <div className="mt-1.5 text-2xl font-bold text-slate-900">
              {counts.total}
            </div>
            <div className="mt-1 text-[11px] text-slate-400">All registered profiles</div>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 shadow-2xs">
            <div className="text-xs font-semibold text-emerald-800">
              Active Roster
            </div>
            <div className="mt-1.5 text-2xl font-bold text-emerald-700">
              {counts.active}
            </div>
            <div className="mt-1 text-[11px] text-emerald-700/80">Authorized for field deployment</div>
          </div>
          <div className="rounded-xl border border-teal-200 bg-teal-50/40 p-4 shadow-2xs">
            <div className="text-xs font-semibold text-teal-800">
              Immediately Available
            </div>
            <div className="mt-1.5 text-2xl font-bold text-[#0B827B]">
              {counts.available}
            </div>
            <div className="mt-1 text-[11px] text-teal-700/80">Ready for emergency dispatch</div>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3.5 sm:flex-row sm:items-center shadow-2xs">
          <div className="relative flex-1">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by engineer name, ID (TECH-001), phone, or specialization..."
              className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-teal-600 focus:ring-1 focus:ring-teal-600 focus:outline-none transition-all"
            />
          </div>

          <div className="flex gap-2">
            <select
              value={availabilityFilter}
              onChange={(e) => setAvailabilityFilter(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:border-teal-600 focus:ring-1 focus:ring-teal-600 focus:outline-none"
            >
              <option value="ALL">All Availabilities</option>
              <option value="AVAILABLE">Available</option>
              <option value="ON_CALL">On Call</option>
              <option value="BUSY">Busy</option>
              <option value="ON_LEAVE">On Leave</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:border-teal-600 focus:ring-1 focus:ring-teal-600 focus:outline-none"
            >
              <option value="all">All Engineers</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>
        </div>

        {/* Technicians Table */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                <tr>
                  <th className="px-3.5 py-3">ID</th>
                  <th className="px-3.5 py-3">Engineer Name</th>
                  <th className="px-3.5 py-3">Clinical Specialization</th>
                  <th className="px-3.5 py-3">Email & Phone</th>
                  <th className="px-3.5 py-3">Availability</th>
                  <th className="px-3.5 py-3">Status</th>
                  <th className="px-3.5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />
                        <span>Loading technician roster...</span>
                      </div>
                    </td>
                  </tr>
                ) : technicians.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-14 text-center">
                      <div className="mx-auto flex max-w-sm flex-col items-center justify-center text-center">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                        </div>
                        <h4 className="mt-3 text-sm font-semibold text-slate-800">No Technicians Found</h4>
                        <p className="mt-1 text-xs text-slate-500">
                          {search || statusFilter !== "all" || availabilityFilter !== "ALL"
                            ? "No field engineers match your filter criteria. Try clearing search filters."
                            : "No biomedical field engineers registered yet. Register your certified engineers to assign service tickets."}
                        </p>
                        <button
                          type="button"
                          onClick={openAddModal}
                          className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-[#0F9F95] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#0B827B] transition-colors"
                        >
                          + Register Technician
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  technicians.map((t) => (
                    <tr key={t.technicianId} className="hover:bg-slate-50/80 transition-colors">
                      <td className="whitespace-nowrap px-3.5 py-3 font-mono text-xs font-semibold text-slate-500">
                        {t.technicianId}
                      </td>
                      <td className="px-3.5 py-3 font-semibold text-slate-900">
                        {t.name}
                      </td>
                      <td className="px-3.5 py-3">
                        <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-700">
                          {t.specialization}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3.5 py-3">
                        <div className="text-slate-800 font-medium">{t.email}</div>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5">{t.phone}</div>
                      </td>
                      <td className="whitespace-nowrap px-3.5 py-3">
                        <div className="flex items-center gap-2">
                          {getAvailabilityBadge(t.availability)}
                          <select
                            value={t.availability}
                            onChange={(e) => handleQuickAvailabilityChange(t, e.target.value as TechnicianDoc["availability"])}
                            className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-xs text-slate-600 hover:text-slate-900 hover:border-slate-300 focus:border-teal-600 focus:ring-1 focus:ring-teal-600 focus:outline-none"
                          >
                            <option value="AVAILABLE">Set Available</option>
                            <option value="ON_CALL">Set On Call</option>
                            <option value="BUSY">Set Busy</option>
                            <option value="ON_LEAVE">Set Leave</option>
                          </select>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3.5 py-3">
                        {t.isActive ? (
                          <span className="inline-flex items-center gap-1.5 text-emerald-700 text-xs font-semibold">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-slate-400 text-xs font-medium">
                            <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-3.5 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditModal(t)}
                            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:border-slate-300 hover:text-slate-900 transition-colors shadow-2xs"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleActive(t)}
                            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-500 hover:border-rose-300 hover:text-rose-600 transition-colors shadow-2xs"
                          >
                            {t.isActive ? "Deactivate" : "Activate"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add / Edit Technician Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-4">
            <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
              <div className="flex items-start justify-between border-b border-slate-100 pb-4">
                <div>
                  <div className="text-[11px] font-semibold text-[#0F9F95] uppercase tracking-wider">
                    {editingTech ? "Update Service Engineer" : "Register Field Service Engineer"}
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mt-0.5">
                    {editingTech ? `${editingTech.name} (${editingTech.technicianId})` : "Add Certified Clinical Technician"}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {formError && (
                <div className="my-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-800">
                  {formError}
                </div>
              )}

              <form onSubmit={handleSaveTech} className="mt-4 space-y-4 text-xs">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Engineer Full Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    placeholder="e.g. Rahul Sharma"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-teal-600 focus:ring-1 focus:ring-teal-600 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                      placeholder="engineer@domain.com"
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-teal-600 focus:ring-1 focus:ring-teal-600 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Phone Number *
                    </label>
                    <input
                      type="text"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      required
                      placeholder="+91 98765 43210"
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-xs text-slate-900 placeholder-slate-400 focus:border-teal-600 focus:ring-1 focus:ring-teal-600 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Clinical / Modality Specialization *
                  </label>
                  <input
                    type="text"
                    value={formData.specialization}
                    onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                    placeholder="e.g. Patient Monitors, Defibrillators, Ventilators & Critical Care"
                    required
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-teal-600 focus:ring-1 focus:ring-teal-600 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Initial Availability
                    </label>
                    <select
                      value={formData.availability}
                      onChange={(e) => setFormData({ ...formData, availability: e.target.value as TechnicianDoc["availability"] })}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-teal-600 focus:ring-1 focus:ring-teal-600 focus:outline-none"
                    >
                      <option value="AVAILABLE">AVAILABLE</option>
                      <option value="ON_CALL">ON CALL</option>
                      <option value="BUSY">BUSY / DEPLOYED</option>
                      <option value="ON_LEAVE">ON LEAVE</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2 pt-6">
                    <input
                      type="checkbox"
                      id="techActiveToggle"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                    />
                    <label htmlFor="techActiveToggle" className="text-xs font-medium text-slate-800">
                      Active field technician
                    </label>
                  </div>
                </div>

                <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingForm}
                    className="rounded-lg bg-[#0F9F95] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0B827B] transition-colors disabled:opacity-50 shadow-xs"
                  >
                    {savingForm ? "Saving..." : editingTech ? "Update Profile" : "Register Technician"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
