import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Server external packages (no longer needed since we're fully client-side,
  // but kept for fallback compatibility)
  serverExternalPackages: ["@contentauth/c2pa-node"],

  // Serve static WASM file with correct MIME type
  async headers() {
    return [
      {
        source: "/c2pa.wasm",
        headers: [
          { key: "Content-Type", value: "application/wasm" },
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        source: "/c2pa.worker.js",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
  },

  // Allow cross-origin isolation needed for SharedArrayBuffer (WASM threads)
  async rewrites() {
    return [];
  },
};

export default nextConfig;
