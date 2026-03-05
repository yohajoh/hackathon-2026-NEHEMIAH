"use client";

import React from "react";
import Image from "next/image";
import { MoveRight } from "lucide-react";

export const CTA = () => {
  return (
    <section className="w-full py-16 px-6">
      <div className="mx-auto max-w-7xl">
        <div className="relative overflow-hidden rounded-[40px] bg-[#F3DFC0] px-10 py-16 lg:px-20 lg:py-24">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-12 relative z-10">
            <div className="flex-1 space-y-8 max-w-xl">
              <h2 className="text-4xl lg:text-5xl font-serif font-extrabold text-primary leading-tight">
                Ready to dive into your next great read?
              </h2>
              <p className="text-lg text-secondary font-medium leading-relaxed">
                ⚡⚡ Experience the simplest way to borrow books within our gibi
                gubae. Built for students who love reading—without the hassle.
                ⚡⚡
              </p>
              <button className="flex items-center gap-3 rounded-full bg-primary px-10 py-4 text-base font-bold text-background shadow-xl hover:bg-accent transition-all group active:scale-95">
                Explore Collections
                <MoveRight
                  size={20}
                  className="group-hover:translate-x-1 transition-transform"
                />
              </button>
            </div>

            <div className="flex-1 relative w-full flex justify-center lg:justify-end">
              <div className="relative w-full max-w-md aspect-square">
                <Image
                  src="/reading_illustration.png"
                  alt="Person reading on a bed illustration"
                  fill
                  className="object-contain"
                />
              </div>
            </div>
          </div>

          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/20 rounded-full blur-3xl z-0" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl z-0" />
        </div>
      </div>
    </section>
  );
};
