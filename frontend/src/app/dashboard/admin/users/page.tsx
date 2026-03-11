"use client";

import { useState } from "react";
import { MoreHorizontal, Search, ChevronLeft, ChevronRight, X } from "lucide-react";
import { toast } from "sonner";
import {
  useUsers,
  useUserInsights,
  useDeleteUser,
  useBlockUser,
  useUnblockUser,
  usePromoteStudentToAdmin,
  useConvertAdminToStudent,
  useTransferSuperAdmin,
} from "@/lib/hooks/useQueries";
import { usePersona } from "@/components/providers/PersonaProvider";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  student_id?: string;
  year?: number | string;
  phone?: string;
  is_blocked?: boolean;
  is_super_admin?: boolean;
}

interface UserInsights {
  user: User & { department?: string; is_confirmed?: boolean; created_at?: string };
  stats: {
    totalRentals: number;
    activeOverdue: number;
    returnedOnTime: number;
    onTimeRate: number;
    wishlistCount: number;
    reviewCount: number;
    statusSummary: Record<string, number>;
  };
  favoriteCategories: Array<{ name: string; count: number }>;
  history: Array<{
    id: string;
    bookTitle: string;
    status: string;
    loanDate: string;
    dueDate: string;
    returnDate?: string | null;
    fine: number;
    isLate: boolean;
    daysLate: number;
  }>;
}

type ConfirmDialogState = {
  title: string;
  description: string;
  confirmLabel: string;
  tone: "danger" | "primary" | "amber";
  action: () => Promise<void>;
} | null;

const ITEMS_PER_PAGE = 8;

