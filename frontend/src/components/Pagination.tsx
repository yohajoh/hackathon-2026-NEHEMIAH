"use client";

import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export const Pagination = () => {
  return (
    <div className="flex items-center justify-center gap-3 py-12">
      <button className="h-10 w-10 flex items-center justify-center rounded-full bg-primary text-background shadow-md hover:bg-accent transition-all active:scale-90">
        <ChevronLeft size={20} />
      </button>

      <div className="flex items-center gap-2">
        <button className="h-10 w-10 flex items-center justify-center rounded-full bg-primary text-background font-bold text-sm shadow-sm ring-2 ring-primary/20">
          1
        </button>
        <button className="h-10 w-10 flex items-center justify-center rounded-full bg-card border border-border text-secondary font-bold text-sm hover:bg-muted transition-all">
          2
        </button>
        <button className="h-10 w-10 flex items-center justify-center rounded-full bg-card border border-border text-secondary font-bold text-sm hover:bg-muted transition-all">
          3
        </button>
        <span className="px-2 text-secondary/40 font-bold tracking-widest">
          ...
        </span>
        <button className="h-10 w-10 flex items-center justify-center rounded-full bg-card border border-border text-secondary font-bold text-sm hover:bg-muted transition-all">
          25
        </button>
        <button className="h-10 w-10 flex items-center justify-center rounded-full bg-card border border-border text-secondary font-bold text-sm hover:bg-muted transition-all">
          26
        </button>
      </div>

      <button className="h-10 w-10 flex items-center justify-center rounded-full bg-primary text-background shadow-md hover:bg-accent transition-all active:scale-90">
        <ChevronRight size={20} />
      </button>
    </div>
  );
};
