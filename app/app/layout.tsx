import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Activity, Cpu, Search, LayoutGrid, ScanLine } from "lucide-react";
import Link from "next/link";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "MLCC Copilot",
  description: "MLCC Design and Yield Copilot",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.className} antialiased bg-zinc-50 text-zinc-900 min-h-screen`}
      >
        <header className="bg-white border-b border-zinc-200 sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-14 items-center">
              <div className="flex items-center gap-2">
                <Cpu className="w-5 h-5 text-zinc-900" />
                <span className="font-semibold text-sm tracking-tight text-zinc-900 uppercase">MLCC Copilot</span>
              </div>
              <nav className="flex space-x-1">
                <Link href="/" className="flex items-center gap-2 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50 px-3 py-1.5 rounded-sm text-xs font-medium transition-colors">
                  <LayoutGrid className="w-3.5 h-3.5" /> Overview
                </Link>
                <Link href="/predict" className="flex items-center gap-2 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50 px-3 py-1.5 rounded-sm text-xs font-medium transition-colors">
                  <Activity className="w-3.5 h-3.5" /> Predict
                </Link>
                <Link href="/suggest" className="flex items-center gap-2 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50 px-3 py-1.5 rounded-sm text-xs font-medium transition-colors">
                  <Search className="w-3.5 h-3.5" /> Auto-Tune
                </Link>
                <Link href="/inspect" className="flex items-center gap-2 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50 px-3 py-1.5 rounded-sm text-xs font-medium transition-colors">
                  <ScanLine className="w-3.5 h-3.5" /> Inspect
                </Link>

              </nav>
            </div>
          </div>
        </header>
        <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          {children}
        </main>
      </body>
    </html>
  );
}
