"use client";

import { useState } from "react";
import { Search as SearchIcon } from "lucide-react";

type Props = {
  onSearch: (query: string) => void;
};

export const SearchBar = ({ onSearch }: Props) => {
  const [query, setQuery] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(query);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    // Auto-search on type (debounced in parent)
    if (value.length === 0) {
      onSearch("");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="relative w-full max-w-2xl group">
      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
        <SearchIcon
          className="text-secondary/60 group-focus-within:text-primary transition-colors"
          size={20}
        />
      </div>
      <input
        type="text"
        value={query}
        onChange={handleChange}
        placeholder="Search for books, authors, or categories..."
        className="block w-full pl-12 pr-4 py-4 rounded-full border border-border bg-card/60 text-primary placeholder-secondary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-card transition-all shadow-sm"
      />
    </form>
  );
};
