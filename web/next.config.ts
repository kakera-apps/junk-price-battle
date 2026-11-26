import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export", // static site: deploy to Cloudflare Pages / any static host
  trailingSlash: true,
  serverExternalPackages: ["better-sqlite3"],
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "thumbnail.image.rakuten.co.jp" },
      { protocol: "https", hostname: "image.rakuten.co.jp" },
      { protocol: "https", hostname: "shop.r10s.jp" },
      { protocol: "https", hostname: "upload.wikimedia.org" },
      { protocol: "https", hostname: "commons.wikimedia.org" },
    ],
  },
};

export default nextConfig;

