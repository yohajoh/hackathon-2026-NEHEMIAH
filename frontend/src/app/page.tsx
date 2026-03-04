"use client";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#FFF2D9] text-[#2B1A10] flex flex-col">
      {/* Top bar */}
      <header className="w-full pt-3 pb-2">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4">
          <div className="flex w-full items-center justify-between rounded-full border border-[#E1D2BD] bg-[#FFF7EA] px-5 py-2 shadow-sm">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full border border-[#C8AE8B] text-xs font-semibold text-[#3B2718]">
                Br
              </div>
              <span className="text-sm font-semibold tracking-tight text-[#3B2718]">
                Birana
              </span>
            </div>

            <nav className="hidden items-center gap-8 text-xs text-[#5F422A] md:flex">
              <button className="relative pb-1 font-medium text-[#3B2718]">
                Home
                <span className="absolute inset-x-0 -bottom-0.5 mx-auto block h-[1px] w-6 rounded bg-[#3B2718]" />
              </button>
              <button className="hover:text-[#3B2718] transition-colors">
                Books
              </button>
              <button className="hover:text-[#3B2718] transition-colors">
                About Us
              </button>
            </nav>

            <button className="ml-4 rounded-full bg-[#3B2718] px-4 py-1.5 text-xs font-medium text-[#FFF7EA] shadow-sm hover:bg-[#4A2B0B] transition-colors">
              Log in
            </button>
          </div>
        </div>
      </header>

      {/* Hero section */}
      <section
        className="relative w-full border-b  border-[#E1D2BD] bg-cover bg-center"
        style={{ backgroundImage: "url('/auth/image.png')" }}
      >
        <div className="absolute inset-0  text-white" />
        <div className="relative mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 lg:flex-row lg:items-center lg:py-12 text-white">
          <div className="flex-1 space-y-7">
            <h1 className="text-3xl font-semibold tracking-tight  sm:text-4xl">
              Your Next Read, Just a Click Away
            </h1>

            <div className="rounded-xl bg-[#2B1A10]/85 px-4 py-3 text-[13px] text-[#FDEFD9] shadow-md">
              <p>
                ⚡⚡ Experience the simplest way to borrow books within our gibi
                gubae. Search our online catalog, request instantly, and get
                your book delivered to your dorm. Built for students who love
                reading—without the hassle. ⚡⚡
              </p>
            </div>
            <div className="pt-2">
              <button className="inline-flex items-center justify-center rounded-full border border-white px-5 py-2 text-sm font-medium text-white hover:bg-[#2B1A10] hover:text-[#FFF2D9] transition-colors">
                See all books
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Content section */}
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 lg:flex-row">
        {/* Left sidebar */}
        <aside className="w-full space-y-4 text-sm text-[#4A2B0B] lg:w-52">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8B6B4A]">
              All Items
            </h2>
            <button className="mt-2 text-sm font-medium text-[#2B1A10] hover:text-[#5B3410]">
              See all items
            </button>
          </div>

          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8B6B4A]">
              Categories
            </p>
            <nav className="space-y-1.5 text-sm">
              <button className="flex w-full items-center justify-between rounded-lg px-2 py-1 text-left hover:bg-[#F3DFC0]">
                <span>Amharic Books</span>
              </button>
              <button className="flex w-full items-center justify-between rounded-lg px-2 py-1 text-left hover:bg-[#F3DFC0]">
                <span>English Books</span>
              </button>
              <button className="flex w-full items-center justify-between rounded-lg px-2 py-1 text-left hover:bg-[#F3DFC0]">
                <span>Devotional</span>
              </button>
              <button className="flex w-full items-center justify-between rounded-lg px-2 py-1 text-left hover:bg-[#F3DFC0]">
                <span>Academic</span>
              </button>
            </nav>
          </div>
        </aside>

        {/* Center: featured products */}
        <section className="flex-1 space-y-4">
          <div className="rounded-2xl border border-[#E1D2BD] bg-[#FFF7EA] px-4 py-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[#2B1A10]">
                Featured Products
              </h2>
              <button className="text-xs font-medium text-[#4A2B0B] hover:text-[#754019]">
                View all
              </button>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {[
                "The Alchemist",
                "Rich Dad Poor Dad",
                "Becoming",
                "Sidney Sheldon",
              ].map((title, index) => (
                <div
                  key={index}
                  className="flex flex-col gap-2 rounded-xl bg-white p-2 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="aspect-[3/4] w-full rounded-lg bg-gradient-to-br from-[#F6D7A8] to-[#E9B97A]" />
                  <div>
                    <p className="line-clamp-2 text-xs font-medium text-[#2B1A10]">
                      {title}
                    </p>
                    <p className="mt-1 text-[11px] text-[#8B6B4A]">
                      by Unknown Author
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Right: basket */}
        <aside className="w-full space-y-3 text-sm text-[#4A2B0B] lg:w-60">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[#2B1A10]">My Basket</h2>
          </div>
          <div className="rounded-2xl border border-[#E1D2BD] bg-[#FFF7EA] p-4 text-xs text-[#5F422A]">
            <p className="font-medium text-[#2B1A10]">
              To add items to your cart, sign in below
            </p>
            <button className="mt-3 inline-flex w-full items-center justify-center rounded-full border border-[#4A2B0B] px-4 py-2 text-xs font-medium text-[#4A2B0B] hover:bg-[#4A2B0B] hover:text-[#FFF2D9] transition-colors">
              Log in
            </button>
          </div>
        </aside>
      </main>
    </div>
  );
}
