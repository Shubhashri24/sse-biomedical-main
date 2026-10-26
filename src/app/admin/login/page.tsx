"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import BrandLogo from "@/components/BrandLogo";

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim() || !password) {
      setStatus("error");
      setErrorMessage("Please enter both username and password.");
      return;
    }

    setStatus("submitting");
    setErrorMessage("");

    try {
      const res = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setStatus("error");
        setErrorMessage(data.message || "Invalid administrative credentials.");
        return;
      }

      router.push("/admin");
    } catch {
      setStatus("error");
      setErrorMessage("Network error: Could not connect to authentication service.");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F5F7FA] px-4 py-16">
      <div className="w-full max-w-md rounded-2xl border border-[#E2E8F0] bg-white p-8 shadow-sm">
        <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-4">
          <div className="flex items-center gap-3">
            <BrandLogo variant="symbol" theme="light" size="sm" priority />
            <div>
              <div className="text-xs font-bold text-[#172033]">Operations Console</div>
              <div className="text-[11px] font-medium text-[#64748B]">Shree Shyam Electronics</div>
            </div>
          </div>
          <Link
            href="/"
            className="text-xs font-semibold text-[#64748B] hover:text-[#0F9F95] transition-colors"
          >
            ← Public site
          </Link>
        </div>

        <div className="mt-6 mb-6">
          <h1 className="text-xl font-bold tracking-tight text-[#172033]">
            Sign In
          </h1>
          <p className="mt-1 text-xs text-[#64748B] leading-relaxed">
            Authorized personnel only. Manage equipment catalog, quotations, service dispatch, and inventory.
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label
              htmlFor="admin-username"
              className="block text-xs font-semibold text-[#172033] mb-1.5"
            >
              Username
            </label>
            <input
              id="admin-username"
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3.5 py-2.5 text-xs font-medium text-[#172033] placeholder-[#94A3B8] focus:border-[#0F9F95] focus:bg-white focus:outline-none transition-colors"
              placeholder="Enter your administrative username"
            />
          </div>

          <div>
            <label
              htmlFor="admin-password"
              className="block text-xs font-semibold text-[#172033] mb-1.5"
            >
              Password
            </label>
            <input
              id="admin-password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3.5 py-2.5 text-xs font-medium text-[#172033] placeholder-[#94A3B8] focus:border-[#0F9F95] focus:bg-white focus:outline-none transition-colors"
              placeholder="••••••••••••"
            />
          </div>

          {status === "error" && (
            <div
              role="alert"
              className="rounded-xl border border-[#FECACA] bg-[#FEF2F2] p-3.5 text-xs font-medium text-[#B91C1C]"
            >
              {errorMessage}
            </div>
          )}

          <button
            type="submit"
            disabled={status === "submitting"}
            className="w-full rounded-lg bg-[#0F9F95] hover:bg-[#0B827B] px-4 py-2.5 text-xs font-semibold text-white transition-all shadow-sm hover:shadow disabled:opacity-50 cursor-pointer"
          >
            {status === "submitting" ? "Authenticating..." : "Sign in to Dashboard"}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-[#F1F5F9] text-center">
          <p className="text-[11px] font-medium text-[#94A3B8]">
            Shree Shyam Electronics • Biomedical Systems Division
          </p>
        </div>
      </div>
    </div>
  );
}
