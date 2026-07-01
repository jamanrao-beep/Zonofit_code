import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ZonoFit Portal | Gym & Admin Management",
  description: "Manage your gym partners, view analytics, and control the ZonoFit network.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground min-h-screen flex flex-col`}
      >
        <header className="fixed top-0 w-full z-50 glass border-b border-white/5">
          <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <div className="w-3 h-3 bg-black rounded-full" />
              </div>
              <span className="text-xl font-bold tracking-tight text-white">
                Zono<span className="text-primary">Fit</span> Portal
              </span>
            </div>
            <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-300">
              <a href="#" className="hover:text-white transition-colors">Overview</a>
              <a href="#" className="hover:text-white transition-colors">Gym Partners</a>
              <a href="#" className="hover:text-white transition-colors">Analytics</a>
              <a href="#" className="hover:text-white transition-colors">Settings</a>
            </nav>
            <div className="flex items-center gap-4">
              <button className="text-sm font-medium hover:text-white transition-colors">
                Log in
              </button>
              <button className="bg-primary hover:bg-primary-dark text-white px-5 py-2.5 rounded-full text-sm font-semibold transition-all hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                Admin Access
              </button>
            </div>
          </div>
        </header>
        <main className="flex-1 pt-20">
          {children}
        </main>
      </body>
    </html>
  );
}
