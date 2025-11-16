import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import { PostHogProvider } from "@/providers/posthog";

export const metadata: Metadata = {
  title: "AI World Model",
  description: "Interactive probability map exploring potential AI futures",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieYesId = process.env.NEXT_PUBLIC_COOKIEYES_ID;

  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;800&display=swap"
          rel="stylesheet"
        />
        {cookieYesId && (
          <Script
            id="cookieyes"
            type="text/javascript"
            src={`https://cdn-cookieyes.com/client_data/${cookieYesId}/script.js`}
            strategy="beforeInteractive"
          />
        )}
      </head>
      <body>
        <PostHogProvider>{children}</PostHogProvider>
      </body>
    </html>
  );
}
