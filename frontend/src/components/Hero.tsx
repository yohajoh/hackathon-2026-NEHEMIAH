"use client";

import React from "react";
import Image from "next/image";
import { MoveRight } from "lucide-react";

export const Hero = () => {
  return (
    <section className="relative w-full overflow-hidden pt-12 pb-24 lg:pt-20 lg:pb-32 mb-10">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex flex-col lg:flex-row items-center gap-16 lg:gap-23">
          {/* Text Content */}
          <div className="space-y-10 order-2 lg:order-1 max-w-4xl">
            <div>
              <h1 className="text-5xl lg:text-7xl font-serif font-extrabold tracking-tight text-primary leading-tight mb-6">
                Your Next Read, Just a Click{" "}
                <span className="text-secondary italic">Away</span>
              </h1>

              <p className="text-base lg:text-lg leading-relaxed text-secondary font-medium">
                Experience the simplest way to borrow books within our gibi
                gubae. Search our online catalog, request instantly, and get
                your book delivered to your dorm. Built for students who love
                reading without the hassle.
              </p>
            </div>

            <button className="flex items-center gap-3 rounded-full bg-primary px-6 py-3 text-base font-bold text-background shadow-xl hover:bg-accent transition-all group active:scale-95 cursor-pointer">
              Explore Collections
              <MoveRight
                size={20}
                className="group-hover:translate-x-1 transition-transform"
              />
            </button>
          </div>

          {/* Image Container */}
          <div className="order-1 lg:order-2 w-full max-w-xl -mt-20 rounded-2xl overflow-hidden shadow-2xl">
            <Image
              src="/hero img.jpg"
              alt="Woman reading a book by candlelight"
              height={1024}
              width={1024}
              priority
              className="object-cover"
            />
          </div>
        </div>
      </div>
    </section>
  );
};
