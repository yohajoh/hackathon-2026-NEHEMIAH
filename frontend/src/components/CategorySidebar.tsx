"use client";

import { Filter } from "lucide-react";

type Category = {
  id: string;
  name: string;
  slug: string;
  _count: { books: number; digital_books: number };
};

type Props = {
  categories: Category[];
  selectedCategory: string | null;
  onCategoryChange: (categorySlug: string | null) => void;
  loading?: boolean;
};

export const CategorySidebar = ({ categories, selectedCategory, onCategoryChange, loading }: Props) => {
  if (loading) {
    return (
      <aside className="w-full lg:w-64 flex-shrink-0 space-y-8">
        <div className="flex items-center gap-3 mb-6">
          <Filter className="text-primary" size={24} />
          <h2 className="text-xl font-serif font-extrabold text-primary">Categories</h2>
        </div>
        <nav className="flex flex-col gap-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-12 bg-muted/50 rounded-xl animate-pulse" />
          ))}
        </nav>
      </aside>
    );
  }

  // Calculate total books
  const totalBooks = categories.reduce((sum, cat) => sum + cat._count.books, 0);

  return (
    <aside className="w-full lg:w-64 flex-shrink-0 space-y-8">
      <div className="flex items-center gap-3 mb-6">
        <Filter className="text-primary" size={24} />
        <h2 className="text-xl font-serif font-extrabold text-primary">Categories</h2>
      </div>

      <nav className="flex flex-col gap-2">
        {/* All Books Option */}
        <button
          onClick={() => onCategoryChange(null)}
          className={`flex items-center justify-between px-4 py-3 rounded-xl transition-all group ${
            selectedCategory === null
              ? "bg-muted text-primary font-bold shadow-sm"
              : "text-secondary hover:bg-muted/50 hover:text-primary"
          }`}
        >
          <div className="flex items-center gap-3">
            <span
              className={`${selectedCategory === null ? "text-primary" : "text-secondary/60 group-hover:text-primary"}`}
            >
              <Filter size={18} />
            </span>
            <span className="text-sm font-medium">All Books</span>
          </div>
          <span
            className={`text-xs font-bold px-2 py-0.5 rounded-full ${
              selectedCategory === null ? "bg-primary text-background" : "bg-muted/80 text-secondary/70"
            }`}
          >
            {totalBooks}
          </span>
        </button>

        {/* Category Options */}
        {categories.map((category) => {
          const normalizedSelected = (selectedCategory || "").trim().toLowerCase();
          const isSelected =
            normalizedSelected === category.slug.toLowerCase() || normalizedSelected === category.name.toLowerCase();
          const bookCount = category._count.books;

          return (
            <button
              key={category.id}
              onClick={() => onCategoryChange(category.name)}
              className={`flex items-center justify-between px-4 py-3 rounded-xl transition-all group ${
                isSelected
                  ? "bg-muted text-primary font-bold shadow-sm"
                  : "text-secondary hover:bg-muted/50 hover:text-primary"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium">{category.name}</span>
              </div>
              <span
                className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  isSelected ? "bg-primary text-background" : "bg-muted/80 text-secondary/70"
                }`}
              >
                {bookCount}
              </span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
};
