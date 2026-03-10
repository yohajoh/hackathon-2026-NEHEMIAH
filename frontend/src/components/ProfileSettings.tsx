"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useUpdateProfile } from "@/lib/hooks/useQueries";

type UserData = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  year: string | null;
  department: string | null;
  student_id: string | null;
  role: string;
};

type Props = {
  user: UserData | null;
  loading?: boolean;
  onUpdate: (user: UserData) => void;
};

export const ProfileSettings = ({ user, loading, onUpdate }: Props) => {
  const [name, setName] = useState(() => user?.name || "");
  const [phone, setPhone] = useState(() => user?.phone || "");
  const [year, setYear] = useState(() => user?.year || "");
  const [department, setDepartment] = useState(() => user?.department || "");
  const updateProfile = useUpdateProfile();
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (user) {
      const timer = setTimeout(() => {
        setName(user.name || "");
        setPhone(user.phone || "");
        setYear(user.year || "");
        setDepartment(user.department || "");
      }, 0);

      return () => clearTimeout(timer);
    }
  }, [user]);

  const handleSave = async () => {
    try {
      setMessage(null);

      await updateProfile.mutateAsync({
        name,
        phone: phone || null,
        year: year || null,
        department: department || null,
      });

      if (user) {
        onUpdate({
          ...user,
          name,
          phone: phone || null,
          year: year || null,
          department: department || null,
        });
      }

      toast.success("Profile updated successfully");
      setMessage({ type: "success", text: "Profile updated successfully!" });
    } catch (e) {
      setMessage({ 
        type: "error", 
        text: e instanceof Error ? e.message : "Failed to update profile" 
      });
      toast.error(e instanceof Error ? e.message : "Failed to update profile");
    }
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <h3 className="text-xl font-serif font-extrabold text-primary">
          My Profile
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl animate-pulse">
          <div className="md:col-span-2 h-16 bg-muted/50 rounded-xl" />
          <div className="h-16 bg-muted/50 rounded-xl" />
          <div className="h-16 bg-muted/50 rounded-xl" />
          <div className="h-16 bg-muted/50 rounded-xl" />
          <div className="h-16 bg-muted/50 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h3 className="text-xl font-serif font-extrabold text-primary">
        My Profile
      </h3>

      {message && (
        <div
          className={`rounded-xl p-4 text-sm border ${
            message.type === "success"
              ? "bg-green-50 text-green-600 border-green-100"
              : "bg-red-50 text-red-600 border-red-100"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl">
        <div className="md:col-span-2 space-y-2">
          <label className="text-xs font-bold text-secondary uppercase tracking-widest px-1">
            Full Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your full name"
            className="w-full px-5 py-3.5 rounded-xl border border-border bg-card text-sm text-primary focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all placeholder:text-secondary/30"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold text-secondary uppercase tracking-widest px-1">
            Student ID
          </label>
          <input
            type="text"
            value={user?.student_id || "Not set"}
            disabled
            className="w-full px-5 py-3.5 rounded-xl border border-border bg-muted/30 text-sm text-secondary focus:outline-none transition-all cursor-not-allowed"
          />
          <p className="text-xs text-secondary/60 px-1">
            Contact admin to update student ID
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold text-secondary uppercase tracking-widest px-1">
            Phone Number
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+251 912 345 678"
            className="w-full px-5 py-3.5 rounded-xl border border-border bg-card text-sm text-primary focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all placeholder:text-secondary/30"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold text-secondary uppercase tracking-widest px-1">
            Year
          </label>
          <select
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="w-full px-5 py-3.5 rounded-xl border border-border bg-card text-sm text-primary focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all"
          >
            <option value="">Select Year</option>
            <option value="1st Year">1st Year</option>
            <option value="2nd Year">2nd Year</option>
            <option value="3rd Year">3rd Year</option>
            <option value="4th Year">4th Year</option>
            <option value="5th Year">5th Year</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold text-secondary uppercase tracking-widest px-1">
            Department
          </label>
          <input
            type="text"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            placeholder="e.g., Computer Science"
            className="w-full px-5 py-3.5 rounded-xl border border-border bg-card text-sm text-primary focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all placeholder:text-secondary/30"
          />
        </div>

        <div className="md:col-span-2 space-y-2">
          <label className="text-xs font-bold text-secondary uppercase tracking-widest px-1">
            Email Address
          </label>
          <input
            type="email"
            value={user?.email || ""}
            disabled
            className="w-full px-5 py-3.5 rounded-xl border border-border bg-muted/30 text-sm text-secondary focus:outline-none transition-all cursor-not-allowed"
          />
          <p className="text-xs text-secondary/60 px-1">
            Email cannot be changed
          </p>
        </div>

        <div className="md:col-span-2 flex justify-end gap-3 pt-4">
          <button
            onClick={() => {
              setName(user?.name || "");
              setPhone(user?.phone || "");
              setYear(user?.year || "");
              setDepartment(user?.department || "");
              setMessage(null);
            }}
            disabled={updateProfile.isPending}
            className="px-6 py-3 rounded-xl border border-border bg-card text-sm font-bold text-secondary hover:bg-muted transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={updateProfile.isPending || !name.trim()}
            className="px-6 py-3 rounded-xl bg-primary text-background text-sm font-bold hover:bg-accent transition-all active:scale-95 shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {updateProfile.isPending ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
};
