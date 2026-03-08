"use client";

import { useState } from "react";
import { Trash2, Search, ChevronLeft, ChevronRight, X } from "lucide-react";
import { toast } from "sonner";
import { useUsers, useUserInsights, useDeleteUser, useBlockUser, useUnblockUser } from "@/lib/hooks/useQueries";

interface User {
  id: string;
  name: string;
  email: string;
  student_id?: string;
  year?: number | string;
  phone?: string;
  is_blocked?: boolean;
}

interface UserInsights {
  user: User & { department?: string; is_confirmed?: boolean; created_at?: string };
  stats: { totalRentals: number; activeOverdue: number; returnedOnTime: number; onTimeRate: number; wishlistCount: number; reviewCount: number; statusSummary: Record<string, number> };
  favoriteCategories: Array<{ name: string; count: number }>;
  history: Array<{ id: string; bookTitle: string; status: string; loanDate: string; dueDate: string; returnDate?: string | null; fine: number; isLate: boolean; daysLate: number }>;
}

const ITEMS_PER_PAGE = 8;

export default function AdminUsersPage() {
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const { data: usersData, isLoading } = useUsers();
  const { data: insightsData } = useUserInsights(selectedUser?.id || "");
  const deleteUser = useDeleteUser();
  const blockUser = useBlockUser();
  const unblockUser = useUnblockUser();

  const users: User[] = usersData?.data?.users || [];
  
  const insights = insightsData?.data as UserInsights | null;

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    return u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q) || u.student_id?.toLowerCase().includes(q);
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this user?")) return;
    try {
      await deleteUser.mutateAsync(id);
      toast.success("User deleted successfully");
    } catch (error) {
      toast.error("Failed to delete user");
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
      toast.error("Failed to update user status");
    }
  };

  return (
    <div className="p-6 lg:p-12 space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-4xl lg:text-5xl font-serif font-extrabold text-[#2B1A10]">Manage Users</h1>
          <p className="text-[#AE9E85] font-medium">Filter, sort, and access detailed user profiles</p>
        </div>
        <div className="relative mt-2">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#AE9E85]" />
          <input type="text" placeholder="Search user" value={search} onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }} className="pl-9 pr-4 py-2.5 text-sm bg-white border border-[#E1D2BD] rounded-xl text-[#2B1A10] placeholder:text-[#C4B49E] w-56" />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-[#E1D2BD]/50 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#8B6B4A]"></div></div>
        ) : (
          <>
            <div className="grid grid-cols-[2fr_2fr_1.5fr_0.8fr_1.2fr_1fr_auto_auto] gap-4 px-6 py-3 border-b border-[#E1D2BD]/50 bg-[#FDFAF6]">
              <span className="text-[11px] font-bold text-[#AE9E85] uppercase">Name</span>
              <span className="text-[11px] font-bold text-[#AE9E85] uppercase">Email</span>
              <span className="text-[11px] font-bold text-[#AE9E85] uppercase">ID No</span>
              <span className="text-[11px] font-bold text-[#AE9E85] uppercase">Year</span>
              <span className="text-[11px] font-bold text-[#AE9E85] uppercase">Phone No</span>
              <span className="text-[11px] font-bold text-[#AE9E85] uppercase">Status</span>
              <span className="w-8"></span>
              <span className="w-28"></span>
            </div>
            {paginated.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-[#AE9E85]"><p className="text-sm font-medium">No users found</p></div>
            ) : (
              paginated.map((user) => (
                <div key={user.id} onClick={() => setSelectedUser(user)} className="grid grid-cols-[2fr_2fr_1.5fr_0.8fr_1.2fr_1fr_auto_auto] gap-4 items-center px-6 py-4 border-b border-[#E1D2BD]/30 hover:bg-[#FDFAF6] transition-colors cursor-pointer">
                  <span className="text-sm font-bold text-[#2B1A10] truncate">{user.name}</span>
                  <span className="text-sm text-[#8B6B4A] truncate">{user.email}</span>
                  <span className="text-sm text-[#2B1A10]/70">{user.student_id || "—"}</span>
                  <span className="text-sm text-[#2B1A10]/70">{user.year || "—"}</span>
                  <span className="text-sm text-[#2B1A10]/70">{user.phone || "—"}</span>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-lg w-fit ${user.is_blocked ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}>
                    {user.is_blocked ? "Blocked" : "Active"}
                  </span>
                  <button onClick={(e) => { e.stopPropagation(); handleDelete(user.id); }} disabled={deleteUser.variables === user.id} className="w-8 h-8 flex items-center justify-center rounded-lg text-[#AE9E85] hover:text-red-500 hover:bg-red-50 disabled:opacity-40" title="Delete user">
                    <Trash2 size={16} strokeWidth={1.5} />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); handleToggleBlock(user); }} disabled={blockUser.variables === user.id || unblockUser.variables === user.id} className="w-28 px-3 py-1.5 text-xs font-bold text-[#2B1A10] border border-[#C2B199] rounded-lg hover:bg-[#C2B199]/20 disabled:opacity-40">
                    {blockUser.variables === user.id || unblockUser.variables === user.id ? "Updating..." : user.is_blocked ? "Unblock" : "Block"}
                  </button>
                </div>
              ))
            )}
          </>
        )}
      </div>

      {!isLoading && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-[#2B1A10]/60 disabled:opacity-30">
            <ChevronLeft size={16} />Previous
          </button>
          <div className="flex items-center gap-1.5">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button key={page} onClick={() => setCurrentPage(page)} className={`w-8 h-8 rounded-lg text-sm font-bold ${page === currentPage ? "bg-[#2B1A10] text-white" : "text-[#2B1A10]/60 hover:bg-[#F3EFE6]"}`}>{page}</button>
            ))}
          </div>
          <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-[#2B1A10]/60 disabled:opacity-30">
            Next<ChevronRight size={16} />
          </button>
        </div>
      )}

      {selectedUser && (
        <div className="fixed inset-0 z-50 bg-black/20" onClick={() => setSelectedUser(null)}>
          <aside onClick={(e) => e.stopPropagation()} className="absolute right-0 top-0 h-full w-full md:w-[40%] bg-[#FDF8F0] border-l border-[#E1D2BD] p-6 overflow-y-auto">
            <div className="flex items-start justify-between mb-5">
              <div><h2 className="text-2xl font-serif font-black text-[#2B1A10]">{selectedUser.name}</h2><p className="text-sm text-[#AE9E85]">{selectedUser.email}</p></div>
              <button onClick={() => setSelectedUser(null)} className="w-9 h-9 rounded-xl border border-[#E1D2BD] flex items-center justify-center text-[#AE9E85]"><X size={16} /></button>
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
                  {insights.favoriteCategories.length === 0 ? <p className="text-xs text-[#AE9E85]">No category data yet</p> : insights.favoriteCategories.map((cat) => (
                    <div key={cat.name} className="flex items-center justify-between py-1.5 text-sm"><span className="text-[#2B1A10]">{cat.name}</span><span className="text-[#AE9E85]">{cat.count}</span></div>
                  ))}
                </div>
                <div className="bg-white rounded-2xl border border-[#E1D2BD]/50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-[#E1D2BD]/40"><h3 className="text-sm font-bold text-[#2B1A10]">Borrowing History</h3></div>
                  <div className="max-h-[380px] overflow-y-auto">
                    {insights.history.length === 0 ? <p className="p-4 text-xs text-[#AE9E85]">No history</p> : insights.history.map((item) => (
                      <div key={item.id} className="p-4 border-b border-[#E1D2BD]/30 last:border-0">
                        <p className="text-sm font-bold text-[#2B1A10]">{item.bookTitle}</p>
                        <p className="text-xs text-[#AE9E85]">Due {new Date(item.dueDate).toLocaleDateString()} • {item.status}</p>
                        <p className={`text-xs mt-1 ${item.isLate ? "text-red-700" : "text-green-700"}`}>{item.isLate ? `Late by ${item.daysLate} day(s)` : "Returned on time"}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-[#AE9E85]">Loading user progress...</p>
            )}
          </aside>
        </div>
      )}
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
