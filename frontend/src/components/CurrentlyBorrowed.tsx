"use client";

import React from "react";
import Image from "next/image";
import { Star } from "lucide-react";

export const CurrentlyBorrowed = () => {
  return (
    <div className="bg-card rounded-3xl p-6 border border-border/50 shadow-sm relative overflow-hidden group">
      {/* Decorative Background Element */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110" />

      <div className="relative flex flex-col md:flex-row gap-8">
        {/* Book Cover */}
        <div className="w-full md:w-40 shrink-0">
          <div className="relative aspect-3/4 rounded-2xl overflow-hidden shadow-xl border-4 border-white/50">
            <Image
              src="/auth/image.png"
              alt="Currently Borrowed Book"
              fill
              className="object-cover"
            />
          </div>
        </div>

        {/* Detailed Info */}
        <div className="flex-1 space-y-6">
          <div className="space-y-4">
            <div className="space-y-1">
              <h3 className="text-2xl font-serif font-extrabold text-primary">
                የብርሃን እናት
              </h3>
              <div className="flex items-center gap-3">
                <p className="text-sm text-secondary font-medium">
                  ዲያቆን ሄኖክ ኃይሌ
                </p>
                <div className="h-4 w-[1px] bg-border" />
                <div className="flex items-center gap-1 text-primary">
                  <Star size={14} fill="currentColor" />
                  <span className="text-xs font-bold">4.5</span>
                </div>
              </div>
            </div>

            {/* Date Details */}
            <div className="flex flex-wrap gap-3">
              <div className="bg-muted/50 rounded-xl px-4 py-2 space-y-0.5 border border-border/30">
                <p className="text-[10px] uppercase tracking-widest text-secondary font-bold">
                  Borrowed on
                </p>
                <p className="text-sm font-bold text-primary">Feb 20, 2026</p>
              </div>
              <div className="bg-muted/50 rounded-xl px-4 py-2 space-y-0.5 border border-border/30">
                <p className="text-[10px] uppercase tracking-widest text-secondary font-bold">
                  Due date
                </p>
                <p className="text-sm font-bold text-primary">March 6, 2026</p>
              </div>
              <div className="bg-orange-50 rounded-xl px-4 py-2 space-y-0.5 border border-orange-100">
                <p className="text-[10px] uppercase tracking-widest text-orange-600 font-bold">
                  Days remaining
                </p>
                <p className="text-sm font-bold text-orange-700">2 days left</p>
              </div>
            </div>
          </div>

          <button className="w-full md:w-auto px-8 py-3 rounded-full bg-primary text-background font-bold text-sm shadow-lg hover:bg-accent transition-all active:scale-95">
            Return Book
          </button>
        </div>
      </div>
    </div>
  );
};
