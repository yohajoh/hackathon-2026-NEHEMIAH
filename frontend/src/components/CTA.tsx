"use client";

import Image from "next/image";
import { MoveRight } from "lucide-react";
import Link from "next/link";

export const CTA = () => {
  return (
    <section className="w-full py-8 px-6 lg:px-16 relative z-1">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-12 rounded-[40px] bg-[#F3DFC0] px-10 py-16 lg:px-12 lg:py-20">
          <div className="space-y-8 max-w-xl">
            <div>
              <h2 className="text-4xl lg:text-5xl font-serif font-extrabold text-primary leading-tight mb-3">
                Ready to dive into your next great read?
              </h2>
              <p className="text-lg text-secondary font-medium leading-relaxed">
                Experience the simplest way to borrow books within our gibi
                gubae. Built for students who love reading—without the hassle.
              </p>
            </div>

            <Link
              href="/books"
              className="flex items-center w-fit gap-3 rounded-full bg-primary px-8 py-3 text-base font-bold text-background shadow-xl hover:bg-accent transition-all group active:scale-95 cursor-pointer"
            >
              Explore Collections
              <MoveRight
                size={20}
                className="group-hover:translate-x-1 transition-transform"
              />
            </Link>
          </div>

          <div className="max-w-100">
            <Image
              src="/reading img 9.jpg"
              alt="Priest reading a book"
              width={1024}
              height={1024}
              className="object-contain rounded-2xl"
            />
          </div>
        </div>
      </div>
    </section>
  );
};
