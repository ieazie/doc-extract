/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  
  // Styled Components support
  compiler: {
    styledComponents: true,
  },
  
  // Environment variables
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  },

  
  // Image optimization
  images: {
    domains: ['localhost'],
  },
  
  // Output standalone for Docker
  output: 'standalone',
  
};

module.exports = nextConfig;
