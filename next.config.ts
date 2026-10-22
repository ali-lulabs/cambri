import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // react-pdf ships its own font/layout engine; keep it out of the server bundle.
  serverExternalPackages: ["@react-pdf/renderer"],
};

export default nextConfig;
