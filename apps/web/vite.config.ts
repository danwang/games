import { fileURLToPath } from 'node:url';
import path from 'node:path';

import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

const webRoot = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = path.resolve(webRoot, '../..');
const splendorRepoRoot = path.resolve(repoRoot, '../splendor');

export default defineConfig({
  plugins: [tailwindcss(), tsconfigPaths()],
  server: {
    fs: {
      allow: [repoRoot, splendorRepoRoot],
    },
  },
});
