import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "DroneChain – Decentralised Drone Task Marketplace",
  description:
    "Post, accept, and verify autonomous drone tasks on-chain. Powered by Monad and AI verification.",
  keywords: ["drone", "blockchain", "Web3", "Monad", "DeFi", "autonomous"],
  openGraph: {
    title:       "DroneChain",
    description: "Decentralised autonomous drone task marketplace",
    type:        "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} font-sans antialiased bg-[#080c14] text-slate-100 min-h-screen`}
      >
        {/* Subtle grid background */}
        <div
          className="pointer-events-none fixed inset-0 z-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(139,92,246,0.5) 1px, transparent 1px), " +
              "linear-gradient(90deg, rgba(139,92,246,0.5) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
        {/* Radial glow */}
        <div className="pointer-events-none fixed inset-0 z-0">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-violet-700/10 rounded-full blur-[120px]" />
        </div>

        <div className="relative z-10">{children}</div>
      </body>
    </html>
  );
}
