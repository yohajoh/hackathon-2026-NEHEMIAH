"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthLayout } from "../AuthLayout";
import { fetchApi, fetchCurrentUser } from "@/lib/api";

type UserData = {
  id: string;
  name: string;
  email: string;
  role: string;
  student_id?: string | null;
  phone?: string | null;
  year?: string | null;
  department?: string | null;
};

const hasMissingProfileFields = (user: UserData | null) => {
  if (!user || user.role === "ADMIN") return false;
  return !user.student_id || !user.phone || !user.year || !user.department;
};

export default function CompleteProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [name, setName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [phone, setPhone] = useState("");
  const [year, setYear] = useState("");
  const [department, setDepartment] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      const currentUser = (await fetchCurrentUser()) as UserData | null;
      if (!currentUser) {
        router.replace("/auth/login");
        return;
      }

      if (!hasMissingProfileFields(currentUser)) {
        router.replace(currentUser.role === "ADMIN" ? "/dashboard/admin" : "/dashboard/student");
        return;
      }

      setUser(currentUser);
      setName(currentUser.name || "");
      setStudentId(currentUser.student_id || "");
      setPhone(currentUser.phone || "");
      setYear(currentUser.year || "");
      setDepartment(currentUser.department || "");
      setLoading(false);
    };

    init();
  }, [router]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) return;

    setSaving(true);
    setError(null);
    try {
      const payload: Record<string, string | null> = {
        name: name.trim(),
        phone: phone.trim() || null,
        year: year.trim() || null,
        department: department.trim() || null,
      };
      if (!user.student_id) {
        payload.student_id = studentId.trim();
      }

      await fetchApi("/auth/update-me", {
        method: "PATCH",
        body: JSON.stringify(payload),
      });

      router.replace(user.role === "ADMIN" ? "/dashboard/admin" : "/dashboard/student");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AuthLayout
      title="Complete your profile"
      subtitle="Please fill your remaining account details before continuing."
      showBackLink={false}
      imageSrc="/auth/image.png"
      imageAlt="Library shelves"
    >
      {loading ? (
        <div className="text-sm text-[#142B6F]">Loading...</div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-xl bg-red-50 p-3 text-xs text-red-600 border border-red-100 italic">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="name" className="text-xs font-medium text-[#111111]">Full Name</label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full rounded-xl border border-[#E1DEE5] bg-white px-3 py-2.5 text-sm text-[#111111] outline-none focus:border-[#142B6F] focus:ring-2 focus:ring-[#FFD602] transition"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="studentId" className="text-xs font-medium text-[#111111]">Student ID</label>
            <input
              id="studentId"
              type="text"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              required={!user?.student_id}
              disabled={Boolean(user?.student_id)}
              className="w-full rounded-xl border border-[#E1DEE5] bg-white px-3 py-2.5 text-sm text-[#111111] outline-none focus:border-[#142B6F] focus:ring-2 focus:ring-[#FFD602] transition disabled:opacity-70"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="phone" className="text-xs font-medium text-[#111111]">Phone</label>
            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              className="w-full rounded-xl border border-[#E1DEE5] bg-white px-3 py-2.5 text-sm text-[#111111] outline-none focus:border-[#142B6F] focus:ring-2 focus:ring-[#FFD602] transition"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="year" className="text-xs font-medium text-[#111111]">Year</label>
            <input
              id="year"
              type="text"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              required
              placeholder="e.g. 3rd Year"
              className="w-full rounded-xl border border-[#E1DEE5] bg-white px-3 py-2.5 text-sm text-[#111111] outline-none focus:border-[#142B6F] focus:ring-2 focus:ring-[#FFD602] transition"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="department" className="text-xs font-medium text-[#111111]">Department</label>
            <input
              id="department"
              type="text"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              required
              className="w-full rounded-xl border border-[#E1DEE5] bg-white px-3 py-2.5 text-sm text-[#111111] outline-none focus:border-[#142B6F] focus:ring-2 focus:ring-[#FFD602] transition"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="mt-2 inline-flex w-full items-center justify-center rounded-xl bg-[#142B6F] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#142B6F] transition disabled:opacity-70"
          >
            {saving ? "Saving..." : "Save and continue"}
          </button>
        </form>
      )}
    </AuthLayout>
  );
}
