import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Avoid "Invalid options: useEslintrc, extensions" when Next runs lint during build (ESLint 9 vs next lint)
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
