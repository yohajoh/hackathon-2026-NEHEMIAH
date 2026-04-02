"use client";

import Link from "next/link";
import { Facebook, Twitter, Instagram, Mail, Phone } from "lucide-react";
import { RiTiktokLine } from "react-icons/ri";
import Image from "next/image";
import { LiaTelegram } from "react-icons/lia";

import { useLanguage } from "@/components/providers/LanguageProvider";

export const Footer = () => {
  const { t } = useLanguage();

  return (
    <footer className="mt-4 w-full bg-[#F2F6FF] text-[#111111] border-t border-[#DEE6F8] pt-10 pb-7">
      <div className="mx-auto w-full max-w-7xl px-6">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-3">
          <div className="space-y-6">
            <Link href="/" className="flex items-center gap-2">
              <Image src="/icons/icon.png" alt="Book icon" width={36} height={36} />
              <span className="text-3xl font-serif font-bold tracking-tight text-[#142B6F]">ብራና</span>
            </Link>

            <p className="max-w-xs text-sm leading-relaxed text-[#142B6F]">{t("footer.description")}</p>

            <div className="flex items-center gap-3">
              <a
                href="#"
                aria-label="Facebook"
                title="Facebook"
                className="rounded-full border border-[#E1DEE5] bg-white p-2 text-[#142B6F] hover:bg-[#FFD602] hover:text-[#111111] hover:border-[#FFD602] transition-all"
              >
                <Facebook size={22} />
              </a>
              <a
                href="#"
                aria-label="Twitter"
                title="Twitter"
                className="rounded-full border border-[#E1DEE5] bg-white p-2 text-[#142B6F] hover:bg-[#FFD602] hover:text-[#111111] hover:border-[#FFD602] transition-all"
              >
                <Twitter size={22} />
              </a>
              <a
                href="#"
                aria-label="Instagram"
                title="Instagram"
                className="rounded-full border border-[#E1DEE5] bg-white p-2 text-[#142B6F] hover:bg-[#FFD602] hover:text-[#111111] hover:border-[#FFD602] transition-all"
              >
                <Instagram size={22} />
              </a>
              <a
                href="#"
                aria-label="TikTok"
                title="TikTok"
                className="rounded-full border border-[#E1DEE5] bg-white p-2 text-[#142B6F] hover:bg-[#FFD602] hover:text-[#111111] hover:border-[#FFD602] transition-all"
              >
                <RiTiktokLine size={22} />
              </a>
              <a
                href="#"
                aria-label="Telegram"
                title="Telegram"
                className="rounded-full border border-[#E1DEE5] bg-white p-2 text-[#142B6F] hover:bg-[#FFD602] hover:text-[#111111] hover:border-[#FFD602] transition-all"
              >
                <LiaTelegram size={22} />
              </a>
            </div>
          </div>

          <div className="space-y-6">
            <h3 className="text-base font-bold uppercase tracking-widest text-[#142B6F]">{t("footer.links_title")}</h3>
            <nav className="flex flex-col gap-3">
              <Link href="/" className="w-fit text-sm text-[#111111] hover:text-[#142B6F] transition-colors">
                {t("navbar.home")}
              </Link>
              <Link href="/books" className="w-fit text-sm text-[#111111] hover:text-[#142B6F] transition-colors">
                {t("navbar.books")}
              </Link>
              <Link href="/about" className="w-fit text-sm text-[#111111] hover:text-[#142B6F] transition-colors">
                {t("navbar.about")}
              </Link>
            </nav>
          </div>

          <div className="space-y-6">
            <h3 className="text-base font-bold uppercase tracking-widest text-[#142B6F]">
              {t("footer.contact_title")}
            </h3>
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3 text-sm text-[#111111]">
                <Phone size={16} className="text-[#FFD602]" />
                <span>+251 987 654 321</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-[#111111]">
                <Mail size={16} className="text-[#FFD602]" />
                <span>hello@birana.com</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-col items-center justify-between gap-4 border-t border-[#E1DEE5] pt-5 md:flex-row">
          <p className="text-xs text-[#142B6F]">
            &copy; {new Date().getFullYear()} Birana. {t("footer.rights")}
          </p>
          <div className="flex gap-6">
            <Link href="/privacy-policy" className="text-xs text-[#142B6F] hover:text-[#111111] transition-colors">
              {t("footer.privacy")}
            </Link>
            <Link href="/terms-of-service" className="text-xs text-[#142B6F] hover:text-[#111111] transition-colors">
              {t("footer.terms")}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
