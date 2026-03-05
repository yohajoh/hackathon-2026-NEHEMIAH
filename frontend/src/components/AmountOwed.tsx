"use client";

import React from "react";

export const AmountOwed = () => {
  return (
    <div className="bg-card rounded-3xl p-8 border border-border/50 shadow-sm space-y-8 h-full">
      <h3 className="text-xl font-serif font-extrabold text-primary">
        Amount Owed
      </h3>

      <div className="space-y-4">
        {/* Daily Rate */}
        <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-border/20">
          <span className="text-sm font-medium text-secondary">
            Daily Rate:
          </span>
          <span className="text-sm font-bold text-primary">2 birr per day</span>
        </div>

        {/* Days Borrowed */}
        <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-border/20">
          <span className="text-sm font-medium text-secondary">
            Days Borrowed So Far:
          </span>
          <span className="text-sm font-bold text-primary">15 days</span>
        </div>

        {/* Total Amount */}
        <div className="pt-4 border-t border-dashed border-border flex items-center justify-between">
          <span className="text-sm font-bold text-primary uppercase tracking-wider">
            Total amount Owed:
          </span>
          <div className="text-2xl font-serif font-extrabold text-primary">
            30 birr
          </div>
        </div>
      </div>
    </div>
  );
};
