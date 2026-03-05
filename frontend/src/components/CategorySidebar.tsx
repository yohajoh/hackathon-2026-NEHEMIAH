"use client";

import React from "react";
import {
  Filter,
  BookOpen,
  Cross,
  ShieldCheck,
  Heart,
  User,
  History,
} from "lucide-react";

const categories = [
  { id: "all", name: "All Genres", count: 247, icon: <Filter size={18} /> },
  { id: "geezlet", name: "Geezlet", count: 47, icon: <BookOpen size={18} /> },
  { id: "diaconat", name: "Diaconat", count: 21, icon: <Cross size={18} /> },
  {
    id: "apologetics",
    name: "Apologetics",
    count: 18,
    icon: <ShieldCheck size={18} />,
  },
  {
    id: "christian-life",
    name: "Christian Life",
    count: 23,
    icon: <Heart size={18} />,
  },
  { id: "biography", name: "Biography", count: 7, icon: <User size={18} /> },
  {
    id: "church-history",
    name: "Church History",
    count: 5,
    icon: <History size={18} />,
  },
];

export const CategorySidebar = () => {
  const [selected, setSelected] = React.useState("all");

  return (
    <aside className="w-full lg:w-64 flex-shrink-0 space-y-8">
      <div className="flex items-center gap-3 mb-6">
        <Filter className="text-primary" size={24} />
        <h2 className="text-xl font-serif font-extrabold text-primary">
          Categories
        </h2>
      </div>

      <nav className="flex flex-col gap-2">
        {categories.map((category) => {
          const isSelected = selected === category.id;
          return (
            <button
              key={category.id}
              onClick={() => setSelected(category.id)}
              className={`flex items-center justify-between px-4 py-3 rounded-xl transition-all group ${
                isSelected
                  ? "bg-muted text-primary font-bold shadow-sm"
                  : "text-secondary hover:bg-muted/50 hover:text-primary"
              }`}
            >
              <div className="flex items-center gap-3">
                <span
                  className={`${isSelected ? "text-primary" : "text-secondary/60 group-hover:text-primary"}`}
                >
                  {category.icon}
                </span>
                <span className="text-sm font-medium">{category.name}</span>
              </div>
              <span
                className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  isSelected
                    ? "bg-primary text-background"
                    : "bg-muted/80 text-secondary/70"
                }`}
              >
                {category.count}
              </span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
};
