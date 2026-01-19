"use client";

import { ChangePasswordForm } from "@/components/change-password-form";

export default function AdminSettingsPage() {
  return (
    <div className="p-6 lg:p-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-100 italic tracking-tight">
          Admin Settings
        </h1>
        <p className="text-slate-400 mt-2">
          Manage your account preferences and security
        </p>
      </div>

      <div className="grid gap-8 max-w-2xl">
        <ChangePasswordForm userType="staff" />
      </div>
    </div>
  );
}
