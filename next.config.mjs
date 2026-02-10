/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@tensorflow/tfjs-core', '@tensorflow/tfjs-backend-webgl'],
  output: 'export',
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
