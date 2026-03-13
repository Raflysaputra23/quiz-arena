import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    remotePatterns: [
      new URL('https://fwmkxfudqmqyzpfjldxv.supabase.co/storage/v1/object/public/question-images/**')
    ]
  }
};

export default nextConfig;
