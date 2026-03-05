"use client";

import React, { useState } from "react";
import { ChangePasswordModal } from "./ChangePasswordModal";

export const SecuritySettings = () => {
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  return (
    <div className="space-y-8">
      <h3 className="text-xl font-serif font-extrabold text-primary">
        Account Security
      </h3>

      <div className="space-y-6 max-w-3xl">
        {/* Email Section */}
        <div className="flex flex-col md:flex-row md:items-end gap-4">
          <div className="flex-1 space-y-2">
            <label className="text-xs font-bold text-secondary uppercase tracking-widest px-1">
              Email
            </label>
            <input
              type="email"
              placeholder="jhondoe@gmail.com"
              disabled
              className="w-full px-5 py-3.5 rounded-xl border border-border bg-muted/30 text-sm text-secondary focus:outline-none transition-all cursor-not-allowed"
            />
          </div>
          <button className="px-6 py-3.5 rounded-xl bg-accent text-background text-xs font-extrabold hover:bg-primary transition-all active:scale-95 whitespace-nowrap shadow-md">
            Change Email
          </button>
        </div>

        {/* Password Section */}
        <div className="flex flex-col md:flex-row md:items-end gap-4">
          <div className="flex-1 space-y-2">
            <label className="text-xs font-bold text-secondary uppercase tracking-widest px-1">
              Password
            </label>
            <input
              type="password"
              value="............"
              disabled
              className="w-full px-5 py-3.5 rounded-xl border border-border bg-muted/30 text-sm text-secondary focus:outline-none transition-all cursor-not-allowed tracking-widest"
            />
          </div>
          <button
            onClick={() => setIsPasswordModalOpen(true)}
            className="px-6 py-3.5 rounded-xl bg-accent text-background text-xs font-extrabold hover:bg-primary transition-all active:scale-95 whitespace-nowrap shadow-md"
          >
            Change Password
          </button>
        </div>
      </div>

      <ChangePasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
      />
    </div>
  );
};
