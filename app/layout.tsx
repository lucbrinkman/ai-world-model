import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Map of AI Futures",
  description: "Interactive probability map exploring potential AI futures",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
