"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import queryClient from "./QueryClient";
import React from "react";
export default function QueryClientWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
