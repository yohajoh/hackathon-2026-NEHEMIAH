"use client";

import { useEffect, useRef, useState } from "react";
import { Trash2, Pencil, MoreHorizontal, Search, Plus, ChevronLeft, ChevronRight, X, Upload } from "lucide-react";
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
  useBookCopies,
  useConditionHistory,
  useUpdateCondition,
} from "@/lib/hooks/useQueries";

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

  const { data: booksData, isLoading: booksLoading } = useBooks();
  const { data: digitalData, isLoading: digitalLoading } = useDigitalBooks();
  const { data: categoriesData, isLoading: categoriesLoading } = useCategories();
  const { data: authorsData, isLoading: authorsLoading } = useAuthors();

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
      toast.success("Book deleted successfully");
      setDeleteBookCandidate(null);
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to delete book"));
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
    { key: "all", label: "All Books" },
    { key: "physical", label: "Physical Books" },
    { key: "digital", label: "Digital Books" },
    { key: "categories", label: "Categories" },
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
        toast.success("Category updated successfully");
      } else {
        await createCategoryFn.mutateAsync({ name: categoryName });
        toast.success("Category created successfully");
      }
      setShowCategoryModal(false);
      setEditingCategoryId(null);
      setCategoryName("");
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to save category"));
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm("Delete this category?")) return;
    try {
      await deleteCategoryFn.mutateAsync(id);
      toast.success("Category deleted successfully");
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to delete category"));
    }
  };

  return (
    <>
      <div className="p-6 lg:p-12 space-y-8">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-1">
            <h1 className="text-4xl lg:text-5xl font-serif font-extrabold text-[#2B1A10]">Manage Books</h1>
            <p className="text-[#AE9E85] font-medium">Filter, sort, and access detailed Book profiles</p>
          </div>
          <div className="flex items-center gap-3 mt-2">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#AE9E85]" />
              <input
                type="text"
                placeholder="Search book"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                disabled={activeTab === "categories"}
                className="pl-9 pr-4 py-2.5 text-sm bg-white border border-[#E1D2BD] rounded-xl text-[#2B1A10] placeholder:text-[#C4B49E] w-52 disabled:opacity-40"
              />
            </div>
            <button
              onClick={() => (activeTab === "categories" ? setShowCategoryModal(true) : openCreateBookModal())}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#2B1A10] text-white text-sm font-bold rounded-xl"
            >
              <Plus size={16} />
              {activeTab === "categories" ? "Add new category" : "Add new book"}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-6 border-b border-[#E1D2BD]/50">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className={`pb-3 text-sm font-bold border-b-2 ${activeTab === tab.key ? "text-[#2B1A10] border-[#2B1A10]" : "text-[#AE9E85] border-transparent"}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-[#E1D2BD]/50 overflow-visible">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#8B6B4A]"></div>
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
            <div className="flex items-center justify-between px-8 pt-7 pb-4 border-b border-[#E1D2BD]/50">
              <h3 className="text-xl font-serif font-extrabold text-[#2B1A10]">
                {editingCategoryId ? "Edit Category" : "Add Category"}
              </h3>
              <button
                onClick={() => setShowCategoryModal(false)}
                className="w-8 h-8 flex items-center justify-center text-[#AE9E85] hover:text-[#2B1A10] rounded-lg"
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
                <label className="block text-sm font-bold text-[#2B1A10] mb-1.5">Category Name</label>
                <input
                  type="text"
                  required
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-[#E1D2BD] rounded-xl text-[#2B1A10]"
                />
              </div>
              <button
                type="submit"
                disabled={createCategoryFn.isPending || updateCategoryFn.isPending}
                className="w-full py-3 bg-[#2B1A10] text-white text-sm font-bold rounded-xl disabled:opacity-50"
              >
                {createCategoryFn.isPending || updateCategoryFn.isPending
                  ? "Saving..."
                  : editingCategoryId
                    ? "Update Category"
                    : "Create Category"}
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
          className="fixed inset-0 z-10000 bg-[#2B1A10]/35 flex items-center justify-center p-4"
          onClick={() => !deleteBook.isPending && setDeleteBookCandidate(null)}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            className="w-full max-w-md rounded-[28px] border border-[#E1D2BD] bg-[#FFF9F1] p-6 shadow-2xl"
          >
            <div className="space-y-2">
              <h3 className="text-2xl font-serif font-black text-[#2B1A10]">Delete Book?</h3>
              <p className="text-sm text-[#7B6853] leading-6">
                This will remove <span className="font-bold text-[#2B1A10]">{deleteBookCandidate.title}</span>. This
                action cannot be undone.
              </p>
            </div>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteBookCandidate(null)}
                disabled={deleteBook.isPending}
                className="px-4 py-2.5 rounded-xl border border-[#D9C8B3] text-sm font-bold text-[#6C5236] disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeleteBook(deleteBookCandidate)}
                disabled={deleteBook.isPending}
                className="px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-red-700 disabled:opacity-40"
              >
                {deleteBook.isPending ? "Deleting..." : "Delete Book"}
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
  const [openMenuBookId, setOpenMenuBookId] = useState<string | null>(null);

  useEffect(() => {
    const closeMenu = () => setOpenMenuBookId(null);
    window.addEventListener("click", closeMenu);
    return () => {
      window.removeEventListener("click", closeMenu);
    };
  }, []);

  if (books.length === 0) return <div className="py-16 text-center text-sm text-[#AE9E85]">No books found</div>;
  return (
    <>
      <div className="grid grid-cols-[2.5fr_2fr_1.5fr_1fr_1fr_auto] gap-4 px-6 py-3 border-b border-[#E1D2BD]/50 bg-[#FDFAF6]">
        <span className="text-[11px] font-bold text-[#AE9E85] uppercase">Title</span>
        <span className="text-[11px] font-bold text-[#AE9E85] uppercase">Author</span>
        <span className="text-[11px] font-bold text-[#AE9E85] uppercase">Category</span>
        <span className="text-[11px] font-bold text-[#AE9E85] uppercase text-center">Copies</span>
        <span className="text-[11px] font-bold text-[#AE9E85] uppercase">Status</span>
        <span className="w-16"></span>
      </div>
      {books.map((book) => (
        <div
          key={book.id}
          className="grid grid-cols-[2.5fr_2fr_1.5fr_1fr_1fr_auto] gap-4 items-center px-6 py-4 border-b border-[#E1D2BD]/30 hover:bg-[#FDFAF6]"
        >
          <span className="text-sm font-bold text-[#2B1A10] truncate">{book.title}</span>
          <span className="text-sm text-[#8B6B4A] truncate">{book.author?.name || "—"}</span>
          <span className="text-sm text-[#2B1A10]/70">{book.category?.name || "—"}</span>
          <span className="text-sm text-[#2B1A10]/70 text-center">
            {book.type === "digital" ? "Digital" : (book.total ?? "—")}
          </span>
          <span
            className={`text-xs font-bold px-2.5 py-1 rounded-lg w-fit ${book.type === "digital" ? "bg-[#F3EFE6] text-[#2B1A10]" : book.available === 0 || book.status === "BORROWED" ? "bg-red-50 text-red-600" : "bg-green-50 text-green-700"}`}
          >
            {book.type === "digital"
              ? book.pdf_access === "RESTRICTED"
                ? "Read Only"
                : "Download Allowed"
              : book.status || (book.available === 0 ? "Out of Stock" : "Available")}
          </span>
          <div className="relative flex justify-end" onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              onClick={() => setOpenMenuBookId((current) => (current === book.id ? null : book.id))}
              className="h-9 w-9 rounded-full border border-[#E1D2BD] bg-[#FFFDF9] text-[#8B6B4A] flex items-center justify-center"
              aria-label={`Open actions for ${book.title}`}
            >
              <MoreHorizontal size={16} />
            </button>

            {openMenuBookId === book.id ? (
              <div className="absolute right-0 top-11 z-2147483646 min-w-56 overflow-hidden rounded-xl border border-[#E6D7C4] bg-white shadow-[0_18px_40px_rgba(0,0,0,0.18)]">
                <button
                  type="button"
                  onClick={() => {
                    setOpenMenuBookId(null);
                    onEdit(book);
                  }}
                  className="flex w-full items-center px-3 py-2.5 text-left text-sm font-semibold text-[#2B1A10] hover:bg-[#F8F2E9]"
                >
                  Edit
                </button>
                {book.type === "physical" ? (
                  <button
                    type="button"
                    onClick={() => {
                      setOpenMenuBookId(null);
                      onCondition(book.id, book.title);
                    }}
                    className="flex w-full items-center px-3 py-2.5 text-left text-sm font-semibold text-[#2B1A10] hover:bg-[#F8F2E9]"
                  >
                    Condition
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
                  Delete
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
  if (categories.length === 0)
    return <div className="py-16 text-center text-sm text-[#AE9E85]">No categories found</div>;
  return (
    <>
      <div className="grid grid-cols-[3fr_1fr_auto] gap-4 px-6 py-3 border-b border-[#E1D2BD]/50 bg-[#FDFAF6]">
        <span className="text-[11px] font-bold text-[#AE9E85] uppercase">Category Name</span>
        <span className="text-[11px] font-bold text-[#AE9E85] uppercase">Books</span>
        <span className="w-16"></span>
      </div>
      {categories.map((cat) => (
        <div
          key={cat.id}
          className="grid grid-cols-[3fr_1fr_auto] gap-4 items-center px-6 py-4 border-b border-[#E1D2BD]/30 hover:bg-[#FDFAF6]"
        >
          <span className="text-sm font-bold text-[#2B1A10]">{cat.name}</span>
          <span className="text-sm text-[#2B1A10]/70">
            {(cat._count?.books || 0) + (cat._count?.digital_books || 0)}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onEdit(cat)}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-[#AE9E85] hover:text-[#2B1A10] hover:bg-[#F3EFE6]"
            >
              <Pencil size={15} />
            </button>
            <button
              onClick={() => onDelete(cat.id)}
              disabled={deletingId === cat.id}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-[#AE9E85] hover:text-red-500 hover:bg-red-50 disabled:opacity-40"
            >
              <Trash2 size={15} />
            </button>
          </div>
        </div>
      ))}
    </>
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
  const [modalTab, setModalTab] = useState<"physical" | "digital">("physical");
  const [form, setForm] = useState({
    title: "",
    author_id: "",
    category_id: "",
    copies: "",
    pages: "",
    description: "",
    publication_year: "",
    tags: "",
    topics: "",
    pdf_access: "RESTRICTED" as "FREE" | "PAID" | "RESTRICTED",
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [galleryFiles, setGalleryFiles] = useState<File[]>([]);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

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
          tags: "",
          topics: "",
          pdf_access: "RESTRICTED",
        });
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
      tags: "",
      topics: "",
      pdf_access: "RESTRICTED",
    });
    setImageFile(null);
    setGalleryFiles([]);
    setPdfFile(null);
  };

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="flex items-center justify-center gap-8 pt-8 pb-4 border-b border-[#E1D2BD]/50 relative">
          <button
            onClick={() => setModalTab("physical")}
            disabled={!!editingBook}
            className={`text-sm font-bold pb-2 border-b-2 ${modalTab === "physical" ? "text-[#2B1A10] border-[#2B1A10]" : "text-[#AE9E85] border-transparent"} disabled:opacity-50`}
          >
            Physical Book
          </button>
          <button
            onClick={() => setModalTab("digital")}
            disabled={!!editingBook}
            className={`text-sm font-bold pb-2 border-b-2 ${modalTab === "digital" ? "text-[#2B1A10] border-[#2B1A10]" : "text-[#AE9E85] border-transparent"} disabled:opacity-50`}
          >
            Digital Book
          </button>
          <button
            onClick={onClose}
            className="absolute right-5 top-6 w-8 h-8 flex items-center justify-center text-[#AE9E85] hover:text-[#2B1A10] rounded-lg"
          >
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-8 py-6 space-y-4 max-h-[80vh] overflow-y-auto">
          <div>
            <label className="block text-sm font-bold text-[#2B1A10] mb-1.5">Title *</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              required
              className="w-full px-3 py-2.5 text-sm border border-[#E1D2BD] rounded-xl text-[#2B1A10]"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-bold text-[#2B1A10] mb-1.5">Author *</label>
              <select
                value={form.author_id}
                onChange={(e) => setForm((f) => ({ ...f, author_id: e.target.value }))}
                required
                className="w-full px-3 py-2.5 text-sm border border-[#E1D2BD] rounded-xl text-[#2B1A10]"
              >
                <option value="">Select author</option>
                {authors.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-[#2B1A10] mb-1.5">Category *</label>
              <select
                value={form.category_id}
                onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value }))}
                required
                className="w-full px-3 py-2.5 text-sm border border-[#E1D2BD] rounded-xl text-[#2B1A10]"
              >
                <option value="">Select category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {modalTab === "physical" ? (
              <div>
                <label className="block text-sm font-bold text-[#2B1A10] mb-1.5">Copies *</label>
                <input
                  type="number"
                  min="1"
                  value={form.copies}
                  onChange={(e) => setForm((f) => ({ ...f, copies: e.target.value }))}
                  required
                  className="w-full px-3 py-2.5 text-sm border border-[#E1D2BD] rounded-xl text-[#2B1A10]"
                />
              </div>
            ) : (
              <div>
                <label className="block text-sm font-bold text-[#2B1A10] mb-1.5">
                  {editingBook ? "PDF (optional)" : "PDF *"}
                </label>
                <div
                  onClick={() => pdfInputRef.current?.click()}
                  className="w-full h-10 border-2 border-dashed border-[#E1D2BD] rounded-xl flex items-center justify-center cursor-pointer hover:border-[#8B6B4A]"
                >
                  {pdfFile ? (
                    <p className="text-xs text-[#2B1A10] truncate px-2">{pdfFile.name}</p>
                  ) : (
                    <p className="text-xs text-[#AE9E85]">{editingBook ? "Upload new PDF" : "Upload PDF"}</p>
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
              <label className="block text-sm font-bold text-[#2B1A10] mb-1.5">Year</label>
              <input
                type="text"
                value={form.publication_year}
                onChange={(e) => setForm((f) => ({ ...f, publication_year: e.target.value }))}
                placeholder="e.g. 2024"
                className="w-full px-3 py-2.5 text-sm border border-[#E1D2BD] rounded-xl text-[#2B1A10]"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-[#2B1A10] mb-1.5">Pages</label>
              <input
                type="number"
                min="1"
                value={form.pages}
                onChange={(e) => setForm((f) => ({ ...f, pages: e.target.value }))}
                placeholder="e.g. 300"
                className="w-full px-3 py-2.5 text-sm border border-[#E1D2BD] rounded-xl text-[#2B1A10]"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-bold text-[#2B1A10] mb-1.5">Tags</label>
              <input
                type="text"
                value={form.tags}
                onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
                placeholder="comma separated"
                className="w-full px-3 py-2.5 text-sm border border-[#E1D2BD] rounded-xl text-[#2B1A10]"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-[#2B1A10] mb-1.5">Topics</label>
              <input
                type="text"
                value={form.topics}
                onChange={(e) => setForm((f) => ({ ...f, topics: e.target.value }))}
                placeholder="comma separated"
                className="w-full px-3 py-2.5 text-sm border border-[#E1D2BD] rounded-xl text-[#2B1A10]"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold text-[#2B1A10] mb-1.5">Description</label>
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className="w-full px-3 py-2.5 text-sm border border-[#E1D2BD] rounded-xl text-[#2B1A10] resize-none"
            />
          </div>
          {modalTab === "digital" && (
            <div>
              <label className="block text-sm font-bold text-[#2B1A10] mb-1.5">Access Mode</label>
              <select
                value={form.pdf_access}
                onChange={(e) =>
                  setForm((f) => ({ ...f, pdf_access: e.target.value as "FREE" | "PAID" | "RESTRICTED" }))
                }
                className="w-full px-3 py-2.5 text-sm border border-[#E1D2BD] rounded-xl text-[#2B1A10]"
              >
                <option value="RESTRICTED">Read Only (Restricted)</option>
                <option value="FREE">Free Download</option>
                <option value="PAID">Paid</option>
              </select>
            </div>
          )}
          <div>
            <label className="block text-sm font-bold text-[#2B1A10] mb-1.5">Cover Image</label>
            <div
              onClick={() => imageInputRef.current?.click()}
              className="w-full h-24 border-2 border-dashed border-[#E1D2BD] rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-[#8B6B4A]"
            >
              {imageFile ? (
                <p className="text-xs text-[#AE9E85]">{imageFile.name}</p>
              ) : (
                <>
                  <Upload size={20} className="text-[#AE9E85]" />
                  <p className="text-xs text-[#AE9E85]">Click to upload</p>
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
            <label className="block text-sm font-bold text-[#2B1A10] mb-1.5">Gallery Images (up to 10)</label>
            <div
              onClick={() => galleryInputRef.current?.click()}
              className="w-full h-20 border-2 border-dashed border-[#E1D2BD] rounded-2xl flex items-center justify-center cursor-pointer hover:border-[#8B6B4A]"
            >
              <p className="text-xs text-[#AE9E85]">
                {galleryFiles.length > 0
                  ? `${galleryFiles.length} image(s) selected`
                  : "Click to select multiple images"}
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
            className="w-full py-3 bg-[#2B1A10] text-white text-sm font-bold rounded-xl disabled:opacity-50 mt-2"
          >
            {submitting
              ? editingBook
                ? "Updating..."
                : "Adding..."
              : editingBook
                ? "Update Book"
                : "Add book to collection"}
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
      toast.success("Condition updated successfully");
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
        <div className="flex items-center justify-between px-8 pt-7 pb-4 border-b border-[#E1D2BD]/50">
          <div>
            <h3 className="text-xl font-serif font-extrabold text-[#2B1A10]">Book Condition Management</h3>
            <p className="text-sm text-[#AE9E85]">{title}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-[#AE9E85] hover:text-[#2B1A10] rounded-lg"
          >
            <X size={18} />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 min-h-[500px]">
          {/* Left: Copies List */}
          <div className="border-r border-[#E1D2BD]/50 p-6 bg-[#FDFAF6]">
            <h4 className="text-sm font-bold text-[#2B1A10] mb-4">All Copies ({copies.length})</h4>
            {copiesLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#8B6B4A]"></div>
              </div>
            ) : (
              <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                {copies.length === 0 ? (
                  <div className="text-sm text-[#AE9E85] text-center py-4">No copies found</div>
                ) : (
                  copies.map((copy) => (
                    <button
                      key={copy.id}
                      type="button"
                      onClick={() => {
                        setSelectedCopyId(copy.id);
                        setConditionForm({ condition: copy.condition, notes: copy.notes || "" });
                      }}
                      className={`w-full text-left rounded-2xl border-2 px-4 py-3 transition-all ${copy.id === selectedCopyId ? "border-[#2B1A10] bg-white shadow-md" : "border-[#E1D2BD] hover:bg-white hover:border-[#C2B199]"}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-bold text-[#2B1A10]">{copy.copy_code}</span>
                        <span
                          className={`text-[10px] font-bold px-2 py-1 rounded-full ${getConditionColor(copy.condition)}`}
                        >
                          {copy.condition}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-[#AE9E85]">
                          {copy.is_available ? "Available" : "Checked Out"}
                        </span>
                        <span className="text-xs text-[#AE9E85]">
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
          <div className="border-r border-[#E1D2BD]/50 p-6">
            <h4 className="text-sm font-bold text-[#2B1A10] mb-4">Update Condition</h4>
            {!selectedCopyId ? (
              <div className="text-sm text-[#AE9E85] text-center py-8">Select a copy to update its condition</div>
            ) : (
              <div className="space-y-4">
                <div className="bg-[#FDFAF6] rounded-2xl p-4 border border-[#E1D2BD]/50">
                  <div className="text-xs text-[#AE9E85] mb-1">Selected Copy</div>
                  <div className="text-sm font-bold text-[#2B1A10]">{selectedCopy?.copy_code}</div>
                  <div className="text-xs text-[#AE9E85] mt-1">
                    Current:{" "}
                    <span className={`font-bold ${getConditionColor(selectedCopy?.condition || "")}`}>
                      {selectedCopy?.condition}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-[#2B1A10] mb-2">New Condition *</label>
                  <div className="grid grid-cols-3 gap-2">
                    {["NEW", "GOOD", "WORN", "DAMAGED", "LOST"].map((cond) => (
                      <button
                        key={cond}
                        type="button"
                        onClick={() => setConditionForm((p) => ({ ...p, condition: cond }))}
                        className={`py-2 px-3 rounded-xl text-xs font-bold border-2 transition-all ${conditionForm.condition === cond ? "border-[#2B1A10] bg-[#2B1A10] text-white" : `border ${getConditionColor(cond)} hover:opacity-80`}`}
                      >
                        {cond}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-[#2B1A10] mb-2">Notes (Optional)</label>
                  <textarea
                    rows={3}
                    value={conditionForm.notes}
                    onChange={(e) => setConditionForm((p) => ({ ...p, notes: e.target.value }))}
                    placeholder="Add notes about the book's condition..."
                    className="w-full px-3 py-2.5 text-sm border border-[#E1D2BD] rounded-xl text-[#2B1A10] resize-none"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleSaveCondition}
                  disabled={
                    !selectedCopyId || updateCondition.isPending || conditionForm.condition === selectedCopy?.condition
                  }
                  className="w-full py-3 bg-[#2B1A10] text-white text-sm font-bold rounded-xl disabled:opacity-50 hover:bg-[#3d2413] transition-colors"
                >
                  {updateCondition.isPending ? "Saving..." : "Update Condition"}
                </button>

                {conditionForm.condition !== selectedCopy?.condition && (
                  <div className="text-xs text-center text-[#8B6B4A]">
                    Change: <span className="line-through">{selectedCopy?.condition}</span> →{" "}
                    <span className="font-bold">{conditionForm.condition}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right: History */}
          <div className="p-6 bg-[#FAFAFA]">
            <h4 className="text-sm font-bold text-[#2B1A10] mb-4">Condition History</h4>
            {historyLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#8B6B4A]"></div>
              </div>
            ) : (
              <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                {history.length === 0 ? (
                  <div className="text-sm text-[#AE9E85] text-center py-8">
                    No history yet.
                    <br />
                    Update a copy to see history.
                  </div>
                ) : (
                  history.map((entry) => (
                    <div key={entry.id} className="rounded-2xl border border-[#E1D2BD] px-4 py-3 bg-white">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-xs font-bold px-2 py-0.5 rounded ${getConditionColor(entry.old_condition)}`}
                          >
                            {entry.old_condition}
                          </span>
                          <span className="text-[#AE9E85]">→</span>
                          <span
                            className={`text-xs font-bold px-2 py-0.5 rounded ${getConditionColor(entry.new_condition)}`}
                          >
                            {entry.new_condition}
                          </span>
                        </div>
                      </div>
                      <div className="text-xs text-[#AE9E85]">{new Date(entry.created_at).toLocaleString()}</div>
                      {entry.notes && (
                        <div className="text-xs text-[#2B1A10]/70 mt-2 pt-2 border-t border-[#E1D2BD]/50">
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
