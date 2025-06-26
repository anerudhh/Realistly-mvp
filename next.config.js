/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: ['res.cloudinary.com'], // Allow image loading from Cloudinary if needed
  },
  // Enable file system APIs for handling uploads
  experimental: {
    serverComponentsExternalPackages: ['formidable']
  },
  // Allow larger payloads for file uploads
  api: {
    responseLimit: '8mb',
    bodyParser: false
  },
  env: {
    // Public env vars (these will be available in the browser)
  },
};

module.exports = nextConfig;
