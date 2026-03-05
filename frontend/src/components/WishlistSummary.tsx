"use client";

import React from "react";
import { BookMarked, CheckCircle2, Clock, Bell } from "lucide-react";

export const WishlistSummary = () => {
  const stats = [
    {
      label: "Books On Wishlist",
      value: "5",
      icon: <BookMarked className="text-secondary" size={24} />,
    },
    {
      label: "Available Now",
      value: "1",
      icon: <CheckCircle2 className="text-secondary" size={24} />,
    },
    {
      label: "Coming Soon",
      value: "4",
      icon: <Clock className="text-secondary" size={24} />,
    },
    {
      label: "Notify Me When Available",
      value: "ON for all",
      icon: <Bell className="text-secondary" size={24} />,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-serif font-extrabold text-primary">
          My Reading Wishlist
        </h2>
        <p className="text-sm text-secondary font-medium">
          Save books for later. We&apos;ll notify you when they&apos;re
          available.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <div
            key={index}
            className="bg-card rounded-2xl p-6 border border-border/50 shadow-sm flex flex-col gap-4"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-muted/50 rounded-lg">{stat.icon}</div>
              <p className="text-[10px] uppercase tracking-widest text-secondary font-bold">
                {stat.label}
              </p>
            </div>
            <p className="text-2xl font-serif font-extrabold text-primary">
              {stat.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};
