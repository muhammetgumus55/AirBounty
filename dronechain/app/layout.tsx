import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "DroneChain | Autonomous Drone Marketplace",
  description: "AI-powered autonomous drone task marketplace on Monad",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-950 text-white min-h-screen`}>
        <nav className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <span className="text-xl font-bold text-cyan-400">🚁 DroneChain</span>
          <Link
            href="/create"
            className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-black font-semibold rounded-lg transition-colors"
          >
            Create Task
          </Link>
        </nav>
        {children}
      </body>
    </html>
  );
}