export default function AdminUsersPage() {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"STUDENTS" | "ADMINS">("STUDENTS");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [openMenuUserId, setOpenMenuUserId] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const { user: currentUser } = usePersona();

  const { data: usersData, isLoading } = useUsers();
  const { data: insightsData } = useUserInsights(selectedUser?.id || "");
  const deleteUser = useDeleteUser();
  const blockUser = useBlockUser();
  const unblockUser = useUnblockUser();
  const promoteUser = usePromoteStudentToAdmin();
  const convertAdmin = useConvertAdminToStudent();
  const transferSuperAdmin = useTransferSuperAdmin();

  const users: User[] = usersData?.data?.users || [];
  const isSuperAdminViewer = Boolean(currentUser?.is_super_admin);

  const scopeFiltered = users.filter((u) => {
    if (!isSuperAdminViewer) {
      return u.role === "STUDENT";
    }
    return activeTab === "ADMINS" ? u.role === "ADMIN" || u.role === "SUPER_ADMIN" : u.role === "STUDENT";
  });

  const insights = insightsData?.data as UserInsights | null;

  const getErrorMessage = (error: unknown, fallback: string) =>
    error instanceof Error && error.message ? error.message : fallback;

  const filtered = scopeFiltered.filter((u) => {
    const q = search.toLowerCase();
    return (
      u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q) || u.student_id?.toLowerCase().includes(q)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const openConfirmDialog = (nextDialog: NonNullable<ConfirmDialogState>) => {
    setOpenMenuUserId(null);
    setConfirmDialog(nextDialog);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteUser.mutateAsync(id);
      toast.success("User deleted successfully");
      setSelectedUser((current) => (current?.id === id ? null : current));
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to delete user"));
      throw error;
    }
  };

  const handleToggleBlock = async (user: User) => {
    try {
      if (user.is_blocked) {
        await unblockUser.mutateAsync(user.id);
        toast.success("User unblocked successfully");
      } else {
        await blockUser.mutateAsync(user.id);
        toast.success("User blocked successfully");
      }
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to update user status"));
      throw error;
    }
  };

  const handlePromote = async (user: User) => {
    try {
      await promoteUser.mutateAsync(user.id);
      toast.success("Student promoted to admin successfully");
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to promote user"));
      throw error;
    }
  };

  const handleConvertToStudent = async (user: User) => {
    try {
      await convertAdmin.mutateAsync(user.id);
      toast.success("Admin converted to student successfully");
      setSelectedUser((current) => (current?.id === user.id ? { ...current, role: "STUDENT", is_super_admin: false } : current));
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to convert admin to student"));
      throw error;
    }
  };

  const handleTransferSuperAdmin = async (user: User) => {
    try {
      await transferSuperAdmin.mutateAsync(user.id);
      toast.success("Super admin role transferred successfully");
      window.location.reload();
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to transfer super admin role"));
      throw error;
    }
  };

  const submitConfirmDialog = async () => {
    if (!confirmDialog) return;
    setIsConfirming(true);
    try {
      await confirmDialog.action();
      setConfirmDialog(null);
    } finally {
      setIsConfirming(false);
    }
  };

  const getRoleLabel = (user: User) => {
    if (user.is_blocked) return "Blocked";
    if (user.is_super_admin || user.role === "SUPER_ADMIN") return "Super Admin";
    if (user.role === "ADMIN") return "Admin";
    return "Student";
  };

  const getRoleBadgeClassName = (user: User) => {
    if (user.is_blocked) return "bg-red-50 text-red-700";
    if (user.is_super_admin || user.role === "SUPER_ADMIN") return "bg-amber-50 text-amber-700";
    if (user.role === "ADMIN") return "bg-[#F3EFE6] text-[#6C5236]";
    return "bg-green-50 text-green-700";
  };

  const getUserActions = (user: User) => {
    const actions: Array<{
      key: string;
      label: string;
      tone: "default" | "danger" | "amber";
      disabled?: boolean;
      onClick: () => void;
    }> = [];

    const canManageUser = isSuperAdminViewer ? !user.is_super_admin && user.id !== currentUser?.id : user.role === "STUDENT";

    if (!canManageUser) {
      return actions;
    }

    actions.push({
      key: user.is_blocked ? "unblock" : "block",
      label: user.is_blocked ? "Unblock" : "Block",
      tone: "default",
      onClick: () =>
        openConfirmDialog({
          title: `${user.is_blocked ? "Unblock" : "Block"} ${user.name}?`,
          description: user.is_blocked
            ? "This will restore account access immediately."
            : "This user will not be able to access the system until you unblock them.",
          confirmLabel: user.is_blocked ? "Unblock User" : "Block User",
          tone: "amber",
          action: () => handleToggleBlock(user),
        }),
    });

    actions.push({
      key: "delete",
      label: "Delete",
      tone: "danger",
      onClick: () =>
        openConfirmDialog({
          title: `Delete ${user.name}?`,
          description: "This removes the user account permanently if no protected related records exist.",
          confirmLabel: "Delete User",
          tone: "danger",
          action: () => handleDelete(user.id),
        }),
    });

    if (isSuperAdminViewer && user.role === "STUDENT") {
      actions.unshift({
        key: "promote",
        label: "Promote",
        tone: "default",
        disabled: Boolean(user.is_blocked),
        onClick: () =>
          openConfirmDialog({
            title: `Promote ${user.name} to admin?`,
            description: "The user will gain admin permissions and keep student persona access.",
            confirmLabel: "Promote to Admin",
            tone: "primary",
            action: () => handlePromote(user),
          }),
      });
    }

    if (isSuperAdminViewer && user.role === "ADMIN") {
      actions.unshift({
        key: "to-student",
        label: "Make Student",
        tone: "default",
        disabled: Boolean(user.is_blocked),
        onClick: () =>
          openConfirmDialog({
            title: `Convert ${user.name} to student?`,
            description: "This removes admin privileges and keeps the account as a student user.",
            confirmLabel: "Convert to Student",
            tone: "primary",
            action: () => handleConvertToStudent(user),
          }),
      });

      actions.unshift({
        key: "transfer-super-admin",
        label: "Make Super Admin",
        tone: "amber",
        disabled: Boolean(user.is_blocked),
        onClick: () =>
          openConfirmDialog({
            title: `Transfer super admin to ${user.name}?`,
            description:
              "This admin will become the only super admin. Your account will automatically become a normal admin.",
            confirmLabel: "Transfer Role",
            tone: "amber",
            action: () => handleTransferSuperAdmin(user),
          }),
      });
    }

    return actions;
  };

  return (
    <div className="p-6 lg:p-12 space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-4xl lg:text-5xl font-serif font-extrabold text-[#2B1A10]">Manage Users</h1>
          <p className="text-[#AE9E85] font-medium">
            {isSuperAdminViewer
              ? "Super Admin can manage both admins and students"
              : "Admin can manage students only"}
          </p>
          {isSuperAdminViewer ? (
            <div className="mt-4 inline-flex rounded-xl border border-[#E1D2BD] bg-white p-1">
              <button
                type="button"
                onClick={() => {
                  setActiveTab("STUDENTS");
                  setCurrentPage(1);
                }}
                className={`px-4 py-2 text-xs font-bold rounded-lg ${
                  activeTab === "STUDENTS" ? "bg-[#2B1A10] text-white" : "text-[#8B6B4A]"
                }`}
              >
                Students
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab("ADMINS");
                  setCurrentPage(1);
                }}
                className={`px-4 py-2 text-xs font-bold rounded-lg ${
                  activeTab === "ADMINS" ? "bg-[#2B1A10] text-white" : "text-[#8B6B4A]"
                }`}
              >
                Admins
              </button>
            </div>
          ) : null}
        </div>
        <div className="relative mt-2">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#AE9E85]" />
          <input
            type="text"
            placeholder="Search user"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="pl-9 pr-4 py-2.5 text-sm bg-white border border-[#E1D2BD] rounded-xl text-[#2B1A10] placeholder:text-[#C4B49E] w-56"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-[#E1D2BD]/50 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#8B6B4A]"></div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-[2fr_2fr_1.5fr_0.8fr_1.2fr_1fr_2fr] gap-4 px-6 py-3 border-b border-[#E1D2BD]/50 bg-[#FDFAF6]">
              <span className="text-[11px] font-bold text-[#AE9E85] uppercase">Name</span>
              <span className="text-[11px] font-bold text-[#AE9E85] uppercase">Email</span>
              <span className="text-[11px] font-bold text-[#AE9E85] uppercase">ID No</span>
              <span className="text-[11px] font-bold text-[#AE9E85] uppercase">Year</span>
              <span className="text-[11px] font-bold text-[#AE9E85] uppercase">Phone No</span>
              <span className="text-[11px] font-bold text-[#AE9E85] uppercase">Status</span>
              <span className="text-[11px] font-bold text-[#AE9E85] uppercase">Actions</span>
            </div>
            {paginated.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-[#AE9E85]">
                <p className="text-sm font-medium">No users found</p>
              </div>
            ) : (
              paginated.map((user) => {
                const actions = getUserActions(user);

                return (
                  <div
                    key={user.id}
                    onClick={() => setSelectedUser(user)}
                    className="grid grid-cols-[2fr_2fr_1.5fr_0.8fr_1.2fr_1fr_2fr] gap-4 items-center px-6 py-4 border-b border-[#E1D2BD]/30 hover:bg-[#FDFAF6] transition-colors cursor-pointer"
                  >
                    <span className="text-sm font-bold text-[#2B1A10] truncate">{user.name}</span>
                    <span className="text-sm text-[#8B6B4A] truncate">{user.email}</span>
                    <span className="text-sm text-[#2B1A10]/70">{user.student_id || "—"}</span>
                    <span className="text-sm text-[#2B1A10]/70">{user.year || "—"}</span>
                    <span className="text-sm text-[#2B1A10]/70">{user.phone || "—"}</span>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-lg w-fit ${getRoleBadgeClassName(user)}`}>
                      {getRoleLabel(user)}
                    </span>
                    <div className="flex items-center justify-end">
                      <div className="relative" onClick={(event) => event.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => setOpenMenuUserId((current) => (current === user.id ? null : user.id))}
                          disabled={actions.length === 0}
                          className="h-9 w-9 rounded-full border border-[#E1D2BD] bg-[#FFFDF9] text-[#8B6B4A] flex items-center justify-center disabled:opacity-40"
                          aria-label={`Open actions for ${user.name}`}
                        >
                          <MoreHorizontal size={16} />
                        </button>
                        {openMenuUserId === user.id && actions.length > 0 ? (
                          <div className="absolute right-0 top-11 z-20 min-w-56 rounded-2xl border border-[#E1D2BD] bg-white p-2 shadow-lg">
                            {actions.map((action) => (
                              <button
                                key={action.key}
                                type="button"
                                onClick={action.onClick}
                                disabled={action.disabled}
                                className={`flex w-full items-center rounded-xl px-3 py-2.5 text-left text-xs font-bold transition-colors disabled:opacity-40 ${
                                  action.tone === "danger"
                                    ? "bg-red-50 text-red-700 hover:bg-red-100"
                                    : action.tone === "amber"
                                      ? "bg-amber-50 text-amber-700 hover:bg-amber-100"
                                      : "bg-[#F5EFE6] text-[#2B1A10] hover:bg-[#EADFCF]"
                                }`}
                              >
                                {action.label}
                              </button>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </>
        )}
      </div>

      {!isLoading && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-[#2B1A10]/60 disabled:opacity-30"
          >
            <ChevronLeft size={16} />
            Previous
          </button>
          <div className="flex items-center gap-1.5">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`w-8 h-8 rounded-lg text-sm font-bold ${page === currentPage ? "bg-[#2B1A10] text-white" : "text-[#2B1A10]/60 hover:bg-[#F3EFE6]"}`}
              >
                {page}
              </button>
            ))}
          </div>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-[#2B1A10]/60 disabled:opacity-30"
          >
            Next
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {selectedUser && (
        <div className="fixed inset-0 z-50 bg-black/20" onClick={() => setSelectedUser(null)}>
          <aside
            onClick={(e) => e.stopPropagation()}
            className="absolute right-0 top-0 h-full w-full md:w-[40%] bg-[#FDF8F0] border-l border-[#E1D2BD] p-6 overflow-y-auto"
          >
            <div className="flex items-start justify-between mb-5">
              <div>
                <h2 className="text-2xl font-serif font-black text-[#2B1A10]">{selectedUser.name}</h2>
                <p className="text-sm text-[#AE9E85]">{selectedUser.email}</p>
              </div>
              <button
                onClick={() => setSelectedUser(null)}
                className="w-9 h-9 rounded-xl border border-[#E1D2BD] flex items-center justify-center text-[#AE9E85]"
                title="Close user details"
                aria-label="Close user details"
              >
                <X size={16} />
              </button>
            </div>
            {insights ? (
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-3">
                  <Card label="Total Rentals" value={String(insights.stats.totalRentals)} />
                  <Card label="On-Time Rate" value={`${insights.stats.onTimeRate}%`} />
                  <Card label="Active Overdue" value={String(insights.stats.activeOverdue)} />
                  <Card label="Wishlist" value={String(insights.stats.wishlistCount)} />
                </div>
                <div className="bg-white rounded-2xl border border-[#E1D2BD]/50 p-4">
                  <h3 className="text-sm font-bold text-[#2B1A10] mb-3">Favorite Categories</h3>
                  {insights.favoriteCategories.length === 0 ? (
                    <p className="text-xs text-[#AE9E85]">No category data yet</p>
                  ) : (
                    insights.favoriteCategories.map((cat) => (
                      <div key={cat.name} className="flex items-center justify-between py-1.5 text-sm">
                        <span className="text-[#2B1A10]">{cat.name}</span>
                        <span className="text-[#AE9E85]">{cat.count}</span>
                      </div>
                    ))
                  )}
                </div>
                <div className="bg-white rounded-2xl border border-[#E1D2BD]/50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-[#E1D2BD]/40">
                    <h3 className="text-sm font-bold text-[#2B1A10]">Borrowing History</h3>
                  </div>
                  <div className="max-h-95 overflow-y-auto">
                    {insights.history.length === 0 ? (
                      <p className="p-4 text-xs text-[#AE9E85]">No history</p>
                    ) : (
                      insights.history.map((item) => (
                        <div key={item.id} className="p-4 border-b border-[#E1D2BD]/30 last:border-0">
                          <p className="text-sm font-bold text-[#2B1A10]">{item.bookTitle}</p>
                          <p className="text-xs text-[#AE9E85]">
                            Due {new Date(item.dueDate).toLocaleDateString()} • {item.status}
                          </p>
                          <p className={`text-xs mt-1 ${item.isLate ? "text-red-700" : "text-green-700"}`}>
                            {item.isLate ? `Late by ${item.daysLate} day(s)` : "Returned on time"}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-[#AE9E85]">Loading user progress...</p>
            )}
          </aside>
        </div>
      )}

      {confirmDialog ? (
        <div className="fixed inset-0 z-60 bg-[#2B1A10]/35 flex items-center justify-center p-4" onClick={() => !isConfirming && setConfirmDialog(null)}>
          <div
            onClick={(event) => event.stopPropagation()}
            className="w-full max-w-md rounded-[28px] border border-[#E1D2BD] bg-[#FFF9F1] p-6 shadow-2xl"
          >
            <div className="space-y-2">
              <h3 className="text-2xl font-serif font-black text-[#2B1A10]">{confirmDialog.title}</h3>
              <p className="text-sm text-[#7B6853] leading-6">{confirmDialog.description}</p>
            </div>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmDialog(null)}
                disabled={isConfirming}
                className="px-4 py-2.5 rounded-xl border border-[#D9C8B3] text-sm font-bold text-[#6C5236] disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitConfirmDialog}
                disabled={isConfirming}
                className={`px-4 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-40 ${
                  confirmDialog.tone === "danger"
                    ? "bg-red-700"
                    : confirmDialog.tone === "amber"
                      ? "bg-amber-700"
                      : "bg-[#2B1A10]"
                }`}
              >
                {isConfirming ? "Processing..." : confirmDialog.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-2xl border border-[#E1D2BD]/50 p-3">
      <p className="text-[11px] font-bold text-[#AE9E85] uppercase tracking-wider">{label}</p>
      <p className="text-lg font-black text-[#2B1A10]">{value}</p>
    </div>
  );
}
