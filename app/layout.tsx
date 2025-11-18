import type { Metadata } from "next";
import "./globals.css";
import { PostHogProvider } from "@/providers/posthog";
import { CookieBanner } from "@/components/CookieBanner";

export const metadata: Metadata = {
  title: "Map of AI Futures",
  description: "Interactive probability map exploring potential AI futures",
  manifest: "/site.webmanifest",
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
      <body>
        <PostHogProvider>
          {children}
          <CookieBanner />
        </PostHogProvider>
      </body>
    </html>
  );
}
