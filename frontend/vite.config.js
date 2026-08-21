import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { sites } from '@openai/sites-vite-plugin'
import tailwindcss from '@tailwindcss/postcss'
import { cloudflare } from '@cloudflare/vite-plugin'

export default defineConfig({
  plugins: [react(), sites(), cloudflare({ viteEnvironment: { name: 'server' } })],
  css: { postcss: { plugins: [tailwindcss()] } },
  server: { port: 5173 },
})
