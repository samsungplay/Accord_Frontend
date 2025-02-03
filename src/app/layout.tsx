import type { Metadata } from "next";
import { Kanit } from "next/font/google";

import "./globals.css";
import QueryClientWrapper from "./query/QueryClientWrapper";
import React from "react";
const primaryFont = Kanit({ subsets: ["latin"], weight: ["400", "700"] });

import ThemeManager from "./components/ThemeManager";
import Constants from "./constants/Constants";

export const metadata: Metadata = {
  title: "Accord",
  description:
    "A chatting software developed for self-practice in the style of discord",
  authors: {
    name: "infiniteplay",
  },
  icons: Constants.SERVER_STATIC_CONTENT_PATH + "accord_logo.png",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta
          name="format-detection"
          content="telephone=no, date=no, email=no, address=no"
        />
      </head>
      <ThemeManager />

      <QueryClientWrapper>
        <body className={primaryFont.className}>{children}</body>
      </QueryClientWrapper>
    </html>
  );
}
