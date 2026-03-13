"use client";

import { useEffect, useState } from "react";
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
import { useLanguage } from "@/components/providers/LanguageProvider";

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
  const { t } = useLanguage();

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

  useEffect(() => {
    const closeMenu = () => setOpenMenuUserId(null);
    window.addEventListener("click", closeMenu);
    return () => {
      window.removeEventListener("click", closeMenu);
    };
  }, []);

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
      toast.success(t("admin_users.messages.delete_success"));
      setSelectedUser((current) => (current?.id === id ? null : current));
    } catch (error) {
      toast.error(getErrorMessage(error, t("admin_users.messages.status_update_failed")));
      throw error;
    }
  };

  const handleToggleBlock = async (user: User) => {
    try {
      if (user.is_blocked) {
        await unblockUser.mutateAsync(user.id);
        toast.success(t("admin_users.messages.unblock_success"));
      } else {
        await blockUser.mutateAsync(user.id);
        toast.success(t("admin_users.messages.block_success"));
      }
    } catch (error) {
      toast.error(getErrorMessage(error, t("admin_users.messages.status_update_failed")));
      throw error;
    }
  };

  const handlePromote = async (user: User) => {
    try {
      await promoteUser.mutateAsync(user.id);
      toast.success(t("admin_users.messages.promote_success"));
    } catch (error) {
      toast.error(getErrorMessage(error, t("admin_users.messages.status_update_failed")));
      throw error;
    }
  };

  const handleConvertToStudent = async (user: User) => {
    try {
      await convertAdmin.mutateAsync(user.id);
      toast.success(t("admin_users.messages.to_student_success"));
      setSelectedUser((current) =>
        current?.id === user.id ? { ...current, role: "STUDENT", is_super_admin: false } : current,
      );
    } catch (error) {
      toast.error(getErrorMessage(error, t("admin_users.messages.status_update_failed")));
      throw error;
    }
  };

  const handleTransferSuperAdmin = async (user: User) => {
    try {
      await transferSuperAdmin.mutateAsync(user.id);
      toast.success(t("admin_users.messages.transfer_success"));
      window.location.reload();
    } catch (error) {
      toast.error(getErrorMessage(error, t("admin_users.messages.status_update_failed")));
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
    if (user.is_blocked) return t("admin_users.roles.blocked");
    if (user.is_super_admin || user.role === "SUPER_ADMIN") return t("admin_users.roles.super_admin");
    if (user.role === "ADMIN") return t("admin_users.roles.admin");
    return t("admin_users.roles.student");
  };

  const getRoleBadgeClassName = (user: User) => {
    if (user.is_blocked) return "bg-red-50 text-red-700";
    if (user.is_super_admin || user.role === "SUPER_ADMIN") return "bg-amber-50 text-amber-700";
    if (user.role === "ADMIN") return "bg-[#E1DEE5] text-[#142B6F]";
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

    const canManageUser = isSuperAdminViewer
      ? !user.is_super_admin && user.id !== currentUser?.id
      : user.role === "STUDENT";

    if (!canManageUser) {
      return actions;
    }

    actions.push({
      key: user.is_blocked ? "unblock" : "block",
      label: user.is_blocked ? t("admin_users.actions.unblock") : t("admin_users.actions.block"),
      tone: "default",
      onClick: () =>
        openConfirmDialog({
          title: t(`admin_users.confirm.${user.is_blocked ? "unblock" : "block"}_title`, { name: user.name }),
          description: t(`admin_users.confirm.${user.is_blocked ? "unblock" : "block"}_desc`),
          confirmLabel: user.is_blocked ? t("admin_users.actions.unblock") : t("admin_users.actions.block"),
          tone: "amber",
          action: () => handleToggleBlock(user),
        }),
    });

    actions.push({
      key: "delete",
      label: t("admin_users.actions.delete"),
      tone: "danger",
      onClick: () =>
        openConfirmDialog({
          title: t("admin_users.confirm.delete_title", { name: user.name }),
          description: t("admin_users.confirm.delete_desc"),
          confirmLabel: t("admin_users.actions.delete"),
          tone: "danger",
          action: () => handleDelete(user.id),
        }),
    });

    if (isSuperAdminViewer && user.role === "STUDENT") {
      actions.unshift({
        key: "promote",
        label: t("admin_users.actions.promote"),
        tone: "default",
        disabled: Boolean(user.is_blocked),
        onClick: () =>
          openConfirmDialog({
            title: t("admin_users.confirm.promote_title", { name: user.name }),
            description: t("admin_users.confirm.promote_desc"),
            confirmLabel: t("admin_users.actions.promote"),
            tone: "primary",
            action: () => handlePromote(user),
          }),
      });
    }

    if (isSuperAdminViewer && user.role === "ADMIN") {
      actions.unshift({
        key: "to-student",
        label: t("admin_users.actions.make_student"),
        tone: "default",
        disabled: Boolean(user.is_blocked),
        onClick: () =>
          openConfirmDialog({
            title: t("admin_users.confirm.to_student_title", { name: user.name }),
            description: t("admin_users.confirm.to_student_desc"),
            confirmLabel: t("admin_users.actions.make_student"),
            tone: "primary",
            action: () => handleConvertToStudent(user),
          }),
      });

      actions.unshift({
        key: "transfer-super-admin",
        label: t("admin_users.actions.make_super_admin"),
        tone: "amber",
        disabled: Boolean(user.is_blocked),
        onClick: () =>
          openConfirmDialog({
            title: t("admin_users.confirm.transfer_super_title", { name: user.name }),
            description: t("admin_users.confirm.transfer_super_desc"),
            confirmLabel: t("admin_users.actions.make_super_admin"),
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
          <h1 className="text-4xl lg:text-5xl font-serif font-extrabold text-[#111111]">{t("admin_users.title")}</h1>
          <p className="text-[#142B6F] font-medium">
            {isSuperAdminViewer ? t("admin_users.subtitle_super") : t("admin_users.subtitle_admin")}
          </p>
          {isSuperAdminViewer ? (
            <div className="mt-4 inline-flex rounded-xl border border-[#E1DEE5] bg-white p-1">
              <button
                type="button"
                onClick={() => {
                  setActiveTab("STUDENTS");
                  setCurrentPage(1);
                }}
                className={`px-4 py-2 text-xs font-bold rounded-lg ${
                  activeTab === "STUDENTS" ? "bg-[#142B6F] text-white" : "text-[#142B6F]"
                }`}
              >
                {t("admin_users.tabs.students")}
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab("ADMINS");
                  setCurrentPage(1);
                }}
                className={`px-4 py-2 text-xs font-bold rounded-lg ${
                  activeTab === "ADMINS" ? "bg-[#142B6F] text-white" : "text-[#142B6F]"
                }`}
              >
                {t("admin_users.tabs.admins")}
              </button>
            </div>
          ) : null}
        </div>
        <div className="relative mt-2">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#142B6F]" />
          <input
            type="text"
            placeholder={t("admin_users.search_placeholder")}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="pl-9 pr-4 py-2.5 text-sm bg-white border border-[#E1DEE5] rounded-xl text-[#111111] placeholder:text-[#E1DEE5] w-56"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-[#E1DEE5]/50 overflow-visible">
        {isLoading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="grid grid-cols-[2fr_2fr_1.5fr_0.8fr_1.2fr_1fr_2fr] gap-4 items-center py-2">
                <div className="h-4 rounded-lg bg-[#E1DEE5]/70 animate-pulse" />
                <div className="h-4 rounded-lg bg-[#E1DEE5]/70 animate-pulse" />
                <div className="h-4 rounded-lg bg-[#E1DEE5]/70 animate-pulse" />
                <div className="h-4 rounded-lg bg-[#E1DEE5]/70 animate-pulse" />
                <div className="h-4 rounded-lg bg-[#E1DEE5]/70 animate-pulse" />
                <div className="h-4 w-20 rounded-lg bg-[#E1DEE5]/70 animate-pulse" />
                <div className="h-8 w-8 ml-auto rounded-full bg-[#E1DEE5]/70 animate-pulse" />
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-[2fr_2fr_1.5fr_0.8fr_1.2fr_1fr_2fr] gap-4 px-6 py-3 border-b border-[#E1DEE5]/50 bg-[#FFFFFF]">
              <span className="text-[11px] font-bold text-[#142B6F] uppercase">{t("admin_users.table.name")}</span>
              <span className="text-[11px] font-bold text-[#142B6F] uppercase">{t("admin_users.table.email")}</span>
              <span className="text-[11px] font-bold text-[#142B6F] uppercase">{t("admin_users.table.id_no")}</span>
              <span className="text-[11px] font-bold text-[#142B6F] uppercase">{t("admin_users.table.year")}</span>
              <span className="text-[11px] font-bold text-[#142B6F] uppercase">{t("admin_users.table.phone_no")}</span>
              <span className="text-[11px] font-bold text-[#142B6F] uppercase">{t("admin_users.table.status")}</span>
              <span className="text-[11px] font-bold text-[#142B6F] uppercase">{t("admin_users.table.actions")}</span>
            </div>
            {paginated.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-[#142B6F]">
                <p className="text-sm font-medium">{t("admin_users.table.no_users")}</p>
              </div>
            ) : (
              paginated.map((user) => {
                const actions = getUserActions(user);

                return (
                  <div
                    key={user.id}
                    onClick={() => setSelectedUser(user)}
                    className="grid grid-cols-[2fr_2fr_1.5fr_0.8fr_1.2fr_1fr_2fr] gap-4 items-center px-6 py-4 border-b border-[#E1DEE5]/30 hover:bg-[#FFFFFF] transition-colors cursor-pointer"
                  >
                    <span className="text-sm font-bold text-[#111111] truncate">{user.name}</span>
                    <span className="text-sm text-[#142B6F] truncate">{user.email}</span>
                    <span className="text-sm text-[#111111]/70">{user.student_id || "—"}</span>
                    <span className="text-sm text-[#111111]/70">{user.year || "—"}</span>
                    <span className="text-sm text-[#111111]/70">{user.phone || "—"}</span>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-lg w-fit ${getRoleBadgeClassName(user)}`}>
                      {getRoleLabel(user)}
                    </span>
                    <div className="flex items-center justify-end">
                      <div className="relative" onClick={(event) => event.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => setOpenMenuUserId((current) => (current === user.id ? null : user.id))}
                          disabled={actions.length === 0}
                          className="h-9 w-9 rounded-full border border-[#E1DEE5] bg-[#FFFFFF] text-[#142B6F] flex items-center justify-center disabled:opacity-40"
                          aria-label={`Open actions for ${user.name}`}
                        >
                          <MoreHorizontal size={16} />
                        </button>
                        {openMenuUserId === user.id && actions.length > 0 ? (
                          <div className="absolute right-0 top-11 z-2147483646 min-w-56 overflow-hidden rounded-xl border border-[#E1DEE5] bg-white shadow-[0_18px_40px_rgba(0,0,0,0.18)]">
                            {actions.map((action) => (
                              <button
                                key={action.key}
                                type="button"
                                onClick={action.onClick}
                                disabled={action.disabled}
                                className={`flex w-full items-center px-3 py-2.5 text-left text-sm font-semibold transition-colors disabled:opacity-40 ${
                                  action.tone === "danger"
                                    ? "text-red-700 hover:bg-red-50"
                                    : action.tone === "amber"
                                      ? "text-amber-700 hover:bg-amber-50"
                                      : "text-[#111111] hover:bg-[#FFFFFF]"
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
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-[#111111]/60 disabled:opacity-30"
          >
            <ChevronLeft size={16} />
            {t("common.previous")}
          </button>
          <div className="flex items-center gap-1.5">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`w-8 h-8 rounded-lg text-sm font-bold ${page === currentPage ? "bg-[#142B6F] text-white" : "text-[#111111]/60 hover:bg-[#E1DEE5]"}`}
              >
                {page}
              </button>
            ))}
          </div>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-[#111111]/60 disabled:opacity-30"
          >
            {t("common.next")}
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {selectedUser && (
        <div className="fixed inset-0 z-50 bg-black/20" onClick={() => setSelectedUser(null)}>
          <aside
            onClick={(e) => e.stopPropagation()}
            className="absolute right-0 top-0 h-full w-full md:w-[40%] bg-[#FFFFFF] border-l border-[#E1DEE5] p-6 overflow-y-auto"
          >
            <div className="flex items-start justify-between mb-5">
              <div>
                <h2 className="text-2xl font-serif font-black text-[#111111]">{selectedUser.name}</h2>
                <p className="text-sm text-[#142B6F]">{selectedUser.email}</p>
              </div>
              <button
                onClick={() => setSelectedUser(null)}
                className="w-9 h-9 rounded-xl border border-[#E1DEE5] flex items-center justify-center text-[#142B6F]"
                title="Close user details"
                aria-label="Close user details"
              >
                <X size={16} />
              </button>
            </div>
            {insights ? (
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-3">
                  <Card label={t("admin_users.insights.total_rentals")} value={String(insights.stats.totalRentals)} />
                  <Card label={t("admin_users.insights.on_time_rate")} value={`${insights.stats.onTimeRate}%`} />
                  <Card label={t("admin_users.insights.active_overdue")} value={String(insights.stats.activeOverdue)} />
                  <Card label={t("admin_users.insights.wishlist")} value={String(insights.stats.wishlistCount)} />
                </div>
                <div className="bg-white rounded-2xl border border-[#E1DEE5]/50 p-4">
                  <h3 className="text-sm font-bold text-[#111111] mb-3">{t("admin_users.insights.favorite_categories")}</h3>
                  {insights.favoriteCategories.length === 0 ? (
                    <p className="text-xs text-[#142B6F]">{t("admin_users.insights.no_category_data")}</p>
                  ) : (
                    insights.favoriteCategories.map((cat) => (
                      <div key={cat.name} className="flex items-center justify-between py-1.5 text-sm">
                        <span className="text-[#111111]">{cat.name}</span>
                        <span className="text-[#142B6F]">{cat.count}</span>
                      </div>
                    ))
                  )}
                </div>
                <div className="bg-white rounded-2xl border border-[#E1DEE5]/50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-[#E1DEE5]/40">
                    <h3 className="text-sm font-bold text-[#111111]">{t("admin_users.insights.borrowing_history")}</h3>
                  </div>
                  <div className="max-h-95 overflow-y-auto">
                    {insights.history.length === 0 ? (
                      <p className="p-4 text-xs text-[#142B6F]">{t("admin_users.insights.history_empty")}</p>
                    ) : (
                      insights.history.map((item) => (
                        <div key={item.id} className="p-4 border-b border-[#E1DEE5]/30 last:border-0">
                          <p className="text-sm font-bold text-[#111111]">{item.bookTitle}</p>
                          <p className="text-xs text-[#142B6F]">
                            {t("admin_users.insights.due", { date: new Date(item.dueDate).toLocaleDateString() })} • {item.status}
                          </p>
                          <p className={`text-xs mt-1 ${item.isLate ? "text-red-700" : "text-green-700"}`}>
                            {item.isLate 
                              ? t("admin_users.insights.late", { count: item.daysLate }) 
                              : t("admin_users.insights.on_time")}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-[#142B6F]">{t("admin_users.insights.loading")}</p>
            )}
          </aside>
        </div>
      )}

      {confirmDialog ? (
        <div
          className="fixed inset-0 z-10000 bg-[#142B6F]/35 flex items-center justify-center p-4"
          onClick={() => !isConfirming && setConfirmDialog(null)}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            className="w-full max-w-md rounded-[28px] border border-[#E1DEE5] bg-[#FFFFFF] p-6 shadow-2xl"
          >
            <div className="space-y-2">
              <h3 className="text-2xl font-serif font-black text-[#111111]">{confirmDialog.title}</h3>
              <p className="text-sm text-[#142B6F] leading-6">{confirmDialog.description}</p>
            </div>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmDialog(null)}
                disabled={isConfirming}
                className="px-4 py-2.5 rounded-xl border border-[#E1DEE5] text-sm font-bold text-[#142B6F] disabled:opacity-40"
              >
                {t("common.cancel")}
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
                      : "bg-[#142B6F]"
                }`}
              >
                {isConfirming ? t("admin_users.actions.processing") : confirmDialog.confirmLabel}
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
    <div className="bg-white rounded-2xl border border-[#E1DEE5]/50 p-3">
      <p className="text-[11px] font-bold text-[#142B6F] uppercase tracking-wider">{label}</p>
      <p className="text-lg font-black text-[#111111]">{value}</p>
    </div>
  );
}
