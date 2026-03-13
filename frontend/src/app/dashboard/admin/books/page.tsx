"use client";

import { useEffect, useRef, useState } from "react";
import {
  Trash2,
  Pencil,
  MoreHorizontal,
  Search,
  Plus,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  X,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import {
  useBooks,
  useDigitalBooks,
  useCategories,
  useAuthors,
  useCreateBook,
  useUpdateBook,
  useDeleteBook,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
  useCreateAuthor,
  useBookCopies,
  useConditionHistory,
  useUpdateCondition,
} from "@/lib/hooks/useQueries";
import { useLanguage } from "@/components/providers/LanguageProvider";

type Tab = "all" | "physical" | "digital" | "categories";

interface Book {
  id: string;
  author_id?: string;
  category_id?: string;
  title: string;
  author?: { id: string; name: string };
  category?: { id: string; name: string };
  total?: number;
  copies?: number;
  available?: number;
  status?: string;
  description?: string;
  publication_year?: number;
  loan_duration_days?: number | null;
  rental_price?: number;
  pages?: number;
  tags?: string[];
  topics?: string[];
  pdf_access?: "FREE" | "PAID" | "RESTRICTED";
  type?: "physical" | "digital";
}

type DeleteBookCandidate = {
  id: string;
  type: "physical" | "digital";
  title: string;
} | null;

interface Category {
  id: string;
  name: string;
  _count?: { books: number; digital_books?: number };
}

interface Author {
  id: string;
  name: string;
}

interface BookCopy {
  id: string;
  copy_code: string;
  condition: "NEW" | "GOOD" | "WORN" | "DAMAGED" | "LOST";
  is_available: boolean;
  last_condition_update: string;
  notes?: string | null;
}

interface ConditionHistoryEntry {
  id: string;
  old_condition: string;
  new_condition: string;
  notes?: string | null;
  created_at: string;
}

const ITEMS_PER_PAGE = 8;

export default function AdminBooksPage() {
  const [activeTab, setActiveTab] = useState<Tab>("all");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [categoryName, setCategoryName] = useState("");
  const [showConditionModal, setShowConditionModal] = useState(false);
  const [conditionBookId, setConditionBookId] = useState("");
  const [conditionBookTitle, setConditionBookTitle] = useState("");
  const [deleteBookCandidate, setDeleteBookCandidate] = useState<DeleteBookCandidate>(null);
  const { t } = useLanguage();

  const { data: booksData, isLoading: booksLoading } = useBooks("limit=200");
  const { data: digitalData, isLoading: digitalLoading } = useDigitalBooks("limit=200");
  const { data: categoriesData, isLoading: categoriesLoading } = useCategories("limit=200");
  const { data: authorsData, isLoading: authorsLoading } = useAuthors("limit=200");

  const createBook = useCreateBook();
  const updateBook = useUpdateBook();
  const deleteBook = useDeleteBook();
  const createCategoryFn = useCreateCategory();
  const updateCategoryFn = useUpdateCategory();
  const deleteCategoryFn = useDeleteCategory();

  const physicalBooks: Book[] =
    booksData?.books?.map((b: Book & { copies?: number; total?: number }) => ({
      ...b,
      total: b.copies ?? b.total,
      type: "physical",
    })) || [];

  const digitalBooksList: Book[] =
    digitalData?.books?.map((b: Book) => ({
      ...b,
      total: 0,
      type: "digital",
    })) || [];

  const categories: Category[] = categoriesData?.categories || [];
  const authors: Author[] = authorsData?.authors || [];

  const loading = booksLoading || digitalLoading || categoriesLoading || authorsLoading;
  const deletingBookId = deleteBook.isPending ? deleteBook.variables?.id : undefined;
  const deletingCategoryId = deleteCategoryFn.isPending ? deleteCategoryFn.variables : undefined;
  const isBookSubmitting = createBook.isPending || updateBook.isPending;

  const getErrorMessage = (error: unknown, fallback: string) =>
    error instanceof Error && error.message ? error.message : fallback;

  const allBooks = [...physicalBooks, ...digitalBooksList];

  const getDisplayBooks = () => {
    const source = activeTab === "all" ? allBooks : activeTab === "physical" ? physicalBooks : digitalBooksList;
    if (!search) return source;
    const q = search.toLowerCase();
    return source.filter(
      (b) =>
        b.title?.toLowerCase().includes(q) ||
        b.author?.name?.toLowerCase().includes(q) ||
        b.category?.name?.toLowerCase().includes(q),
    );
  };

  const handleDeleteBook = async (candidate: NonNullable<DeleteBookCandidate>) => {
    try {
      await deleteBook.mutateAsync({ id: candidate.id, type: candidate.type });
      toast.success(t("admin_books.messages.delete_success"));
      setDeleteBookCandidate(null);
    } catch (error) {
      toast.error(getErrorMessage(error, t("admin_books.messages.status_update_failed")));
    }
  };

  const openCreateBookModal = () => {
    setEditingBook(null);
    setShowModal(true);
  };

  const openEditBookModal = (book: Book) => {
    setEditingBook(book);
    setShowModal(true);
  };

  const TABS: { key: Tab; label: string }[] = [
    { key: "all", label: t("admin_books.tabs.all") },
    { key: "physical", label: t("admin_books.tabs.physical") },
    { key: "digital", label: t("admin_books.tabs.digital") },
    { key: "categories", label: t("admin_books.tabs.categories") },
  ];

  const displayBooks = getDisplayBooks();
  const totalPages = Math.max(
    1,
    Math.ceil(
      activeTab === "categories"
        ? Math.ceil(categories.length / ITEMS_PER_PAGE)
        : Math.ceil(displayBooks.length / ITEMS_PER_PAGE),
    ),
  );
  const paginatedBooks = displayBooks.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  const paginatedCategories = categories.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    setCurrentPage(1);
    setSearch("");
  };

  const openCategoryModal = (category?: Category) => {
    if (category) {
      setEditingCategoryId(category.id);
      setCategoryName(category.name);
    } else {
      setEditingCategoryId(null);
      setCategoryName("");
    }
    setShowCategoryModal(true);
  };

  const handleSaveCategory = async () => {
    if (!categoryName.trim()) return;
    try {
      if (editingCategoryId) {
        await updateCategoryFn.mutateAsync({ id: editingCategoryId, data: { name: categoryName } });
        toast.success(t("admin_categories.messages.update_success"));
      } else {
        await createCategoryFn.mutateAsync({ name: categoryName });
        toast.success(t("admin_categories.messages.add_success"));
      }
      setShowCategoryModal(false);
      setEditingCategoryId(null);
      setCategoryName("");
    } catch (error) {
      toast.error(getErrorMessage(error, t("admin_categories.messages.add_failed")));
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm("Delete this category?")) return;
    try {
      await deleteCategoryFn.mutateAsync(id);
      toast.success(t("admin_categories.messages.delete_success"));
    } catch (error) {
      toast.error(getErrorMessage(error, t("admin_categories.messages.delete_failed")));
    }
  };

  return (
    <>
      <div className="p-6 lg:p-12 space-y-8">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-1">
            <h1 className="text-4xl lg:text-5xl font-serif font-extrabold text-[#111111]">{t("admin_books.title")}</h1>
            <p className="text-[#142B6F] font-medium">{t("admin_books.subtitle")}</p>
          </div>
          <div className="flex items-center gap-3 mt-2">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#142B6F]" />
              <input
                type="text"
                placeholder={t("admin_books.search_placeholder")}
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                disabled={activeTab === "categories"}
                className="pl-9 pr-4 py-2.5 text-sm bg-white border border-[#E1DEE5] rounded-xl text-[#111111] placeholder:text-[#E1DEE5] w-52 disabled:opacity-40"
              />
            </div>
            <button
              onClick={() => (activeTab === "categories" ? setShowCategoryModal(true) : openCreateBookModal())}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#142B6F] text-white text-sm font-bold rounded-xl"
            >
              <Plus size={16} />
              {activeTab === "categories" ? t("admin_categories.add_new") : t("admin_books.add_new")}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-6 border-b border-[#E1DEE5]/50">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className={`pb-3 text-sm font-bold border-b-2 ${activeTab === tab.key ? "text-[#111111] border-[#111111]" : "text-[#142B6F] border-transparent"}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-[#E1DEE5]/50 overflow-visible">
          {loading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="grid grid-cols-[2.5fr_2fr_1.5fr_1fr_1fr_auto] gap-4 items-center py-2">
                  <div className="h-4 rounded-lg bg-[#E1DEE5]/70 animate-pulse" />
                  <div className="h-4 rounded-lg bg-[#E1DEE5]/70 animate-pulse" />
                  <div className="h-4 rounded-lg bg-[#E1DEE5]/70 animate-pulse" />
                  <div className="h-4 w-16 rounded-lg bg-[#E1DEE5]/70 animate-pulse" />
                  <div className="h-4 w-20 rounded-lg bg-[#E1DEE5]/70 animate-pulse" />
                  <div className="h-8 w-8 ml-auto rounded-full bg-[#E1DEE5]/70 animate-pulse" />
                </div>
              ))}
            </div>
          ) : activeTab === "categories" ? (
            <CategoryTable
              categories={paginatedCategories}
              onEdit={openCategoryModal}
              onDelete={handleDeleteCategory}
              deletingId={deletingCategoryId}
            />
          ) : (
            <BookTable
              books={paginatedBooks}
              onDelete={(candidate) => setDeleteBookCandidate(candidate)}
              onEdit={openEditBookModal}
              deletingId={deletingBookId}
              onCondition={(id, title) => {
                setConditionBookId(id);
                setConditionBookTitle(title);
                setShowConditionModal(true);
              }}
            />
          )}
        </div>

        {!loading && totalPages > 1 && (
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
        <AddBookModal
          show={showModal}
          onClose={() => {
            setShowModal(false);
            setEditingBook(null);
          }}
          authors={authors}
          categories={categories}
          editingBook={editingBook}
          onSubmit={async (type, data) => {
            try {
              if (editingBook) {
                await updateBook.mutateAsync({ id: editingBook.id, type, data });
                toast.success(type === "physical" ? "Physical book updated" : "Digital book updated");
              } else {
                await createBook.mutateAsync({ type, data });
                toast.success(type === "physical" ? "Physical book added" : "Digital book added");
              }
              setShowModal(false);
              setEditingBook(null);
            } catch (error) {
              toast.error(getErrorMessage(error, editingBook ? "Failed to update book" : "Failed to add book"));
            }
          }}
          submitting={isBookSubmitting}
        />
      )}

      {showCategoryModal && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowCategoryModal(false);
          }}
        >
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-8 pt-7 pb-4 border-b border-[#E1DEE5]/50">
              <h3 className="text-xl font-serif font-extrabold text-[#111111]">
                {editingCategoryId ? t("admin_categories.modal.edit_title") : t("admin_categories.modal.add_title")}
              </h3>
              <button
                onClick={() => setShowCategoryModal(false)}
                className="w-8 h-8 flex items-center justify-center text-[#142B6F] hover:text-[#111111] rounded-lg"
              >
                <X size={18} />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSaveCategory();
              }}
              className="px-8 py-6 space-y-4"
            >
              <div>
                <label className="block text-sm font-bold text-[#111111] mb-1.5">{t("admin_categories.modal.label_name")}</label>
                <input
                  type="text"
                  required
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-[#E1DEE5] rounded-xl text-[#111111]"
                />
              </div>
              <button
                type="submit"
                disabled={createCategoryFn.isPending || updateCategoryFn.isPending}
                className="w-full py-3 bg-[#142B6F] text-white text-sm font-bold rounded-xl disabled:opacity-50"
              >
                {createCategoryFn.isPending || updateCategoryFn.isPending
                  ? t("admin_categories.modal.submitting")
                  : editingCategoryId
                    ? t("admin_categories.modal.submit_update")
                    : t("admin_categories.modal.submit_add")}
              </button>
            </form>
          </div>
        </div>
      )}

      {showConditionModal && (
        <ConditionModal
          show={showConditionModal}
          onClose={() => {
            setShowConditionModal(false);
            setConditionBookId("");
            setConditionBookTitle("");
          }}
          bookId={conditionBookId}
          title={conditionBookTitle}
        />
      )}

      {deleteBookCandidate && (
        <div
          className="fixed inset-0 z-10000 bg-[#142B6F]/35 flex items-center justify-center p-4"
          onClick={() => !deleteBook.isPending && setDeleteBookCandidate(null)}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            className="w-full max-w-md rounded-[28px] border border-[#E1DEE5] bg-[#FFFFFF] p-6 shadow-2xl"
          >
            <div className="space-y-2">
              <h3 className="text-2xl font-serif font-black text-[#111111]">{t("admin_categories.confirm.delete_title")}</h3>
              <p className="text-sm text-[#142B6F] leading-6">
                {t("admin_categories.confirm.delete_desc", { name: deleteBookCandidate.title })}
              </p>
            </div>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteBookCandidate(null)}
                disabled={deleteBook.isPending}
                className="px-4 py-2.5 rounded-xl border border-[#E1DEE5] text-sm font-bold text-[#142B6F] disabled:opacity-40"
              >
                {t("common.cancel")}
              </button>
              <button
                type="button"
                onClick={() => handleDeleteBook(deleteBookCandidate)}
                disabled={deleteBook.isPending}
                className="px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-red-700 disabled:opacity-40"
              >
                {deleteBook.isPending ? t("admin_books.messages.deleting") || "Deleting..." : t("admin_books.actions.delete")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function BookTable({
  books,
  onDelete,
  onEdit,
  deletingId,
  onCondition,
}: {
  books: Book[];
  onDelete: (candidate: { id: string; type: "physical" | "digital"; title: string }) => void;
  onEdit: (book: Book) => void;
  deletingId?: string;
  onCondition: (id: string, title: string) => void;
}) {
  const { t } = useLanguage();
  const [openMenuBookId, setOpenMenuBookId] = useState<string | null>(null);

  useEffect(() => {
    const closeMenu = () => setOpenMenuBookId(null);
    window.addEventListener("click", closeMenu);
    return () => {
      window.removeEventListener("click", closeMenu);
    };
  }, []);

  if (books.length === 0) return <div className="py-16 text-center text-sm text-[#142B6F]">{t("admin_books.table.no_books")}</div>;
  return (
    <>
      <div className="grid grid-cols-[2.5fr_2fr_1.5fr_1fr_1fr_auto] gap-4 px-6 py-3 border-b border-[#E1DEE5]/50 bg-[#FFFFFF]">
        <span className="text-[11px] font-bold text-[#142B6F] uppercase">{t("admin_books.table.title")}</span>
        <span className="text-[11px] font-bold text-[#142B6F] uppercase">{t("admin_books.table.author")}</span>
        <span className="text-[11px] font-bold text-[#142B6F] uppercase">{t("admin_books.table.category")}</span>
        <span className="text-[11px] font-bold text-[#142B6F] uppercase text-center">{t("admin_books.table.copies")}</span>
        <span className="text-[11px] font-bold text-[#142B6F] uppercase">{t("admin_books.table.status")}</span>
        <span className="w-16"></span>
      </div>
      {books.map((book) => (
        <div
          key={book.id}
          className="grid grid-cols-[2.5fr_2fr_1.5fr_1fr_1fr_auto] gap-4 items-center px-6 py-4 border-b border-[#E1DEE5]/30 hover:bg-[#FFFFFF]"
        >
          <span className="text-sm font-bold text-[#111111] truncate">{book.title}</span>
          <span className="text-sm text-[#142B6F] truncate">{book.author?.name || "—"}</span>
          <span className="text-sm text-[#111111]/70">{book.category?.name || "—"}</span>
          <span className="text-sm text-[#111111]/70 text-center">
            {book.type === "digital" ? t("admin_books.status.digital") : (book.total ?? "—")}
          </span>
          <span
            className={`text-xs font-bold px-2.5 py-1 rounded-lg w-fit ${book.type === "digital" ? "bg-[#E1DEE5] text-[#111111]" : book.available === 0 || book.status === "BORROWED" ? "bg-red-50 text-red-600" : "bg-green-50 text-green-700"}`}
          >
            {book.type === "digital"
              ? book.pdf_access === "RESTRICTED"
                ? t("admin_books.status.read_only")
                : t("admin_books.status.download_allowed")
              : book.status || (book.available === 0 ? t("admin_books.status.out_of_stock") : t("admin_books.status.available"))}
          </span>
          <div className="relative flex justify-end" onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              onClick={() => setOpenMenuBookId((current) => (current === book.id ? null : book.id))}
              className="h-9 w-9 rounded-full border border-[#E1DEE5] bg-[#FFFFFF] text-[#142B6F] flex items-center justify-center"
              aria-label={`Open actions for ${book.title}`}
            >
              <MoreHorizontal size={16} />
            </button>

            {openMenuBookId === book.id ? (
              <div className="absolute right-0 top-11 z-2147483646 min-w-56 overflow-hidden rounded-xl border border-[#E1DEE5] bg-white shadow-[0_18px_40px_rgba(0,0,0,0.18)]">
                <button
                  type="button"
                  onClick={() => {
                    setOpenMenuBookId(null);
                    onEdit(book);
                  }}
                  className="flex w-full items-center px-3 py-2.5 text-left text-sm font-semibold text-[#111111] hover:bg-[#FFFFFF]"
                >
                  {t("admin_books.actions.edit")}
                </button>
                {book.type === "physical" ? (
                  <button
                    type="button"
                    onClick={() => {
                      setOpenMenuBookId(null);
                      onCondition(book.id, book.title);
                    }}
                    className="flex w-full items-center px-3 py-2.5 text-left text-sm font-semibold text-[#111111] hover:bg-[#FFFFFF]"
                  >
                    {t("admin_books.actions.condition")}
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => {
                    setOpenMenuBookId(null);
                    onDelete({ id: book.id, type: book.type || "physical", title: book.title });
                  }}
                  disabled={deletingId === book.id}
                  className="flex w-full items-center px-3 py-2.5 text-left text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-40"
                >
                  {t("admin_books.actions.delete")}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      ))}
    </>
  );
}

function CategoryTable({
  categories,
  onEdit,
  onDelete,
  deletingId,
}: {
  categories: Category[];
  onEdit: (category: Category) => void;
  onDelete: (id: string) => void;
  deletingId?: string;
}) {
  const { t } = useLanguage();
  if (categories.length === 0)
    return <div className="py-16 text-center text-sm text-[#142B6F]">{t("admin_categories.table.no_categories")}</div>;
  return (
    <>
      <div className="grid grid-cols-[3fr_1fr_auto] gap-4 px-6 py-3 border-b border-[#E1DEE5]/50 bg-[#FFFFFF]">
        <span className="text-[11px] font-bold text-[#142B6F] uppercase">{t("admin_categories.table.category")}</span>
        <span className="text-[11px] font-bold text-[#142B6F] uppercase">{t("admin_categories.table.physical")} / {t("admin_categories.table.digital")}</span>
        <span className="w-16"></span>
      </div>
      {categories.map((cat) => (
        <div
          key={cat.id}
          className="grid grid-cols-[3fr_1fr_auto] gap-4 items-center px-6 py-4 border-b border-[#E1DEE5]/30 hover:bg-[#FFFFFF]"
        >
          <span className="text-sm font-bold text-[#111111]">{cat.name}</span>
          <span className="text-sm text-[#111111]/70">
            {(cat._count?.books || 0) + (cat._count?.digital_books || 0)}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onEdit(cat)}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-[#142B6F] hover:text-[#111111] hover:bg-[#E1DEE5]"
            >
              <Pencil size={15} />
            </button>
            <button
              onClick={() => onDelete(cat.id)}
              disabled={deletingId === cat.id}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-[#142B6F] hover:text-red-500 hover:bg-red-50 disabled:opacity-40"
            >
              <Trash2 size={15} />
            </button>
          </div>
        </div>
      ))}
    </>
  );
}

function SearchableDropdown({
  label,
  placeholder,
  options,
  selectedId,
  onSelect,
  onCreate,
  createLabel,
  isCreating,
}: {
  label: string;
  placeholder: string;
  options: Array<{ id: string; name: string }>;
  selectedId: string;
  onSelect: (option: { id: string; name: string }) => void;
  onCreate: (value: string) => Promise<void> | void;
  createLabel: string;
  isCreating: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const normalizedSearch = searchText.trim().toLowerCase();
  const selectedOption = options.find((option) => option.id === selectedId) || null;
  const filteredOptions = options.filter((option) => option.name.toLowerCase().includes(normalizedSearch));
  const showCreateAction =
    normalizedSearch.length > 0 && !options.some((option) => option.name.toLowerCase() === normalizedSearch);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <label className="block text-sm font-bold text-[#111111] mb-1.5">{label} *</label>
      <button
        type="button"
        title={`Select ${label.toLowerCase()}`}
        aria-label={`Select ${label.toLowerCase()}`}
        onClick={() => {
          const nextOpen = !isOpen;
          setIsOpen(nextOpen);
          if (nextOpen) {
            // Fresh search each time the dropdown opens.
            setSearchText("");
          }
        }}
        className="flex w-full items-center justify-between border border-[#E1DEE5] bg-white px-3 py-2.5 text-sm text-[#111111]"
      >
        <span className={selectedOption ? "text-[#111111]" : "text-[#142B6F]"}>
          {selectedOption?.name || placeholder}
        </span>
        <ChevronDown size={16} className={`text-[#142B6F] transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen ? (
        <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 overflow-hidden border border-[#E1DEE5] bg-white shadow-[0_12px_24px_rgba(0,0,0,0.12)]">
          <div className="border-b border-[#E1DEE5] p-3">
            <input
              type="text"
              title={`Search ${label.toLowerCase()}`}
              aria-label={`Search ${label.toLowerCase()}`}
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder={`Search ${label.toLowerCase()}`}
              className="w-full border border-[#E1DEE5] px-3 py-2.5 text-sm text-[#111111] outline-none focus:border-[#142B6F]"
            />
          </div>

          <div className="max-h-56 overflow-y-auto p-2">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-2 text-sm text-[#142B6F]">No matching {label.toLowerCase()} found.</div>
            ) : (
              filteredOptions.map((option) => (
                <div
                  key={option.id}
                  onClick={() => {
                    onSelect(option);
                    setSearchText("");
                    setIsOpen(false);
                  }}
                  className={`cursor-pointer px-3 py-2.5 text-left text-sm ${selectedId === option.id ? "bg-[#FFFFFF] font-bold text-[#111111]" : "text-[#111111] hover:bg-[#FFFFFF]"}`}
                >
                  {option.name}
                </div>
              ))
            )}
          </div>

          <div className="border-t border-[#E1DEE5] p-2">
            <button
              type="button"
              title={createLabel}
              onClick={async () => {
                await onCreate(searchText.trim());
                setSearchText("");
                setIsOpen(false);
              }}
              disabled={isCreating || !showCreateAction}
              className="w-full rounded-xl border border-[#111111] bg-[#142B6F] px-3 py-2.5 text-center text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-45"
            >
              {isCreating ? `Adding ${label.toLowerCase()}...` : createLabel}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function AddBookModal({
  show,
  onClose,
  authors,
  categories,
  editingBook,
  onSubmit,
  submitting,
}: {
  show: boolean;
  onClose: () => void;
  authors: Author[];
  categories: Category[];
  editingBook?: Book | null;
  onSubmit: (type: "physical" | "digital", data: FormData) => Promise<void>;
  submitting: boolean;
}) {
  const { t } = useLanguage();
  const [modalTab, setModalTab] = useState<"physical" | "digital">("physical");
  const [form, setForm] = useState({
    title: "",
    author_id: "",
    category_id: "",
    copies: "",
    pages: "",
    description: "",
    publication_year: "",
    loan_duration_days: "",
    rental_price: "10",
    tags: "",
    topics: "",
    pdf_access: "RESTRICTED" as "FREE" | "PAID" | "RESTRICTED",
  });
  const [authorSearch, setAuthorSearch] = useState("");
  const [categorySearch, setCategorySearch] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [galleryFiles, setGalleryFiles] = useState<File[]>([]);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const createAuthorFn = useCreateAuthor();
  const createCategoryFn = useCreateCategory();
  const imageInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  const syncSelectedLabels = (nextForm: typeof form) => {
    const selectedAuthor = authors.find((item) => item.id === nextForm.author_id);
    const selectedCategory = categories.find((item) => item.id === nextForm.category_id);
    setAuthorSearch(selectedAuthor?.name || "");
    setCategorySearch(selectedCategory?.name || "");
  };

  useEffect(() => {
    if (!show) return;

    if (!editingBook) {
      const timer = setTimeout(() => {
        setModalTab("physical");
        setForm({
          title: "",
          author_id: "",
          category_id: "",
          copies: "",
          pages: "",
          description: "",
          publication_year: "",
          loan_duration_days: "",
          rental_price: "10",
          tags: "",
          topics: "",
          pdf_access: "RESTRICTED",
        });
        setAuthorSearch("");
        setCategorySearch("");
        setImageFile(null);
        setGalleryFiles([]);
        setPdfFile(null);
      }, 0);
      return () => clearTimeout(timer);
    }

    const timer = setTimeout(() => {
      const tab = editingBook.type === "digital" ? "digital" : "physical";
      setModalTab(tab);
      setForm({
        title: editingBook.title || "",
        author_id: editingBook.author_id || editingBook.author?.id || "",
        category_id: editingBook.category_id || editingBook.category?.id || "",
        copies: String(editingBook.copies ?? editingBook.total ?? ""),
        pages: String(editingBook.pages ?? ""),
        description: editingBook.description || "",
        publication_year: String(editingBook.publication_year ?? ""),
        loan_duration_days: String(editingBook.loan_duration_days ?? ""),
        rental_price: String(editingBook.rental_price ?? 10),
        tags: Array.isArray(editingBook.tags) ? editingBook.tags.join(", ") : "",
        topics: Array.isArray(editingBook.topics) ? editingBook.topics.join(", ") : "",
        pdf_access: editingBook.pdf_access || "RESTRICTED",
      });
      syncSelectedLabels({
        title: editingBook.title || "",
        author_id: editingBook.author_id || editingBook.author?.id || "",
        category_id: editingBook.category_id || editingBook.category?.id || "",
        copies: String(editingBook.copies ?? editingBook.total ?? ""),
        pages: String(editingBook.pages ?? ""),
        description: editingBook.description || "",
        publication_year: String(editingBook.publication_year ?? ""),
        loan_duration_days: String(editingBook.loan_duration_days ?? ""),
        rental_price: String(editingBook.rental_price ?? 10),
        tags: Array.isArray(editingBook.tags) ? editingBook.tags.join(", ") : "",
        topics: Array.isArray(editingBook.topics) ? editingBook.topics.join(", ") : "",
        pdf_access: editingBook.pdf_access || "RESTRICTED",
      });
      setImageFile(null);
      setGalleryFiles([]);
      setPdfFile(null);
    }, 0);

    return () => clearTimeout(timer);
  }, [show, editingBook]);

  if (!show) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: "image" | "gallery" | "pdf") => {
    const files = e.target.files;
    if (!files) return;
    if (type === "image") setImageFile(files[0]);
    else if (type === "pdf") setPdfFile(files[0]);
    else if (type === "gallery") setGalleryFiles(Array.from(files));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.author_id || !form.category_id) {
      alert("Please select both author and category.");
      return;
    }
    if (!editingBook && modalTab === "digital" && !pdfFile) {
      alert("Please upload a PDF file for digital books.");
      return;
    }
    if (modalTab === "physical" && !form.copies) {
      alert("Please enter number of copies.");
      return;
    }

    const fd = new FormData();
    fd.append("title", form.title);
    fd.append("author_id", form.author_id);
    fd.append("category_id", form.category_id);
    fd.append("description", form.description);
    if (form.publication_year) fd.append("publication_year", form.publication_year);
    if (form.loan_duration_days) fd.append("loan_duration_days", form.loan_duration_days);
    if (form.rental_price) fd.append("rental_price", form.rental_price);
    if (form.tags.trim()) fd.append("tags", form.tags);
    if (form.topics.trim()) fd.append("topics", form.topics);
    if (form.pages) fd.append("pages", form.pages);

    if (modalTab === "physical") {
      fd.append("total", form.copies);
      if (imageFile) fd.append("image", imageFile);
      galleryFiles.forEach((f) => fd.append("images", f));
    } else {
      if (imageFile) fd.append("image", imageFile);
      if (pdfFile) fd.append("pdf", pdfFile);
      fd.append("pdf_access", form.pdf_access);
      galleryFiles.forEach((f) => fd.append("images", f));
    }
    await onSubmit(modalTab, fd);
    setForm({
      title: "",
      author_id: "",
      category_id: "",
      copies: "",
      pages: "",
      description: "",
      publication_year: "",
      loan_duration_days: "",
      rental_price: "10",
      tags: "",
      topics: "",
      pdf_access: "RESTRICTED",
    });
    setAuthorSearch("");
    setCategorySearch("");
    setImageFile(null);
    setGalleryFiles([]);
    setPdfFile(null);
  };

  const createInlineAuthor = async (nameInput: string) => {
    const name = nameInput.trim();
    if (!name) return;
    try {
      const formData = new FormData();
      formData.append("name", name);
      formData.append("bio", `Auto-created from add book modal for ${name}.`);
      formData.append("image", "https://placehold.co/200x200?text=Author");
      const response = await createAuthorFn.mutateAsync(formData);
      const created = (response as { data?: { author?: { id?: string; name?: string } } })?.data?.author;
      if (created?.id) {
        setForm((prev) => ({ ...prev, author_id: created.id || "" }));
        setAuthorSearch(created.name || name);
        toast.success("Author created");
        return;
      }

      const fallback = authors.find((author) => author.name.toLowerCase() === name.toLowerCase());
      if (fallback) {
        setForm((prev) => ({ ...prev, author_id: fallback.id }));
        setAuthorSearch(fallback.name);
        toast.success("Author created");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create author";
      toast.error(message);
      throw error;
    }
  };

  const createInlineCategory = async (nameInput: string) => {
    const name = nameInput.trim();
    if (!name) return;
    try {
      const response = await createCategoryFn.mutateAsync({ name });
      const created = (response as { data?: { category?: { id?: string; name?: string } } })?.data?.category;
      if (created?.id) {
        setForm((prev) => ({ ...prev, category_id: created.id || "" }));
        setCategorySearch(created.name || name);
        toast.success("Category created");
        return;
      }

      const fallback = categories.find((category) => category.name.toLowerCase() === name.toLowerCase());
      if (fallback) {
        setForm((prev) => ({ ...prev, category_id: fallback.id }));
        setCategorySearch(fallback.name);
        toast.success("Category created");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create category";
      toast.error(message);
      throw error;
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-2147483647 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden">
        <div className="flex items-center justify-center gap-8 pt-8 pb-4 border-b border-[#E1DEE5]/50 relative">
          <button
            onClick={() => setModalTab("physical")}
            disabled={!!editingBook}
            className={`text-sm font-bold pb-2 border-b-2 ${modalTab === "physical" ? "text-[#111111] border-[#111111]" : "text-[#142B6F] border-transparent"} disabled:opacity-50`}
          >
            {t("admin_books.tabs.physical")}
          </button>
          <button
            onClick={() => setModalTab("digital")}
            disabled={!!editingBook}
            className={`text-sm font-bold pb-2 border-b-2 ${modalTab === "digital" ? "text-[#111111] border-[#111111]" : "text-[#142B6F] border-transparent"} disabled:opacity-50`}
          >
            {t("admin_books.tabs.digital")}
          </button>
          <button
            onClick={onClose}
            className="absolute right-5 top-6 w-8 h-8 flex items-center justify-center text-[#142B6F] hover:text-[#111111] rounded-lg"
          >
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-8 py-6 space-y-4 max-h-[80vh] overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-[#111111] mb-1.5">{t("admin_books.modal.labels.title")} *</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                required
                className="w-full px-3 py-2.5 text-sm border border-[#E1DEE5] rounded-xl text-[#111111]"
              />
            </div>
            <SearchableDropdown
              label={t("admin_books.modal.labels.author")}
              placeholder={t("admin_books.modal.placeholders.author")}
              options={authors}
              selectedId={form.author_id}
              onSelect={(author) => {
                setForm((prev) => ({ ...prev, author_id: author.id }));
                setAuthorSearch(author.name);
              }}
              onCreate={createInlineAuthor}
              createLabel={t("admin_authors.modal.submit_add")}
              isCreating={createAuthorFn.isPending}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SearchableDropdown
              label={t("admin_books.modal.labels.category")}
              placeholder={t("admin_books.modal.placeholders.category")}
              options={categories.map((category) => ({ id: category.id, name: category.name }))}
              selectedId={form.category_id}
              onSelect={(category) => {
                setForm((prev) => ({ ...prev, category_id: category.id }));
                setCategorySearch(category.name);
              }}
              onCreate={createInlineCategory}
              createLabel={t("admin_categories.modal.submit_add")}
              isCreating={createCategoryFn.isPending}
            />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-bold text-[#111111] mb-1.5">{t("admin_books.modal.labels.rental_price")} *</label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={form.rental_price}
                  onChange={(e) => setForm((f) => ({ ...f, rental_price: e.target.value }))}
                  className="w-full px-3 py-2.5 text-sm border border-[#E1DEE5] rounded-xl text-[#111111]"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-[#111111] mb-1.5">{t("admin_books.modal.labels.loan_duration")}</label>
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={form.loan_duration_days}
                  onChange={(e) => setForm((f) => ({ ...f, loan_duration_days: e.target.value }))}
                  placeholder="System default"
                  className="w-full px-3 py-2.5 text-sm border border-[#E1DEE5] rounded-xl text-[#111111]"
                />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {modalTab === "physical" ? (
              <div>
                <label className="block text-sm font-bold text-[#111111] mb-1.5">{t("admin_books.modal.labels.copies")} *</label>
                <input
                  type="number"
                  min="1"
                  value={form.copies}
                  onChange={(e) => setForm((f) => ({ ...f, copies: e.target.value }))}
                  required
                  className="w-full px-3 py-2.5 text-sm border border-[#E1DEE5] rounded-xl text-[#111111]"
                />
              </div>
            ) : (
              <div>
                <label className="block text-sm font-bold text-[#111111] mb-1.5">
                  {editingBook ? t("admin_books.modal.labels.pdf_file_edit") : t("admin_books.modal.labels.pdf_file")}
                </label>
                <div
                  onClick={() => pdfInputRef.current?.click()}
                  className="w-full h-10 border-2 border-dashed border-[#E1DEE5] rounded-xl flex items-center justify-center cursor-pointer hover:border-[#142B6F]"
                >
                  {pdfFile ? (
                    <p className="text-xs text-[#111111] truncate px-2">{pdfFile.name}</p>
                  ) : (
                    <p className="text-xs text-[#142B6F]">{editingBook ? t("admin_books.modal.drop_pdf_edit") : t("admin_books.modal.drop_pdf")}</p>
                  )}
                </div>
                <input
                  ref={pdfInputRef}
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => handleFileChange(e, "pdf")}
                  className="hidden"
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-bold text-[#111111] mb-1.5">{t("admin_books.modal.labels.publication_year")}</label>
              <input
                type="text"
                value={form.publication_year}
                onChange={(e) => setForm((f) => ({ ...f, publication_year: e.target.value }))}
                placeholder="e.g. 2024"
                className="w-full px-3 py-2.5 text-sm border border-[#E1DEE5] rounded-xl text-[#111111]"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-[#111111] mb-1.5">{t("admin_books.modal.labels.pages")}</label>
              <input
                type="number"
                min="1"
                value={form.pages}
                onChange={(e) => setForm((f) => ({ ...f, pages: e.target.value }))}
                placeholder="e.g. 300"
                className="w-full px-3 py-2.5 text-sm border border-[#E1DEE5] rounded-xl text-[#111111]"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-bold text-[#111111] mb-1.5">{t("admin_books.modal.labels.tags")}</label>
              <input
                type="text"
                value={form.tags}
                onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
                placeholder="comma separated"
                className="w-full px-3 py-2.5 text-sm border border-[#E1DEE5] rounded-xl text-[#111111]"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-[#111111] mb-1.5">{t("admin_books.modal.labels.topics")}</label>
              <input
                type="text"
                value={form.topics}
                onChange={(e) => setForm((f) => ({ ...f, topics: e.target.value }))}
                placeholder="comma separated"
                className="w-full px-3 py-2.5 text-sm border border-[#E1DEE5] rounded-xl text-[#111111]"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold text-[#111111] mb-1.5">{t("admin_books.modal.labels.description")}</label>
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className="w-full px-3 py-2.5 text-sm border border-[#E1DEE5] rounded-xl text-[#111111] resize-none"
            />
          </div>
          {modalTab === "digital" && (
            <div>
              <label className="block text-sm font-bold text-[#111111] mb-1.5">{t("admin_books.modal.labels.pdf_access")}</label>
              <select
                value={form.pdf_access}
                onChange={(e) =>
                  setForm((f) => ({ ...f, pdf_access: e.target.value as "FREE" | "PAID" | "RESTRICTED" }))
                }
                className="w-full px-3 py-2.5 text-sm border border-[#E1DEE5] rounded-xl text-[#111111]"
              >
                <option value="RESTRICTED">{t("admin_books.status.read_only")}</option>
                <option value="FREE">{t("admin_books.status.free_download")}</option>
                <option value="PAID">{t("admin_books.status.paid")}</option>
              </select>
            </div>
          )}
          <div>
            <label className="block text-sm font-bold text-[#111111] mb-1.5">{t("admin_books.modal.labels.cover_image")}</label>
            <div
              onClick={() => imageInputRef.current?.click()}
              className="w-full h-24 border-2 border-dashed border-[#E1DEE5] rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-[#142B6F]"
            >
              {imageFile ? (
                <p className="text-xs text-[#142B6F]">{imageFile.name}</p>
              ) : (
                <>
                  <Upload size={20} className="text-[#142B6F]" />
                  <p className="text-xs text-[#142B6F]">{t("admin_books.modal.drop_image")}</p>
                </>
              )}
            </div>
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => handleFileChange(e, "image")}
              className="hidden"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-[#111111] mb-1.5">{t("admin_books.modal.labels.book_gallery")}</label>
            <div
              onClick={() => galleryInputRef.current?.click()}
              className="w-full h-20 border-2 border-dashed border-[#E1DEE5] rounded-2xl flex items-center justify-center cursor-pointer hover:border-[#142B6F]"
            >
              <p className="text-xs text-[#142B6F]">
                {galleryFiles.length > 0
                  ? t("admin_books.modal.gallery_selected", { count: galleryFiles.length })
                  : t("admin_books.modal.drop_gallery")}
              </p>
            </div>
            <input
              ref={galleryInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => handleFileChange(e, "gallery")}
              className="hidden"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-[#142B6F] text-white text-sm font-bold rounded-xl disabled:opacity-50 mt-2"
          >
            {submitting
              ? t("admin_books.modal.submitting")
              : editingBook
                ? t("admin_books.modal.submit_update")
                : t("admin_books.modal.submit_add")}
          </button>
        </form>
      </div>
    </div>
  );
}

function ConditionModal({
  show,
  onClose,
  bookId,
  title,
}: {
  show: boolean;
  onClose: () => void;
  bookId: string;
  title: string;
}) {
  const { t } = useLanguage();
  const [selectedCopyId, setSelectedCopyId] = useState("");
  const [conditionForm, setConditionForm] = useState({ condition: "GOOD", notes: "" });

  const { data: copiesData, isLoading: copiesLoading } = useBookCopies(bookId);
  const copies: BookCopy[] = copiesData?.data?.copies || [];
  const { data: historyData, isLoading: historyLoading } = useConditionHistory(selectedCopyId);
  const history: ConditionHistoryEntry[] = historyData?.data?.history || [];
  const updateCondition = useUpdateCondition();

  const selectedCopy = copies.find((c) => c.id === selectedCopyId);

  const handleSaveCondition = async () => {
    if (!selectedCopyId) return;
    try {
      await updateCondition.mutateAsync({ copyId: selectedCopyId, data: conditionForm });
      toast.success(t("admin_books.condition_modal.submit_update") || "Condition updated successfully");
    } catch {
      toast.error("Failed to update condition");
    }
  };

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case "NEW":
        return "bg-green-100 text-green-700 border-green-200";
      case "GOOD":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "WORN":
        return "bg-yellow-100 text-yellow-700 border-yellow-200";
      case "DAMAGED":
        return "bg-orange-100 text-orange-700 border-orange-200";
      case "LOST":
        return "bg-red-100 text-red-700 border-red-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  if (!show) return null;

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl overflow-hidden">
        <div className="flex items-center justify-between px-8 pt-7 pb-4 border-b border-[#E1DEE5]/50">
          <div>
            <h3 className="text-xl font-serif font-extrabold text-[#111111]">Book Condition Management</h3>
            <p className="text-sm text-[#142B6F]">{title}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-[#142B6F] hover:text-[#111111] rounded-lg"
          >
            <X size={18} />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 min-h-[500px]">
          {/* Left: Copies List */}
          <div className="border-r border-[#E1DEE5]/50 p-6 bg-[#FFFFFF]">
            <h4 className="text-sm font-bold text-[#111111] mb-4">All Copies ({copies.length})</h4>
            {copiesLoading ? (
              <div className="space-y-3 py-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-14 rounded-2xl bg-[#E1DEE5]/70 animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                {copies.length === 0 ? (
                  <div className="text-sm text-[#142B6F] text-center py-4">No copies found</div>
                ) : (
                  copies.map((copy) => (
                    <button
                      key={copy.id}
                      type="button"
                      onClick={() => {
                        setSelectedCopyId(copy.id);
                        setConditionForm({ condition: copy.condition, notes: copy.notes || "" });
                      }}
                      className={`w-full text-left rounded-2xl border-2 px-4 py-3 transition-all ${copy.id === selectedCopyId ? "border-[#111111] bg-white shadow-md" : "border-[#E1DEE5] hover:bg-white hover:border-[#E1DEE5]"}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-bold text-[#111111]">{copy.copy_code}</span>
                        <span
                          className={`text-[10px] font-bold px-2 py-1 rounded-full ${getConditionColor(copy.condition)}`}
                        >
                          {copy.condition}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-[#142B6F]">
                          {copy.is_available ? "Available" : "Checked Out"}
                        </span>
                        <span className="text-xs text-[#142B6F]">
                          {new Date(copy.last_condition_update).toLocaleDateString()}
                        </span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Middle: Update Condition */}
          <div className="border-r border-[#E1DEE5]/50 p-6">
            <h4 className="text-sm font-bold text-[#111111] mb-4">Update Condition</h4>
            {!selectedCopyId ? (
              <div className="text-sm text-[#142B6F] text-center py-8">Select a copy to update its condition</div>
            ) : (
              <div className="space-y-4">
                <div className="bg-[#FFFFFF] rounded-2xl p-4 border border-[#E1DEE5]/50">
                  <div className="text-xs text-[#142B6F] mb-1">Selected Copy</div>
                  <div className="text-sm font-bold text-[#111111]">{selectedCopy?.copy_code}</div>
                  <div className="text-xs text-[#142B6F] mt-1">
                    Current:{" "}
                    <span className={`font-bold ${getConditionColor(selectedCopy?.condition || "")}`}>
                      {selectedCopy?.condition}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-[#111111] mb-2">New Condition *</label>
                  <div className="grid grid-cols-3 gap-2">
                    {["NEW", "GOOD", "WORN", "DAMAGED", "LOST"].map((cond) => (
                      <button
                        key={cond}
                        type="button"
                        onClick={() => setConditionForm((p) => ({ ...p, condition: cond }))}
                        className={`py-2 px-3 rounded-xl text-xs font-bold border-2 transition-all ${conditionForm.condition === cond ? "border-[#111111] bg-[#142B6F] text-white" : `border ${getConditionColor(cond)} hover:opacity-80`}`}
                      >
                        {cond}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-[#111111] mb-2">Notes (Optional)</label>
                  <textarea
                    rows={3}
                    value={conditionForm.notes}
                    onChange={(e) => setConditionForm((p) => ({ ...p, notes: e.target.value }))}
                    placeholder="Add notes about the book's condition..."
                    className="w-full px-3 py-2.5 text-sm border border-[#E1DEE5] rounded-xl text-[#111111] resize-none"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleSaveCondition}
                  disabled={
                    !selectedCopyId || updateCondition.isPending || conditionForm.condition === selectedCopy?.condition
                  }
                  className="w-full py-3 bg-[#142B6F] text-white text-sm font-bold rounded-xl disabled:opacity-50 hover:bg-[#142B6F] transition-colors"
                >
                  {updateCondition.isPending ? "Saving..." : "Update Condition"}
                </button>

                {conditionForm.condition !== selectedCopy?.condition && (
                  <div className="text-xs text-center text-[#142B6F]">
                    Change: <span className="line-through">{selectedCopy?.condition}</span> →{" "}
                    <span className="font-bold">{conditionForm.condition}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right: History */}
          <div className="p-6 bg-[#FFFFFF]">
            <h4 className="text-sm font-bold text-[#111111] mb-4">Condition History</h4>
            {historyLoading ? (
              <div className="space-y-3 py-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-16 rounded-2xl bg-[#E1DEE5]/70 animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                {history.length === 0 ? (
                  <div className="text-sm text-[#142B6F] text-center py-8">
                    No history yet.
                    <br />
                    Update a copy to see history.
                  </div>
                ) : (
                  history.map((entry) => (
                    <div key={entry.id} className="rounded-2xl border border-[#E1DEE5] px-4 py-3 bg-white">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-xs font-bold px-2 py-0.5 rounded ${getConditionColor(entry.old_condition)}`}
                          >
                            {entry.old_condition}
                          </span>
                          <span className="text-[#142B6F]">→</span>
                          <span
                            className={`text-xs font-bold px-2 py-0.5 rounded ${getConditionColor(entry.new_condition)}`}
                          >
                            {entry.new_condition}
                          </span>
                        </div>
                      </div>
                      <div className="text-xs text-[#142B6F]">{new Date(entry.created_at).toLocaleString()}</div>
                      {entry.notes && (
                        <div className="text-xs text-[#111111]/70 mt-2 pt-2 border-t border-[#E1DEE5]/50">
                          {entry.notes}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
