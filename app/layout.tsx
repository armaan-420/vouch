import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vouch — The Wharton Sunscreen Edit",
  description: "Vouch or pass on sunscreens and discover the Wharton community’s picks.",
  manifest: "/site.webmanifest",
  icons: {
    icon: [{ url: "/brand/favicon.svg", type: "image/svg+xml" }, { url: "/brand/favicon-32.png", sizes: "32x32", type: "image/png" }, { url: "/favicon.ico", sizes: "48x48" }],
    shortcut: "/favicon.ico",
    apple: "/brand/apple-touch-icon.png",
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
