"use client";

import Link from "next/link";
import { Facebook, Twitter, Instagram, Mail, Phone } from "lucide-react";
import { RiTiktokLine } from "react-icons/ri";
import Image from "next/image";
import { LiaTelegram } from "react-icons/lia";

export const Footer = () => {
  return (
    <footer className="w-full bg-secondary/5 pt-24 pb-8 -mt-20 relative z-0">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-8 mt-8 justify-items-center">
          {/* Brand and Description */}
          <div className="col-span-1 md:col-span-1 space-y-6">
            <Link href="/" className="flex items-center gap-2">
              <Image src="/icons/book.svg" alt="Book icon" width={36} height={36} />
              <span className="text-3xl font-serif font-bold tracking-tight text-primary">ብራና</span>
            </Link>
            <p className="text-sm text-secondary leading-relaxed max-w-2xs">
              We are here to make your reading life easier through a modern digital book rental system.
            </p>
            <div className="flex items-center gap-4">
              <a
                href="#"
                className="p-2 rounded-full bg-background border border-border text-secondary hover:text-primary hover:border-primary transition-all"
              >
                <Facebook size={24} />
              </a>
              <a
                href="#"
                className="p-2 rounded-full bg-background border border-border text-secondary hover:text-primary hover:border-primary transition-all"
              >
                <Twitter size={24} />
              </a>
              <a
                href="#"
                className="p-2 rounded-full bg-background border border-border text-secondary hover:text-primary hover:border-primary transition-all"
              >
                <Instagram size={24} />
              </a>
              <a
                href="#"
                className="p-2 rounded-full bg-background border border-border text-secondary hover:text-primary hover:border-primary transition-all"
              >
                <RiTiktokLine size={24} />
              </a>
              <a
                href="#"
                className="p-2 rounded-full bg-background border border-border text-secondary hover:text-primary hover:border-primary transition-all"
              >
                <LiaTelegram size={24} />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-6">
            <h3 className="text-lg font-bold uppercase tracking-widest text-primary">Links</h3>
            <nav className="flex flex-col gap-3">
              <Link href="/" className="text-sm text-secondary hover:text-primary transition-colors">
                Home
              </Link>
              <Link href="/books" className="text-sm text-secondary hover:text-primary transition-colors">
                Books
              </Link>
              <Link href="/about" className="text-sm text-secondary hover:text-primary transition-colors">
                About Us
              </Link>
            </nav>
          </div>

          {/* Contact Info */}
          <div className="space-y-6">
            <h3 className="text-lg font-bold uppercase tracking-widest text-primary">Contact</h3>
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3 text-sm text-secondary">
                <Phone size={16} />
                <span>+251 987 654 321</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-secondary">
                <Mail size={16} />
                <span>hello@birana.com</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-secondary/70">&copy; {new Date().getFullYear()} Birana. All rights reserved.</p>
          <div className="flex gap-6">
            <a href="#" className="text-xs text-secondary/70 hover:text-primary transition-colors">
              Privacy Policy
            </a>
            <a href="#" className="text-xs text-secondary/70 hover:text-primary transition-colors">
              Terms of Service
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};
