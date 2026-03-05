"use client";

import { BookMarked, CheckCircle2, Clock } from "lucide-react";

type WishlistItem = {
  id: string;
  bookAvailable: boolean;
  bookDeleted: boolean;
};

type Props = {
  wishlist: WishlistItem[];
  loading?: boolean;
};

export const WishlistSummary = ({ wishlist, loading }: Props) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-card rounded-2xl p-6 border border-border/50 shadow-sm animate-pulse"
          >
            <div className="h-20 bg-muted/50 rounded" />
          </div>
        ))}
      </div>
    );
  }

  const totalBooks = wishlist.length;
  const availableNow = wishlist.filter((item) => item.bookAvailable && !item.bookDeleted).length;
  const unavailable = wishlist.filter((item) => !item.bookAvailable && !item.bookDeleted).length;
  const deleted = wishlist.filter((item) => item.bookDeleted).length;

  const stats = [
    {
      label: "Books On Wishlist",
      value: totalBooks.toString(),
      icon: <BookMarked className="text-secondary" size={24} />,
    },
    {
      label: "Available Now",
      value: availableNow.toString(),
      icon: <CheckCircle2 className="text-secondary" size={24} />,
    },
    {
      label: "Currently Unavailable",
      value: unavailable.toString(),
      icon: <Clock className="text-secondary" size={24} />,
    },
    {
      label: "No Longer Available",
      value: deleted.toString(),
      icon: <Clock className="text-secondary" size={24} />,
    },
  ];

  return (
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
  );
};
