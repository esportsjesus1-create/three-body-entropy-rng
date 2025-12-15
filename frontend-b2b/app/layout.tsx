import type { Metadata } from "next";
import "./globals.css";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Three-Body Entropy Slots | Provably Fair Gaming",
  description: "Provably fair slot games with cryptographically verifiable randomness. Every spin can be independently verified.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-primary-bg text-text-primary antialiased min-h-screen flex flex-col">
        <Navigation />
        <main className="flex-1 pt-20">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
