// import type { NextConfig } from "next";
// import path from "node:path";

// const LOADER = path.resolve(__dirname, 'src/visual-edits/component-tagger-loader.js');

// const nextConfig: NextConfig = {
//   images: {
//     remotePatterns: [
//       {
//         protocol: 'https',
//         hostname: '**',
//       },
//       {
//         protocol: 'http',
//         hostname: '**',
//       },
//     ],
//   },
//   outputFileTracingRoot: path.resolve(__dirname, '../../'),
//   turbopack: {
//     rules: {
//       "*.{jsx,tsx}": {
//         loaders: [LOADER]
//       }
//     }
//   }
// };

// export default nextConfig;

import path from 'node:path';

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: '**',
      },
    ],
  },
  output: 'export', // Required for static export
  outputFileTracingRoot: path.resolve(__dirname, '../../'),
};

export default nextConfig;
