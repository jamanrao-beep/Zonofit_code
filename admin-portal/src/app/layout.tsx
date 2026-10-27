import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "ZonoFit Admin Console",
  description: "Internal administration for the ZonoFit network.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${jakarta.variable} antialiased bg-background text-foreground min-h-screen flex flex-col font-sans`}
      >
        <main className="flex-1">
          {children}
        </main>
      </body>
    </html>
  );
}
