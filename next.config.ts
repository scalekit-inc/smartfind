import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["smartfind"],
  // smartfind reads its bundled catalog from disk at runtime; ship it with every route.
  outputFileTracingIncludes: {
    "/**": ["./packages/smartfind/data/catalog.json.gz"],
  },
};

export default nextConfig;
