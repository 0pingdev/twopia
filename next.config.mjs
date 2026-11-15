/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === 'production';
const basePath = '/twopia';

const nextConfig = {
  output: 'export',
  trailingSlash: true,
  basePath: isProd ? basePath : '',
  assetPrefix: isProd ? basePath : '',
  images: { unoptimized: true },
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_BASE_PATH: isProd ? basePath : '',
  },
};

export default nextConfig;
