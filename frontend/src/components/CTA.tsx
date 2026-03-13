"use client";

import Image from "next/image";
import { MoveRight } from "lucide-react";
import Link from "next/link";

import { useLanguage } from "@/components/providers/LanguageProvider";

export const CTA = () => {
  const { t } = useLanguage();

  return (
    <section className="w-full py-8 px-6 lg:px-16 relative translate-y-18 z-1">
      <div className="mx-auto max-w-7xl">
        <div className="relative flex flex-col lg:flex-row items-center justify-between gap-12 rounded-[40px] border border-border/60 bg-[#E1DEE5] px-10 py-16 lg:px-12 lg:py-20 overflow-hidden">
          <div className="pointer-events-none absolute -left-20 top-0 h-52 w-52 rounded-full bg-accent/30 blur-3xl" />
          <div className="pointer-events-none absolute -right-24 bottom-0 h-64 w-64 rounded-full bg-primary/20 blur-3xl" />
          <div className="space-y-8 max-w-xl">
            <div>
              <h2 className="text-4xl lg:text-5xl font-serif font-extrabold text-primary leading-tight mb-3">
                {t("cta_section.title")}
              </h2>
              <p className="text-lg text-secondary font-medium leading-relaxed">{t("cta_section.description")}</p>
            </div>

            <Link
              href="/books"
              className="flex items-center w-fit gap-3 rounded-full bg-primary px-8 py-3 text-base font-bold text-background shadow-[0_14px_40px_rgba(20,43,111,0.26)] hover:bg-accent transition-all group active:scale-95 cursor-pointer"
            >
              {t("cta_section.button")}
              <MoveRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          <div className="max-w-100 relative">
            <Image
              src="/reading img 9.jpg"
              alt="Priest reading a book"
              width={1024}
              height={1024}
              className="object-contain rounded-2xl border border-border/60"
            />
          </div>
        </div>
      </div>
    </section>
  );
};
