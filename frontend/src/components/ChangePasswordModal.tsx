"use client";

import { useState } from "react";
import { X, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { useChangePassword } from "@/lib/hooks/useQueries";

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ChangePasswordModal = ({
  isOpen,
  onClose,
}: ChangePasswordModalProps) => {
  const changePassword = useChangePassword();
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const loading = changePassword.isPending;
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    // Validation
    if (!oldPassword || !newPassword || !confirmPassword) {
      setMessage({ type: "error", text: "All fields are required" });
      return;
    }

    if (newPassword.length < 6) {
      setMessage({ type: "error", text: "New password must be at least 6 characters" });
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage({ type: "error", text: "New passwords do not match" });
      return;
    }

    try {
      await changePassword.mutateAsync({
        currentPassword: oldPassword,
        newPassword,
      });

      toast.success("Password changed successfully");
      setMessage({ type: "success", text: "Password changed successfully!" });
      
      // Reset form and close after 2 seconds
      setTimeout(() => {
        setOldPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setMessage(null);
        onClose();
      }, 2000);
    } catch (e) {
      setMessage({
        type: "error",
        text: e instanceof Error ? e.message : "Failed to change password",
      });
      toast.error(e instanceof Error ? e.message : "Failed to change password");
    }
  };

  const handleClose = () => {
    setOldPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setMessage(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-primary/20 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={handleClose}
      />

      <div className="relative w-full max-w-md bg-background rounded-[32px] p-8 shadow-2xl border border-border/50 animate-in zoom-in-95 duration-300">
        <button
          onClick={handleClose}
          className="absolute top-6 right-6 p-2 rounded-full hover:bg-muted/50 text-secondary transition-colors"
        >
          <X size={20} />
        </button>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <h3 className="text-xl font-serif font-extrabold text-primary">
              Change Password
            </h3>
            <p className="text-sm text-secondary">
              Enter your current password and choose a new one
            </p>
          </div>

          {message && (
            <div
              className={`rounded-xl p-3 text-sm ${
                message.type === "success"
                  ? "bg-green-50 text-green-600 border border-green-100"
                  : "bg-red-50 text-red-600 border border-red-100"
              }`}
            >
              {message.text}
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-secondary uppercase tracking-[0.2em] px-1">
                Old Password
              </label>
              <div className="relative">
                <input
                  type={showOld ? "text" : "password"}
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder="Enter old Password"
                  disabled={loading}
                  className="w-full px-5 py-3.5 rounded-xl border border-border bg-card text-sm text-primary focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all placeholder:text-secondary/30 pr-12 disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <button
                  type="button"
                  onClick={() => setShowOld(!showOld)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-secondary hover:text-primary transition-colors"
                >
                  {showOld ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-secondary uppercase tracking-[0.2em] px-1">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showNew ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter New Password"
                  disabled={loading}
                  className="w-full px-5 py-3.5 rounded-xl border border-border bg-card text-sm text-primary focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all placeholder:text-secondary/30 pr-12 disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-secondary hover:text-primary transition-colors"
                >
                  {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-secondary uppercase tracking-[0.2em] px-1">
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm New Password"
                  disabled={loading}
                  className="w-full px-5 py-3.5 rounded-xl border border-border bg-card text-sm text-primary focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all placeholder:text-secondary/30 pr-12 disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-secondary hover:text-primary transition-colors"
                >
                  {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-xl bg-accent text-background text-sm font-extrabold hover:bg-primary transition-all active:scale-[0.98] shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Changing Password..." : "Change Password"}
          </button>
        </form>
      </div>
    </div>
  );
};
