"use client";

import { useState } from "react";
import { Trash2, Pencil, Search, Plus, ChevronLeft, ChevronRight, X } from "lucide-react";
import { toast } from "sonner";
import { useCategories, useCreateCategory, useUpdateCategory, useDeleteCategory } from "@/lib/hooks/useQueries";

interface Category {
  id: string;
  name: string;
  _count?: { books: number; digital_books: number };
}

const ITEMS_PER_PAGE = 8;

export default function AdminCategoriesPage() {
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");

  const { data: categoriesData, isLoading } = useCategories();
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();

  const categories: Category[] = categoriesData?.categories || [];

  const filtered = categories.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()));
  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const openCreate = () => { setEditingId(null); setName(""); setShowModal(true); };
  const openEdit = (category: Category) => { setEditingId(category.id); setName(category.name); setShowModal(true); };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      if (editingId) {
        await updateCategory.mutateAsync({ id: editingId, data: { name: name.trim() } });
        toast.success("Category updated successfully");
      } else {
        await createCategory.mutateAsync({ name: name.trim() });
        toast.success("Category created successfully");
      }
      setShowModal(false);
      setEditingId(null);
      setName("");
    } catch (error) {
      toast.error("Failed to save category");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this category?")) return;
    try {
      await deleteCategory.mutateAsync(id);
      toast.success("Category deleted successfully");
    } catch (error) {
      toast.error("Failed to delete category");
    }
  };

  return (
    <>
      <div className="p-6 lg:p-12 space-y-8">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-1">
            <h1 className="text-4xl lg:text-5xl font-serif font-extrabold text-[#2B1A10]">Manage Categories</h1>
            <p className="text-[#AE9E85] font-medium">Create, edit and remove categories used by books.</p>
          </div>
          <div className="flex items-center gap-3 mt-2">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#AE9E85]" />
              <input type="text" placeholder="Search category" value={search} onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }} className="pl-9 pr-4 py-2.5 text-sm bg-white border border-[#E1D2BD] rounded-xl text-[#2B1A10] placeholder:text-[#C4B49E] w-52" />
            </div>
            <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2.5 bg-[#2B1A10] text-white text-sm font-bold rounded-xl">
              <Plus size={16} />Add new category
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#E1D2BD]/50 overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#8B6B4A]" /></div>
          ) : (
            <>
              <div className="grid grid-cols-[3fr_1fr_1fr_auto] gap-4 px-6 py-3 border-b border-[#E1D2BD]/50 bg-[#FDFAF6]">
                <span className="text-[11px] font-bold text-[#AE9E85] uppercase">Category</span>
                <span className="text-[11px] font-bold text-[#AE9E85] uppercase text-center">Physical</span>
                <span className="text-[11px] font-bold text-[#AE9E85] uppercase text-center">Digital</span>
                <span className="w-16" />
              </div>
              {paginated.length === 0 ? (
                <div className="py-16 text-center text-sm text-[#AE9E85]">No categories found</div>
              ) : (
                paginated.map((category) => (
                  <div key={category.id} className="grid grid-cols-[3fr_1fr_1fr_auto] gap-4 items-center px-6 py-4 border-b border-[#E1D2BD]/30 hover:bg-[#FDFAF6]">
                    <span className="text-sm font-bold text-[#2B1A10]">{category.name}</span>
                    <span className="text-sm text-[#2B1A10]/70 text-center">{category._count?.books || 0}</span>
                    <span className="text-sm text-[#2B1A10]/70 text-center">{category._count?.digital_books || 0}</span>
                    <div className="flex items-center gap-2">
                      <button onClick={() => openEdit(category)} className="w-8 h-8 flex items-center justify-center rounded-lg text-[#AE9E85] hover:text-[#2B1A10] hover:bg-[#F3EFE6]"><Pencil size={15} /></button>
                      <button onClick={() => handleDelete(category.id)} disabled={deleteCategory.variables === category.id} className="w-8 h-8 flex items-center justify-center rounded-lg text-[#AE9E85] hover:text-red-500 hover:bg-red-50 disabled:opacity-40"><Trash2 size={15} /></button>
                    </div>
                  </div>
                ))
              )}
            </>
          )}
        </div>

        {!isLoading && totalPages > 1 && (
          <div className="flex items-center justify-between">
            <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-[#2B1A10]/60 disabled:opacity-30"><ChevronLeft size={16} />Previous</button>
            <div className="flex items-center gap-1.5">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button key={page} onClick={() => setCurrentPage(page)} className={`w-8 h-8 rounded-lg text-sm font-bold ${page === currentPage ? "bg-[#2B1A10] text-white" : "text-[#2B1A10]/60 hover:bg-[#F3EFE6]"}`}>{page}</button>
              ))}
            </div>
            <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-[#2B1A10]/60 disabled:opacity-30">Next<ChevronRight size={16} /></button>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-8 pt-7 pb-4 border-b border-[#E1D2BD]/50">
              <h3 className="text-xl font-serif font-extrabold text-[#2B1A10]">{editingId ? "Edit Category" : "Add Category"}</h3>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 flex items-center justify-center text-[#AE9E85] hover:text-[#2B1A10] rounded-lg"><X size={18} /></button>
            </div>
            <form onSubmit={handleSave} className="px-8 py-6 space-y-4">
              <div><label className="block text-sm font-bold text-[#2B1A10] mb-1.5">Category Name</label><input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2.5 text-sm border border-[#E1D2BD] rounded-xl text-[#2B1A10]" placeholder="Enter category name" /></div>
              <button type="submit" disabled={createCategory.isPending || updateCategory.isPending} className="w-full py-3 bg-[#2B1A10] text-white text-sm font-bold rounded-xl disabled:opacity-50">
                {createCategory.isPending || updateCategory.isPending ? "Saving..." : editingId ? "Update Category" : "Create Category"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
