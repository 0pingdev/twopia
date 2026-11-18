/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === 'production';
// This is the hardcoded basePath for Next.js routing
const basePath = '/twopia'; 

const nextConfig = {
  output: 'export',
  trailingSlash: true,
  basePath: isProd ? basePath : '',
  // Use the environment variable for assetPrefix, fallback to basePath
  assetPrefix: isProd ? (process.env.NEXT_PUBLIC_BASE_PATH || basePath) : '',
  images: { unoptimized: true },
  reactStrictMode: true,
  env: {
    // This exposes the env var to the browser for our 3D models
    NEXT_PUBLIC_BASE_PATH: process.env.NEXT_PUBLIC_BASE_PATH || (isProd ? basePath : ''),
  },
};

export default nextConfig;
