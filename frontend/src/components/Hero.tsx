"use client";

import React from "react";
import Image from "next/image";
import { MoveRight } from "lucide-react";

export const Hero = () => {
  return (
    <section className="relative w-full overflow-hidden pt-12 pb-24 lg:pt-20 lg:pb-32">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex flex-col lg:flex-row items-center gap-16 lg:gap-20">
          {/* Text Content */}
          <div className="flex-1 space-y-10 order-2 lg:order-1 max-w-2xl">
            <h1 className="text-5xl lg:text-7xl font-serif font-extrabold tracking-tight text-primary leading-tight">
              Your Next Read, <br /> Just a Click{" "}
              <span className="text-secondary italic">Away</span>
            </h1>

            <div className="bg-muted/30 border border-border p-6 rounded-2xl shadow-sm">
              <p className="text-base lg:text-lg leading-relaxed text-secondary font-medium">
                Experience the simplest way to borrow books within our gibi
                gubae. Search our online catalog, request instantly, and get
                your book delivered to your dorm. Built for students who love
                reading—without the hassle.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-6 pt-2">
              <button className="flex items-center gap-3 rounded-full bg-primary px-8 py-4 text-base font-bold text-background shadow-xl hover:bg-accent transition-all group active:scale-95">
                Explore Collections
                <MoveRight
                  size={20}
                  className="group-hover:translate-x-1 transition-transform"
                />
              </button>
            </div>
          </div>

          {/* Image Container */}
          <div className="flex-1 relative order-1 lg:order-2 w-full max-w-xl">
            <div className="relative aspect-[4/5] w-full rounded-2xl overflow-hidden shadow-2xl border-4 border-white transform rotate-1 hover:rotate-0 transition-transform duration-500">
              <Image
                src="/auth/image.png"
                alt="Woman reading a book by candlelight"
                fill
                priority
                className="object-cover"
              />
              <div className="absolute inset-0 bg-linear-to-t from-primary/30 to-transparent" />
            </div>
            {/* Decorative elements */}
            <div className="absolute -top-6 -right-6 w-32 h-32 bg-secondary/10 rounded-full blur-3xl -z-10" />
            <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-accent/10 rounded-full blur-3xl -z-10" />
          </div>
        </div>
      </div>
    </section>
  );
};
