import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import path from 'path'

function resolveBuildId() {
  const fromCi = process.env.CF_PAGES_COMMIT_SHA || process.env.GITHUB_SHA;
  if (fromCi) return String(fromCi).slice(0, 12);
  return new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
}

// https://vite.dev/config/
export default defineConfig({
  logLevel: 'error', // Suppress warnings, only show errors
  define: {
    __YASVIK_BUILD_ID__: JSON.stringify(resolveBuildId()),
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  plugins: [
    react(),
  ],
});
