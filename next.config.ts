import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'pub-7fffc38932334c9cb56dced971206600.r2.dev',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
