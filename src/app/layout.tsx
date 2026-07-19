import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Online Data Sub",
  description: "Data, airtime, bills — and gold & stocks, watch only.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-white">{children}</body>
    </html>
  );
}
