/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: ['unpdf', 'tesseract.js']
  }
};

export default nextConfig;

