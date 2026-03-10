"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Trash2, Search, Plus, ChevronLeft, ChevronRight, X, Upload, Pencil } from "lucide-react";
import { toast } from "sonner";
import { useAuthors, useCreateAuthor, useUpdateAuthor, useDeleteAuthor, Author } from "@/lib/hooks/useQueries";

const ITEMS_PER_PAGE = 8;

export default function AdminAuthorsPage() {
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editingAuthorId, setEditingAuthorId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", bio: "" });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const { data: authorsData, isLoading } = useAuthors();
  const createAuthor = useCreateAuthor();
  const updateAuthor = useUpdateAuthor();
  const deleteAuthor = useDeleteAuthor();
  const deletingAuthorId = deleteAuthor.isPending ? deleteAuthor.variables : undefined;
  const isSubmitting = createAuthor.isPending || updateAuthor.isPending;

  const getErrorMessage = (error: unknown, fallback: string) =>
    error instanceof Error && error.message ? error.message : fallback;

  const authors: Author[] = authorsData?.authors || [];

  const filteredAuthors = authors.filter(
    (a) => a.name.toLowerCase().includes(search.toLowerCase()) || (a.bio?.toLowerCase().includes(search.toLowerCase()) ?? false)
  );

  const totalPages = Math.max(1, Math.ceil(filteredAuthors.length / ITEMS_PER_PAGE));
  const paginatedAuthors = filteredAuthors.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const resetModal = () => {
    setShowModal(false);
    setEditingAuthorId(null);
    setForm({ name: "", bio: "" });
    setImageFile(null);
    setImagePreview(null);
  };

  const openCreateModal = () => {
    setEditingAuthorId(null);
    setForm({ name: "", bio: "" });
    setImageFile(null);
    setImagePreview(null);
    setShowModal(true);
  };

  const openEditModal = (author: Author) => {
    setEditingAuthorId(author.id);
    setForm({ name: author.name || "", bio: author.bio || "" });
    setImageFile(null);
    setImagePreview(author.image || null);
    setShowModal(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { setImageFile(file); setImagePreview(URL.createObjectURL(file)); }
  };

  const handleSubmitAuthor = async (e: React.FormEvent) => {
    e.preventDefault();
    const fd = new FormData();
    fd.append("name", form.name);
    fd.append("bio", form.bio);
    if (imageFile) fd.append("image", imageFile);
    try {
      if (editingAuthorId) {
        await updateAuthor.mutateAsync({ id: editingAuthorId, formData: fd });
        toast.success("Author updated successfully");
      } else {
        await createAuthor.mutateAsync(fd);
        toast.success("Author created successfully");
      }
      resetModal();
    } catch (error) {
      toast.error(getErrorMessage(error, editingAuthorId ? "Failed to update author" : "Failed to create author"));
    }
  };

  const handleDeleteAuthor = async (id: string) => {
    if (!confirm("Are you sure you want to delete this author?")) return;
    try {
      await deleteAuthor.mutateAsync(id);
      toast.success("Author deleted successfully");
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to delete author"));
    }
  };

  return (
    <>
      <div className="p-6 lg:p-12 space-y-8">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-1">
            <h1 className="text-4xl lg:text-5xl font-serif font-extrabold text-[#2B1A10]">Manage Authors</h1>
            <p className="text-[#AE9E85] font-medium">Filter, sort, and access detailed Author profiles</p>
          </div>
          <div className="flex items-center gap-3 mt-2">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#AE9E85]" />
              <input type="text" placeholder="Search author" value={search} onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }} className="pl-9 pr-4 py-2.5 text-sm bg-white border border-[#E1D2BD] rounded-xl text-[#2B1A10] placeholder:text-[#C4B49E] w-52" />
            </div>
            <button onClick={openCreateModal} className="flex items-center gap-2 px-4 py-2.5 bg-[#2B1A10] text-white text-sm font-bold rounded-xl">
              <Plus size={16} />Add new author
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#E1D2BD]/50 overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#8B6B4A]"></div></div>
          ) : (
            <>
              <div className="grid grid-cols-[80px_2fr_3fr_1fr_1fr_1fr_auto] gap-4 px-6 py-3 border-b border-[#E1D2BD]/50 bg-[#FDFAF6]">
                <span className="text-[11px] font-bold text-[#AE9E85] uppercase">IMAGE</span>
                <span className="text-[11px] font-bold text-[#AE9E85] uppercase">NAME</span>
                <span className="text-[11px] font-bold text-[#AE9E85] uppercase">BIO</span>
                <span className="text-[11px] font-bold text-[#AE9E85] uppercase text-center">CATEGORY</span>
                <span className="text-[11px] font-bold text-[#AE9E85] uppercase text-center">BOOKS</span>
                <span className="text-[11px] font-bold text-[#AE9E85] uppercase text-center">STATUS</span>
                <span className="w-16"></span>
              </div>
              {paginatedAuthors.length === 0 ? (
                <div className="py-16 text-center text-sm text-[#AE9E85]">No authors found</div>
              ) : (
                paginatedAuthors.map((author) => (
                  <div key={author.id} className="grid grid-cols-[80px_2fr_3fr_1fr_1fr_1fr_auto] gap-4 items-center px-6 py-4 border-b border-[#E1D2BD]/30 hover:bg-[#FDFAF6]">
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-[#F3EFE6] border border-[#E1D2BD]/50">
                      {author.image ? (
                        <Image
                          src={author.image}
                          alt={author.name}
                          width={48}
                          height={48}
                          className="w-full h-full object-cover"
                          unoptimized
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[#AE9E85] text-xs">{author.name.charAt(0)}</div>
                      )}
                    </div>
                    <span className="text-sm font-bold text-[#2B1A10]">{author.name}</span>
                    <p className="text-sm text-[#AE9E85] line-clamp-1">{author.bio}</p>
                    <span className="text-sm text-[#2B1A10]/70 text-center">Mixed</span>
                    <span className="text-sm text-[#2B1A10]/70 text-center font-bold">{(author._count?.books || 0) + (author._count?.digital_books || 0)}</span>
                    <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-green-50 text-green-700 w-fit mx-auto">Active</span>
                    <div className="flex items-center gap-2">
                      <button onClick={() => openEditModal(author)} className="w-8 h-8 flex items-center justify-center rounded-lg text-[#AE9E85] hover:text-[#2B1A10] hover:bg-[#F3EFE6]"><Pencil size={15} /></button>
                      <button onClick={() => handleDeleteAuthor(author.id)} disabled={deletingAuthorId === author.id} className="w-8 h-8 flex items-center justify-center rounded-lg text-[#AE9E85] hover:text-red-500 hover:bg-red-50 disabled:opacity-40"><Trash2 size={15} /></button>
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
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) resetModal(); }}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-8 pt-8 pb-4 border-b border-[#E1D2BD]/50">
              <h2 className="text-xl font-serif font-bold text-[#2B1A10]">{editingAuthorId ? "Update Author" : "Add New Author"}</h2>
              <button onClick={resetModal} className="w-8 h-8 flex items-center justify-center text-[#AE9E85] hover:text-[#2B1A10] rounded-lg"><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmitAuthor} className="px-8 py-6 space-y-4">
              <div><label className="block text-sm font-bold text-[#2B1A10] mb-1.5">Name</label><input type="text" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required placeholder="Author Name" className="w-full px-3 py-2.5 text-sm border border-[#E1D2BD] rounded-xl text-[#2B1A10]" /></div>
              <div><label className="block text-sm font-bold text-[#2B1A10] mb-1.5">Bio</label><textarea rows={4} value={form.bio} onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))} required placeholder="Author Biography" className="w-full px-3 py-2.5 text-sm border border-[#E1D2BD] rounded-xl text-[#2B1A10] resize-none" /></div>
              <div><label className="block text-sm font-bold text-[#2B1A10] mb-1.5">Image</label><div onClick={() => imageInputRef.current?.click()} className="w-full h-32 border-2 border-dashed border-[#E1D2BD] rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-[#8B6B4A] overflow-hidden relative">{imagePreview ? <Image src={imagePreview} alt="preview" fill sizes="100vw" className="object-cover" unoptimized /> : <><Upload size={24} className="text-[#AE9E85]" /><p className="text-xs text-[#AE9E85]">Click to upload author image</p></>}</div><input ref={imageInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" /></div>
              <button type="submit" disabled={isSubmitting} className="w-full py-3 bg-[#2B1A10] text-white text-sm font-bold rounded-xl disabled:opacity-50 mt-2">{isSubmitting ? (editingAuthorId ? "Updating..." : "Adding...") : (editingAuthorId ? "Update Author" : "Add Author to Collection")}</button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
