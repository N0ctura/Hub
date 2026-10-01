/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === 'production';

// The repository is named "Hub", so GitHub Pages serves the site at
// https://n0ctura.github.io/Hub/. In dev mode (`npm run dev`) the app
// runs at "/" locally, so no basePath there.
const basePath = isProd ? '/Hub' : '';

const nextConfig = {
  output: 'export',
  basePath,
  // Espone il basePath anche al client (per gli asset di public/)
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
