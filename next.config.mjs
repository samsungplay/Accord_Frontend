/** @type {import('next').NextConfig} */
const nextConfig = {};
import bundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const config = withBundleAnalyzer(nextConfig);

export default config;
