"use client";

import React, { useEffect, useState, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LogIn,
  User,
  BookOpen,
  Settings,
  LogOut,
  LayoutDashboard,
  ChevronDown,
  Menu,
  X,
} from "lucide-react";
import {
  SignInButton,
  SignedIn,
  SignedOut,
  useUser,
  useClerk,
} from "@clerk/nextjs";
import { Button } from "@/components/ui/button";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/pricing", label: "Pricing" },
];

const Header = () => {
  const [mounted, setMounted] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isLoaded, user } = useUser();
  const { signOut } = useClerk();
  const pathname = usePathname();
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setAccountOpen(false);
      }
    };
    if (accountOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [accountOpen]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <header
      className={`sticky top-0 z-50 isolate transition-all duration-500 ${
        scrolled
          ? "border-b border-white/8 bg-black/40 shadow-[0_4px_30px_rgba(0,0,0,0.4)] backdrop-blur-xl"
          : "border-b border-white/10 bg-black/20 backdrop-blur-md"
      }`}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-20 left-1/4 h-44 w-44 rounded-full bg-linear-to-r from-purple-500/20 to-pink-500/10 blur-3xl animate-[float_14s_ease-in-out_infinite]" />
        <div className="absolute -right-12 -top-16 h-48 w-48 rounded-full bg-linear-to-r from-sky-500/20 to-indigo-500/10 blur-3xl animate-[float_18s_ease-in-out_infinite]" />
      </div>

      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-white/15 to-transparent" />

      <div className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-3">
        <Link href="/" className="group flex items-center gap-3">
          <div className="relative">
            <div className="absolute -inset-1 rounded-lg bg-linear-to-r from-purple-500/30 to-sky-500/30 opacity-0 blur transition-opacity duration-500 group-hover:opacity-100" />
            <Image
              src="/image.png"
              alt="logo"
              width={42}
              height={38}
              className="relative rounded-lg ring-1 ring-white/10 transition-transform duration-300 group-hover:scale-105"
            />
          </div>
          <h1 className="text-lg font-semibold tracking-wide text-white">
            <span className="bg-linear-to-r from-purple-400 to-sky-400 bg-clip-text font-bold text-transparent">
              vid
            </span>
            AI
          </h1>
        </Link>

        <nav aria-label="Main navigation" className="hidden md:block">
          <ul className="flex items-center gap-1 rounded-full border border-white/8 bg-white/4 px-2 py-1.5 backdrop-blur-sm">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={`relative rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-300 ${
                    isActive(link.href)
                      ? "bg-white/10 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]"
                      : "text-white/60 hover:bg-white/6 hover:text-white/90"
                  }`}
                >
                  {link.label}
                  {isActive(link.href) && (
                    <span className="absolute -bottom-3 left-1/2 h-0.5 w-6 -translate-x-1/2 rounded-full bg-white/50" />
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-3">
          <button
            className="md:hidden rounded-lg border border-white/10 bg-white/5 p-2 text-white/70 transition hover:bg-white/10 hover:text-white"
            onClick={() => setMobileMenuOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          <div className="flex items-center min-w-35 justify-end">
            {!mounted || !isLoaded ? (
              <div className="h-10 w-28 rounded-full bg-white/5 animate-pulse" />
            ) : (
              <>
                <SignedIn>
                  <div className="relative" ref={dropdownRef}>
                    <button
                      onClick={() => setAccountOpen((v) => !v)}
                      className={`group flex items-center gap-2.5 rounded-full border px-3 py-1.5 transition-all duration-300 ${
                        accountOpen
                          ? "border-white/25 bg-white/15 shadow-[0_0_16px_rgba(255,255,255,0.08)]"
                          : "border-white/12 bg-white/6 hover:border-white/20 hover:bg-white/10"
                      }`}
                    >
                      {user?.imageUrl ? (
                        <img
                          src={user.imageUrl}
                          alt="avatar"
                          className="h-7 w-7 rounded-full ring-2 ring-white/20 transition-all duration-300 group-hover:ring-white/40"
                        />
                      ) : (
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/20 text-xs font-bold text-white">
                          {user?.firstName?.[0] || "U"}
                        </div>
                      )}
                      <span className="hidden sm:block text-sm font-medium text-white/90 max-w-25 truncate">
                        {user?.firstName || "Account"}
                      </span>
                      <ChevronDown
                        className={`h-3.5 w-3.5 text-white/50 transition-transform duration-300 ${
                          accountOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>

                    {accountOpen && (
                      <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-64 origin-top-right animate-[fadeIn_0.2s_ease-out] rounded-xl border border-white/10 bg-black/70 p-1.5 shadow-[0_16px_48px_rgba(0,0,0,0.5)] backdrop-blur-xl">
                        <div className="mb-1.5 rounded-lg bg-white/4 px-3 py-3">
                          <div className="flex items-center gap-3">
                            {user?.imageUrl ? (
                              <img
                                src={user.imageUrl}
                                alt="avatar"
                                className="h-10 w-10 rounded-full ring-2 ring-white/15"
                              />
                            ) : (
                              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/12 ring-1 ring-white/15 text-sm font-bold text-white">
                                {user?.firstName?.[0] || "U"}
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-white">
                                {user?.fullName || "User"}
                              </p>
                              <p className="truncate text-xs text-white/50">
                                {user?.primaryEmailAddress?.emailAddress || ""}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="h-px bg-white/6 my-1" />

                        <DropdownItem
                          icon={<LayoutDashboard className="h-4 w-4" />}
                          label="Dashboard"
                          href="/dashboard"
                          onClick={() => setAccountOpen(false)}
                        />
                        <DropdownItem
                          icon={<BookOpen className="h-4 w-4" />}
                          label="My Courses"
                          href="/my-courses"
                          onClick={() => setAccountOpen(false)}
                        />
                        <DropdownItem
                          icon={<User className="h-4 w-4" />}
                          label="Profile"
                          href="/profile"
                          onClick={() => setAccountOpen(false)}
                        />
                        <DropdownItem
                          icon={<Settings className="h-4 w-4" />}
                          label="Settings"
                          href="/profile"
                          onClick={() => setAccountOpen(false)}
                        />

                        <div className="h-px bg-white/6 my-1" />

                        <button
                          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-red-400/90 transition-colors hover:bg-red-500/10 hover:text-red-400"
                          onClick={() => {
                            setAccountOpen(false);
                            signOut({ redirectUrl: "/" });
                          }}
                        >
                          <LogOut className="h-4 w-4" />
                          Sign Out
                        </button>
                      </div>
                    )}
                  </div>
                </SignedIn>

                <SignedOut>
                  <SignInButton mode="modal">
                    <Button className="group relative overflow-hidden rounded-full border border-white/15 bg-white/8 px-6 py-2.5 text-sm font-semibold text-white shadow-[0_2px_12px_rgba(255,255,255,0.06)] backdrop-blur-sm transition-all duration-300 hover:bg-white/15 hover:shadow-[0_4px_20px_rgba(255,255,255,0.1)] hover:scale-[1.03] active:scale-[0.98]">
                      <LogIn className="mr-2 h-4 w-4 text-white/70" />
                      Get Started
                    </Button>
                  </SignInButton>
                </SignedOut>
              </>
            )}
          </div>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden border-t border-white/6 bg-black/50 backdrop-blur-xl animate-[fadeIn_0.2s_ease-out]">
          <nav className="mx-auto max-w-6xl px-6 py-4 space-y-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
                  isActive(link.href)
                    ? "bg-white/10 text-white"
                    : "text-white/60 hover:bg-white/6 hover:text-white"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
};

function DropdownItem({
  icon,
  label,
  href,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  href: string;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-white/80 transition-colors hover:bg-white/6 hover:text-white"
    >
      <span className="text-white/50">{icon}</span>
      {label}
    </Link>
  );
}

export default Header;
