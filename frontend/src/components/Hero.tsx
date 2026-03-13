"use client";

import React from "react";
import Image from "next/image";
import { MoveRight } from "lucide-react";

import { useLanguage } from "@/components/providers/LanguageProvider";

export const Hero = () => {
  const { t } = useLanguage();

  return (
    <section className="relative w-full overflow-hidden pt-12 pb-24 lg:pt-20 lg:pb-32 mb-10">
      <div className="pointer-events-none absolute -left-24 top-10 h-56 w-56 rounded-full bg-accent/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-28 bottom-0 h-72 w-72 rounded-full bg-primary/20 blur-3xl" />
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex flex-col lg:flex-row items-center gap-16 lg:gap-23">
          {/* Text Content */}
          <div className="space-y-10 order-2 lg:order-1 max-w-4xl">
            <div>
              <h1 className="text-5xl lg:text-7xl font-serif font-extrabold tracking-tight text-primary leading-tight mb-6">
                {t("hero.title_part1")} <span className="text-primary italic">{t("hero.title_italic")}</span>
              </h1>

              <p className="text-base lg:text-lg leading-relaxed text-secondary font-medium max-w-2xl">
                {t("hero.description")}
              </p>
            </div>

            <button className="flex items-center gap-3 rounded-full bg-primary px-7 py-3.5 text-base font-bold text-background shadow-[0_14px_40px_rgba(20,43,111,0.26)] hover:bg-accent transition-all group active:scale-95 cursor-pointer">
              {t("hero.cta")}
              <MoveRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          {/* Image Container */}
          <div className="order-1 lg:order-2 w-full max-w-xl -mt-20 rounded-2xl overflow-hidden shadow-2xl border border-border/60">
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
