"use client";

import React from "react";

export const ProfileSettings = () => {
  return (
    <div className="space-y-8">
      <h3 className="text-xl font-serif font-extrabold text-primary">
        My Profile
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl">
        <div className="md:col-span-2 space-y-2">
          <label className="text-xs font-bold text-secondary uppercase tracking-widest px-1">
            Full Name
          </label>
          <input
            type="text"
            placeholder="John Doe"
            className="w-full px-5 py-3.5 rounded-xl border border-border bg-card text-sm text-primary focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all placeholder:text-secondary/30"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold text-secondary uppercase tracking-widest px-1">
            ID NO
          </label>
          <input
            type="text"
            placeholder="at/12345/15"
            className="w-full px-5 py-3.5 rounded-xl border border-border bg-card text-sm text-primary focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all placeholder:text-secondary/30"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold text-secondary uppercase tracking-widest px-1">
            Batch
          </label>
          <input
            type="text"
            placeholder="4th year"
            className="w-full px-5 py-3.5 rounded-xl border border-border bg-card text-sm text-primary focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all placeholder:text-secondary/30"
          />
        </div>
      </div>
    </div>
  );
};
