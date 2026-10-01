/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === 'production';

// The repository is named "Hub", so GitHub Pages serves the site at
// https://n0ctura.github.io/Hub/. In dev mode (`npm run dev`) the app
// runs at "/" locally, so no basePath there.
const basePath = isProd ? '/Hub' : '';

const nextConfig = {
  output: 'export',
  basePath,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
