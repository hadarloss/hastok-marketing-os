import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The floating dev-mode indicator sits bottom-left, the same corner where the
  // chat composer's send button lands in this RTL layout — disable it so it never
  // blocks a click during local development.
  devIndicators: false,
};

export default nextConfig;
