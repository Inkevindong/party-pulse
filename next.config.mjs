/** @type {import('next').NextConfig} */
const nextConfig = {
  // Compress responses in production
  compress: true,
  // Strip unused JS from production bundles
  experimental: {
    optimizePackageImports: ["next/font"],
  },
  // Allow Spotify album-art images
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "i.scdn.co" },
      { protocol: "https", hostname: "mosaic.scdn.co" },
    ],
  },
};

export default nextConfig;
