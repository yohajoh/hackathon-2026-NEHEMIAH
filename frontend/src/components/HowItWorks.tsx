"use client";

import React from "react";
import { UserPlus, Search, Truck, RotateCcw } from "lucide-react";

const steps = [
  {
    id: 1,
    title: "Create Account",
    description: "Register your journey, beat a bookshelf's limit.",
    icon: <UserPlus size={24} />,
  },
  {
    id: 2,
    title: "Choose a Book",
    description: "Explore our vast library, find your next read.",
    icon: <Search size={24} />,
  },
  {
    id: 3,
    title: "Dorm Delivery",
    description: "Your book delivered to your dorm, stress-free.",
    icon: <Truck size={24} />,
  },
  {
    id: 4,
    title: "Return & Pay",
    description:
      "Use your book share, pay for the next time, and keep the cycle going.",
    icon: <RotateCcw size={24} />,
  },
];

export const HowItWorks = () => {
  return (
    <section className="w-full py-24 bg-background">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-serif font-extrabold text-primary mb-4">
            How It Works
          </h2>
          <div className="h-1.5 w-24 bg-secondary/30 mx-auto rounded-full" />
        </div>

        <div className="relative">
          {/* Decorative curve (simplified for implementation) */}
          <div className="hidden lg:block absolute top-[60px] left-[15%] right-[15%] h-[2px] border-t-2 border-dashed border-border/80 z-0" />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 relative z-10">
            {steps.map((step) => (
              <div
                key={step.id}
                className="flex flex-col items-center text-center p-8 rounded-3xl bg-card border border-border shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
              >
                <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center text-background mb-6 shadow-lg shadow-primary/20">
                  {step.icon}
                </div>
                <h3 className="text-xl font-serif font-bold text-primary mb-3">
                  {step.title}
                </h3>
                <p className="text-sm text-secondary leading-relaxed font-medium">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
