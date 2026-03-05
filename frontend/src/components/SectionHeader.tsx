"use client";

import React from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

interface SectionHeaderProps {
  title: string;
  viewAllHref?: string;
  viewAllText?: string;
  centered?: boolean;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  viewAllHref,
  viewAllText = "View All",
  centered = false,
}) => {
  return (
    <div
      className={`flex items-end mb-8 ${centered ? "justify-center text-center" : "justify-between"}`}
    >
      <h2 className="text-3xl font-serif font-bold text-primary max-w-lg leading-tight">
        {title}
      </h2>
      {viewAllHref && (
        <Link
          href={viewAllHref}
          className="flex items-center gap-1 text-sm font-bold text-secondary hover:text-primary transition-colors group mb-1"
        >
          {viewAllText}
          <ChevronRight
            size={16}
            className="group-hover:translate-x-0.5 transition-transform"
          />
        </Link>
      )}
    </div>
  );
};
