/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === 'production';

console.log('Current NODE_ENV:', process.env.NODE_ENV);
console.log('Is Production?', isProd);

const nextConfig = {
  output: 'export',
  // In dev mode (isProd=false), we want no basePath so it runs at root /
  // In prod mode (isProd=true), we use the repo name
  basePath: isProd ? '/hunger-games-simulator' : '',
  assetPrefix: isProd ? '/hunger-games-simulator/' : '',
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
