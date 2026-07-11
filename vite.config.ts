import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Relative base so the build works when served from any sub-path
// (e.g. GitHub Pages project site at /<repo>/).
export default defineConfig({
  base: './',
  plugins: [react()],
})
