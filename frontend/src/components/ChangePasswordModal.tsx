"use client";

import React, { useState } from "react";
import { X, Eye, EyeOff } from "lucide-react";

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ChangePasswordModal = ({
  isOpen,
  onClose,
}: ChangePasswordModalProps) => {
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-primary/20 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative w-full max-w-md bg-background rounded-[32px] p-8 shadow-2xl border border-border/50 animate-in zoom-in-95 duration-300">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-full hover:bg-muted/50 text-secondary transition-colors"
        >
          <X size={20} />
        </button>

        <div className="space-y-6">
          <div className="space-y-4">
            {/* Old Password */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-secondary uppercase tracking-[0.2em] px-1">
                Old Password
              </label>
              <div className="relative">
                <input
                  type={showOld ? "text" : "password"}
                  placeholder="Enter old Password"
                  className="w-full px-5 py-3.5 rounded-xl border border-border bg-card text-sm text-primary focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all placeholder:text-secondary/30 pr-12"
                />
                <button
                  onClick={() => setShowOld(!showOld)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-secondary hover:text-primary transition-colors"
                >
                  {showOld ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-secondary uppercase tracking-[0.2em] px-1">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showNew ? "text" : "password"}
                  placeholder="Enter New Password"
                  className="w-full px-5 py-3.5 rounded-xl border border-border bg-card text-sm text-primary focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all placeholder:text-secondary/30 pr-12"
                />
                <button
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-secondary hover:text-primary transition-colors"
                >
                  {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Confirm New Password */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-secondary uppercase tracking-[0.2em] px-1">
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  type={showConfirm ? "text" : "password"}
                  placeholder="Confirm New Password"
                  className="w-full px-5 py-3.5 rounded-xl border border-border bg-card text-sm text-primary focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all placeholder:text-secondary/30 pr-12"
                />
                <button
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-secondary hover:text-primary transition-colors"
                >
                  {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
          </div>

          <button className="w-full py-4 rounded-xl bg-accent text-background text-sm font-extrabold hover:bg-primary transition-all active:scale-[0.98] shadow-lg">
            Change Password
          </button>
        </div>
      </div>
    </div>
  );
};
