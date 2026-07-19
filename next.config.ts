import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["html2canvas-pro"],
  images: {
    qualities: [75, 100],
    remotePatterns: [
      // YouTube thumbnail'lari icin
      { protocol: "https", hostname: "i.ytimg.com" },
      { protocol: "https", hostname: "img.youtube.com" },
      // Rehberlik kapak gorselleri — CMS'ten herhangi bir https kaynagi girilebilir
      { protocol: "https", hostname: "**" },
    ],
  },
};

export default nextConfig;
