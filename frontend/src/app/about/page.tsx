import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { MoveRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import React from "react";
import { RxPeople } from "react-icons/rx";

const page = () => {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary/10">
      <Navbar />
      <div className="px-4 sm:px-8 lg:px-16 flex gap-20 pt-10 items-center justify-between mb-40">
        <div>
          <h2 className="text-4xl font-serif font-bold text-primary mb-5">
            Our Story
          </h2>
          <p className="text-[16px] max-w-171.25 leading-relaxed">
            It all started with a stack of Google Forms and a team of dedicated
            volunteers. For years, our fellowship managed book lending
            manually—students would fill out forms, volunteers would track
            everything on spreadsheets, and books were handed out whenever
            schedules aligned.
            <br /> It worked, but it wasn't easy. Books got lost in the shuffle.
            Students didn't know what was available. Volunteers spent hours on
            administrative work instead of connecting with readers. We knew
            there had to be a better way.
            <br /> So we built one. What started as a conversation among friends
            became a project to create a simple, fair, and community-focused
            borrowing system. Today, the Fellowship Library is a fully digital
            platform that lets students browse, request, and receive books—all
            delivered to their dorm, with a pay-per-day model that's fair for
            everyone.
          </p>
        </div>
        <Image
          src="/about img.jpg"
          alt="image of gibi gubae library members"
          width={1024}
          height={1024}
          className="max-w-100 rounded-2xl"
        />
      </div>

      <div className="px-4 sm:px-8 lg:px-16 pt-10 text-center mb-40">
        <h2 className="text-4xl font-serif font-bold text-primary mb-5">
          Our Mission
        </h2>
        <p className="text-[16px] max-w-190 leading-relaxed mx-auto">
          At the Gibi Gubae Library, we believe that reading nurtures the mind
          and soul. Our mission is simple: to make quality books accessible to
          every member of our Gibi Gubae community—without hassle, without
          barriers, and with a personal touch. We're not just a library. We're a
          community of readers who share stories, grow in faith, and support one
          another's journey.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 py-12 bg-secondary/5 h-fit mb-40">
        <div className="px-4 sm:px-8 lg:px-16 text-center w-full border-r-2 border-accent">
          <h3 className="text-4xl font-serif font-bold text-primary mb-5">
            200+
          </h3>
          <p className="text-[16px] leading-relaxed mx-auto">
            Books in our collection
          </p>
        </div>
        <div className="px-4 sm:px-8 lg:px-16 text-center w-full border-r-2 border-accent">
          <h3 className="text-4xl font-serif font-bold text-primary mb-5">
            87
          </h3>
          <p className="text-[16px] leading-relaxed mx-auto">
            Books borrowed this year
          </p>
        </div>
        <div className="px-4 sm:px-8 lg:px-16 text-center w-full border-r-2 border-accent">
          <h3 className="text-4xl font-serif font-bold text-primary mb-5">
            12
          </h3>
          <p className="text-[16px] leading-relaxed mx-auto">
            Library members keeping things running
          </p>
        </div>
        <div className="px-4 sm:px-8 lg:px-16 text-center ">
          <h3 className="text-4xl font-serif font-bold text-primary mb-5">
            50+
          </h3>
          <p className="text-[16px] leading-relaxed mx-auto">Active readers</p>
        </div>
      </div>

      <div className="px-4 sm:px-8 lg:px-16 pt-10 text-center mb-50 flex flex-col items-center">
        <h2 className="text-4xl font-serif font-bold text-primary mb-15">
          Be Part of the Story
        </h2>
        <div className="flex gap-8 ">
          <div className="flex flex-col items-center">
            <div className="w-fit h-fit p-4.5 rounded-full bg-black/30 translate-y-2/6">
              <Image
                src="/icons/read.svg"
                width={32}
                height={32}
                alt="read icon"
              />
            </div>
            <div className="px-4 pb-4 pt-10 text-center bg-white/50 max-w-75 rounded-2xl shadow-xl  flex flex-col items-center gap-1">
              <h4 className="text-[24px] font-serif font-bold text-primary">
                Borrow Books
              </h4>
              <p className="text-[16px] leading-relaxed mb-4 max-w-60">
                The easiest way to get involved! Sign up and start reading.
              </p>
              <Link
                href="/books"
                className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-[14px] font-bold text-background shadow-xl hover:bg-accent transition-all group active:scale-95 cursor-pointer"
              >
                Explore Collections
                <MoveRight
                  size={20}
                  className="group-hover:translate-x-1 transition-transform"
                />
              </Link>
            </div>
          </div>
          <div className="flex flex-col items-center">
            <div className="w-fit h-fit p-4.5 rounded-full bg-black/30 translate-y-2/6">
              <Image
                src="/icons/donate.svg"
                width={32}
                height={32}
                alt="donate icon"
              />
            </div>
            <div className="px-4 pb-4 pt-10 text-center bg-white/50 max-w-75 rounded-2xl shadow-xl  flex flex-col items-center gap-1">
              <h4 className="text-[24px] font-serif font-bold text-primary">
                Donate Books
              </h4>
              <p className="text-[16px] leading-relaxed mb-4">
                Have a book to share? We accept gently used donations that align
                with our collection.
              </p>
              <Link
                href="#"
                className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-[14px] font-bold text-background shadow-xl hover:bg-accent transition-all group active:scale-95 cursor-pointer"
              >
                Contact Us
              </Link>
            </div>
          </div>
          <div className="flex flex-col items-center">
            <div className="w-fit h-fit p-4.5 rounded-full bg-black/30 translate-y-2/6">
              <RxPeople size={32} />
            </div>
            <div className="px-4 pb-4 pt-10 text-center bg-white/50 max-w-75 rounded-2xl shadow-xl  flex flex-col items-center gap-1">
              <h4 className="text-[24px] font-serif font-bold text-primary">
                Be Volunteer
              </h4>
              <p className="text-[16px] leading-relaxed mb-4 max-w-60">
                Help with deliveries, book processing, or admin tasks. Time
                commitment is flexible.
              </p>
              <Link
                href="#"
                className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-[14px] font-bold text-background shadow-xl hover:bg-accent transition-all group active:scale-95 cursor-pointer"
              >
                Contact Us
              </Link>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default page;
