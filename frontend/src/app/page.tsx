"use client";

import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { MostBorrowed } from "@/components/MostBorrowed";
import { HowItWorks } from "@/components/HowItWorks";
import { FAQ } from "@/components/FAQ";
import { CTA } from "@/components/CTA";
import { Footer } from "@/components/Footer";

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary/10">
      <Navbar />
      <main className="space-y-4 lg:space-y-8">
        <Hero />
        <MostBorrowed />
        <HowItWorks />
        <FAQ />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}
