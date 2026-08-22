import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/postcss'

export default defineConfig(({mode})=>({
  plugins: mode==='test' ? [react()] : [react()],
  css: { postcss: { plugins: [tailwindcss()] } },
  server: { port: 5174, proxy: { '/api': { target: 'http://localhost:8000', changeOrigin: true } } },
  test: { environment: 'jsdom', setupFiles: './src/test/setup.js', clearMocks: true },
}))
