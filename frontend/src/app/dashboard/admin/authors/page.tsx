"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Search, Plus, ChevronLeft, ChevronRight, X, Upload, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { useAuthors, useCreateAuthor, useUpdateAuthor, useDeleteAuthor, Author } from "@/lib/hooks/useQueries";
import { useLanguage } from "@/components/providers/LanguageProvider";

const ITEMS_PER_PAGE = 8;

export default function AdminAuthorsPage() {
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editingAuthorId, setEditingAuthorId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", bio: "" });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [openMenuAuthorId, setOpenMenuAuthorId] = useState<string | null>(null);
  const [deleteAuthorCandidate, setDeleteAuthorCandidate] = useState<{ id: string; name: string } | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const { t } = useLanguage();

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
    (a) =>
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      (a.bio?.toLowerCase().includes(search.toLowerCase()) ?? false),
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
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
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
        toast.success(t("admin_authors.messages.update_success"));
      } else {
        await createAuthor.mutateAsync(fd);
        toast.success(t("admin_authors.messages.add_success"));
      }
      resetModal();
    } catch (error) {
      toast.error(getErrorMessage(error, editingAuthorId ? t("admin_authors.messages.update_failed") || "Failed to update author" : t("admin_authors.messages.add_failed") || "Failed to create author"));
    }
  };

  const handleDeleteAuthor = async (candidate: { id: string; name: string }) => {
    try {
      await deleteAuthor.mutateAsync(candidate.id);
      toast.success(t("admin_authors.messages.delete_success"));
      setDeleteAuthorCandidate(null);
    } catch (error) {
      toast.error(getErrorMessage(error, t("admin_authors.messages.delete_failed") || "Failed to delete author"));
    }
  };

  return (
    <>
      <div className="p-6 lg:p-12 space-y-8">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-1">
            <h1 className="text-4xl lg:text-5xl font-serif font-extrabold text-[#111111]">{t("admin_authors.title")}</h1>
            <p className="text-[#142B6F] font-medium">{t("admin_authors.subtitle")}</p>
          </div>
          <div className="flex items-center gap-3 mt-2">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#142B6F]" />
              <input
                type="text"
                placeholder={t("admin_authors.search_placeholder")}
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-9 pr-4 py-2.5 text-sm bg-white border border-[#E1DEE5] rounded-xl text-[#111111] placeholder:text-[#E1DEE5] w-52"
              />
            </div>
            <button
              onClick={openCreateModal}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#142B6F] text-white text-sm font-bold rounded-xl"
            >
              <Plus size={16} />
              {t("admin_authors.add_new")}
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#E1DEE5]/50 overflow-visible">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="grid grid-cols-[80px_2fr_3fr_1fr_1fr_1fr_auto] gap-4 items-center py-2">
                  <div className="h-10 w-10 rounded-full bg-[#E1DEE5]/70 animate-pulse" />
                  <div className="h-4 rounded-lg bg-[#E1DEE5]/70 animate-pulse" />
                  <div className="h-4 rounded-lg bg-[#E1DEE5]/70 animate-pulse" />
                  <div className="h-4 w-20 mx-auto rounded-lg bg-[#E1DEE5]/70 animate-pulse" />
                  <div className="h-4 w-16 mx-auto rounded-lg bg-[#E1DEE5]/70 animate-pulse" />
                  <div className="h-4 w-16 mx-auto rounded-lg bg-[#E1DEE5]/70 animate-pulse" />
                  <div className="h-8 w-8 ml-auto rounded-full bg-[#E1DEE5]/70 animate-pulse" />
                </div>
              ))}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-[80px_2fr_3fr_1fr_1fr_1fr_auto] gap-4 px-6 py-3 border-b border-[#E1DEE5]/50 bg-[#FFFFFF]">
                <span className="text-[11px] font-bold text-[#142B6F] uppercase">{t("admin_authors.table.image")}</span>
                <span className="text-[11px] font-bold text-[#142B6F] uppercase">{t("admin_authors.table.name")}</span>
                <span className="text-[11px] font-bold text-[#142B6F] uppercase">{t("admin_authors.table.bio")}</span>
                <span className="text-[11px] font-bold text-[#142B6F] uppercase text-center">{t("admin_authors.table.category")}</span>
                <span className="text-[11px] font-bold text-[#142B6F] uppercase text-center">{t("admin_authors.table.books")}</span>
                <span className="text-[11px] font-bold text-[#142B6F] uppercase text-center">{t("admin_authors.table.status")}</span>
                <span className="w-16"></span>
              </div>
              {paginatedAuthors.length === 0 ? (
                <div className="py-16 text-center text-sm text-[#142B6F]">{t("admin_authors.table.no_authors")}</div>
              ) : (
                paginatedAuthors.map((author) => (
                  <div
                    key={author.id}
                    className="grid grid-cols-[80px_2fr_3fr_1fr_1fr_1fr_auto] gap-4 items-center px-6 py-4 border-b border-[#E1DEE5]/30 hover:bg-[#FFFFFF]"
                  >
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-[#E1DEE5] border border-[#E1DEE5]/50">
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
                        <div className="w-full h-full flex items-center justify-center text-[#142B6F] text-xs">
                          {author.name.charAt(0)}
                        </div>
                      )}
                    </div>
                    <span className="text-sm font-bold text-[#111111]">{author.name}</span>
                    <p className="text-sm text-[#142B6F] line-clamp-1">{author.bio}</p>
                    <span className="text-sm text-[#111111]/70 text-center">Mixed</span>
                    <span className="text-sm text-[#111111]/70 text-center font-bold">
                      {(author._count?.books || 0) + (author._count?.digital_books || 0)}
                    </span>
                    <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-green-50 text-green-700 w-fit mx-auto">
                      {t("admin_authors.status.active")}
                    </span>
                    <div className="relative flex justify-end" onClick={(event) => event.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => setOpenMenuAuthorId((current) => (current === author.id ? null : author.id))}
                        className="h-9 w-9 rounded-full border border-[#E1DEE5] bg-[#FFFFFF] text-[#142B6F] flex items-center justify-center"
                        aria-label={`Open actions for ${author.name}`}
                      >
                        <MoreHorizontal size={16} />
                      </button>

                      {openMenuAuthorId === author.id ? (
                        <div className="absolute right-0 top-11 z-2147483646 min-w-56 overflow-hidden rounded-xl border border-[#E1DEE5] bg-white shadow-[0_18px_40px_rgba(0,0,0,0.18)]">
                          <button
                            type="button"
                            onClick={() => {
                              setOpenMenuAuthorId(null);
                              openEditModal(author);
                            }}
                            className="flex w-full items-center px-3 py-2.5 text-left text-sm font-semibold text-[#111111] hover:bg-[#FFFFFF]"
                          >
                            {t("admin_authors.modal.submit_update")}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setOpenMenuAuthorId(null);
                              setDeleteAuthorCandidate({ id: author.id, name: author.name });
                            }}
                            disabled={deletingAuthorId === author.id}
                            className="flex w-full items-center px-3 py-2.5 text-left text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-40"
                          >
                            {t("admin_books.actions.delete")}
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                ))
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
      </div>

      {showModal && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) resetModal();
          }}
        >
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-8 pt-8 pb-4 border-b border-[#E1DEE5]/50">
              <h2 className="text-xl font-serif font-bold text-[#111111]">
                {editingAuthorId ? t("admin_authors.modal.edit_title") : t("admin_authors.modal.add_title")}
              </h2>
              <button
                onClick={resetModal}
                title="Close"
                aria-label="Close"
                className="w-8 h-8 flex items-center justify-center text-[#142B6F] hover:text-[#111111] rounded-lg"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmitAuthor} className="px-8 py-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-[#111111] mb-1.5">{t("admin_authors.modal.labels.name")}</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  required
                  placeholder={t("admin_authors.modal.placeholders.name")}
                  className="w-full px-3 py-2.5 text-sm border border-[#E1DEE5] rounded-xl text-[#111111]"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-[#111111] mb-1.5">{t("admin_authors.modal.labels.bio")}</label>
                <textarea
                  rows={4}
                  value={form.bio}
                  onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
                  required
                  placeholder={t("admin_authors.modal.placeholders.bio")}
                  className="w-full px-3 py-2.5 text-sm border border-[#E1DEE5] rounded-xl text-[#111111] resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-[#111111] mb-1.5">{t("admin_authors.modal.labels.image")}</label>
                <div
                  onClick={() => imageInputRef.current?.click()}
                  className="w-full h-32 border-2 border-dashed border-[#E1DEE5] rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-[#142B6F] overflow-hidden relative"
                >
                  {imagePreview ? (
                    <Image src={imagePreview} alt="preview" fill sizes="100vw" className="object-cover" unoptimized />
                  ) : (
                    <>
                      <Upload size={24} className="text-[#142B6F]" />
                      <p className="text-xs text-[#142B6F]">{t("admin_authors.modal.drop_image")}</p>
                    </>
                  )}
                </div>
                <input
                  ref={imageInputRef}
                  title="Author image"
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-[#142B6F] text-white text-sm font-bold rounded-xl disabled:opacity-50 mt-2"
              >
                {isSubmitting
                  ? t("admin_authors.modal.submitting_add")
                  : editingAuthorId
                    ? t("admin_authors.modal.submit_update")
                    : t("admin_authors.modal.submit_add")}
              </button>
            </form>
          </div>
        </div>
      )}

      {deleteAuthorCandidate && (
        <div
          className="fixed inset-0 z-10000 bg-[#142B6F]/35 flex items-center justify-center p-4"
          onClick={() => !deleteAuthor.isPending && setDeleteAuthorCandidate(null)}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            className="w-full max-w-md rounded-[28px] border border-[#E1DEE5] bg-[#FFFFFF] p-6 shadow-2xl"
          >
            <div className="space-y-2">
              <h3 className="text-2xl font-serif font-black text-[#111111]">{t("admin_authors.confirm.delete_title")}</h3>
              <p className="text-sm text-[#142B6F] leading-6">
                {t("admin_authors.confirm.delete_desc", { name: deleteAuthorCandidate.name })}
              </p>
            </div>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteAuthorCandidate(null)}
                disabled={deleteAuthor.isPending}
                className="px-4 py-2.5 rounded-xl border border-[#E1DEE5] text-sm font-bold text-[#142B6F] disabled:opacity-40"
              >
                {t("common.cancel")}
              </button>
              <button
                type="button"
                onClick={() => handleDeleteAuthor(deleteAuthorCandidate)}
                disabled={deleteAuthor.isPending}
                className="px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-red-700 disabled:opacity-40"
              >
                {deleteAuthor.isPending ? t("admin_authors.modal.submitting_add") : t("admin_authors.confirm.delete_confirm")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
