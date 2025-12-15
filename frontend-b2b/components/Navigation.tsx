"use client";

import Link from "next/link";
import { useState } from "react";

export default function Navigation() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navLinks = [
    { href: "#games", label: "Our Games" },
    { href: "#why-fair", label: "Why Fair?" },
    { href: "/verify", label: "Verify Spin" },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-primary-bg/95 backdrop-blur-sm">
      <div className="section-container">
        <div className="flex items-center justify-between h-20 md:h-20">
          <Link href="/" className="text-xl md:text-2xl font-bold text-primary">
            Three-Body Entropy
          </Link>

          <div className="hidden md:flex items-center space-x-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-text-secondary hover:text-secondary transition-colors duration-200 text-base"
              >
                {link.label}
              </Link>
            ))}
          </div>

          <button
            className="md:hidden text-text-primary p-2"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Toggle menu"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {isMenuOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>

        {isMenuOpen && (
          <div className="md:hidden pb-4">
            <div className="flex flex-col space-y-4">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-text-secondary hover:text-secondary transition-colors duration-200 text-base py-2"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
