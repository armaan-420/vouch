import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vouch — The Wharton Sunscreen Edit",
  description: "Vouch or pass on sunscreens and discover the Wharton community’s picks.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
